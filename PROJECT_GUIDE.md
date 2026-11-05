# Smart Siren — AI Project Guide

This document is a standalone orientation guide for a person or AI assistant that has not seen this repository before. It describes the purpose, architecture, current implementation, and every tracked project file in the `crud/` and `vvce/` applications. File descriptions are based on the source code, not just filenames.

## Current project state (verified 2026-11-05)

This section describes the active implementation and takes precedence over older file notes below if they conflict.

- The repository contains two separate applications: `crud/` is the Node/Express/Mongoose API and `vvce/` is the React/Vite user interface. They communicate over HTTP; they are not merged into one application or one package.
- The main backend process is `crud/index.js`. It connects to MongoDB, mounts the APIs, attaches Socket.IO to the same HTTP server, and starts the mission watchdog. The frontend development server runs separately and proxies `/api` requests to the backend.
- Missions are stored in the MongoDB `missions` collection. The `/api/missions` API supports create, list, detail, lifecycle transitions, positions, and deletion. Mission status is persisted, so a browser refresh does not erase a mission.
- The dashboard's **Emergency Ambulances** card is currently a mission view: it lists `CREATED` and `ACTIVE` missions, lets an operator select one to inspect its mission details, and shares the mission store/realtime updates with the Missions page. The dashboard's Active Ambulances statistic counts `ACTIVE` missions. This does not read the separate ambulance-registration or lane-assignment collections.
- The dashboard's **Traffic Signal Control** card reads registered signal records from `GET /api/traffic-signals`, shows location/ID/type/status, and refreshes the list periodically. A registered signal's `active` status means its record is available/active in the registry; it does not prove a physical signal is green or controlled by an ambulance.
- The `/ambulances` page still uses fixed simulation rows and lane IDs for the Proteus/Arduino demonstration. Do not silently replace those simulation lanes with mission or database data: a general vehicle mission does not necessarily have a physical lane assignment.
- At the latest local demo-data check, MongoDB contained eleven signal records (the pre-existing record plus `MSR-DEMO-02` through `MSR-DEMO-11`) and ten missions `AMB-SIH-001` through `AMB-SIH-010`, all in `CREATED`. These are demo records in the configured database, not seeded by code or guaranteed to exist in another environment. Confirm before relying on them.
- Some metrics, route/analytics screens, emergency activation UI, and lane data remain simulated or hard-coded. The app is a demonstration/prototype, not a fully integrated emergency dispatch or certified traffic-control system.

## What the project is for

Smart Siren is a prototype emergency-response traffic-management system. Its intended users are emergency operators who need to verify an ambulance, declare an emergency, see the vehicle and surrounding traffic infrastructure, and request a route or signal/lane change to reduce delays.

The project aims to address delays caused by congested roads and intersections. The intended product combines:

- A browser dashboard for vehicle registration, ambulance/emergency views, signal management, routes, notifications, and analytics.
- An Express API with MongoDB persistence for vehicle, ambulance, lane, and signal records.
- An optional serial link from the API to an Arduino or simulator to request a lane signal change.
- An optional, backend-managed SUMO corridor simulation started by activating a mission on the Missions page.

This is a prototype, not a production traffic-control system. The checked-in code contains no AI model, machine-learning pipeline, live traffic feed, or complete real-road route-optimization engine. The SUMO corridor is synthetic, runs only when a valid mission is activated, and does not provide real GPS, TomTom observations, or physical signal control. Several dashboard panels still use sample values; do not treat screen labels such as “AI Route Efficiency” or displayed analytics as measured system output.

## Architecture and data flow

### Applications

- `vvce/` is the React 18/Vite single-page dashboard. `vvce/src/main.jsx` mounts the app, `vvce/src/App.jsx` defines routes/providers, and `vvce/src/pages/` contains the main screens.
- `crud/` is the Node.js/Express/Mongoose backend. The `npm start` script runs `crud/index.js`, which connects to MongoDB and mounts API routes. `crud/server.js` is a different, standalone serial-dispatch server.
- `crud/model/` contains Mongoose schemas; `crud/routes/` defines HTTP endpoints; `crud/controller/` contains some route handlers. Some routes implement handlers inline instead of using a controller.
- `sim/` contains the synthetic SUMO scenario generator, traffic-aware demo routing, conflict helpers, headless TraCI publisher, and SUMO-independent tests. The backend starts it as a managed child process; frontend code never launches a local simulator.
- `crud/arduino_server/arduino-server.js` creates the serial dispatch router used by `crud/index.js`. It is not the same server as `crud/server.js`.
- The frontend Vite development server proxies `/api` requests to `http://localhost:8000`. A Google Maps browser key is read from `VITE_GOOGLE_MAPS_API_KEY`.

### Main API currently mounted by `crud/index.js`

| Prefix | Route module | What the mounted module currently exposes |
|---|---|---|
| `/api/user` | `crud/routes/userRoute.js` | Placeholder user responses; not connected to the CRUD handlers in `userController.js`. |
| `/api/traffic-signals` | `crud/routes/trafficSignalRoute.js` | Register, list, and update signal status. |
| `/api/vehicles` | `crud/routes/vehicleRoute.js` | Vehicle registration and CRUD endpoints. |
| `/api/ambulance` | `crud/routes/ambulanceRoute.js` | Ambulance activation, active ambulances, lane status/dispatch, and mission completion endpoints. |
| `/api/verify` | `crud/routes/verifyroute.js` | Vehicle/engine and ambulance-ID verification endpoints. |
| `/api/missions` | `crud/routes/missionRoute.js` | MongoDB-backed mission creation/list/detail/deletion, lifecycle actions, and position updates. |
| `/api/simulations` | `crud/routes/simulationRoute.js` | Returns synthetic network configuration and persisted run state. Runs start only through mission activation; there is no separate simulation start endpoint. |
| `/api/dispatch` | `crud/arduino_server/arduino-server.js` | Validates lane and ambulance type, then writes a serial command. |
| `/health` | inline in `crud/index.js` | Basic server health response. |

`crud/routes/trigger-route.js` and `crud/routes/ambulanceRoutes.js` exist but are not mounted by `crud/index.js`. They should not be assumed to provide live endpoints.

### Intended emergency workflow

1. Register an ambulance/vehicle and persist its identifying details.
2. Verify the emergency request against the registered vehicle.
3. Mark the ambulance active and associate it with an emergency.
4. Select a route or lane and optionally request a signal change.
5. Show the ambulance, route, signal status, and mission lifecycle to the operator.
6. When the mission ends, mark it complete and release the assigned lane.

For the SUMO demo specifically, the Missions-page Activate action validates the existing registered `Vehicle.vehicleId` and explicit synthetic origin/destination settings, then calls the existing `POST /api/missions/:id/activate` endpoint. The backend starts at most one run for that mission and returns `{ data: mission, simulation: run }` only after the runner reports `RUNNING`; failed preflight/startup does not activate the mission. The simulation UI is opened only after this response. The code only implements parts of the broader real-world dispatch path and has contract/schema gaps described below.

## Important implementation facts for future AI changes

These are observed implementation details and should guide future work:

- **Backend entry points are easy to confuse.** `crud/package.json` defines `npm start` as `nodemon index.js`. `index.js` is the MongoDB API server; `server.js` is a standalone serial-only server. Both default to port `8000`, so they cannot normally run together.
- **SUMO is an optional prerequisite for mission activation.** The backend uses `SUMO_HOME` or explicit `SUMO_BINARY`/`NETCONVERT_BINARY`, plus `SIMULATION_PYTHON` and optional `SIMULATION_STARTUP_TIMEOUT_MS`. If prerequisites are missing or the run does not start, the API reports an error and does not return success. Windows setup is in `sim/README.md`.
- **Simulation records are synthetic.** The `DEMO` source uses local SUMO coordinates and generated traffic/restrictions. It rejects unsupported live mode; do not represent this as live traffic, GPS, real-road mapping, or physical signal control.
- **Simulation contract and events.** `GET /api/simulations/config` returns demo options; `GET /api/simulations/:missionId` reads run state. REST activation uses the mission ID and configured demo origin/destination edges. `simulation:update` is an outbound Socket.IO update, not an inbound telemetry feed. Existing real GPS positions remain a separate mission API path.
- **The ambulance page is intentionally simulation-driven.** `vvce/src/pages/AmbulancesPage.jsx` creates fixed ambulance/lane rows locally, then sends a dispatch request directly to `/api/dispatch`. It does not show MongoDB missions or registered vehicles. Keep the simulation behavior intact unless the user explicitly asks to integrate it.
- **The dashboard emergency list is mission-driven, not lane-driven.** `vvce/src/components/dashboard/ActiveAmbulances.jsx` reads `/api/missions` and lists missions in `CREATED` or `ACTIVE` state. Clicking a row fetches full mission details when needed. It does not infer a lane assignment from the vehicle ID.
- **Vehicle registration and emergency verification do not share one complete data contract.** The registration controller saves driver name and vehicle number through `model/Vehicle.js`. Verification and ambulance activation code also expects fields such as `engineNumber` and `ambulanceId`, which that registration model does not define.
- **Lane schemas and lane endpoints disagree.** `model/LaneStatus.js` stores `status` and nested `emergency`/`signals` data. `ambulanceRoute.js` also reads/writes `isOccupied`, `occupiedBy`, and `occupiedAt`, which are not declared in that schema.
- **Lane initialization appears incomplete.** `index.js` checks for `LaneStatus.initializeLanes` before calling it, but the current `LaneStatus.js` file does not define that helper. The mounted ambulance route also calls it from `/init-lanes`.
- **Signal registry status is not hardware state.** The registration form sends signal metadata and initial status to the API. The MongoDB model stores `city`, `area`, `intersection`, `location`, signal type/capabilities, and status. The dashboard and signal page render stored records, but this registry API does not control hardware.
- **The trigger form is a simulation.** `TriggeredEmergency.jsx` locally checks that two strings have a minimum length, waits, creates a random ambulance ID, and navigates; it does not call the verification or activation API.
- **Route and analytics screens are illustrative.** Route cards, route history, map coordinates, KPI values, and chart series are hard-coded. The dashboard signal list and signal page load registered records, but those records do not represent live hardware state. The route creation screen navigates after a timer rather than asking a backend route planner.
- **Verification endpoint naming overlaps.** There is a mounted `/api/verify/verify-engine-vehicle` handler in `verifyroute.js` and a separate, unmounted trigger router with a similar route. Check the actual mounted module before changing a frontend request.
- **User handling is incomplete.** The mounted user routes return dummy messages; `userController.js` is not wired into them. Authentication/session handling is not implemented in the visible application flow.
- **UI layouts have legacy/duplicate pieces.** The app currently routes through `src/components/Layouts/AppLayout.jsx`. The top-level `vvce/AppLayout.jsx` is a separate older layout and is not imported by the active router.
- **Hardware commands affect physical or simulated equipment.** Keep lane/type validation, explicit hardware-disconnected errors, safe defaults, and operator confirmation in mind. Do not infer that a successful web request proves the real traffic signal changed.
- **Local configuration is intentionally not documented by value.** `.env.local`, `.env`, API keys, and machine-specific serial-port settings must remain private and must not be copied into an AI prompt or committed.

For a feature change, trace the whole vertical path: React screen and state → request URL/body → Vite proxy → mounted Express prefix and route → controller/inline handler → Mongoose model → response shape → UI rendering. Preserve or deliberately migrate every side of that contract.

## How to start the project

From the repository root, use separate terminals:

```powershell
cd crud
npm install
npm start
```

```powershell
cd vvce
npm install
npm run dev
```

The API requires MongoDB, using `MONGO_URI` if configured or `mongodb://localhost:27017/crud` by default. Set `PORT` to change the API port. The Arduino router reads `ARDUINO_PORT` and defaults to `COM15` on Windows. Map components show a configuration message if `VITE_GOOGLE_MAPS_API_KEY` is not set in the frontend's local environment.

To run the alternate serial-only server instead of the MongoDB API, run `node server.js` in `crud/`. Do not run that server and `npm start` at the same time because both use port `8000` by default. To use the synthetic SUMO flow, install SUMO and TraCI and follow `sim/README.md`; without SUMO, activation fails explicitly and the mission remains unactivated.

## File-by-file guide

This guide covers the application files in the repository root, `crud/`, `vvce/`, and `sim/`. Installed dependencies (`node_modules`), build output (`dist`), and ignored local environment files are excluded because they are generated, machine-specific, or may contain credentials.

Each entry gives the file's purpose and its relationship or limitations. “Runtime” means it participates in the app; “support” means it supplies a feature or shared code; “development” means it helps local development; “legacy/mock” means it is not the active source of production behavior or contains illustrative data.

## Repository root

### `.gitignore`

- Excludes `node_modules`, `.env` files, and `.env.*` files from Git, while allowing `.env.example`.
- Helps keep local credentials and dependencies out of commits.
- Does not itself configure runtime behavior.

### `sim/` — synthetic SUMO simulation

The simulation is an optional backend-managed demo. Its coordinates, traffic, closure, signal/telemetry absence, and limitations are labeled synthetic; the scenario is not mapped to real roads.

#### `sim/README.md`

- Documents Windows SUMO/TraCI setup, backend activation workflow, environment variable names, REST/Socket.IO payloads, and demo/live limitations.
- Treats the backend-managed headless runner as the normal UI flow; the browser never launches SUMO.

#### `sim/requirements.txt`

- Pins TraCI and sumolib to the installed SUMO release (1.28.0).
- Install with the same Python executable configured by the backend's `SIMULATION_PYTHON`.

#### `sim/config/manual_values.json`

- Source configuration for the synthetic corridor, local coordinates, routes, background traffic, and a demo closure.
- Defines the synthetic origin/destination edge choices offered when creating a simulation-capable mission.

#### `sim/build_scenario.py`

- Generates SUMO node, edge, route, network, and configuration files from `manual_values.json`.
- Generated artifacts are kept under the ignored `sim/scenarios/generated/` directory; requires SUMO's `netconvert`.

#### `sim/routing.py`

- Provides a SUMO-independent traffic-weighted route planner for the demo graph.
- Rejects unknown endpoints, avoids blocked edges, and checks that a route reaches the fixed destination.

#### `sim/conflicts.py`

- Provides deterministic severity/ETA priority selection and conflict-node hold/release predicates.
- Does not control physical signals.

#### `sim/publisher.py`

- Runs the generated scenario through headless TraCI as a child process managed by the backend.
- Receives a validated mission run over stdin and emits line-delimited JSON lifecycle/telemetry updates; it does not fetch TomTom or GPS data.

#### `sim/tests/test_routing.py`

- Tests demo route restriction avoidance, destination preservation, invalid endpoints, and conflict priority/hold/release without requiring SUMO binaries.

### `README.md`

- Introduces Smart Siren and gives setup instructions and a high-level inventory.
- Documents running the frontend/backend and configuring Google Maps and the synthetic SUMO demo.
- Read this guide alongside it for deeper source-by-source behavior; source and package scripts are authoritative if they differ.

### `PROJECT_GUIDE.md`

- This file: explains project purpose, architecture, runtime routes, known implementation gaps, and the application files in root, `crud/`, `vvce/`, and `sim/`.
- Intended to be uploaded as context when asking another AI for help.
- Treat the source code as authoritative if this document and code diverge.

## Backend: `crud/`

### Backend root files

#### `crud/README.md`

- Provides a short backend overview, a categorized file table, and backend setup notes.
- Is useful for backend orientation but less comprehensive than this guide.
- Identifies `index.js` as the MongoDB API entry point and `server.js` as the separate serial-only server; confirm runtime details against `crud/package.json` and source files.

#### `crud/.env.example`

- Lists local backend configuration names and the verified Windows SUMO/Python paths without credentials.
- Copy or merge values into the ignored `crud/.env`; never replace existing private values with this template.

#### `crud/activeambulances.json`

- Contains four example lane records with `id`, `location`, and `status` values.
- Represents sample data only; the inspected server code uses MongoDB and does not load this file as its live database.
- Its schema is simpler than the Mongoose lane schema.

#### `crud/check-routes-conflicts.js`

- Reads a hard-coded list of route modules as text.
- Uses a regular expression to report duplicate method/path declarations.
- Is a lightweight diagnostic only: it does not evaluate Express mount prefixes or reliably parse every JavaScript route form.

#### `crud/debug-routes.js`

- Dynamically imports selected route modules and attempts to mount them on a temporary Express app.
- Logs import/mount failures to help diagnose malformed routes.
- Is not started by the API package script and does not send actual HTTP requests.

#### `crud/index.js`

- Main backend entry point launched by `npm start` (`nodemon index.js`).
- Creates the Express app, configures CORS/body parsing/request logging, and mounts the API route modules.
- Connects to MongoDB using `MONGO_URI` or the local `crud` database default, then starts listening on `PORT` or `8000`.
- Mounts the Arduino router under `/api/dispatch`, the mission router under `/api/missions`, the simulation router under `/api/simulations`, and provides `/health`.
- Attaches the Socket.IO server to the same HTTP server and starts the mission watchdog after MongoDB connects.
- Starts the simulation manager after the database connection and asks active child simulations to stop during server shutdown.
- Attempts to call `LaneStatus.initializeLanes` only if that method exists; the current model file does not define it.
- Registers a global Express error middleware for requests that reach it through `next(error)`.

#### `crud/package.json`

- Declares the backend as an ES module package and lists backend dependencies such as Express, Mongoose, dotenv, serialport, and nodemon.
- Defines `npm start` as `nodemon index.js`; this is the MongoDB API entry point.
- `main: index.js` also identifies the API entry point for package metadata.
- Metadata still contains references to a separate CRUD repository; it does not define the Smart Siren product behavior.

#### `crud/package-lock.json`

- Records exact resolved backend package versions and dependency relationships.
- Allows repeatable `npm install` results and should be updated by npm when `package.json` dependencies change.
- Is generated dependency metadata, not application logic.

#### `crud/server.js`

- Starts an alternate, standalone Express endpoint at port `8000`.
- Opens a serial port hard-coded as `COM15` and accepts `POST /api/dispatch`.
- Converts the supplied lane into a `LANE:GREEN` newline-terminated serial string and returns success/failure.
- Does not connect to MongoDB or mount the main API routes.
- Unlike the router in `arduino_server/arduino-server.js`, this server's input validation is limited to checking that `lane` and `type` are present.
- Conflicts on the default port with `index.js`; it is not the server invoked by `npm start`.

#### `crud/test-ports.js`

- Uses the SerialPort library to list serial devices visible to the current machine.
- Prints each port path and manufacturer when available.
- Is a local hardware-diagnostics utility, not an API route or app startup file.

### `crud/arduino_server/`

#### `crud/arduino_server/arduino-server.js`

- Exports `createArduinoRouter()`, which creates the router mounted by `crud/index.js` at `/api/dispatch`.
- Reads the port from `ARDUINO_PORT` (Windows default `COM15`) and opens it at 9600 baud.
- Accepts `POST /` relative to the mounted router; requires lane `L1`–`L4` and type `AMBULANCE`.
- Returns an explicit unavailable response if the serial port is not open, or an error if writing fails.
- Writes a newline-terminated command such as `L2:GREEN` to the serial device.
- This is a hardware integration boundary; a successful write only confirms that bytes were accepted by the serial library, not that an intersection physically changed state.

### `crud/config/`

#### `crud/config/constants.js`

- Defines mission lifecycle statuses (`CREATED`, `ACTIVE`, `ARRIVED`, `CLOSED`, `ABORTED`), permitted socket event names including `simulation:update`, maximum retained GPS positions, and severity bounds/default.
- Serves as the shared source of mission and realtime constants for backend services.

#### `crud/config/index.js`

- Loads backend environment configuration from `crud/.env` and exports the normalized port, MongoDB URI, CORS origins, watchdog intervals, legacy migration path, and SUMO/Python executable and startup-timeout settings.
- Supplies local defaults for development; actual environment values and credentials must remain private.

### `crud/controller/`

#### `crud/controller/ambulanceController.js`

- Uses `model/ambulanceModel.js`, a separate ambulance schema with an `active` boolean.
- `getActiveAmbulances` queries records where `active` is true.
- `activateAmbulance` marks a MongoDB record active by document ID.
- This controller is not imported by the mounted `ambulanceRoute.js` seen in the current API path, so do not assume these handlers back the active endpoints.

#### `crud/controller/trafficSignalController.js`

- Uses `model/trafficSignalModel.js` to create, count, list, and update traffic signal documents.
- Also exports alternate list/get/delete/status functions and a placeholder `controlTrafficSignal` handler.
- The mounted `trafficSignalRoute.js` currently imports only registration, list, and update functions.
- Registration validates `signalId`, `city`, `area`, `intersection`, optional type/capability flags, and status; it composes a display `location` string before saving.
- The list handler returns the saved signal documents as an array. The list/update paths do not send commands to the Arduino.

#### `crud/controller/trigger-control.js`

- Uses `model/trigger-model.js` to find an ambulance by engine and vehicle numbers.
- Provides verification, status activation, and listing of `active`/`emergency` ambulance records.
- Is referenced by `routes/trigger-route.js`, which is not mounted by `crud/index.js`.
- Should not be treated as the implementation of the mounted `/api/verify` path.

#### `crud/controller/userController.js`

- Attempts to provide user create, list, update, and delete handlers using `model/usermodel.js`.
- Is not connected to the mounted `routes/userRoute.js`, which uses dummy handlers.
- The `getVehicleCount` handler refers to `Vehicle` without importing it.
- The create handler also has duplicate `email` declarations in the same scope as currently written, so this module requires correction before wiring it into the runtime.
- The user model stores a password field, but this controller does not implement password hashing or authentication.

#### `crud/controller/vehicleController.js`

- Uses `model/Vehicle.js` for vehicle registration and CRUD operations.
- Registration currently requires only driver name and vehicle number, checks duplicates, and returns a registration-safe field set.
- Listing supports page/limit pagination; lookup accepts Mongo ID, generated vehicle ID, or vehicle number.
- Update and delete find by Mongo ID or generated vehicle ID.
- Its status expectations and fields differ from the separate verification/ambulance flow, which expects fields such as engine number and ambulance ID.

#### `crud/controller/verifycontroller.js`

- Uses `model/verifymodel.js` to compare submitted engine and vehicle numbers.
- Returns a boolean `valid` field and basic error responses.
- It is not imported by the currently mounted `verifyroute.js`, which implements its own verification logic using `model/Vehicle.js`.

#### `crud/controller/missionController.js`

- Thin HTTP adapter for mission service functions: create, list, get one, delete, activate, add position, mark arrived, close, and abort.
- Uses `asyncHandler` so rejected service promises flow into the mission router's error handler.
- Mission activation delegates to the simulation manager; its successful response includes the persisted mission and run. Activation errors do not claim success.
- Wraps other successful responses in `{ data }` and returns a small ID/message payload for deletion.

### `crud/model/`

#### `crud/model/ActiveAmbulance.js`

- Defines a MongoDB record for an emergency-active ambulance, including ambulance/engine/vehicle IDs, lifecycle status, assigned lane, location, and activation/dispatch/completion timestamps.
- Status values are `emergency`, `dispatched`, and `completed`.
- Is used by the mounted `ambulanceRoute.js` for emergency lifecycle operations.

#### `crud/model/LaneStatus.js`

- Defines lane ID, lane status, geographic location, traffic density, nested emergency details, signal timing/override data, last updater, and notes.
- Adds indexes and a pre-save hook that updates `lastUpdated`.
- Defines instance methods to activate/deactivate an emergency and static methods to query active emergencies or nearby lanes.
- Does not currently define `initializeLanes`.
- Does not define `isOccupied`, `occupiedBy`, or `occupiedAt`, even though the mounted ambulance routes access these properties.

#### `crud/model/Mission.js`

- Defines a persisted emergency trip document in MongoDB's `missions` collection.
- Stores `vehicleId`, lifecycle status, ordered route stops, capped GPS position history, severity, optional ETA percentiles, lifecycle timestamps, watchdog timestamp, abort reason, optional migration idempotency key, and explicit simulation mode/origin/destination settings.
- Adds indexes for status, vehicle ID, and unique sparse legacy migration key.
- Is the source of truth for `/api/missions` and for the dashboard's emergency-vehicle mission list; it is separate from the `Vehicle` and `ActiveAmbulance` models. `Vehicle.vehicleId` is the canonical registration identity validated for simulation activation.

#### `crud/model/SimulationRun.js`

- Persists the unique run for a mission, lifecycle status, run ID, source/mode, sequence-ordered local telemetry, route/destination, demo traffic/restrictions, conflict state, and timestamps.
- A unique mission index and monotonically increasing update sequence prevent concurrent duplicate runs and stale/out-of-order updates from replacing newer state.
- Coordinates are SUMO-local demo positions, not GPS coordinates.

#### `crud/model/Vehicle.js`

- Defines the vehicle-registration schema used by `vehicleController.js` and `verifyroute.js`.
- Generates a `VEH-...` ID and validates/normalizes driver name and vehicle number.
- Defines vehicle status as `active`, `inactive`, or `suspended`, plus registration timestamps and lookup/serialization helpers.
- Does not define `engineNumber` or `ambulanceId`, although verification and ambulance-activation handlers query those fields.

#### `crud/model/ambulanceModel.js`

- Defines a separate, minimal ambulance model with a unique identifier, active boolean, location, and update time.
- Is used by `ambulanceController.js`.
- Represents an alternate data model, not the richer `ActiveAmbulance` lifecycle model.

#### `crud/model/trafficSignalModel.js`

- Defines a traffic-signal document with required `signalId`, city, area, intersection, and display location, plus signal type, camera/pedestrian capability flags, and status.
- Is the schema imported by the traffic-signal controller.
- `status` is a registry value from `TRAFFIC_SIGNAL_STATUSES`; it is not proof of a physical light color or hardware connectivity.

#### `crud/model/trigger-model.js`

- Defines an ambulance record keyed by unique engine and vehicle numbers.
- Stores idle/active/emergency status, location, destination, ETA, and a count of optimized signals.
- Is used by `trigger-control.js`, through the unmounted trigger routes.

#### `crud/model/usermodel.js`

- Defines a User document with required name, unique email, password, and creation date.
- Does not itself hash or protect the password; secure authentication is outside the current model.
- Is used by `userController.js`, which the active user route does not call.

#### `crud/model/vehicleModel.js`

- Defines an alternate ambulance/vehicle data shape with ambulance ID, unique ID, driver, vehicle number, status, destination, ETA, and optimized signal count.
- Uses `active`, `idle`, and `emergency` statuses.
- Is not the same schema as `model/Vehicle.js`; check all imports before choosing a model for a feature.

#### `crud/model/verifymodel.js`

- Defines a verification-oriented vehicle record with ambulance ID, driver name, vehicle number, engine number, status, and registration date.
- Validates engine numbers as seven digits and normalizes vehicle numbers.
- Is used by `verifycontroller.js`, not by the mounted `verifyroute.js`.

### `crud/routes/`

#### `crud/routes/ambulanceRoute.js`

- This is the ambulance route module mounted at `/api/ambulance` by `crud/index.js`.
- Implements lane initialization, active ambulance listing, activation after engine/vehicle lookup, available/status lane views, lane dispatch, mission completion, and cleanup of completed records.
- Activation writes an `ActiveAmbulance` and changes the matched vehicle status.
- Dispatch writes ambulance assignment and lane occupancy; completion clears the lane and resets vehicle status.
- Uses `initializeLanes`, `isOccupied`, `occupiedBy`, and `occupiedAt` fields that are missing from the current `LaneStatus` model.
- Also expects vehicle fields such as engine number and ambulance ID absent from `model/Vehicle.js`, so the intended lifecycle is not consistent end to end yet.

#### `crud/routes/ambulanceRoutes.js`

- Defines an alternate ambulance route set directly against `ActiveAmbulance`.
- Includes a simple request-ID pattern check, record creation, and active record listing.
- Is not mounted by `crud/index.js`; it is separate from the live `/api/ambulance` module.

#### `crud/routes/trafficSignalRoute.js`

- Defines the route module mounted at `/api/traffic-signals`.
- `POST /register` creates a signal; `GET /` lists signals; `PUT /status` updates status.
- Imports other controller handlers that are currently unused by the route file.
- Its endpoint behavior is narrower than the UI labels imply; there is no hardware signal-control operation here.

#### `crud/routes/missionRoute.js`

- Defines the MongoDB-backed mission API mounted at `/api/missions`.
- `POST /` creates; `GET /` lists with status/pagination validation; `GET /:id` reads a mission; `DELETE /:id` deletes it.
- `POST /:id/activate`, `/position`, `/arrive`, `/close`, and `/abort` perform lifecycle or telemetry actions. Activation requires a valid registered vehicle and explicit supported demo endpoints, preflights SUMO, and returns both mission and run after startup.
- Validates Mongo ObjectId route parameters and request fields; maps service errors to HTTP status codes and JSON responses.

#### `crud/routes/simulationRoute.js`

- Is mounted at `/api/simulations`.
- `GET /config` returns the explicitly synthetic network and available demo origin/destination choices.
- `GET /:missionId` returns the persisted run for that mission; there are no separate start or cancel routes because run creation/cancellation follow the existing mission activation/abort lifecycle.
- Returns errors for missing run records instead of generating pretend live state.

#### `crud/routes/trigger-route.js`

- Maps engine/vehicle verification and ambulance activation/listing to `trigger-control.js`.
- Would expose its paths under whatever prefix a server mounts it with.
- Is not mounted by `crud/index.js`, so these endpoints are currently dormant.

#### `crud/routes/userRoute.js`

- Defines create/list/update/delete-style user paths.
- Uses inline dummy handlers that return messages such as “create works” rather than calling `userController.js`.
- Is mounted at `/api/user`; current responses do not read or write user records.

#### `crud/routes/vehicleRoute.js`

- Defines vehicle registration, list, lookup, update, delete, and service health-check endpoints.
- Logs requests and delegates CRUD operations to `vehicleController.js`.
- Is mounted at `/api/vehicles`.

#### `crud/routes/verifyroute.js`

- Is mounted at `/api/verify`.
- `POST /verify-engine-vehicle` checks required inputs, requires a seven-digit engine number, looks up the pair in `model/Vehicle.js`, and returns a verification result plus selected vehicle details.
- `POST /ambulance-id` checks that an ambulance ID exists and returns selected fields.
- The engine/vehicle verification expects schema fields and `available` status that `model/Vehicle.js` does not define.

### `crud/utils/`

#### `crud/utils/asyncHandler.js`

- Exports a wrapper that invokes an async Express handler and forwards rejected promises to `next`.
- Can reduce repeated `try/catch` forwarding in routes that adopt it.
- The current route files mostly implement their own error handling and do not consistently use this helper.

### Mission backend support files

#### `crud/middleware/validate.js`

- Provides hand-written validators for mission ObjectId parameters, creation payloads, position telemetry, list query filters, and abort reasons.
- Rejects invalid input with HTTP 400 before the controller calls the service.

#### `crud/services/mission/errors.js`

- Defines `AppError`, an error carrying an HTTP status and optional detail information for mission service failures.

#### `crud/services/mission/missionStateMachine.js`

- Defines the legal mission transitions without database or network I/O: `CREATED → ACTIVE → ARRIVED → CLOSED`; `ABORTED` is reachable from `CREATED` or `ACTIVE`.
- Exposes helpers used to check or apply transitions and assign matching timestamps.

#### `crud/services/mission/missionService.js`

- Owns mission persistence and business behavior: creation, filtered listing, detail lookup, deletion, lifecycle transitions, and GPS position updates.
- Uses MongoDB conditional updates for lifecycle transitions to prevent concurrent requests from applying an illegal transition.
- Retains at most 500 positions per mission and emits `mission:update` events after successful changes.

#### `crud/services/simulation/simulationContract.js`

- Validates mission status, registered canonical `Vehicle.vehicleId`, explicit `DEMO` mode, and known synthetic network endpoints.
- Rejects unsupported live mode or missing configuration; it does not infer a destination or present sample coordinates as production data.

#### `crud/services/simulation/simulationManager.js`

- Preflights SUMO and the generated network before activating a mission, then ensures at most one run per mission.
- Owns the Python/TraCI child lifecycle, persists sequence-ordered run updates, emits `simulation:update`, and requests shutdown/cancellation cleanup.
- A successful activation response means the run reported `RUNNING`; absent SUMO or failed startup returns an error rather than a success-shaped response.

#### `crud/jobs/missionWatchdog.js`

- Periodically queries MongoDB for `ACTIVE` missions that have not sent a position within the configured timeout.
- Aborts stale missions with reason `WATCHDOG_TIMEOUT` and emits an internal watchdog event; timer failures are logged.

#### `crud/realtime/eventBus.js`

- Exports the process-wide Node EventEmitter shared by mission services and Socket.IO.

#### `crud/realtime/socketServer.js`

- Attaches Socket.IO to the HTTP server and forwards configured mission, signal, preemption, metrics, and `simulation:update` events from the event bus to connected clients.
- REST API operation remains available if Socket.IO cannot be loaded.

#### `crud/scripts/migrateActiveAmbulances.js`

- One-time migration utility for converting entries in `activeambulances.json` into Mission records.
- Defaults legacy records to `CLOSED`, supports an explicit `CLOSED` or `ACTIVE` target, and uses a hash-based `legacyKey` so repeated runs do not duplicate records.
- Never deletes or mutates the source JSON file.

#### `crud/tests/unit/`

- `missionService.test.js` tests mission persistence, lifecycle transitions, concurrency, position caps, errors, and event emission against an in-memory MongoDB.
- `missionStateMachine.test.js` tests legal and illegal lifecycle transitions.
- `missionWatchdog.test.js` tests stale-mission abort behavior and watchdog start/stop.
- `simulationContract.test.js` tests canonical vehicle, mission, and explicit demo-contract validation.
- `simulationRun.test.js` tests the simulation-run schema and its per-mission uniqueness/update fields.
- `trafficSignalController.test.js` tests traffic signal API registration and data validation.
- `validate.test.js` tests mission request validation.
- Run the backend suite with `cd crud; npm test`.

## Frontend: `vvce/`

### Frontend root/configuration

#### `vvce/.env.example`

- Shows the expected `VITE_GOOGLE_MAPS_API_KEY` variable using a placeholder value.
- Documents the name, not a usable credential.
- Copy to a local environment file and supply a restricted key privately; do not commit real keys.

#### `vvce/AGENTS.md`

- Gives coding agents instructions for frontend changes: read the theme guide, use existing tokens/primitives, preserve active routes, and distinguish simulated behavior from real integrations.

#### `vvce/FRONTEND_THEME.md`

- Documents Smart Siren's visual theme, design tokens, component conventions, and responsive expectations for future UI work.
- Use it as frontend design guidance, while treating the implementation as the source of truth when the guide and current code differ.

#### `vvce/.gitignore`

- Ignores `node_modules`, build output, local `.env` files, logs, and common editor/OS files.
- Explicitly allows `.env.example` to remain tracked.
- Protects machine-specific configuration from accidental commits.

#### `vvce/AppLayout.jsx`

- Defines an older layout shell that combines a sidebar, a routed `<Outlet>`, and a footer.
- Imports `../ui/Sidebar`, which does not match the active source tree's layout/sidebar paths.
- Is not referenced by `src/App.jsx`; treat it as legacy, not the active layout.

#### `vvce/README.md`

- Contains the original React/Vite starter instructions and template explanation.
- Does not explain the Smart Siren feature behavior.
- Use this guide and the root README for application context.

#### `vvce/eslint.config.js`

- Configures ESLint for JavaScript/JSX modules and browser globals.
- Enables recommended JavaScript and React Hooks rules and a React Refresh export rule.
- Ignores `dist`; used by `npm run lint`.

#### `vvce/index.html`

- Provides the HTML document and `#root` mount point for the single-page app.
- Loads the app entry module at `/src/main.jsx` and links the app CSS files.
- Also includes a third-party GPT Engineer script; be aware of this external script if evaluating application dependencies or deployment policy.

#### `vvce/package.json`

- Declares the React/Vite frontend and its scripts: development server, production/development builds, lint, and preview.
- Lists React, router, map, chart, toast, form, styling, and Radix UI dependencies.
- Includes some packages not necessarily used by current screens; inspect imports before removing dependencies.

#### `vvce/package-lock.json`

- Stores exact resolved frontend package versions and dependency relationships for reproducible installs.
- Should be changed through npm when dependency manifests change.
- Is generated dependency metadata, not UI or business logic.

#### `vvce/postcss.config.js`

- Registers Tailwind CSS and Autoprefixer as PostCSS plugins.
- Is used during CSS processing by the frontend toolchain.

#### `vvce/tailwind.config.js`

- Configures class-based dark mode and the source files Tailwind scans for class names.
- Defines theme colors from CSS custom properties, Smart Siren emergency/signal colors, radii, and animations.
- Loads the `tailwindcss-animate` plugin.
- Changes here affect shared styling tokens and utility generation across the dashboard.

#### `vvce/vite.config.js`

- Configures Vite's `@` alias to point to `src/`.
- Configures Tailwind and Autoprefixer processing.
- Proxies development `/api` requests to `http://localhost:8000`.
- The proxy is for Vite's dev server; production deployment needs its own API routing configuration.

### Frontend source entry and app shell

#### `vvce/src/main.jsx`

- Creates the React root from the `#root` element and renders `App`.
- Imports global CSS.
- Is the browser entry point referenced by `index.html`.

#### `vvce/src/App.jsx`

- Creates the React Query client and wraps the app with query, tooltip, toaster, sidebar-state, and router providers.
- Defines routes for dashboard, ambulance management, registration, notifications, signal management, emergency trigger, route/map view, analytics, settings, and `/simulation/:missionId`.
- Wraps app pages in `src/components/Layouts/AppLayout.jsx`; unknown paths use `NotFound`.
- Includes both a standard toaster and Sonner toaster.
- The route set is the source of truth for which pages are reachable; components not routed here may be unused.

#### `vvce/src/App.css`

- Contains Vite/React starter styles for the root container, logos, cards, and demo text.
- Is linked from `index.html`, so its generic `#root` layout rules can affect dashboard width/alignment.
- Is not the main Smart Siren design system; the main tokens and shared styles are in `src/index.css`.

#### `vvce/src/index.css`

- Imports Leaflet CSS and Tailwind base/components/utilities.
- Defines CSS variables for light/dark colors, cards, borders, sidebar, and shared design tokens.
- Applies global sizing and colors and defines reusable signal-status/map styles.
- Used by both the app entry and `App.jsx`; adjust carefully because it affects all screens.

#### `vvce/src/assets/react.svg`

- React logo asset inherited from the Vite starter.
- It is not used as a Smart Siren business asset in the inspected app flow.

### Frontend shared components

#### `vvce/src/components/Footer.jsx`

- Renders a site footer with project description, quick links, team attribution, and icons.
- Links include `/active-routes`, `/signal-control`, and `/map-view`, which do not match the routes currently declared in `App.jsx`.
- Is not included in the active `src/components/Layouts/AppLayout.jsx`; the older root `AppLayout.jsx` imports it.

### `vvce/src/components/Layouts/`

#### `vvce/src/components/Layouts/AppLayout.jsx`

- Active page shell used by the router in `App.jsx`.
- Combines the sidebar, navbar, and nested route outlet in a responsive layout.
- Wraps children in a sidebar provider and provides the shared page frame for normal routes.

#### `vvce/src/components/Layouts/Navbar.jsx`

- Renders the dashboard top bar with mobile sidebar toggle, a visual search input, and notification navigation.
- Search is currently not wired to application data.
- Uses a `useSidebar` import from `components/ui/sidebar`; check that provider/context carefully if changing sidebar behavior.

#### `vvce/src/components/Layouts/Sidebar.jsx`

- Defines the primary navigation links for dashboard, ambulances, signals, routes, analytics, and settings.
- Includes a separate “Trigger Emergency” action and mobile backdrop/close behavior.
- Uses shared sidebar primitives and a sidebar state hook; route destinations should stay synchronized with `App.jsx`.

### `vvce/src/components/dashboard/`

#### `vvce/src/components/dashboard/ActiveAmbulances.jsx`

- Displays MongoDB-backed missions in `CREATED` or `ACTIVE` status in the dashboard's emergency-vehicle card.
- Loads the mission list through the shared mission API/store and subscribes to mission Socket.IO updates with polling fallback.
- Selecting a row fetches full mission details (including positions) when they are not already loaded and displays `MissionDetailPanel`.
- It does not retrieve the separate `ActiveAmbulance` records and does not infer a simulation lane from a mission vehicle ID.

#### `vvce/src/components/dashboard/DashboardStats.jsx`

- Renders four summary cards for active ambulances, response time, controlled signals, and route efficiency.
- The Active Ambulances card counts `ACTIVE` missions from the shared mission store.
- Response-time, controlled-signal, and route-efficiency figures remain hard-coded presentation values, not measured output.

#### `vvce/src/components/dashboard/Mapview.jsx`

- Renders the dashboard Google Map centered on a fixed coordinate.
- Reads `VITE_GOOGLE_MAPS_API_KEY`; without it, shows a setup hint.
- Does not currently load ambulance positions, signal markers, routes, or live data.

#### `vvce/src/components/dashboard/TrafficSignals.jsx`

- Fetches registered traffic signal documents from `GET /api/traffic-signals`, shows location, status, signal ID, type, and update/registration time, and refreshes periodically.
- Displays loading, empty, and error states; it never invents signal rows or issues hardware commands.
- Registry `active`/`green`/`yellow`/`red` values are the saved status fields, not confirmation of live signal-controller state.

### `vvce/src/components/domain/missions/`

#### `ConnectionIndicator.jsx`

- Renders the mission Socket.IO connection state (connected, disconnected, or polling fallback).

#### `LiveEventLog.jsx`

- Displays recent mission/realtime events supplied by the mission store, with filtering and a caller-provided clear action.

#### `MissionActions.jsx`

- Presents lifecycle actions for the selected mission and disables actions that violate the frontend transition table unless the explicit test bypass is enabled.
- Includes a confirmed delete action and the existing mission activation action; the parent navigates only after the backend confirms activation and run startup.

#### `MissionCreateForm.jsx`

- Collects a registered vehicle ID, severity, optional ordered route signal stops, and explicit synthetic demo origin/destination edges.
- These SUMO edge values are not real-road coordinates or live routing data.

#### `MissionDetailPanel.jsx`

- Displays the selected mission's status, ID, severity, ETAs, abort reason, route signals, GPS trail, and recent positions.

#### `MissionStatusBadge.jsx`

- Maps mission lifecycle statuses to visual badge styles.

#### `MissionTable.jsx`

- Displays the mission list, status filter, sort order, and selection interaction; data loading and API calls are managed by its parent/hooks.

#### `PositionSimulator.jsx`

- Provides a UI for manually adding simulated GPS positions to an active mission and triggering a test burst. It is a test/demo input, not a GPS feed.

#### `missionTransitions.js`

- Frontend copy of allowed mission lifecycle transitions used to enable or disable action buttons. Keep it aligned with `crud/services/mission/missionStateMachine.js`.

### `vvce/src/components/ui/` — feature components

#### `EmergencyRouteMap.jsx`

- Loads Google Maps and requests a driving route with Google Directions Service.
- Uses fixed origin and destination coordinates rather than route form inputs or URL query parameters.
- Shows a missing-key message when the Maps key is absent.
- Is the route map component referenced by the `/emergency-route` route.

#### `NotificationPage.jsx`

- Displays a static list of example notifications such as registration approval and maintenance reminder.
- Does not subscribe to a backend, push notification service, or live event stream.

#### `SignalsList.jsx`

- Accepts a `signals` array and `onSelect` callback as props.
- Displays each signal name/status and calls the callback when its Control button is pressed.
- Does not fetch signals or implement the control action itself.

#### `TrafficSignalControls.jsx`

- Accepts one `signal` and an `onChangeStatus` callback.
- Calls the callback with the signal and either `green` or `red` when clicked.
- Is a presentational control; caller must persist changes or communicate with hardware.

#### `TrafficSignalRegistrationForm.jsx`

- Presents a dialog form with signal ID, type, city, area, intersection, status, pedestrian-crossing, and camera fields.
- Performs basic required-field checks and posts the full form object to `/api/traffic-signals/register`.
- Posts signal ID, location parts, type, capability flags, and status to the backend registration controller, which validates and persists those fields and derives the display location.
- Shows toast feedback and resets/closes after a successful HTTP response.

#### `TriggeredEmergency.jsx`

- Collects engine and vehicle numbers, then gates activation behind a local verification state.
- Verification only checks that both values exist and have length of at least six; it does not call `/api/verify`.
- Activation waits for a timer, generates a random ID, shows success, clears the form, and navigates to ambulances; it does not persist activation.
- Keep the simulation clearly labeled until wired to real endpoints.

#### `VehicleRegistrationForm.jsx`

- Collects driver name and vehicle number and posts them to `/api/vehicles/register`.
- Displays client-side required-field checks, submitting state, and success/error feedback.
- The API registration controller accepts these two fields, but the emergency verification workflow expects additional ambulance/engine identity fields.
- Includes a visible debug block showing the endpoint and current form data; consider removing it before production use.

### `vvce/src/components/ui/` — reusable UI primitives

These files are shared presentation wrappers, mostly around Radix UI primitives. They provide consistent styling/accessibility building blocks; they do not contain Smart Siren domain logic unless noted.

#### `accordion.jsx`

- Exports accordion root, item, trigger, and content wrappers.
- Builds expandable/collapsible sections on Radix Accordion.
- Used when content needs to be shown or hidden in a compact panel.

#### `alert-dialog.jsx`

- Exports alert-dialog root, trigger, portal, overlay, content, title, description, action, and cancel wrappers.
- Provides modal confirmation flows for consequential actions.
- Does not make decisions or persist data; callers provide content and event handlers.

#### `alert.jsx`

- Exports styled alert container, title, and description components.
- Supports default/destructive visual variants.
- Used for inline status/error messages rather than toast notifications.

#### `aspect-ratio.jsx`

- Exposes a wrapper that keeps child content at a chosen aspect ratio.
- Built on Radix Aspect Ratio.
- Useful for stable map, image, and media layout sizing.

#### `avatar.jsx`

- Exports avatar, image, and fallback components.
- Shows a user/profile image when available and a fallback when it is not.
- Is a generic UI primitive; no profile data source is included.

#### `badge.jsx`

- Exports a styled badge and its variant definitions.
- Used to label statuses and categories compactly.
- Status semantics and colors are supplied by callers.

#### `breadcrumb.jsx`

- Exports breadcrumb list, item, link, page, separator, and ellipsis wrappers.
- Provides accessible hierarchical navigation display.
- Does not infer the current route automatically.

#### `button.jsx`

- Exports the common button component and button style variants.
- Standardizes sizes, visual variants, focus/disabled states, and Radix Slot composition.
- Used by feature pages and other primitives.

#### `calendar.jsx`

- Exports a calendar/date-picker view built on React Day Picker.
- Supplies shared navigation and day styling.
- Does not save selected dates or provide date-range business rules on its own.

#### `card.jsx`

- Exports card, header, title, description, content, and footer layout wrappers.
- Gives dashboard metrics, lists, and settings panels a consistent container.
- Pure presentation; content is supplied by each page.

#### `carousel.jsx`

- Exports carousel root, content, item, previous/next controls, and related wrappers.
- Integrates Embla Carousel for horizontal/slide navigation.
- Callers supply slide content and configuration.

#### `chart.jsx`

- Exports chart container/context helpers, tooltip/legend presentation helpers, and chart CSS-variable configuration around Recharts.
- Centralizes chart theme colors and consistent tooltip/legend styling.
- Does not create data or calculate analytics; the page supplies chart series.

#### `checkbox.jsx`

- Exports a styled accessible checkbox wrapper around Radix Checkbox.
- Supports checked/unchecked and indeterminate state rendering.
- The parent owns the selected value and form submission.

#### `collapsible.jsx`

- Exports collapsible root, trigger, and content wrappers.
- Allows a small section of UI to expand or collapse.
- Does not manage domain state outside its local Radix behavior.

#### `command.jsx`

- Exports command palette/list, group, item, input, empty state, shortcut, and separator components.
- Uses `cmdk` to present searchable command choices.
- Consumers must supply the actual commands and actions.

#### `context-menu.jsx`

- Exports right-click context-menu root, trigger, content, item, checkbox/radio items, labels, separators, and submenus.
- Uses Radix Context Menu for keyboard/accessibility behavior.
- Provides generic menu presentation, not application actions.

#### `dialog.jsx`

- Exports dialog root, trigger, portal, overlay, content, title, description, and close components.
- Provides the modal primitive used by registration and confirmation flows.
- Does not control whether an operation is authorized or persisted.

#### `drawer.jsx`

- Exports drawer root, trigger, portal, overlay, content, header/footer, title, and description wrappers.
- Uses Vaul for a mobile-friendly slide-up/slide-over panel.
- Intended for secondary UI panels with content supplied by a caller.

#### `dropdown-menu.jsx`

- Exports dropdown-menu root, trigger, content, item, checkbox/radio item, label, separator, shortcut, and submenu wrappers.
- Provides accessible pop-up menu behavior through Radix.
- Menu items need caller-provided labels and callbacks.

#### `form.jsx`

- Exports form/field/control/label/message wrappers integrated with React Hook Form context.
- Helps associate validation state and accessible messages with controls.
- It is a reusable form helper; individual pages still define schemas, submit handlers, and API calls.

#### `hover-card.jsx`

- Exports hover-card root, trigger, and content wrappers.
- Shows supplementary content when an element is hovered/focused.
- Does not fetch or calculate the card content.

#### `index.jsx`

- Re-exports a small convenience set: Button, Card, Input, Label, Tabs, and Badge.
- Allows pages such as `RouteOptimizationPage.jsx` to import several common primitives from one module.
- Does not re-export every file in the UI directory.

#### `input-otp.jsx`

- Exports one-time-password input group, slot, and separator wrappers.
- Provides a segmented code-entry UI.
- No OTP generation, delivery, or server-side verification is implemented here.

#### `input.jsx`

- Exports the styled text/input element used by forms and filters.
- Centralizes borders, sizing, placeholder, focus, and disabled styling.
- Validation and data ownership belong to the parent form.

#### `label.jsx`

- Exports an accessible label component, generally wrapping Radix Label.
- Standardizes form label styling and association with input controls.
- Does not enforce required fields by itself.

#### `menubar.jsx`

- Exports menubar root, menu, trigger, content, item, checkbox/radio items, labels, separators, and submenus.
- Implements an accessible desktop-style menu bar using Radix.
- Menu contents and commands are supplied by callers.

#### `navigation-menu.jsx`

- Exports navigation-menu root, list, item, trigger, content, link, viewport, and indicator wrappers.
- Provides accessible navigation dropdown behavior.
- Does not define the app's route list; that is in `Sidebar.jsx` and `App.jsx`.

#### `pagination.jsx`

- Exports pagination container, content, item, link, previous/next, and ellipsis components.
- Provides a consistent pager interface.
- Does not load pages or calculate pagination totals.

#### `popover.jsx`

- Exports popover root, trigger, content, and anchor wrappers.
- Displays floating content attached to a trigger using Radix positioning.
- Callers supply content and open state as needed.

#### `progress.jsx`

- Exports a styled progress bar wrapper around Radix Progress.
- Communicates a numeric progress value visually.
- Does not track a task or calculate completion.

#### `radio-group.jsx`

- Exports radio-group root and item wrappers.
- Supports accessible single-choice input groups.
- Parent components own the selected value.

#### `resizable.jsx`

- Exports resizable panel group, panel, and resize handle components using `react-resizable-panels`.
- Allows users to change panel dimensions.
- Does not define dashboard-specific panel content.

#### `scroll-area.jsx`

- Exports scroll area, scrollbar, and thumb wrappers around Radix Scroll Area.
- Provides consistently styled custom scrolling regions.
- Does not change the underlying content.

#### `select.jsx`

- Exports select root, group, value, trigger, content, item, label, separator, and scroll controls.
- Wraps Radix Select for accessible dropdown selection.
- Forms provide their own values and change handlers.

#### `separator.jsx`

- Exports a horizontal/vertical visual separator around Radix Separator.
- Divides sections visually and accessibly.
- Has no business behavior.

#### `sheet.jsx`

- Exports a side-panel/modal sheet root, trigger, overlay, content, close, header/footer, title, and description.
- Built on the dialog primitive for slide-in panels.
- Callers choose placement and content.

#### `sidebar-context.jsx`

- Defines a React context, provider, and `useSidebar` hook for a boolean sidebar-open state.
- Used by the app's sidebar navigation and layout to open/close the mobile menu.
- Keep provider and hook imports on this same module; using a different sidebar context can split state.

#### `sidebar.jsx`

- Exports the styled sidebar structure: provider/context hook, sidebar container, content/header/footer, groups, menu items, and buttons.
- Implements collapsible/responsive sidebar layout primitives and local state helpers.
- The project also has `sidebar-context.jsx`; verify which `useSidebar`/provider pair each consumer imports to avoid two separate state contexts.

#### `skeleton.jsx`

- Exports a pulsing placeholder block for loading states.
- Used as visual scaffolding while real content is pending.
- Does not trigger or detect loading.

#### `slider.jsx`

- Exports a styled range slider around Radix Slider.
- Supports controlled numeric/range selection.
- Callers supply bounds, value, and change handler.

#### `sonner.jsx`

- Exports a themed wrapper around Sonner's toast renderer.
- Applies the app's colors and classes to transient toast messages.
- It is one notification mechanism; `toast.jsx`/`toaster.jsx` implement a separate toast system.

#### `switch.jsx`

- Exports an accessible toggle switch around Radix Switch.
- Used for boolean settings and preferences.
- The visible settings screen currently uses defaults and does not persist those values.

#### `table.jsx`

- Exports table, header, body, footer, row, head, cell, and caption wrappers.
- Provides consistent table styling for ambulance and data lists.
- Data fetching, sorting, and actions belong to the consuming page.

#### `tabs.jsx`

- Exports tabs root, list, trigger, and content wrappers.
- Enables in-page tab selection using Radix Tabs.
- The caller defines tab names and each tab's content.

#### `textarea.jsx`

- Exports a styled multiline text input.
- Shares sizing, focus, and disabled styling with `input.jsx`.
- Validation and submission are handled by the parent.

#### `toast.jsx`

- Exports toast provider, viewport, root, title, description, action, and close primitives.
- Supplies the visual pieces rendered by `toaster.jsx`.
- Toast state and dispatch are managed by `src/hooks/use-toast.js`.

#### `toaster.jsx`

- Calls the app toast hook and renders the current toast list into the toast provider/viewport.
- Displays toast title, description, optional action, and close control.
- Must be mounted once in the app shell; it is mounted by `App.jsx`.

#### `toggle-group.jsx`

- Exports a group of single- or multi-select toggle controls around Radix Toggle Group.
- Provides shared styling and selection behavior.
- Caller defines the options and selected-value handling.

#### `toggle.jsx`

- Exports a single accessible toggle button and visual variants.
- Provides pressed/unpressed behavior for a button-like boolean control.
- Callers own the meaning and persistence of the state.

#### `tooltip.jsx`

- Exports tooltip provider, root, trigger, content, and related wrappers.
- Provides accessible hover/focus hints.
- `App.jsx` mounts a provider around the application.

#### `use-toast.js`

- Implements a small module-level toast store with add, update, dismiss, and remove actions.
- Exports `toast()` for dispatching a notification and `useToast()` for subscribing React components.
- Limits the visible toast list to one and removes dismissed notifications after a configured delay.
- This is the implementation imported by the app hook; avoid duplicating toast state.

### `vvce/src/hooks/`

#### `vvce/src/hooks/use-mobile.jsx`

- Exports `useIsMobile()`, which checks whether the viewport is narrower than 768 pixels.
- Listens for media-query changes and removes the listener on unmount.
- Useful for conditional responsive behavior; sidebar components also have their own responsive CSS/state.

#### `vvce/src/hooks/use-toast.js`

- Re-exports `useToast` and `toast` from `components/ui/use-toast.js`.
- Gives app code a stable alias-based hook import path.
- Does not implement a separate store.

### `vvce/src/lib/`

#### `vvce/src/lib/utils.js`

- Exports `cn(...inputs)`, which combines conditional class names with `clsx` and merges conflicting Tailwind classes with `tailwind-merge`.
- Used throughout UI primitives and layouts.
- Keep shared class-merging behavior centralized here rather than reimplementing it.

### `vvce/src/services/`

#### `vvce/src/services/apiClient.js`

- Fetch wrapper used by the mission API client. Applies the optional `VITE_API_URL`, JSON headers, a ten-second timeout, and normalized HTTP errors.

#### `vvce/src/services/missionApi.js`

- Calls the persistent `/api/missions` REST endpoints for create/list/detail/delete, activation, positions, arrival, close, and abort.
- Activation returns the persisted mission and simulation run; it does not navigate or show success when the backend rejects the request or runner startup.
- It does not fall back to an in-memory mock; backend/MongoDB failures are returned to the calling UI.

#### `vvce/src/services/simulationApi.js`

- Loads public synthetic network/options from `GET /api/simulations/config` and a persisted mission run from `GET /api/simulations/:missionId`.
- Uses the same API base/proxy as the mission client; it does not attempt to start SUMO from the browser.

#### `vvce/src/services/socketClient.js`

- Lazily creates one Socket.IO client, dispatches subscribed event handlers including outbound `simulation:update`, and reports connection/polling status.
- Socket updates are a realtime enhancement; mission CRUD uses the REST API.

### `vvce/src/store/`

#### `vvce/src/store/createStore.js`

- Implements a small external store using React `useSyncExternalStore`, providing get/set/subscribe and selector-hook APIs.

#### `vvce/src/store/missionStore.js`

- Holds the frontend mission cache, ordering, selected mission, status filter, connection state, loading/error state, and event log.
- Merges list responses with loaded mission detail so list refreshes that omit positions do not discard the selected mission's GPS history.
- Applies socket updates and removes missions from local state after successful backend deletion.

### Mission-related frontend hooks

#### `vvce/src/hooks/useMissions.js`

- Loads and refreshes the mission list from the REST API using the current status filter, updating loading/error state in the mission store.

#### `vvce/src/hooks/useMissionActions.js`

- Wraps mission API mutations with pending-action and user-visible error state, then updates the shared mission store.

#### `vvce/src/hooks/useMissionSocket.js`

- Subscribes to Socket.IO mission/signal/preemption/metrics events, updates the shared store and event log, and polls the mission API when realtime is unavailable.

### `vvce/src/tests/`

- `setup.js` installs the Testing Library DOM matchers for Vitest.
- `vvce/src/tests/missions/MissionActions.test.jsx` covers mission action enabled/disabled states and confirmed deletion.
- `vvce/src/tests/missions/MissionCreateForm.test.jsx` covers mission form validation and submission.
- `vvce/src/tests/missions/apiClient.test.js` covers successful JSON responses and normalized HTTP errors.
- `vvce/src/tests/missions/missionStore.test.js` covers store insert/update, socket updates, position preservation, and deletion.
- `vvce/src/tests/missions/missionTransitions.test.js` covers the frontend transition rules.
- `vvce/src/tests/missions/socketClient.test.js` verifies singleton Socket.IO initialization.
- Run the frontend suite with `cd vvce; npm test`.

### `vvce/src/pages/`

#### `vvce/src/pages/AmbulancesPage.jsx`

- Displays an “Emergency Ambulance List” and a dispatch action.
- Populates the list from hard-coded dummy ambulance objects in a `useEffect`.
- Sends `{ lane, type: 'AMBULANCE' }` to `/api/dispatch`, shows success/failure toasts, and prevents simultaneous clicks.
- The dispatch action can reach the mounted serial router, but the displayed ambulance records are not loaded from MongoDB or connected to registered ambulance IDs.

#### `vvce/src/pages/AnalyticsPage.jsx`

- Renders response-time, signal-override, emergency-count, route-efficiency, and AI-impact cards/charts using Recharts.
- All numbers, trends, districts, dates, and chart data are embedded in the component.
- Date-range selection, export, and detailed-report controls are visual only; there is no analytics API integration.

#### `vvce/src/pages/Dashboard.jsx`

- Composes the dashboard heading/tabs, summary stats, map, active ambulance panel, and traffic-signal summary.
- Delegates content to the `components/dashboard/` files.
- Mission and signal cards load their respective persisted backend data; summary cards and map/traffic-control panels still include prototype values or limitations described above.

#### `vvce/src/pages/Index.jsx`

- Renders a generic “Welcome to Your Blank App” placeholder.
- Is not registered as a route in `App.jsx`.
- Treat as unused starter/legacy code unless a future route deliberately adopts it.

#### `vvce/src/pages/NotFound.jsx`

- Renders a branded 404 screen for unrecognized routes.
- Logs the requested browser path to the console.
- Includes a link back to the dashboard.

#### `vvce/src/pages/RouteOptimizationPage.jsx`

- Shows illustrative active-route cards and mock route history.
- Provides a form for ambulance ID, priority, origin, and destination.
- The create action validates origin/destination, waits briefly, and navigates to `emergency-route` with query values.
- It does not call a routing or optimization backend; the map component currently uses fixed coordinates and does not consume those query values.

#### `vvce/src/pages/SettingsPage.jsx`

- Presents general, notification, API integration, and system settings controls.
- Save buttons display a toast but do not persist settings.
- Integration buttons and reset controls are visual placeholders.
- Contains a masked API-key-looking value; do not treat it as actual configuration.

#### `vvce/src/pages/TrafficSignalsPage.jsx`

- Fetches `/api/traffic-signals`, provides search and status filtering, and renders registered signal records.
- Opens `TrafficSignalRegistrationForm` and refreshes the list after successful registration.
- Uses the backend's `signalId`/`location` fields with compatible fallbacks for older records.
- The history tab is placeholder content; API load failures are logged in this page.

#### `vvce/src/pages/MissionsPage.jsx`

- Main mission operations screen: loads/filter/sorts persisted missions, creates missions, loads selected mission detail, and exposes lifecycle, delete, position-simulator, and event-log controls.
- Uses `useMissions`, `useMissionSocket`, `useMissionActions`, the mission store, and components in `components/domain/missions/`.
- Mission mutations go to the MongoDB-backed API; no browser-only mission mock is used. It navigates to `/simulation/:missionId` only after activation returns a started run.

#### `vvce/src/pages/SimulationPage.jsx`

- Loads the selected mission's persisted `SimulationRun` and listens for `simulation:update` events for that mission.
- Displays synthetic run status, local position/speed, destination-preserving route, configured demo restriction/traffic, and conflict state, with loading/error/disconnected/stale/completed states and a dashboard return link.
- Labels the corridor and observations as synthetic and states that signal control/GPS are unavailable; it does not render these local coordinates as real map/GPS data.

## Suggested AI workflow for future changes

1. Identify whether the requested behavior is currently live, mocked, dormant, or legacy using the implementation facts above.
2. Read the target page/component, the route mounted by `crud/index.js`, the route/controller, and the exact Mongoose schema before editing.
3. Write down the request/response field names and status values; compare them across frontend and backend before changing code.
4. Preserve current UI behavior unless the task explicitly changes it; for safety-relevant dispatch, fail explicitly if the API or serial device is unavailable.
5. Add or update tests for both the changed component/handler and its API contract where test infrastructure exists.
6. Do not use sample maps, demo KPIs, or mocked ambulance entries as evidence that live integration or AI optimization exists.
7. Never commit secrets, real API keys, local `.env` files, or machine-specific port values.
