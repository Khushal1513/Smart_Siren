import Vehicle from '../model/Vehicle.js';

// Register a new vehicle
export const registerVehicle = async (req, res) => {
  try {
    const { driverName, vehicleNumber } = req.body;

    if (!driverName || !vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: 'Driver name and vehicle number are required'
      });
    }

    const existingVehicle = await Vehicle.findByVehicleNumber(vehicleNumber);
    if (existingVehicle) {
      return res.status(409).json({
        success: false,
        message: 'Vehicle number already registered'
      });
    }

    const vehicle = new Vehicle({
      driverName: driverName.trim(),
      vehicleNumber: vehicleNumber.trim()
    });

    const savedVehicle = await vehicle.save();

    res.status(201).json({
      success: true,
      message: 'Vehicle registered successfully',
      data: savedVehicle.getRegistrationInfo()
    });

  } catch (error) {
    console.error('Vehicle registration error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Vehicle number already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all vehicles
export const getAllVehicles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const vehicles = await Vehicle.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Vehicle.countDocuments();

    res.status(200).json({
      success: true,
      data: vehicles.map(vehicle => vehicle.getRegistrationInfo()),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get vehicle by ID
export const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findOne({
      $or: [
        { _id: id },
        { vehicleId: id },
        { vehicleNumber: id.toUpperCase() }
      ]
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle.getRegistrationInfo()
    });

  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update vehicle
export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverName, vehicleNumber, status } = req.body;

    const vehicle = await Vehicle.findOne({
      $or: [
        { _id: id },
        { vehicleId: id }
      ]
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    if (vehicleNumber && vehicleNumber.toUpperCase() !== vehicle.vehicleNumber) {
      const existingVehicle = await Vehicle.findByVehicleNumber(vehicleNumber);
      if (existingVehicle) {
        return res.status(409).json({
          success: false,
          message: 'Vehicle number already exists'
        });
      }
    }

    if (driverName) vehicle.driverName = driverName.trim();
    if (vehicleNumber) vehicle.vehicleNumber = vehicleNumber.trim();
    if (status) vehicle.status = status;

    const updatedVehicle = await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: updatedVehicle.getRegistrationInfo()
    });

  } catch (error) {
    console.error('Update vehicle error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete vehicle
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findOneAndDelete({
      $or: [
        { _id: id },
        { vehicleId: id }
      ]
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });

  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
