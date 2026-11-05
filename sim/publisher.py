"""Managed headless TraCI process. Input/output are newline-delimited JSON."""

import json
import os
import queue
import shutil
import sys
import threading
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

SIM_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SIM_DIR))

from build_scenario import CONFIG_PATH, OUTPUT_DIR, build, find_binary, load_config
from conflicts import choose_priority, should_release_hold
from routing import plan_route


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def emit(payload):
    print(json.dumps(payload, separators=(",", ":"), allow_nan=False), flush=True)


def check_environment():
    import traci

    sumo_name = "sumo.exe" if os.name == "nt" else "sumo"
    sumo_binary = find_binary("SUMO_BINARY", "sumo", sumo_name)
    sumocfg = build()
    return traci, sumo_binary, sumocfg


def read_commands(commands):
    for line in sys.stdin:
        try:
            commands.put(json.loads(line))
        except (json.JSONDecodeError, queue.Full):
            emit({"type": "process_error", "message": "Invalid command received by SUMO runner"})


def make_run(command, config):
    mission_id = command["missionId"]
    run_id = command["runId"]
    vehicle_id = command["vehicleId"]
    route, restrictions = plan_route(
        config,
        command["originEdgeId"],
        command["destinationEdgeId"],
    )
    if route[0] != command["originEdgeId"] or route[-1] != command["destinationEdgeId"]:
        raise ValueError("Planned route does not preserve the requested mission endpoints")

    traci_vehicle_id = f"ambulance_{run_id.replace('-', '')[:16]}"
    route_id = f"route_{run_id.replace('-', '')[:16]}"
    import traci

    traci.route.add(route_id, route)
    traci.vehicle.add(
        traci_vehicle_id,
        route_id,
        typeID="demo_car",
        depart="now",
        departLane="best",
        departSpeed="max",
    )

    reason = None
    if restrictions:
        reason = "Synthetic demo restriction avoided: " + ", ".join(
            item["sumoEdgeId"] for item in restrictions
        )
    return {
        "missionId": mission_id,
        "runId": run_id,
        "vehicleId": vehicle_id,
        "traciVehicleId": traci_vehicle_id,
        "severity": command["severity"],
        "originEdgeId": command["originEdgeId"],
        "destinationEdgeId": command["destinationEdgeId"],
        "route": route,
        "rerouteReason": reason,
        "restrictions": restrictions,
        "sequence": -1,
        "lastPublishedAt": 0.0,
        "conflictState": None,
    }


def route_nodes(route, edge_by_id):
    nodes = []
    for edge_id in route:
        edge = edge_by_id.get(edge_id)
        if edge:
            nodes.append(edge["to"])
    return nodes


def distance_to_node(route, current_index, lane_position, node_id, edge_by_id):
    distance = 0.0
    for index in range(current_index, len(route)):
        edge = edge_by_id.get(route[index])
        if not edge:
            return None
        if index == current_index:
            distance += max(0.0, edge["lengthM"] - lane_position)
        else:
            distance += edge["lengthM"]
        if edge["to"] == node_id:
            return distance
    return None


def next_common_conflict(first, second, traci, edge_by_id, conflict_nodes):
    try:
        first_route = list(traci.vehicle.getRoute(first["traciVehicleId"]))
        second_route = list(traci.vehicle.getRoute(second["traciVehicleId"]))
        first_index = traci.vehicle.getRouteIndex(first["traciVehicleId"])
        second_index = traci.vehicle.getRouteIndex(second["traciVehicleId"])
        first_position = traci.vehicle.getLanePosition(first["traciVehicleId"])
        second_position = traci.vehicle.getLanePosition(second["traciVehicleId"])
        first_speed = max(traci.vehicle.getSpeed(first["traciVehicleId"]), 1.0)
        second_speed = max(traci.vehicle.getSpeed(second["traciVehicleId"]), 1.0)
    except Exception:
        return None

    first_nodes = route_nodes(first_route[first_index:], edge_by_id)
    second_nodes = route_nodes(second_route[second_index:], edge_by_id)
    common = [node for node in first_nodes if node in second_nodes and node in conflict_nodes]
    for node in common:
        first_distance = distance_to_node(first_route, first_index, first_position, node, edge_by_id)
        second_distance = distance_to_node(second_route, second_index, second_position, node, edge_by_id)
        if first_distance is not None and second_distance is not None:
            return {
                "nodeId": node,
                "firstDistanceM": first_distance,
                "secondDistanceM": second_distance,
                "firstEtaSeconds": first_distance / first_speed,
                "secondEtaSeconds": second_distance / second_speed,
            }
    return None


def update_conflict_holds(runs, traci, config, conflict_holds):
    edge_by_id = {edge["id"]: edge for edge in config["edges"]}
    incoming = {}
    outgoing = {}
    for edge in config["edges"]:
        outgoing[edge["from"]] = outgoing.get(edge["from"], 0) + 1
        incoming[edge["to"]] = incoming.get(edge["to"], 0) + 1
    conflict_nodes = {
        node_id for node_id in set(incoming) | set(outgoing)
        if incoming.get(node_id, 0) > 1 or outgoing.get(node_id, 0) > 1
    }
    active_ids = set(traci.vehicle.getIDList())
    live = [run for run in runs.values() if run["traciVehicleId"] in active_ids]
    updates = []

    for yielding_id, hold in list(conflict_holds.items()):
        priority_run = runs.get(hold["priorityRunId"])
        priority_vehicle = None
        if priority_run and priority_run["traciVehicleId"] in active_ids:
            edge_id = traci.vehicle.getRoadID(priority_run["traciVehicleId"])
            position = traci.vehicle.getLanePosition(priority_run["traciVehicleId"])
            priority_vehicle = {
                "currentEdgeId": edge_id,
                "lanePositionM": position,
            }
        if should_release_hold(priority_vehicle, hold["nodeId"], edge_by_id):
            yielding_run = runs.get(yielding_id)
            if yielding_run and yielding_run["traciVehicleId"] in active_ids:
                traci.vehicle.setSpeed(yielding_run["traciVehicleId"], -1)
                yielding_run["conflictState"] = {
                    "status": "RELEASED",
                    "intersectionNodeId": hold["nodeId"],
                    "priorityVehicleId": priority_run["vehicleId"] if priority_run else None,
                    "reason": "Priority vehicle cleared the conflict node",
                }
                updates.append(yielding_run)
            conflict_holds.pop(yielding_id, None)

    for index, first in enumerate(live):
        for second in live[index + 1:]:
            conflict = next_common_conflict(first, second, traci, edge_by_id, conflict_nodes)
            if not conflict:
                continue
            first_info = {
                "vehicleId": first["vehicleId"],
                "severity": first["severity"],
                "etaSeconds": conflict["firstEtaSeconds"],
            }
            second_info = {
                "vehicleId": second["vehicleId"],
                "severity": second["severity"],
                "etaSeconds": conflict["secondEtaSeconds"],
            }
            priority, yielding = choose_priority(first_info, second_info)
            if max(priority["etaSeconds"], yielding["etaSeconds"]) > 8:
                continue
            priority_run = first if priority["vehicleId"] == first["vehicleId"] else second
            yielding_run = second if yielding["vehicleId"] == second["vehicleId"] else first
            yielding_distance = (
                conflict["secondDistanceM"]
                if yielding_run is second else conflict["firstDistanceM"]
            )
            if yielding_distance > 40 or yielding_run["runId"] in conflict_holds:
                continue
            try:
                traci.vehicle.setSpeed(yielding_run["traciVehicleId"], 0)
            except Exception:
                continue
            hold = {
                "priorityRunId": priority_run["runId"],
                "nodeId": conflict["nodeId"],
            }
            conflict_holds[yielding_run["runId"]] = hold
            yielding_run["conflictState"] = {
                "status": "HELD",
                "intersectionNodeId": conflict["nodeId"],
                "priorityVehicleId": priority_run["vehicleId"],
                "reason": "Yielding to higher-priority ambulance approaching the same node",
            }
            priority_run["conflictState"] = {
                "status": "PRIORITY",
                "intersectionNodeId": conflict["nodeId"],
                "yieldingVehicleId": yielding_run["vehicleId"],
                "reason": "Priority selected by severity, ETA, then vehicle ID",
            }
            updates.extend([priority_run, yielding_run])

    return updates


def run_server():
    traci, sumo_binary, sumocfg = check_environment()
    config = load_config()
    traci.start([
        sumo_binary,
        "-c", str(sumocfg),
        "--step-length", str(config["stepLengthSeconds"]),
        "--seed", str(config["randomSeed"]),
        "--no-warnings", "true",
    ])
    commands = queue.Queue()
    threading.Thread(target=read_commands, args=(commands,), daemon=True).start()
    runs = {}
    conflict_holds = {}
    tick = 0
    has_started_run = False
    shutdown_requested = False
    emit({"type": "ready", "status": "READY", "source": "SYNTHETIC_DEMO", "timestamp": utc_now()})

    try:
        while not shutdown_requested:
            while True:
                try:
                    command = commands.get_nowait()
                except queue.Empty:
                    break
                if command.get("type") == "shutdown":
                    shutdown_requested = True
                    break
                if command.get("type") == "cancel":
                    run = runs.get(command.get("runId"))
                    if run:
                        vehicle = run["traciVehicleId"]
                        if vehicle in traci.vehicle.getIDList():
                            traci.vehicle.remove(vehicle)
                        runs.pop(run["runId"], None)
                        emit({
                            "type": "run_update",
                            "runId": run["runId"],
                            "missionId": run["missionId"],
                            "sequence": run["sequence"] + 1,
                            "status": "CANCELLED",
                            "timestamp": utc_now(),
                            "source": "SYNTHETIC_DEMO",
                            "error": command.get("reason"),
                        })
                    continue
                if command.get("type") != "start":
                    emit({"type": "process_error", "message": "Unknown SUMO runner command"})
                    continue
                if command.get("runId") in runs:
                    run = runs[command["runId"]]
                    emit_update(run, traci, config, "RUNNING")
                    continue
                try:
                    run = make_run(command, config)
                    runs[run["runId"]] = run
                    has_started_run = True
                    emit_update(run, traci, config, "RUNNING")
                except Exception as error:
                    emit({
                        "type": "run_error",
                        "runId": command.get("runId"),
                        "missionId": command.get("missionId"),
                        "message": str(error),
                        "timestamp": utc_now(),
                    })

            if shutdown_requested:
                break

            traci.simulationStep()
            tick += 1
            arrived = set(traci.simulation.getArrivedIDList())
            for run_id, run in list(runs.items()):
                vehicle_id = run["traciVehicleId"]
                if vehicle_id in arrived:
                    emit_update(run, traci, config, "COMPLETED")
                    runs.pop(run_id, None)
                    conflict_holds.pop(run_id, None)
                elif tick % max(1, int(5 / config["stepLengthSeconds"])) == 0:
                    emit_update(run, traci, config, "RUNNING")

            for run in update_conflict_holds(runs, traci, config, conflict_holds):
                emit_update(run, traci, config, "RUNNING")

            simulation_time = traci.simulation.getTime()
            if simulation_time >= config["maxSimulationSeconds"]:
                for run in list(runs.values()):
                    emit({
                        "type": "run_error",
                        "runId": run["runId"],
                        "missionId": run["missionId"],
                        "message": "Synthetic simulation duration ended before destination arrival",
                        "timestamp": utc_now(),
                    })
                break

            if not runs and has_started_run:
                break
            time.sleep(config["stepLengthSeconds"] / max(1, config["speedFactor"]))
    finally:
        try:
            traci.close()
        except Exception:
            pass
        emit({"type": "stopped", "timestamp": utc_now()})


def main():
    if "--check" in sys.argv:
        try:
            traci, sumo_binary, sumocfg = check_environment()
            del traci
            emit({
                "type": "check",
                "ok": True,
                "sumo": sumo_binary,
                "config": str(sumocfg),
                "source": "SYNTHETIC_DEMO",
            })
            return 0
        except Exception as error:
            print(f"SUMO preflight failed: {error}", file=sys.stderr, flush=True)
            return 1

    try:
        run_server()
    except Exception as error:
        emit({"type": "process_error", "message": str(error), "timestamp": utc_now()})
        traceback.print_exc(file=sys.stderr)
        return 1
    return 0


def emit_update(run, traci, config, status):
    run["sequence"] += 1
    now = time.monotonic()
    vehicle_id = run["traciVehicleId"]
    position = None
    speed_kmh = None
    heading_degrees = None
    current_edge_id = None
    if vehicle_id in traci.vehicle.getIDList():
        edge_id = traci.vehicle.getRoadID(vehicle_id)
        if not edge_id.startswith(":"):
            x, y = traci.vehicle.getPosition(vehicle_id)
            position = {"x": x, "y": y}
            speed_kmh = traci.vehicle.getSpeed(vehicle_id) * 3.6
            heading_degrees = traci.vehicle.getAngle(vehicle_id)
            current_edge_id = edge_id
    run["lastPublishedAt"] = now
    emit({
        "type": "run_update",
        "runId": run["runId"],
        "missionId": run["missionId"],
        "sequence": run["sequence"],
        "status": status,
        "timestamp": utc_now(),
        "source": "SYNTHETIC_DEMO",
        "vehicleId": run["vehicleId"],
        "currentEdgeId": current_edge_id,
        "originEdgeId": run["originEdgeId"],
        "destinationEdgeId": run["destinationEdgeId"],
        "route": run["route"],
        "rerouteReason": run["rerouteReason"],
        "position": position,
        "speedKmh": speed_kmh,
        "headingDegrees": heading_degrees,
        "simulationTimeSeconds": traci.simulation.getTime(),
        "traffic": [
            {
                "segmentId": edge["id"].replace("_", "-"),
                "sumoEdgeId": edge["id"],
                "status": (
                    "BLOCKED"
                    if any(item["sumoEdgeId"] == edge["id"] for item in run["restrictions"])
                    else "OPEN"
                ),
                "averageSpeedKmh": edge["speedKmh"] / edge.get("trafficMultiplier", 1.0),
                "source": "SYNTHETIC_DEMO",
                "timestamp": utc_now(),
            }
            for edge in config["edges"]
        ],
        "restrictions": run["restrictions"],
        "signalState": None,
        "conflictState": run["conflictState"],
        "error": None,
    })


if __name__ == "__main__":
    raise SystemExit(main())
