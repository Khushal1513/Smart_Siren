"""Deterministic conflict priority and safe-hold decisions for demo vehicles."""


def choose_priority(first, second):
    """Higher severity wins, then lower estimated arrival, then stable vehicle ID."""
    first_key = (-first["severity"], first["etaSeconds"], first["vehicleId"])
    second_key = (-second["severity"], second["etaSeconds"], second["vehicleId"])
    return (first, second) if first_key <= second_key else (second, first)


def passed_conflict_node(vehicle, node_id, edge_by_id):
    edge = edge_by_id.get(vehicle.get("currentEdgeId"))
    return bool(
        vehicle.get("currentEdgeId")
        and edge
        and edge["from"] == node_id
        and vehicle.get("lanePositionM", 0) >= 20
    )


def should_release_hold(priority_vehicle, node_id, edge_by_id):
    return (
        priority_vehicle is None
        or passed_conflict_node(priority_vehicle, node_id, edge_by_id)
    )
