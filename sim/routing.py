"""Pure helpers for the synthetic SUMO corridor; no SUMO installation required."""

import heapq


def plan_route(config, origin_edge_id, destination_edge_id):
    edges = {edge["id"]: edge for edge in config["edges"]}
    if origin_edge_id not in edges:
        raise ValueError(f"Unknown origin SUMO edge: {origin_edge_id}")
    if destination_edge_id not in edges:
        raise ValueError(f"Unknown destination SUMO edge: {destination_edge_id}")

    restrictions = [
        item for item in config.get("demoRestrictions", [])
        if item.get("enabled") and item.get("status", "").upper() in {"BLOCKED", "CLOSED"}
    ]
    blocked_edges = {item["sumoEdgeId"] for item in restrictions}
    if origin_edge_id in blocked_edges:
        raise ValueError(f"Origin edge {origin_edge_id} is restricted")
    if destination_edge_id in blocked_edges:
        raise ValueError(f"Destination edge {destination_edge_id} is restricted")

    origin = edges[origin_edge_id]
    destination = edges[destination_edge_id]
    if origin_edge_id == destination_edge_id:
        return [origin_edge_id], restrictions

    start_node = origin["to"]
    target_node = destination["from"]
    distances = {start_node: 0.0}
    previous = {}
    queue = [(0.0, start_node)]
    while queue:
        cost, node = heapq.heappop(queue)
        if cost != distances.get(node):
            continue
        if node == target_node:
            break
        for edge in config["edges"]:
            if edge["from"] != node or edge["id"] in blocked_edges:
                continue
            speed_mps = edge["speedKmh"] / 3.6
            edge_cost = edge["lengthM"] / speed_mps * edge.get("trafficMultiplier", 1.0)
            next_cost = cost + edge_cost
            if next_cost < distances.get(edge["to"], float("inf")):
                distances[edge["to"]] = next_cost
                previous[edge["to"]] = (node, edge["id"])
                heapq.heappush(queue, (next_cost, edge["to"]))

    if target_node not in distances:
        raise ValueError(
            f"No permitted route from {origin_edge_id} to {destination_edge_id}"
        )

    middle = []
    node = target_node
    while node != start_node:
        prior_node, edge_id = previous[node]
        middle.append(edge_id)
        node = prior_node
    middle.reverse()
    route = [origin_edge_id, *middle, destination_edge_id]
    if route[-1] != destination_edge_id:
        raise RuntimeError("Route planner changed the requested destination")
    return route, restrictions
