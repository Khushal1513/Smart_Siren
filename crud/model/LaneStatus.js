import mongoose from 'mongoose';

const laneStatusSchema = new mongoose.Schema({
  laneId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'blocked', 'emergency', 'maintenance'],
    default: 'open'
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  trafficDensity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  emergency: {
    isActive: {
      type: Boolean,
      default: false
    },
    ambulanceId: {
      type: String,
      default: null
    },
    engineNumber: {
      type: String,
      default: null
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    activatedAt: {
      type: Date,
      default: null
    },
    estimatedClearTime: {
      type: Date,
      default: null
    }
  },
  signals: {
    greenDuration: {
      type: Number,
      default: 30 // seconds
    },
    redDuration: {
      type: Number,
      default: 60 // seconds
    },
    isOverridden: {
      type: Boolean,
      default: false
    },
    overrideReason: {
      type: String,
      default: null
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'system'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true,
  collection: 'lane_status'
});

// Indexes for better performance
laneStatusSchema.index({ laneId: 1 });
laneStatusSchema.index({ status: 1 });
laneStatusSchema.index({ 'emergency.isActive': 1 });
laneStatusSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Pre-save middleware to update lastUpdated
laneStatusSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Instance methods
laneStatusSchema.methods.activateEmergency = function(ambulanceId, engineNumber, priority = 'high') {
  this.status = 'emergency';
  this.emergency.isActive = true;
  this.emergency.ambulanceId = ambulanceId;
  this.emergency.engineNumber = engineNumber;
  this.emergency.priority = priority;
  this.emergency.activatedAt = new Date();
  this.signals.isOverridden = true;
  this.signals.overrideReason = 'Emergency vehicle passage';
  return this.save();
};

laneStatusSchema.methods.deactivateEmergency = function() {
  this.status = 'open';
  this.emergency.isActive = false;
  this.emergency.ambulanceId = null;
  this.emergency.engineNumber = null;
  this.emergency.activatedAt = null;
  this.emergency.estimatedClearTime = null;
  this.signals.isOverridden = false;
  this.signals.overrideReason = null;
  return this.save();
};

// Static methods
laneStatusSchema.statics.findActiveEmergencies = function() {
  return this.find({ 'emergency.isActive': true });
};

laneStatusSchema.statics.findByLocation = function(lat, lng, radius = 1000) {
  return this.find({
    'location.latitude': {
      $gte: lat - (radius / 111000),
      $lte: lat + (radius / 111000)
    },
    'location.longitude': {
      $gte: lng - (radius / (111000 * Math.cos(lat * Math.PI / 180))),
      $lte: lng + (radius / (111000 * Math.cos(lat * Math.PI / 180)))
    }
  });
};

export default mongoose.model('LaneStatus', laneStatusSchema);