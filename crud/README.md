# Smart Siren backend (`crud/`)

This folder contains the Node.js/Express API, MongoDB models, optional Arduino serial-dispatch integration, and the managed SUMO simulation adapter for Smart Siren. The dashboard in `vvce/` calls the API to manage vehicles, missions, and traffic-signal registry records.

## How the backend fits together

1. `index.js` connects to MongoDB, mounts the API routes, attaches Socket.IO, and starts the dashboard API on port `8000` by default.
2. Route modules in `routes/` map HTTP paths to controller functions in `controller/`.
3. Controllers implement the application operations and use the Mongoose schemas in `model/` to read or update stored data.
4. Mission activation validates its registered `Vehicle.vehicleId`, then starts at most one Mongo-persisted synthetic SUMO run per mission.
5. The Arduino router is a separate optional hardware dispatch path; SUMO does not command physical signals.

There are two server entry points: `npm start` runs `index.js`, the MongoDB-backed API used by the dashboard; `node server.js` runs a separate serial-only server. Both use port `8000` by default, so do not run them simultaneously.

## File guide

Importance indicates how directly a file supports the running application: **Core** files provide essential runtime behavior; **Supporting** files provide data, shared behavior, or a particular feature; **Development** files assist local setup or diagnostics.

### Backend root

| File | What it does | Importance |
|---|---|---|
| `README.md` | Documents the backend architecture, setup, and role of every tracked backend file. | **Supporting** — helps developers understand, run, and maintain the backend. |
| `activeambulances.json` | Holds sample ambulance/lane status data in JSON format. | **Supporting** — useful as sample data, but the live API primarily uses MongoDB. |
| `check-routes-conflicts.js` | Checks route definitions for duplicate HTTP method and path combinations. | **Development** — helps prevent ambiguous API routing; not needed to run the server. |
| `debug-routes.js` | Loads and mounts route modules to reveal import or route setup errors. | **Development** — useful for troubleshooting; not part of normal server startup. |
| `index.js` | Connects to MongoDB, mounts APIs, attaches Socket.IO, starts the watchdog and managed simulation lifecycle, and listens for dashboard requests. | **Core** — main API entry point used by `npm start`. |
| `package.json` | Defines backend dependencies and the `npm start` command, which runs `index.js`. | **Core** — required to install dependencies and run the backend scripts. |
| `package-lock.json` | Locks exact npm dependency versions for repeatable installs. | **Core** — keeps backend installs consistent across machines. |
| `server.js` | Starts a separate serial-only Express server using a hard-coded serial port. It does not connect to MongoDB or mount the dashboard APIs. | **Legacy/supporting** — optional hardware endpoint; conflicts with the main API's default port. |
| `test-ports.js` | Lists serial ports detected on the current computer. | **Development** — helps configure Arduino communication; not required for API operation. |

### `arduino_server/` — hardware dispatch

| File | What it does | Importance |
|---|---|---|
| `arduino_server/arduino-server.js` | Exposes a dispatch router that validates ambulance/lane requests and writes a command to the configured Arduino serial port. | **Supporting** — enables physical signal dispatch; the rest of the dashboard API can run without attached hardware. |

### `controller/` — request behavior

| File | What it does | Importance |
|---|---|---|
| `controller/ambulanceController.js` | Retrieves active ambulances and activates an ambulance by its database ID. | **Supporting** — implements ambulance activation and active-ambulance operations. |
| `controller/trafficSignalController.js` | Registers and lists traffic signals, counts them, and updates or controls their status. | **Supporting** — provides the traffic-signal management behavior used by the API. |
| `controller/trigger-control.js` | Verifies ambulance details and handles ambulance activation and active/emergency ambulance listings. | **Supporting** — connects emergency triggering and verification behavior to stored data. |
| `controller/userController.js` | Implements user create/list/update/delete handlers and a vehicle-count handler. | **Supporting** — provides user-related request handlers; the current user routes use placeholder responses. |
| `controller/vehicleController.js` | Registers, lists, looks up, updates, and deletes vehicle records. | **Supporting** — implements vehicle management operations for the API. |
| `controller/verifycontroller.js` | Checks an engine-number and vehicle-number pair against stored ambulance records. | **Supporting** — backs vehicle/ambulance verification requests. |

### `model/` — MongoDB data schemas

| File | What it does | Importance |
|---|---|---|
| `model/ActiveAmbulance.js` | Defines active ambulance records, assigned lanes, status, and dispatch lifecycle timestamps. | **Supporting** — stores active-dispatch state used by ambulance features. |
| `model/LaneStatus.js` | Defines lane status, location, traffic density, emergency state, and signal overrides; it does not currently define the `initializeLanes` helper called by some routes. | **Core** — stores lane state, though startup initialization is incomplete. |
| `model/Mission.js` | Stores canonical vehicle ID, mission state, route stops, positions, severity, and optional explicit simulation configuration. | **Core** — MongoDB source of truth for mission activation and lifecycle. |
| `model/SimulationRun.js` | Stores one unique demo run per mission, run status, route, timestamped local position, traffic, restrictions, and conflicts. | **Supporting** — persists simulation state and prevents duplicate mission runs. |
| `model/Vehicle.js` | Defines vehicle registration data, validation, ID generation, and registration helpers. | **Supporting** — provides a vehicle-oriented schema and helpers for registration. |
| `model/ambulanceModel.js` | Defines ambulance identifiers, active state, location, and update time. | **Supporting** — stores ambulance state for ambulance operations. |
| `model/trafficSignalModel.js` | Defines traffic-signal identifiers, locations, and statuses. | **Supporting** — persists signal data managed through the traffic-signal API. |
| `model/trigger-model.js` | Defines ambulance engine/vehicle numbers, status, destination, ETA, and optimized signals for trigger workflows. | **Supporting** — stores emergency-trigger details used by verification and dispatch features. |
| `model/usermodel.js` | Defines user name, email, password, and creation time fields. | **Supporting** — supplies the user data schema for user operations. |
| `model/vehicleModel.js` | Defines vehicle or ambulance identifiers, driver, status, destination, ETA, and optimized signals. | **Supporting** — stores the vehicle and route details used by vehicle features. |
| `model/verifymodel.js` | Defines vehicle and ambulance registration details used in verification. | **Supporting** — supplies the records checked by verification handlers. |

### `routes/` — HTTP API paths

| File | What it does | Importance |
|---|---|---|
| `routes/ambulanceRoute.js` | Defines routes for emergency verification and creating or listing active ambulances. | **Supporting** — exposes ambulance operations through the API. |
| `routes/ambulanceRoutes.js` | Defines an alternate set of ambulance activation and active-ambulance routes. | **Supporting** — not mounted by the main API entry point. |
| `routes/trafficSignalRoute.js` | Maps traffic-signal registration, listing, and status updates to controller functions. | **Supporting** — exposes signal management endpoints. |
| `routes/missionRoute.js` | Exposes persisted mission CRUD and lifecycle; activation starts the managed SUMO demo after validation. | **Core** — API path for the Missions screen and activation flow. |
| `routes/simulationRoute.js` | Exposes public synthetic network configuration and persisted run state. | **Supporting** — API contract consumed by the simulation screen. |
| `routes/trigger-route.js` | Maps ambulance verification, activation, and listing endpoints to trigger controllers. | **Supporting** — exposes emergency trigger workflows. |
| `routes/userRoute.js` | Defines user CRUD paths and currently connects them to placeholder response handlers. | **Supporting** — reserves user API paths; full user CRUD behavior is not currently wired here. |
| `routes/vehicleRoute.js` | Exposes vehicle registration, listing, lookup, update, delete, and health-check endpoints. | **Supporting** — provides the API surface for vehicle management. |
| `routes/verifyroute.js` | Exposes engine/vehicle-pair and ambulance-ID verification endpoints. | **Supporting** — provides the API surface for registration verification. |

### `services/simulation/` — managed SUMO lifecycle

- `simulationContract.js` validates the registered `Vehicle.vehicleId`, mission state, explicit demo endpoints, and restriction state. It rejects unsupported LIVE mode rather than substituting demo data.
- `simulationManager.js` preflights SUMO, creates a unique `SimulationRun`, activates the mission, manages one headless Python/TraCI child, persists sequence-ordered updates, forwards `simulation:update`, and cleans up terminal/shutdown runs.

The simulation source, synthetic scenario, Windows setup, API examples, and Python routing tests are documented in the repository's `sim/README.md`. No real-road mapping, TomTom feed, live GPS feed, or physical traffic-light interface is included.

### `utils/` — shared helpers

| File | What it does | Importance |
|---|---|---|
| `utils/asyncHandler.js` | Wraps an async Express handler and forwards rejected promises to Express error handling. | **Supporting** — centralizes async error forwarding for routes that use it. |

## Configuration and running

Install dependencies and start the main API from this directory:

```powershell
npm install
npm start
```

The main API uses `PORT` (default `8000`) and `MONGO_URI` (default `mongodb://127.0.0.1:27017/crud`) when provided in a local `.env` file. SUMO integration uses `SUMO_HOME`, `SUMO_BINARY`, `NETCONVERT_BINARY`, `SIMULATION_PYTHON`, and `SIMULATION_STARTUP_TIMEOUT_MS`; Arduino dispatch uses `ARDUINO_PORT`. Keep local environment files and credentials out of version control.

To run the alternate serial-only server instead, use `node server.js`. It defaults to port `8000` and must not run at the same time as `npm start`.

SUMO is optional for the backend's other APIs. If SUMO prerequisites are absent, simulation activation returns an explicit error and leaves a CREATED mission unchanged. See `sim/README.md` for Windows setup and mode limitations.
