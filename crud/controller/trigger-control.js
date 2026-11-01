// controllers/trigger-control.js
import Ambulance from '../model/trigger-model.js';

// POST /api/verify-engine-vehicle
export const verifyEngineAndVehicle = async (req, res) => {
  const { engineNumber, vehicleNumber } = req.body;

  try {
    const ambulance = await Ambulance.findOne({ engineNumber, vehicleNumber });
    if (ambulance) {
      return res.json({ valid: true });
    } else {
      return res.json({ valid: false });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error during verification' });
  }
};

// POST /api/active-ambulances
export const activateAmbulance = async (req, res) => {
  const { engineNumber, vehicleNumber, timestamp } = req.body;

  try {
    const ambulance = await Ambulance.findOneAndUpdate(
      { engineNumber, vehicleNumber },
      { status: 'active' },
      { new: true }
    );

    if (!ambulance) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    return res.json({ message: 'Ambulance activated', ambulance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to activate ambulance' });
  }
};

// GET /api/active-ambulances
export const getActiveAmbulances = async (req, res) => {
  try {
    const ambulances = await Ambulance.find({
      status: { $in: ['active', 'emergency'] },
    });

    return res.json(ambulances);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch ambulances' });
  }
};

