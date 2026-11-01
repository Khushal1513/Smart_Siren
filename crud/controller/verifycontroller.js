// controllers/verifycontroller.js
import  Ambulance from '../model/verifymodel.js';

export const verifyEngineAndVehicle = async (req, res) => {
  const { engineNumber, vehicleNumber } = req.body;

  if (!engineNumber || !vehicleNumber) {
    return res.status(400).json({ valid: false, message: 'Missing parameters.' });
  }

  try {
    const ambulance = await Ambulance.findOne({ engineNumber, vehicleNumber });

    if (ambulance) {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(200).json({ valid: false });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ valid: false, message: 'Server error' });
  }
};