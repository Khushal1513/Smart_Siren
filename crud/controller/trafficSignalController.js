import TrafficSignal from '../model/TrafficSignalModel.js';

// Register a new traffic signal
export const registerTrafficSignal = async (req, res) => {
  try {
    const { location, signalId } = req.body;
    const newSignal = new TrafficSignal({ location, signalId });
    await newSignal.save();
    res.status(201).json({ message: 'Traffic signal registered successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering signal', error });
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
    const { signalId, status } = req.body;
    const updatedSignal = await TrafficSignal.findOneAndUpdate(
      { signalId },
      { status },
      { new: true }
    );
    if (!updatedSignal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    res.status(200).json(updatedSignal);
  } catch (error) {
    res.status(500).json({ message: 'Error updating signal', error });
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
    const { signalId, status } = req.body;
    const updated = await TrafficSignal.findOneAndUpdate({ signalId }, { status }, { new: true });
    if (updated) {
      res.status(200).json(updated);
    } else {
      res.status(404).json({ message: 'Signal not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error });
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
