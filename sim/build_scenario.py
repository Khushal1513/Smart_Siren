"""Generate a local-coordinate SUMO corridor from config/manual_values.json."""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parent))
from routing import plan_route


SIM_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SIM_DIR / "config" / "manual_values.json"
OUTPUT_DIR = SIM_DIR / "scenarios" / "generated"


def load_config():
    with CONFIG_PATH.open(encoding="utf-8") as file:
        config = json.load(file)
    nodes = {node["id"] for node in config["nodes"]}
    edge_ids = set()
    for edge in config["edges"]:
        if edge["id"] in edge_ids:
            raise ValueError(f"Duplicate edge ID: {edge['id']}")
        if edge["from"] not in nodes or edge["to"] not in nodes:
            raise ValueError(f"Edge {edge['id']} refers to an unknown node")
        edge_ids.add(edge["id"])
    for restriction in config.get("demoRestrictions", []):
        if restriction["sumoEdgeId"] not in edge_ids:
            raise ValueError(f"Restriction refers to an unknown edge: {restriction['sumoEdgeId']}")
    return config


def find_binary(env_name, command, executable_name):
    configured = os.environ.get(env_name)
    if configured:
        candidate = Path(configured)
        if candidate.is_file():
            return str(candidate)
        raise FileNotFoundError(f"{env_name} does not name an existing file")

    found = shutil.which(command)
    if found:
        return found

    sumo_home = os.environ.get("SUMO_HOME")
    if sumo_home:
        candidate = Path(sumo_home) / "bin" / executable_name
        if candidate.is_file():
            return str(candidate)

    raise FileNotFoundError(
        f"SUMO executable '{command}' was not found. Install SUMO and set SUMO_HOME, "
        f"{env_name}, or add it to PATH."
    )


def _write_inputs(config):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    nodes_root = ET.Element("nodes")
    for node in config["nodes"]:
        ET.SubElement(nodes_root, "node", {
            "id": node["id"],
            "x": str(node["x"]),
            "y": str(node["y"]),
            "type": "priority",
        })
    ET.indent(nodes_root)
    ET.ElementTree(nodes_root).write(OUTPUT_DIR / "corridor.nod.xml", encoding="utf-8", xml_declaration=True)

    edges_root = ET.Element("edges")
    for edge in config["edges"]:
        ET.SubElement(edges_root, "edge", {
            "id": edge["id"],
            "from": edge["from"],
            "to": edge["to"],
            "numLanes": str(edge["lanes"]),
            "speed": str(edge["speedKmh"] / 3.6),
            "priority": "2",
        })
    ET.indent(edges_root)
    ET.ElementTree(edges_root).write(OUTPUT_DIR / "corridor.edg.xml", encoding="utf-8", xml_declaration=True)

    restrictions = {
        item["sumoEdgeId"]
        for item in config.get("demoRestrictions", [])
        if item.get("enabled") and item.get("status", "").upper() in {"BLOCKED", "CLOSED"}
    }
    # Background traffic follows a valid route and avoids enabled demo restrictions.
    main_route, _ = plan_route(
        config,
        config["edges"][0]["id"],
        config["edges"][2]["id"],
    )

    routes_root = ET.Element("routes")
    ET.SubElement(routes_root, "vType", {
        "id": "demo_car",
        "accel": "2.6",
        "decel": "4.5",
        "length": "5",
        "maxSpeed": "15",
        "sigma": "0.5",
    })
    ET.SubElement(routes_root, "route", {"id": "demo_traffic_route", "edges": " ".join(main_route)})
    traffic = config.get("backgroundTraffic", {})
    if traffic.get("enabled"):
        ET.SubElement(routes_root, "flow", {
            "id": "synthetic_background_traffic",
            "type": "demo_car",
            "route": "demo_traffic_route",
            "begin": str(traffic["beginSeconds"]),
            "end": str(traffic["endSeconds"]),
            "vehsPerHour": str(traffic["vehiclesPerHour"]),
            "departLane": "best",
            "departSpeed": "max",
        })
    ET.indent(routes_root)
    ET.ElementTree(routes_root).write(OUTPUT_DIR / "corridor.rou.xml", encoding="utf-8", xml_declaration=True)

    sumocfg = ET.Element("configuration")
    inputs = ET.SubElement(sumocfg, "input")
    ET.SubElement(inputs, "net-file", {"value": "corridor.net.xml"})
    ET.SubElement(inputs, "route-files", {"value": "corridor.rou.xml"})
    time = ET.SubElement(sumocfg, "time")
    ET.SubElement(time, "begin", {"value": "0"})
    ET.SubElement(time, "end", {"value": str(config["maxSimulationSeconds"])})
    ET.SubElement(time, "step-length", {"value": str(config["stepLengthSeconds"])})
    random = ET.SubElement(sumocfg, "random_number")
    ET.SubElement(random, "seed", {"value": str(config["randomSeed"])})
    ET.indent(sumocfg)
    ET.ElementTree(sumocfg).write(OUTPUT_DIR / "corridor.sumocfg", encoding="utf-8", xml_declaration=True)


def build():
    config = load_config()
    netconvert = find_binary("NETCONVERT_BINARY", "netconvert", "netconvert.exe" if os.name == "nt" else "netconvert")
    _write_inputs(config)
    subprocess.run(
        [
            netconvert,
            "--node-files", str(OUTPUT_DIR / "corridor.nod.xml"),
            "--edge-files", str(OUTPUT_DIR / "corridor.edg.xml"),
            "--output-file", str(OUTPUT_DIR / "corridor.net.xml"),
        ],
        check=True,
        cwd=OUTPUT_DIR,
        capture_output=True,
        text=True,
    )
    return OUTPUT_DIR / "corridor.sumocfg"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validate configuration and build the scenario")
    parser.add_argument("--build-only", action="store_true", help="build the network without requiring a SUMO executable")
    args = parser.parse_args()
    try:
        if not args.build_only:
            sumo_name = "sumo.exe" if os.name == "nt" else "sumo"
            find_binary("SUMO_BINARY", "sumo", sumo_name)
        config_path = build()
        if args.check or args.build_only:
            print(json.dumps({"ok": True, "config": str(config_path), "source": "SYNTHETIC_DEMO"}))
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        detail = error.stderr.strip() if isinstance(error, subprocess.CalledProcessError) and error.stderr else str(error)
        print(f"SUMO scenario setup failed: {detail}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
