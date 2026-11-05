import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    edgeId: { type: String, default: null },
  },
  { _id: false }
);

const simulationRunSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, unique: true },
    missionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mission',
      required: true,
      unique: true,
    },
    vehicleId: { type: String, required: true, trim: true },
    mode: { type: String, enum: ['DEMO'], required: true, default: 'DEMO' },
    source: { type: String, required: true, default: 'SYNTHETIC_DEMO' },
    status: {
      type: String,
      enum: ['STARTING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
      required: true,
    },
    originEdgeId: { type: String, required: true },
    destinationEdgeId: { type: String, required: true },
    route: { type: [String], default: [] },
    currentEdgeId: { type: String, default: null },
    position: { type: positionSchema, default: null },
    speedKmh: { type: Number, default: null },
    headingDegrees: { type: Number, default: null },
    simulationTimeSeconds: { type: Number, default: 0 },
    traffic: { type: [mongoose.Schema.Types.Mixed], default: [] },
    restrictions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    signalState: { type: mongoose.Schema.Types.Mixed, default: null },
    conflictState: { type: mongoose.Schema.Types.Mixed, default: null },
    rerouteReason: { type: String, default: null },
    error: { type: String, default: null },
    lastSequence: { type: Number, default: -1 },
    lastUpdateAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'simulation_runs' }
);

const SimulationRun = mongoose.models.SimulationRun
  || mongoose.model('SimulationRun', simulationRunSchema);

export default SimulationRun;
