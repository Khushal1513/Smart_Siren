import Ambulance from '../model/ambulanceModel.js';

/**
 * Fetch all active ambulances
 */
export const getActiveAmbulances = async (req, res) => {
  try {
    const activeAmbulances = await Ambulance.find({ active: true });
    res.status(200).json(activeAmbulances);
  } catch (error) {
    console.error('Failed to fetch active ambulances:', error.message);
    res.status(500).json({ message: 'Server error while fetching active ambulances' });
  }
};

/**
 * Activate an ambulance by ID
 */
export const activateAmbulance = async (req, res) => {
  const { id } = req.params;

  try {
    const ambulance = await Ambulance.findByIdAndUpdate(
      id,
      { active: true },
      { new: true }
    );

    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }

    res.status(200).json({ message: 'Ambulance activated', ambulance });
  } catch (error) {
    console.error('Failed to activate ambulance:', error.message);
    res.status(500).json({ message: 'Server error while activating ambulance' });
  }
};