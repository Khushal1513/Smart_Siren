import express from 'express';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import config from './config/index.js';

// Import routes
import userRoute from './routes/userRoute.js';
import trafficSignalRoute from './routes/trafficSignalRoute.js';
import vehicleRoute from './routes/vehicleRoute.js';
import ambulanceRoute from './routes/ambulanceRoute.js';
import verifyRoute from './routes/verifyroute.js';
import missionRoute from './routes/missionRoute.js';
import { createArduinoRouter } from './arduino_server/arduino-server.js';
import { attachSocketServer } from './realtime/socketServer.js';
import { startMissionWatchdog } from './jobs/missionWatchdog.js';

// Import models for initialization
import LaneStatus from './model/LaneStatus.js';

const app = express();

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
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
app.use('/api/missions', missionRoute);
app.use('/api/dispatch', createArduinoRouter());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const httpServer = createServer(app);
attachSocketServer(httpServer);
let missionWatchdog;

// MongoDB connection (removed deprecated options)
mongoose.connect(config.mongoUri)
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

  missionWatchdog = startMissionWatchdog();
  
  // Start server
  httpServer.listen(config.port, () => {
    console.log(`🚀 Server is running on port ${config.port}`);
    console.log(`🌐 Health check: http://localhost:${config.port}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

httpServer.on('close', async () => {
  missionWatchdog?.stop();
  await mongoose.disconnect();
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