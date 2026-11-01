import express from 'express';
import Vehicle from '../model/Vehicle.js';

const router = express.Router();

// Verify engine number and vehicle number combination
router.post('/verify-engine-vehicle', async (req, res) => {
  try {
    const { engineNumber, vehicleNumber } = req.body;

    // Validation
    if (!engineNumber || !vehicleNumber) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Engine number and vehicle number are required'
      });
    }

    // Validate engine number format (7 digits)
    if (!/^\d{7}$/.test(engineNumber)) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Engine number must be exactly 7 digits'
      });
    }

    // Find vehicle with matching engine number and vehicle number
    const vehicle = await Vehicle.findOne({
      engineNumber: engineNumber.trim(),
      vehicleNumber: vehicleNumber.toUpperCase().trim()
    });

    if (!vehicle) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'Engine number and vehicle number do not match'
      });
    }

    // Check if vehicle is available
    if (vehicle.status !== 'available') {
      return res.status(200).json({
        success: true,
        valid: false,
        message: `Vehicle is currently ${vehicle.status} and cannot be activated`
      });
    }

    // Successful verification
    res.status(200).json({
      success: true,
      valid: true,
      message: 'Verification successful',
      data: {
        ambulanceId: vehicle.ambulanceId,
        driverName: vehicle.driverName,
        vehicleNumber: vehicle.vehicleNumber,
        engineNumber: vehicle.engineNumber
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Server error during verification',
      error: error.message
    });
  }
});

// Additional verification endpoint for ambulance ID
router.post('/ambulance-id', async (req, res) => {
  try {
    const { ambulanceId } = req.body;

    if (!ambulanceId) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Ambulance ID is required'
      });
    }

    const vehicle = await Vehicle.findOne({ ambulanceId: ambulanceId.trim() });

    if (!vehicle) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'Ambulance ID not found'
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      message: 'Ambulance ID verified',
      data: {
        ambulanceId: vehicle.ambulanceId,
        driverName: vehicle.driverName,
        vehicleNumber: vehicle.vehicleNumber,
        status: vehicle.status
      }
    });

  } catch (error) {
    console.error('Ambulance ID verification error:', error);
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Server error during ambulance ID verification',
      error: error.message
    });
  }
});

export default router;