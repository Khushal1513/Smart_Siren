import express from 'express';
import ActiveAmbulance from '../model/ActiveAmbulance.js';

const router = express.Router();

// POST: Verify Emergency Request
router.post('/verify-emergency', (req, res) => {
  const { requestId } = req.body;

  // For example, a simple pattern match
  const isValid = /^#[0-9]{3}[A-Z]{2}[0-9]{4}$/.test(requestId);
  res.json({ valid: isValid });
});

// POST: Add Active Ambulance
router.post('/active-ambulances', async (req, res) => {
  try {
    const { ambulanceId, vehicleNumber, requestId, timestamp } = req.body;

    const newActiveAmbulance = new ActiveAmbulance({
      ambulanceId,
      vehicleNumber,
      requestId,
      timestamp
    });

    await newActiveAmbulance.save();
    res.status(201).json({ message: 'Ambulance marked as active' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Get all Active Ambulances
router.get('/active-ambulances', async (req, res) => {
  try {
    const activeList = await ActiveAmbulance.find().sort({ timestamp: -1 });
    res.json(activeList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;