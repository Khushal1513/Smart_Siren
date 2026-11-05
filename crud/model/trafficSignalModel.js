import mongoose from 'mongoose';

export const TRAFFIC_SIGNAL_TYPES = ['standard', 'smart', 'adaptive', 'emergency'];
export const TRAFFIC_SIGNAL_STATUSES = [
  'active',
  'maintenance',
  'offline',
  'planned',
  'green',
  'yellow',
  'red',
  'emergency',
];

const trafficSignalSchema = new mongoose.Schema({
  signalId: {
    type: String,
    required: [true, 'Signal ID is required'],
    trim: true,
    uppercase: true,
    unique: true,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  area: {
    type: String,
    required: [true, 'Area or district is required'],
    trim: true,
  },
  intersection: {
    type: String,
    required: [true, 'Intersection is required'],
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  signalType: {
    type: String,
    enum: TRAFFIC_SIGNAL_TYPES,
    default: 'standard',
  },
  hasPedestrianCrossing: {
    type: Boolean,
    default: false,
  },
  hasCamera: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: TRAFFIC_SIGNAL_STATUSES,
    default: 'active',
    lowercase: true,
    trim: true,
  },
}, {
  timestamps: true,
});

const TrafficSignal = mongoose.models.TrafficSignal
  || mongoose.model('TrafficSignal', trafficSignalSchema);

export default TrafficSignal;
