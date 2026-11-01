// models/trigger-model.js
import mongoose from 'mongoose';

const AmbulanceSchema = new mongoose.Schema({
  engineNumber: {
    type: String,
    required: true,
    unique: true,
    length: 7
  },
  vehicleNumber: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['idle', 'active', 'emergency'],
    default: 'idle'
  },
  location: {
    type: String,
    default: ''
  },
  destination: {
    type: String,
    default: ''
  },
  eta: {
    type: String,
    default: ''
  },
  optimizedSignals: {
    type: Number,
    default: 0
  }
});

const Ambulance = mongoose.model('Ambulance', AmbulanceSchema);

export default Ambulance;