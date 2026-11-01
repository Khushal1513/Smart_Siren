import mongoose from 'mongoose';

const activeAmbulanceSchema = new mongoose.Schema({
  ambulanceId: {
    type: String,
    required: true,
    ref: 'Vehicle'
  },
  engineNumber: {
    type: String,
    required: true
  },
  vehicleNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['emergency', 'dispatched', 'completed'],
    default: 'emergency'
  },
  assignedLane: {
    type: String,
    enum: ['L1', 'L2', 'L3', 'L4', 'L5'],
    default: null
  },
  location: {
    type: String,
    default: function() {
      return this.assignedLane ? `Lane ${this.assignedLane.slice(1)}` : 'Emergency Queue';
    }
  },
  activatedAt: {
    type: Date,
    default: Date.now
  },
  dispatchedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('ActiveAmbulance', activeAmbulanceSchema);