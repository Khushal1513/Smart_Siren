# Smart Siren

Smart Siren is an emergency-response traffic management project. It combines a React dashboard with a Node.js/Express API for vehicle registration, ambulance dispatch, traffic-signal and lane status, emergency verification, and route views. The backend can also communicate with an Arduino over a serial port.

## Project requirements

- Node.js and npm
- MongoDB, running locally or available through a connection URI
- Google Maps API key for map views (optional)
- Arduino or a configured serial-port simulation for dispatch hardware (optional)

## Run locally

### Start the API

From the repository root, open a terminal and run:

```powershell
cd crud
npm install
npm start
```

The API listens on port `8000` by default, connects to `mongodb://127.0.0.1:27017/crud`, and runs `crud/index.js`. `crud/server.js` is a separate legacy serial-only server; it does not start the Mongo-backed API. Do not run both servers on the same port.

The backend reads optional values from `crud/.env`:

```env
MONGO_URI=mongodb://localhost:27017/crud
PORT=8000
ARDUINO_PORT=COM15
```

The dashboard uses this API. The mounted serial dispatch router is an optional hardware path and is not the SUMO simulation.

### Start the dashboard

In another terminal, from the repository root:

```powershell
cd vvce
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`). Vite proxies `/api` requests to `http://localhost:8000`.

### Google Maps

Map views require a Google Maps JavaScript API key. Create `vvce/.env.local`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_restricted_key
```

Restart Vite after changing environment variables. Browser-based keys are visible to users, so restrict the key in Google Cloud to the required API and allowed website referrers. Do not commit the key.

### SUMO mission simulation

The repository includes an offline, explicitly synthetic SUMO corridor under `sim/`. It uses local metre coordinates, synthetic background traffic, and a demo closure; it is not mapped to real roads and has no live TomTom, GPS, or physical signal input. Install SUMO and matching TraCI, configure `SUMO_HOME` (or `SUMO_BINARY` and `NETCONVERT_BINARY`), then follow [sim/README.md](./sim/README.md) for Windows setup, API contracts, and the mission-activation workflow.

Optional backend setting names are `SIMULATION_PYTHON` and `SIMULATION_STARTUP_TIMEOUT_MS`. Credentials are not needed for this offline demo. Live traffic/ambulance modes are not implemented.

## File-by-file guide

This inventory describes the application files in the repository. Installed dependencies, build output, and other generated files are excluded.

### Repository root

| File | Purpose |
|---|---|
| `.gitignore` | Excludes installed Node dependencies, environment files, and other local-only files from Git. |
| `README.md` | Project overview, setup instructions, and this file inventory. |

### Backend: `crud/`

| File | Purpose |
|---|---|
| `crud/README.md` | Detailed backend file guide describing each backend file, its role, and its importance. |
| `crud/.env.example` | Safe template for backend environment variable names and local SUMO/Python paths; contains no credentials. |
| `crud/activeambulances.json` | Sample lane/ambulance status data in JSON format. |
| `crud/arduino_server/arduino-server.js` | Creates the `/api/dispatch` router and sends validated lane commands to the configured Arduino serial port. |
| `crud/check-routes-conflicts.js` | Scans route files and reports duplicate HTTP method/path definitions. |
| `crud/controller/ambulanceController.js` | Reads active ambulances and activates an ambulance by database ID. |
| `crud/controller/trafficSignalController.js` | Registers, lists, counts, updates, and controls traffic-signal records. |
| `crud/controller/trigger-control.js` | Verifies ambulance engine/vehicle details, activates ambulances, and lists active/emergency ambulances. |
| `crud/controller/userController.js` | Implements user create, list, update, and delete operations (plus a vehicle-count handler). |
| `crud/controller/vehicleController.js` | Registers, lists, retrieves, updates, and deletes vehicles. |
| `crud/controller/verifycontroller.js` | Verifies an engine-number and vehicle-number pair against stored ambulance records. |
| `crud/debug-routes.js` | Imports route modules to check that they load and can be mounted in Express. |
| `crud/index.js` | Main MongoDB API server; `npm start` runs this file. |
| `crud/model/ActiveAmbulance.js` | Mongoose schema for an active ambulance, its assigned lane, status, and dispatch lifecycle timestamps. |
| `crud/model/LaneStatus.js` | Mongoose schema and helpers for lane status, location, traffic density, emergency state, and signal overrides. |
| `crud/model/Mission.js` | Mongoose schema for persisted mission records, telemetry, and optional demo SUMO endpoints. |
| `crud/model/SimulationRun.js` | Mongoose schema for one idempotent simulation run per mission and its updates. |
| `crud/model/Vehicle.js` | Mongoose vehicle-registration schema, validation, ID generation, and registration helpers. |
| `crud/model/ambulanceModel.js` | Mongoose schema for an ambulance identifier, active flag, location, and update time. |
| `crud/model/trafficSignalModel.js` | Mongoose schema for a traffic signal's ID, location, and status. |
| `crud/model/trigger-model.js` | Mongoose schema for ambulance engine/vehicle numbers, status, destination, ETA, and optimized signals. |
| `crud/model/usermodel.js` | Mongoose schema for user name, email, password, and creation time. |
| `crud/model/vehicleModel.js` | Mongoose schema for ambulance/vehicle identifiers, driver, status, destination, ETA, and optimized signals. |
| `crud/model/verifymodel.js` | Mongoose schema for vehicle and ambulance registration details used in verification. |
| `crud/package-lock.json` | Locks the backend's exact npm dependency versions for repeatable installs. |
| `crud/package.json` | Backend package metadata, dependencies, and the `npm start` script. |
| `crud/routes/ambulanceRoute.js` | Defines routes for emergency verification and creating/listing active ambulances. |
| `crud/routes/ambulanceRoutes.js` | Defines an alternate set of ambulance routes for activation and active-ambulance listing. |
| `crud/routes/missionRoute.js` | Exposes the Mongo-backed mission lifecycle; activation starts a validated SUMO run. |
| `crud/routes/simulationRoute.js` | Exposes synthetic simulation configuration and persisted run state. |
| `crud/routes/trafficSignalRoute.js` | Maps traffic-signal registration, listing, and status updates to controller functions. |
| `crud/routes/trigger-route.js` | Maps ambulance verification, activation, and listing routes to trigger controllers. |
| `crud/routes/userRoute.js` | Defines user CRUD route paths, currently connected to placeholder response handlers. |
| `crud/routes/vehicleRoute.js` | Defines vehicle registration, list, lookup, update, delete, and health-check routes. |
| `crud/routes/verifyroute.js` | Verifies engine/vehicle pairs and ambulance IDs against registered vehicles. |
| `crud/server.js` | Separate serial-only server; it does not connect to MongoDB or host the dashboard APIs. |
| `crud/services/simulation/simulationContract.js` | Validates canonical vehicle identity and explicit demo simulation settings. |
| `crud/services/simulation/simulationManager.js` | Manages the headless TraCI child, per-mission run idempotency, events, and cleanup. |
| `crud/test-ports.js` | Lists serial ports available on the current machine. |
| `crud/utils/asyncHandler.js` | Wraps an async Express handler and forwards rejected promises to Express error handling. |

### SUMO demo: `sim/`

| File | Purpose |
|---|---|
| `sim/README.md` | Windows setup, synthetic/demo limitations, and API/event contracts. |
| `sim/requirements.txt` | SUMO 1.28.0-matched TraCI and sumolib Python dependencies. |
| `sim/config/manual_values.json` | Synthetic local-coordinate corridor, traffic, background flow, and configured closure. |
| `sim/build_scenario.py` | Generates SUMO network and configuration inputs and invokes `netconvert`. |
| `sim/publisher.py` | Backend-managed headless TraCI runner and timestamped run publisher. |
| `sim/routing.py` | Traffic-weighted route planner that preserves the destination and avoids blocked demo edges. |
| `sim/conflicts.py` | Deterministic severity/ETA priority and hold-release helpers. |
| `sim/tests/test_routing.py` | SUMO-independent tests for rerouting, destination preservation, and conflict handling. |

### Dashboard: `vvce/`

| File | Purpose |
|---|---|
| `vvce/.env.example` | Example environment setting for the Google Maps API key. |
| `vvce/.gitignore` | Ignores frontend dependencies and local environment files while allowing `.env.example`. |
| `vvce/AppLayout.jsx` | Older standalone layout component; the current router uses `src/components/Layouts/AppLayout.jsx`. |
| `vvce/README.md` | Original Vite/React starter-template notes. |
| `vvce/eslint.config.js` | Configures ESLint rules for the frontend project. |
| `vvce/index.html` | Vite HTML entry point containing the root element for the React app. |
| `vvce/package-lock.json` | Locks the frontend's exact npm dependency versions for repeatable installs. |
| `vvce/package.json` | Frontend dependencies and scripts for development, build, preview, and lint. |
| `vvce/postcss.config.js` | Configures PostCSS plugins used to process the frontend styles. |
| `vvce/src/App.css` | App-level stylesheet. |
| `vvce/src/App.jsx` | Root React component; configures providers and the dashboard's page routes. |
| `vvce/src/assets/react.svg` | React logo asset from the frontend starter template. |
| `vvce/src/components/Footer.jsx` | Reusable dashboard footer. |
| `vvce/src/components/Layouts/AppLayout.jsx` | Main routed dashboard layout, combining sidebar, navbar, and page content. |
| `vvce/src/components/Layouts/Navbar.jsx` | Dashboard top navigation bar. |
| `vvce/src/components/Layouts/Sidebar.jsx` | Dashboard navigation sidebar. |
| `vvce/src/components/dashboard/ActiveAmbulances.jsx` | Dashboard panel for active ambulance information. |
| `vvce/src/components/dashboard/DashboardStats.jsx` | Dashboard summary/statistics panel. |
| `vvce/src/components/dashboard/Mapview.jsx` | Dashboard map view. |
| `vvce/src/components/dashboard/TrafficSignals.jsx` | Dashboard traffic-signal summary panel. |
| `vvce/src/components/ui/EmergencyRouteMap.jsx` | Displays an emergency route on a map. |
| `vvce/src/components/ui/NotificationPage.jsx` | Displays emergency and system notifications. |
| `vvce/src/components/ui/SignalsList.jsx` | Displays a list of traffic signals. |
| `vvce/src/components/ui/TrafficSignalControls.jsx` | Provides controls for traffic-signal status and operation. |
| `vvce/src/components/ui/TrafficSignalRegistrationForm.jsx` | Form for registering a traffic signal. |
| `vvce/src/components/ui/TriggeredEmergency.jsx` | Emergency trigger/activation screen. |
| `vvce/src/components/ui/VehicleRegistrationForm.jsx` | Form for registering a vehicle. |
| `vvce/src/components/ui/accordion.jsx` | Reusable accordion and collapsible-section components. |
| `vvce/src/components/ui/alert-dialog.jsx` | Reusable confirmation/alert dialog components. |
| `vvce/src/components/ui/alert.jsx` | Reusable inline alert components. |
| `vvce/src/components/ui/aspect-ratio.jsx` | Container that maintains a chosen aspect ratio. |
| `vvce/src/components/ui/avatar.jsx` | Reusable avatar and fallback components. |
| `vvce/src/components/ui/badge.jsx` | Reusable compact status/label badge. |
| `vvce/src/components/ui/breadcrumb.jsx` | Reusable breadcrumb navigation components. |
| `vvce/src/components/ui/button.jsx` | Reusable button variants and styling. |
| `vvce/src/components/ui/calendar.jsx` | Reusable calendar/date-picker component. |
| `vvce/src/components/ui/card.jsx` | Reusable card, header, content, and footer components. |
| `vvce/src/components/ui/carousel.jsx` | Reusable carousel components. |
| `vvce/src/components/ui/chart.jsx` | Shared chart components and chart configuration helpers. |
| `vvce/src/components/ui/checkbox.jsx` | Reusable checkbox component. |
| `vvce/src/components/ui/collapsible.jsx` | Reusable collapsible content components. |
| `vvce/src/components/ui/command.jsx` | Reusable command palette and command-list components. |
| `vvce/src/components/ui/context-menu.jsx` | Reusable right-click context-menu components. |
| `vvce/src/components/ui/dialog.jsx` | Reusable modal dialog components. |
| `vvce/src/components/ui/drawer.jsx` | Reusable drawer components for side/bottom panels. |
| `vvce/src/components/ui/dropdown-menu.jsx` | Reusable dropdown-menu components. |
| `vvce/src/components/ui/form.jsx` | Form field components and React Hook Form integration helpers. |
| `vvce/src/components/ui/hover-card.jsx` | Reusable content card shown on hover. |
| `vvce/src/components/ui/index.jsx` | Barrel exports for commonly used button, card, input, label, tab, and badge components. |
| `vvce/src/components/ui/input-otp.jsx` | Reusable one-time-passcode input components. |
| `vvce/src/components/ui/input.jsx` | Reusable text input component. |
| `vvce/src/components/ui/label.jsx` | Reusable form label component. |
| `vvce/src/components/ui/menubar.jsx` | Reusable menu-bar components. |
| `vvce/src/components/ui/navigation-menu.jsx` | Reusable navigation-menu components. |
| `vvce/src/components/ui/pagination.jsx` | Reusable pagination controls. |
| `vvce/src/components/ui/popover.jsx` | Reusable popover components. |
| `vvce/src/components/ui/progress.jsx` | Reusable progress indicator. |
| `vvce/src/components/ui/radio-group.jsx` | Reusable radio-button group components. |
| `vvce/src/components/ui/resizable.jsx` | Reusable resizable panel components. |
| `vvce/src/components/ui/scroll-area.jsx` | Reusable styled scroll-area components. |
| `vvce/src/components/ui/select.jsx` | Reusable select/dropdown components. |
| `vvce/src/components/ui/separator.jsx` | Reusable visual separator. |
| `vvce/src/components/ui/sheet.jsx` | Reusable sheet/slide-over panel components. |
| `vvce/src/components/ui/sidebar-context.jsx` | Sidebar state context and provider used by the dashboard layout. |
| `vvce/src/components/ui/sidebar.jsx` | Reusable sidebar layout, navigation, and menu components. |
| `vvce/src/components/ui/skeleton.jsx` | Reusable loading placeholder. |
| `vvce/src/components/ui/slider.jsx` | Reusable slider control. |
| `vvce/src/components/ui/sonner.jsx` | Toast-notification components built around Sonner. |
| `vvce/src/components/ui/switch.jsx` | Reusable toggle switch. |
| `vvce/src/components/ui/table.jsx` | Reusable table, row, header, and cell components. |
| `vvce/src/components/ui/tabs.jsx` | Reusable tab navigation and content components. |
| `vvce/src/components/ui/textarea.jsx` | Reusable multi-line text input. |
| `vvce/src/components/ui/toast.jsx` | Toast message component and related primitives. |
| `vvce/src/components/ui/toaster.jsx` | Renders and manages the app's toast notifications. |
| `vvce/src/components/ui/toggle-group.jsx` | Reusable grouped toggle controls. |
| `vvce/src/components/ui/toggle.jsx` | Reusable single toggle button. |
| `vvce/src/components/ui/tooltip.jsx` | Tooltip components and provider. |
| `vvce/src/components/ui/use-toast.js` | State and helper hook for displaying toast messages. |
| `vvce/src/hooks/use-mobile.jsx` | Hook for detecting whether the viewport is in the mobile layout range. |
| `vvce/src/hooks/use-toast.js` | Application hook for triggering and managing toast notifications. |
| `vvce/src/index.css` | Global styles, Tailwind layers, and base design rules. |
| `vvce/src/lib/utils.js` | Shared utility functions, including conditional class-name merging. |
| `vvce/src/main.jsx` | React browser entry point; mounts the root app and global stylesheet. |
| `vvce/src/pages/AmbulancesPage.jsx` | Ambulance management page. |
| `vvce/src/pages/AnalyticsPage.jsx` | Analytics and reporting page. |
| `vvce/src/pages/Dashboard.jsx` | Main dashboard page. |
| `vvce/src/pages/Index.jsx` | Alternate landing/index page component. |
| `vvce/src/pages/NotFound.jsx` | Page displayed for unknown routes. |
| `vvce/src/pages/RouteOptimizationPage.jsx` | Emergency route optimization page. |
| `vvce/src/pages/MissionsPage.jsx` | Mongo-backed mission operations and activation screen; starts/navigates to simulation only after backend confirmation. |
| `vvce/src/pages/SimulationPage.jsx` | Shows a mission's synthetic SUMO run, route, position, restrictions, conflicts, and freshness/connectivity state. |
| `vvce/src/pages/SettingsPage.jsx` | Application settings page. |
| `vvce/src/pages/TrafficSignalsPage.jsx` | Traffic-signal management page. |
| `vvce/src/services/simulationApi.js` | Reads simulation configuration and persisted run state from the backend. |
| `vvce/tailwind.config.js` | Tailwind CSS theme and content-scan configuration. |
| `vvce/vite.config.js` | Vite configuration, `@` source alias, PostCSS integration, and API proxy. |

## Useful commands

From `vvce/`:

```powershell
npm run dev
npm run build
npm run lint
```

From `crud/`, use `npm start` to run the dashboard API. `node server.js` runs the separate serial-only server.
