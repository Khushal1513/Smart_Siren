# Smart Siren SUMO simulation

This folder contains a **synthetic offline SUMO demo**, not a model of real Bengaluru streets. The generated network uses local metre coordinates, synthetic traffic, and a configured demo closure. It has no georeferencing, TomTom feed, live GPS source, or SUMO traffic-light controller.

`DEMO` is the only supported mode. Requests marked `LIVE` are rejected explicitly; do not present this scenario as live traffic or physical signal control.

## Files

- `config/manual_values.json` is the source of truth for the demo nodes, directed SUMO edges, synthetic background flow, and restriction.
- `routing.py` calculates a least-travel-time route using the configured synthetic traffic multipliers while excluding blocked/closed edges. It always includes the requested origin and destination edges or returns an error.
- `build_scenario.py` generates the SUMO node, edge, route, network, and `.sumocfg` files. Generated files go under `scenarios/generated/` and are ignored by Git.
- `publisher.py` is a backend-managed, headless TraCI process. It accepts newline-delimited JSON commands on stdin and emits newline-delimited run updates on stdout. The browser never starts SUMO.
- `conflicts.py` contains deterministic severity/ETA priority and hold-release predicates.
- `tests/test_routing.py` tests route preservation, blocked-edge avoidance, priority, and hold release without starting SUMO.

### Synthetic segment mapping

| Demo segment | SUMO edge | Notes |
|---|---|---|
| `S1-S2` | `S1_S2` | Synthetic eastbound edge |
| `S2-S3` | `S2_S3` | Configured synthetic closure |
| `S3-S4` | `S3_S4` | Synthetic eastbound destination edge |
| Detour | `S2_N1`, `N1_N2`, `N2_S3` | Synthetic bypass around `S2_S3` |

These are not database road segments or real-world road mappings. The map uses only SUMO-local x/y coordinates.

## Windows setup

The checked workspace currently has SUMO **1.28.0** at `C:\Program Files (x86)\SUMO` and Python **3.13** at `C:\Python313\python.exe`. Both `traci==1.28.0` and `sumolib==1.28.0` are installed in that Python environment. The backend defaults to the `python` command, but setting `SIMULATION_PYTHON` to the full executable path makes the child-process environment unambiguous.

1. Verify the installed binaries:

   ```powershell
   & 'C:\Program Files (x86)\SUMO\bin\sumo.exe' --version
   & 'C:\Program Files (x86)\SUMO\bin\netconvert.exe' --version
   ```

2. Verify or install TraCI and sumolib into the exact Python interpreter used by the backend:

   ```powershell
   & 'C:\Python313\python.exe' -c "import sys, traci, sumolib; print(sys.executable); print(traci.__file__); print(sumolib.__file__)"
   & 'C:\Python313\python.exe' -m pip install -r sim\requirements.txt
   ```

   The requirements are pinned to SUMO 1.28.0. If SUMO is upgraded or installed elsewhere, install matching TraCI/sumolib versions and update these pins.

3. Keep the local configuration in `crud\.env`, which is ignored by Git. Merge these settings into the existing file; do not overwrite `MONGO_URI` or other local settings:

   ```env
   SUMO_HOME='C:\Program Files (x86)\SUMO'
   SUMO_BINARY='C:\Program Files (x86)\SUMO\bin\sumo.exe'
   NETCONVERT_BINARY='C:\Program Files (x86)\SUMO\bin\netconvert.exe'
   SIMULATION_PYTHON='C:\Python313\python.exe'
   SIMULATION_STARTUP_TIMEOUT_MS=15000
   ```

4. From the repository root, build and check the synthetic network using the same interpreter:

   ```powershell
   & 'C:\Python313\python.exe' sim\build_scenario.py --build-only
   & 'C:\Python313\python.exe' sim\publisher.py --check
   ```

   `--build-only` requires `netconvert`; `--check` requires `sumo`, `netconvert`, and the matching Python bindings. The checked workspace passes this preflight and generates `sim\scenarios\generated\corridor.sumocfg`.

## Start the application

1. Start MongoDB.
2. Restart the existing Mongo-backed API from `crud\` so it loads the SUMO paths:

   ```powershell
   cd C:\Users\khush\Music\Smart_Siren_Project_2\Smart_Siren_Project\crud
   npm start
   ```

   Confirm `http://localhost:8000/health` returns `{"status":"OK","message":"Server is running"}`. This checks API health; SUMO readiness is confirmed by the Python `publisher.py --check` command above and again during activation preflight.
3. Start the existing Vite app from `vvce\` if it is not already running:

   ```powershell
   npm run dev
   ```

4. Register a vehicle using the existing vehicle registration page.
5. Register a test vehicle and use the exact generated `VEH-...` `vehicleId` (not a plate or `AMB-SIH-*` demo ID).
6. Open **Missions**, create a new mission with that registered ID, choose origin `S1_S2` and fixed destination `S3_S4`, then select it. This route is connected through the synthetic detour because `S2_S3` is configured blocked.
7. Activate once. The existing frontend button calls `POST /api/missions/:id/activate`; the backend returns `{ data: mission, simulation: run }` after a `RUNNING` update, then the UI navigates to `/simulation/:missionId`. Updates arrive through Socket.IO `simulation:update` and are also persisted for `GET /api/simulations/:missionId`.

The backend runs one managed headless SUMO child process and uses one persisted run per mission. Repeated activation clicks are guarded in the frontend and are idempotent on the backend. The process is stopped after all runs finish, on mission abort/closure, or during backend shutdown.

### Failure diagnosis

- **`sumo.exe` or `netconvert.exe` not found:** verify the binaries under `C:\Program Files (x86)\SUMO\bin` and check `SUMO_BINARY`/`NETCONVERT_BINARY` in `crud\.env`.
- **Bad `SUMO_HOME`:** it must be the installation root `C:\Program Files (x86)\SUMO` (the parent of `bin` and `tools`), not the `bin` directory.
- **Wrong Python/TraCI environment:** confirm backend `SIMULATION_PYTHON` is `C:\Python313\python.exe`; use that same executable for pip and imports. TraCI/sumolib versions should match SUMO.
- **Invalid vehicle or mission:** activate only a `CREATED` mission whose `vehicleId` exactly matches a registered `Vehicle.vehicleId`. The seeded `AMB-SIH-*` missions are not registered vehicles and must not be used for this test.
- **Invalid route edges:** use known connected edges; for this demo use `S1_S2` → `S3_S4`. Unknown, blocked endpoint, or disconnected routes fail instead of substituting a destination.
- **Simulation process failure:** inspect backend terminal output for `[simulation]`/`[missions]` errors and query `GET /api/simulations/:missionId`; a failed run is persisted as `FAILED` and is not silently restarted. Create a new mission for a new run.

## API and event contract

Create a mission through the existing `POST /api/missions` endpoint:

```json
{
  "vehicleId": "VEH-generated-by-registration",
  "severity": 4,
  "route": [],
  "simulationConfig": {
    "mode": "DEMO",
    "originEdgeId": "S1_S2",
    "destinationEdgeId": "S3_S4"
  }
}
```

Activation uses the existing `POST /api/missions/:id/activate` endpoint. Before changing the mission, the backend validates that the mission exists, its `vehicleId` matches a registered `Vehicle.vehicleId`, its simulation mode/edges are valid, and SUMO/network prerequisites pass. On success it returns:

```json
{
  "data": { "_id": "mission ObjectId", "vehicleId": "VEH-generated-by-registration", "status": "ACTIVE" },
  "simulation": { "runId": "unique-run-id", "status": "RUNNING", "source": "SYNTHETIC_DEMO" }
}
```

Each mission has at most one persisted `SimulationRun`. Repeated activation requests return that run when it is starting, running, or complete. Failed/cancelled runs are not silently restarted; create a new mission for a new run.

- `GET /api/simulations/config` returns the public synthetic topology, restrictions, and data-source label.
- `GET /api/simulations/:missionId` returns the persisted run state.
- `simulation:update` is an outbound Socket.IO event for browser clients. It includes the mission/run/vehicle IDs, ordered sequence, status, SUMO-local position, current route and fixed destination edge, speed/heading, synthetic traffic/restrictions, conflict state, source, and timestamp. It is not an inbound GPS or traffic feed.
- `mission:update` remains the mission lifecycle event. The simulation runner does not write synthetic positions into `Mission.positions`, which is reserved for the existing latitude/longitude position API.
- Aborting or closing a mission stops its associated active simulation run.

The app's registered traffic signals do not have SUMO traffic-light IDs or phase programs; this demo contains no SUMO traffic lights and displays signal state as unavailable.

## Verification

Run the simulator's pure-Python tests without a SUMO executable:

```powershell
python -m unittest discover -s sim\tests -v
```

Backend contract tests run from `crud\` with `npm test`; frontend tests/build run from `vvce\` with `npm test` and `npm run build`. A successful unit test does not mean that SUMO/TraCI ran. Run `python sim\publisher.py --check` and activate a test mission to verify the installed local SUMO runtime.
