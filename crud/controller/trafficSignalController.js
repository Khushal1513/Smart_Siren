import TrafficSignal, { TRAFFIC_SIGNAL_STATUSES } from '../model/trafficSignalModel.js';

// Register a new traffic signal
export const registerTrafficSignal = async (req, res) => {
  try {
    const {
      signalId,
      city,
      area,
      intersection,
      signalType,
      hasPedestrianCrossing,
      hasCamera,
      status,
    } = req.body ?? {};
    const requiredFields = { signalId, city, area, intersection };
    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => typeof value !== 'string' || !value.trim())
      .map(([field]) => field);

    if (missingFields.length) {
      return res.status(400).json({
        success: false,
        message: 'Signal ID, city, area, and intersection are required.',
        details: missingFields,
      });
    }

    if (signalType !== undefined && !['standard', 'smart', 'adaptive', 'emergency'].includes(signalType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signal type.',
      });
    }

    for (const [field, value] of Object.entries({ hasPedestrianCrossing, hasCamera })) {
      if (value !== undefined && typeof value !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: `${field} must be a boolean.`,
        });
      }
    }

    const normalizedSignalId = signalId.trim().toUpperCase();
    const existingSignal = await TrafficSignal.findOne({ signalId: normalizedSignalId });
    if (existingSignal) {
      return res.status(409).json({
        success: false,
        message: `Signal ${normalizedSignalId} is already registered.`,
      });
    }

    const normalizedCity = city.trim();
    const normalizedArea = area.trim();
    const normalizedIntersection = intersection.trim();
    const newSignal = await TrafficSignal.create({
      signalId: normalizedSignalId,
      city: normalizedCity,
      area: normalizedArea,
      intersection: normalizedIntersection,
      location: `${normalizedIntersection}, ${normalizedArea}, ${normalizedCity}`,
      signalType,
      hasPedestrianCrossing,
      hasCamera,
      status,
    });

    return res.status(201).json({
      success: true,
      message: `Traffic signal ${normalizedSignalId} registered successfully.`,
      data: newSignal,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A traffic signal with this ID is already registered.',
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Traffic signal validation failed.',
        details: Object.values(error.errors).map(({ message }) => message),
      });
    }

    console.error('Error registering traffic signal:', error);
    return res.status(500).json({
      success: false,
      message: 'Error registering traffic signal.',
    });
  }
};

// Get total count of traffic signals
export const getSignalCount = async (req, res) => {
  try {
    const count = await TrafficSignal.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error counting signals', error });
  }
};

// Get all traffic signals
export const getAllTrafficSignals = async (req, res) => {
  try {
    const signals = await TrafficSignal.find();
    res.status(200).json(signals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching signals', error });
  }
};

// Update a traffic signal
export const updateTrafficSignal = async (req, res) => {
  try {
    const { signalId, status } = req.body ?? {};
    if (typeof signalId !== 'string' || !signalId.trim() || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Signal ID and status are required.',
      });
    }

    const normalizedStatus = status.trim().toLowerCase();
    if (!TRAFFIC_SIGNAL_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${TRAFFIC_SIGNAL_STATUSES.join(', ')}.`,
      });
    }

    const updatedSignal = await TrafficSignal.findOneAndUpdate(
      { signalId: signalId.trim().toUpperCase() },
      { $set: { status: normalizedStatus } },
      { new: true }
    );
    if (!updatedSignal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    return res.status(200).json(updatedSignal);
  } catch (error) {
    console.error('Error updating traffic signal:', error);
    return res.status(500).json({ message: 'Error updating signal' });
  }
};

// (Alternate or custom logic) Get traffic signals
export const getTrafficSignals = async (req, res) => {
  try {
    const signals = await TrafficSignal.find();
    res.status(200).json(signals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching signals', error });
  }
};

// Get a signal by ID
export const getTrafficSignalById = async (req, res) => {
  try {
    const { signalId } = req.params;
    const signal = await TrafficSignal.findOne({ signalId });
    if (signal) {
      res.status(200).json(signal);
    } else {
      res.status(404).json({ message: 'Signal not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving signal', error });
  }
};

// Delete a traffic signal
export const deleteTrafficSignal = async (req, res) => {
  try {
    const { signalId } = req.params;
    const deleted = await TrafficSignal.findOneAndDelete({ signalId });
    if (deleted) {
      res.status(200).json({ message: 'Signal deleted' });
    } else {
      res.status(404).json({ message: 'Signal not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting signal', error });
  }
};

// Update only the status of a signal
export const updateSignalStatus = async (req, res) => {
  try {
    return updateTrafficSignal(req, res);
  } catch (error) {
    console.error('Error updating traffic signal status:', error);
    return res.status(500).json({ message: 'Error updating status' });
  }
};

// Control traffic signal (dummy placeholder)
export const controlTrafficSignal = async (req, res) => {
  try {
    const { signalId } = req.params;
    // Your custom control logic here
    res.status(200).json({ message: `Signal ${signalId} controlled.` });
  } catch (error) {
    res.status(500).json({ message: 'Error controlling signal', error });
  }
};
