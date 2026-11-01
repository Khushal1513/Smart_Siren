// crud/model/trafficSignalModel.js
import mongoose from 'mongoose';

const trafficSignalSchema = new mongoose.Schema({
  signalId: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, required: true },
});

const TrafficSignal = mongoose.model('TrafficSignal', trafficSignalSchema);

export default TrafficSignal;
