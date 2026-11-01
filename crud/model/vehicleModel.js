import mongoose from 'mongoose';
const vehicleSchema = new mongoose.Schema({
  ambulanceId: {
    type: String,
    required: true,
    unique: true,
  },
  uniqueId: {
    type: String,
    required: true,
    unique: true, // this ensures it remains distinct
  },
  driverName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'idle', 'emergency'],
    default: 'idle',
  },
  vehicleNumber: {
    type: String,
    default: 'Unknown',
  },
  destination: {
    type: String,
  },
  eta: {
    type: String,
  },
  optimizedSignals: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;