import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Import routes
import userRoute from './routes/userRoute.js';
import trafficSignalRoute from './routes/trafficSignalRoute.js';
import vehicleRoute from './routes/vehicleRoute.js';
import ambulanceRoute from './routes/ambulanceRoute.js';
import verifyRoute from './routes/verifyroute.js';
import { createArduinoRouter } from './arduino_server/arduino-server.js';

// Import models for initialization
import LaneStatus from './model/LaneStatus.js';

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Body parser middleware
app.use(bodyParser.json());
app.use(express.json()); // Additional JSON parsing
app.use(express.urlencoded({ extended: true })); // URL encoded parsing

// Add request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', req.body);
  }
  next();
});

// Mount routes
app.use('/api/user', userRoute);
app.use('/api/traffic-signals', trafficSignalRoute);
app.use('/api/vehicles', vehicleRoute);
app.use('/api/ambulance', ambulanceRoute);
app.use('/api/verify', verifyRoute);
app.use('/api/dispatch', createArduinoRouter());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URI || 'mongodb://localhost:27017/crud';

// MongoDB connection (removed deprecated options)
mongoose.connect(MONGO_URL)
.then(async () => {
  console.log('✅ MongoDB connected successfully');
  
  // Initialize lanes if the function exists
  try {
    if (LaneStatus && typeof LaneStatus.initializeLanes === 'function') {
      await LaneStatus.initializeLanes();
      console.log('✅ Lanes initialized successfully');
    } else {
      console.log('⚠️ LaneStatus.initializeLanes not found, skipping initialization');
    }
  } catch (err) {
    console.error('❌ Lane initialization error:', err.message);
  }
  
  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});