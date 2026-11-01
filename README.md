# Smart Siren

Smart Siren is an emergency-response traffic management project. It combines a web dashboard with a Node.js/Express API to manage ambulance dispatch, vehicle and traffic-signal information, and emergency routes. The backend also includes an Arduino serial integration for dispatch-related hardware.

## Features

- Emergency-response dashboard with ambulance and traffic information
- Ambulance activation, dispatch, lane status, and mission management endpoints
- Vehicle registration and management
- Traffic-signal registration, status, and control screens
- Emergency verification and route views
- Express API backed by MongoDB
- Optional Arduino serial connection

Some screens may use demonstration data or require external services and hardware to be configured.

## Project structure

```text
.
├── crud/   Express API, MongoDB models, and Arduino integration
└── vvce/   React + Vite web dashboard
```

## Requirements

- Node.js and npm
- MongoDB, running locally or available through a connection URI
- Google Maps API key for map views (optional)
- Arduino and a configured serial port for hardware integration (optional)

## Run locally

### 1. Start the backend

In a terminal:

```powershell
cd crud
npm install
npm start
```

The API listens on port `8000` by default and connects to `mongodb://localhost:27017/crud`.

To configure a different database or port, create `crud/.env`:

```env
MONGO_URI=mongodb://localhost:27017/crud
PORT=8000
```

For Arduino serial integration, optionally set `ARDUINO_PORT` in the environment. The default serial port is `COM15` on Windows.

### 2. Start the dashboard

In another terminal:

```powershell
cd vvce
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`). The Vite development server proxies `/api` requests to the backend at `http://localhost:8000`.

## Google Maps configuration

Map views require a Google Maps JavaScript API key. Create `vvce/.env.local`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_restricted_key
```

Restart the Vite server after changing environment variables. Do not commit `.env.local` or put a real key in `.env.example`. Browser-based keys are visible to users, so restrict the key in Google Cloud to the required API and your allowed website referrers.

## Useful commands

From `vvce/`:

```powershell
npm run dev
npm run build
npm run lint
```

From `crud/`:

```powershell
npm start
```
