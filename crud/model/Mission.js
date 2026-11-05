import mongoose from 'mongoose';
import { MISSION_STATUS, MISSION_STATUS_VALUES, SEVERITY } from '../config/constants.js';

const routeStopSchema = new mongoose.Schema(
  {
    signalId: { type: String, required: true, trim: true },
    distanceAlongRouteM: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const positionSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    speedKmh: { type: Number, default: 0, min: 0 },
    ts: { type: Date, default: Date.now },
  },
  { _id: false }
);

const simulationConfigSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['DEMO', 'LIVE'], required: true },
    vehicleSource: {
      type: String,
      enum: ['REGISTERED', 'SYNTHETIC_DEMO'],
      default: 'REGISTERED',
    },
    originEdgeId: { type: String, trim: true, default: null },
    destinationEdgeId: { type: String, trim: true, default: null },
  },
  { _id: false }
);

/**
 * Mission: one ambulance run. Collection name: "missions".
 * positions is capped to the last 500 entries by missionService.addPosition ($slice).
 */
const missionSchema = new mongoose.Schema(
  {
    vehicleId: { type: String, required: true, trim: true },
    status: { type: String, enum: MISSION_STATUS_VALUES, default: MISSION_STATUS.CREATED },
    route: { type: [routeStopSchema], default: [] },
    positions: { type: [positionSchema], default: [] },
    etaP50: { type: Number, default: null },
    etaP90: { type: Number, default: null },
    severity: { type: Number, min: SEVERITY.MIN, max: SEVERITY.MAX, default: SEVERITY.DEFAULT },
    startedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    // Extra bookkeeping fields (additive):
    lastPositionAt: { type: Date, default: null }, // used by the watchdog
    abortReason: { type: String, default: null },
    legacyKey: { type: String, default: undefined }, // migration idempotency key
    simulationConfig: { type: simulationConfigSchema, default: null },
  },
  { timestamps: true }
);

missionSchema.index({ status: 1 });
missionSchema.index({ vehicleId: 1 });
missionSchema.index({ legacyKey: 1 }, { unique: true, sparse: true });

const Mission = mongoose.models.Mission || mongoose.model('Mission', missionSchema);

export default Mission;