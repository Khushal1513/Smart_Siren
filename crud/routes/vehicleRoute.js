import express from 'express';
import {
  registerVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle
} from '../controller/vehicleController.js';

const router = express.Router();

// Middleware for logging requests (optional)
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
};

// Apply logging middleware to all routes
router.use(logRequest);

// Vehicle registration route (matches your frontend)
router.post('/register', registerVehicle);

// Get all vehicles with pagination
router.get('/', getAllVehicles);

// Get specific vehicle by ID, vehicleId, or vehicle number
router.get('/:id', getVehicleById);

// Update vehicle
router.put('/:id', updateVehicle);

// Delete vehicle
router.delete('/:id', deleteVehicle);

// Health check route
router.get('/health/check', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Vehicle service is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
