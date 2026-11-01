import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  ambulanceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  driverName: {
    type: String,
    required: true,
    trim: true
  },
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  engineNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{7}$/.test(v); // Exactly 7 digits
      },
      message: 'Engine number must be exactly 7 digits'
    }
  },
  status: {
    type: String,
    enum: ['available', 'active', 'maintenance'],
    default: 'available'
  },
  registrationDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('Vehicle', vehicleSchema);