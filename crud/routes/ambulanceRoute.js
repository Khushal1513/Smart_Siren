import express from 'express';
import Vehicle from '../model/Vehicle.js';
import ActiveAmbulance from '../model/ActiveAmbulance.js';
import LaneStatus from '../model/LaneStatus.js';

const router = express.Router();

// Initialize lanes on server start (call this once)
router.post('/init-lanes', async (req, res) => {
  try {
    await LaneStatus.initializeLanes();
    res.status(200).json({
      success: true,
      message: 'Lanes initialized successfully'
    });
  } catch (error) {
    console.error('Lane initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing lanes',
      error: error.message
    });
  }
});

// Get all active ambulances
router.get('/active', async (req, res) => {
  try {
    const activeAmbulances = await ActiveAmbulance.find()
      .populate('ambulanceId', 'driverName')
      .sort({ activatedAt: -1 });

    res.status(200).json({
      success: true,
      data: activeAmbulances,
      count: activeAmbulances.length
    });

  } catch (error) {
    console.error('Get active ambulances error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active ambulances',
      error: error.message
    });
  }
});

// Activate ambulance (from TriggeredEmergency page)
router.post('/activate', async (req, res) => {
  try {
    const { engineNumber, vehicleNumber } = req.body;

    // Validation
    if (!engineNumber || !vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: 'Engine number and vehicle number are required'
      });
    }

    // Find and verify vehicle
    const vehicle = await Vehicle.findOne({
      engineNumber: engineNumber.trim(),
      vehicleNumber: vehicleNumber.toUpperCase().trim()
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle verification failed'
      });
    }

    // Check if already active
    const existingActive = await ActiveAmbulance.findOne({
      ambulanceId: vehicle.ambulanceId,
      status: { $in: ['emergency', 'dispatched'] }
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: 'Ambulance is already active'
      });
    }

    // Create active ambulance record
    const activeAmbulance = new ActiveAmbulance({
      ambulanceId: vehicle.ambulanceId,
      engineNumber: vehicle.engineNumber,
      vehicleNumber: vehicle.vehicleNumber,
      status: 'emergency'
    });

    await activeAmbulance.save();

    // Update vehicle status
    vehicle.status = 'active';
    await vehicle.save();

    res.status(201).json({
      success: true,
      message: 'Ambulance activated successfully',
      data: {
        id: activeAmbulance._id,
        ambulanceId: vehicle.ambulanceId,
        driverName: vehicle.driverName,
        vehicleNumber: vehicle.vehicleNumber,
        status: activeAmbulance.status,
        activatedAt: activeAmbulance.activatedAt
      }
    });

  } catch (error) {
    console.error('Ambulance activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during ambulance activation',
      error: error.message
    });
  }
});

// Get available lanes
router.get('/lanes/available', async (req, res) => {
  try {
    const availableLanes = await LaneStatus.find({ isOccupied: false })
      .sort({ laneId: 1 });

    res.status(200).json({
      success: true,
      data: availableLanes.map(lane => ({
        laneId: lane.laneId,
        label: `Lane ${lane.laneId.slice(1)}`,
        isAvailable: !lane.isOccupied
      }))
    });

  } catch (error) {
    console.error('Get available lanes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available lanes',
      error: error.message
    });
  }
});

// Get all lanes status
router.get('/lanes/status', async (req, res) => {
  try {
    const allLanes = await LaneStatus.find().sort({ laneId: 1 });

    res.status(200).json({
      success: true,
      data: allLanes.map(lane => ({
        laneId: lane.laneId,
        label: `Lane ${lane.laneId.slice(1)}`,
        isOccupied: lane.isOccupied,
        occupiedBy: lane.occupiedBy,
        occupiedAt: lane.occupiedAt,
        status: lane.isOccupied ? 'occupied' : 'available'
      }))
    });

  } catch (error) {
    console.error('Get lanes status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lanes status',
      error: error.message
    });
  }
});

// Dispatch ambulance to lane
router.post('/dispatch', async (req, res) => {
  try {
    const { ambulanceId, laneId } = req.body;

    // Validation
    if (!ambulanceId || !laneId) {
      return res.status(400).json({
        success: false,
        message: 'Ambulance ID and Lane ID are required'
      });
    }

    // Check if lane is available
    const lane = await LaneStatus.findOne({ laneId });
    if (!lane) {
      return res.status(404).json({
        success: false,
        message: 'Lane not found'
      });
    }

    if (lane.isOccupied) {
      return res.status(400).json({
        success: false,
        message: 'Lane is already occupied'
      });
    }

    // Find active ambulance
    const activeAmbulance = await ActiveAmbulance.findOne({
      ambulanceId,
      status: 'emergency'
    });

    if (!activeAmbulance) {
      return res.status(404).json({
        success: false,
        message: 'Active ambulance not found or already dispatched'
      });
    }

    // Update ambulance status and assign lane
    activeAmbulance.status = 'dispatched';
    activeAmbulance.assignedLane = laneId;
    activeAmbulance.location = `Lane ${laneId.slice(1)}`;
    activeAmbulance.dispatchedAt = new Date();
    await activeAmbulance.save();

    // Update lane status
    lane.isOccupied = true;
    lane.occupiedBy = ambulanceId;
    lane.occupiedAt = new Date();
    lane.lastUpdated = new Date();
    await lane.save();

    res.status(200).json({
      success: true,
      message: `Ambulance ${ambulanceId} dispatched to ${laneId}`,
      data: {
        ambulanceId,
        laneId,
        status: 'dispatched',
        dispatchedAt: activeAmbulance.dispatchedAt
      }
    });

  } catch (error) {
    console.error('Dispatch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during dispatch',
      error: error.message
    });
  }
});

// Complete mission and free up lane
router.post('/complete-mission', async (req, res) => {
  try {
    const { ambulanceId } = req.body;

    if (!ambulanceId) {
      return res.status(400).json({
        success: false,
        message: 'Ambulance ID is required'
      });
    }

    // Find dispatched ambulance
    const activeAmbulance = await ActiveAmbulance.findOne({
      ambulanceId,
      status: 'dispatched'
    });

    if (!activeAmbulance) {
      return res.status(404).json({
        success: false,
        message: 'Dispatched ambulance not found'
      });
    }

    // Free up the lane
    if (activeAmbulance.assignedLane) {
      await LaneStatus.findOneAndUpdate(
        { laneId: activeAmbulance.assignedLane },
        {
          isOccupied: false,
          occupiedBy: null,
          occupiedAt: null,
          lastUpdated: new Date()
        }
      );
    }

    // Update ambulance status to completed
    activeAmbulance.status = 'completed';
    activeAmbulance.completedAt = new Date();
    await activeAmbulance.save();

    // Update vehicle status back to available
    await Vehicle.findOneAndUpdate(
      { ambulanceId },
      { status: 'available' }
    );

    res.status(200).json({
      success: true,
      message: `Mission completed for ambulance ${ambulanceId}`,
      data: {
        ambulanceId,
        laneFreed: activeAmbulance.assignedLane,
        completedAt: activeAmbulance.completedAt
      }
    });

  } catch (error) {
    console.error('Complete mission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during mission completion',
      error: error.message
    });
  }
});

// Delete completed ambulance records (cleanup)
router.delete('/cleanup-completed', async (req, res) => {
  try {
    const result = await ActiveAmbulance.deleteMany({ status: 'completed' });

    res.status(200).json({
      success: true,
      message: `Cleaned up ${result.deletedCount} completed ambulance records`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during cleanup',
      error: error.message
    });
  }
});

export default router;