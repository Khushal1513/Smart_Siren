import json
import sys
import unittest
from pathlib import Path

SIM_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SIM_DIR))

from conflicts import choose_priority, passed_conflict_node, should_release_hold
from routing import plan_route


with (SIM_DIR / "config" / "manual_values.json").open(encoding="utf-8") as file:
    CONFIG = json.load(file)


class RoutingTests(unittest.TestCase):
    def test_demo_reroute_avoids_blocked_edge_and_preserves_destination(self):
        route, restrictions = plan_route(CONFIG, "S1_S2", "S3_S4")
        self.assertEqual(route[0], "S1_S2")
        self.assertEqual(route[-1], "S3_S4")
        self.assertNotIn("S2_S3", route)
        self.assertTrue(any(item["sumoEdgeId"] == "S2_S3" for item in restrictions))

    def test_unknown_origin_or_destination_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unknown origin"):
            plan_route(CONFIG, "MISSING", "S3_S4")
        with self.assertRaisesRegex(ValueError, "Unknown destination"):
            plan_route(CONFIG, "S1_S2", "MISSING")

    def test_blocked_destination_is_not_replaced(self):
        with self.assertRaisesRegex(ValueError, "Destination edge S2_S3 is restricted"):
            plan_route(CONFIG, "S1_S2", "S2_S3")


class ConflictTests(unittest.TestCase):
    def test_priority_uses_severity_then_eta_then_stable_vehicle_id(self):
        winner, loser = choose_priority(
            {"vehicleId": "VEH-B", "severity": 4, "etaSeconds": 2},
            {"vehicleId": "VEH-A", "severity": 4, "etaSeconds": 3},
        )
        self.assertEqual(winner["vehicleId"], "VEH-B")
        self.assertEqual(loser["vehicleId"], "VEH-A")

        winner, _ = choose_priority(
            {"vehicleId": "VEH-B", "severity": 4, "etaSeconds": 2},
            {"vehicleId": "VEH-A", "severity": 5, "etaSeconds": 8},
        )
        self.assertEqual(winner["vehicleId"], "VEH-A")

    def test_release_requires_priority_vehicle_to_clear_conflict_node(self):
        edges = {"out": {"from": "S2", "to": "S3"}}
        vehicle = {"currentEdgeId": "out", "lanePositionM": 19}
        self.assertFalse(passed_conflict_node(vehicle, "S2", edges))
        self.assertFalse(should_release_hold(vehicle, "S2", edges))
        vehicle["lanePositionM"] = 20
        self.assertTrue(should_release_hold(vehicle, "S2", edges))
        self.assertTrue(should_release_hold(None, "S2", edges))


if __name__ == "__main__":
    unittest.main()
