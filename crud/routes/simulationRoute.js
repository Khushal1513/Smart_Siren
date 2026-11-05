import express from 'express';
import { getSimulationConfiguration, getSimulationRun } from '../services/simulation/simulationManager.js';
import { validateIdParam } from '../middleware/validate.js';

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({ data: getSimulationConfiguration() });
});

router.get('/:missionId', (req, res, next) => {
  validateIdParam(req, res, next, req.params.missionId);
}, async (req, res, next) => {
  try {
    const simulation = await getSimulationRun(req.params.missionId);
    res.json({ data: simulation });
  } catch (error) {
    next(error);
  }
});

// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[simulation]', err);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    details: err.details,
  });
});

export default router;
