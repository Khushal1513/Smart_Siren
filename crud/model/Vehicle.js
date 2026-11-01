// ES Module format
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const vehicleSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    unique: true,
    default: () => `VEH-${uuidv4().substring(0, 8).toUpperCase()}`
  },
  driverName: {
    type: String,
    required: [true, 'Driver name is required'],
    trim: true,
    minlength: [2, 'Driver name must be at least 2 characters long'],
    maxlength: [100, 'Driver name cannot exceed 100 characters']
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    trim: true,
    uppercase: true,
    unique: true,
    validate: {
      validator: v => /^[A-Z0-9]{3,10}$/.test(v),
      message: 'Vehicle number must be 3–10 characters long and contain only letters and numbers'
    }
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

vehicleSchema.index({ vehicleNumber: 1 }, { unique: true });
vehicleSchema.index({ vehicleId: 1 }, { unique: true });
vehicleSchema.index({ driverName: 1 });

vehicleSchema.methods.getRegistrationInfo = function () {
  return {
    _id: this._id,
    vehicleId: this.vehicleId,
    driverName: this.driverName,
    vehicleNumber: this.vehicleNumber,
    registrationDate: this.registrationDate,
    status: this.status
  };
};

vehicleSchema.statics.findByVehicleNumber = function (vehicleNumber) {
  return this.findOne({ vehicleNumber: vehicleNumber.toUpperCase() });
};

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;
