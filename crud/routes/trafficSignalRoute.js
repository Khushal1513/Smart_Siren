import express from 'express';
import {
  registerTrafficSignal,
  getSignalCount,
  getAllTrafficSignals,
  updateTrafficSignal,
  getTrafficSignals,
  getTrafficSignalById,
  deleteTrafficSignal,
  updateSignalStatus,
  controlTrafficSignal
} from '../controller/trafficSignalController.js';

const router = express.Router();

router.post('/register', registerTrafficSignal);
router.get('/', getAllTrafficSignals);
router.put('/status', updateTrafficSignal); // or define a new route if needed

export default router;
