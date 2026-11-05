'use strict';

const path = require('path');

// dotenv is optional: if it is not installed, plain process.env is used.
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {
  /* no dotenv, fall back to process.env */
}

/**
 * Read a positive integer env var.
 * @param {string} name
 * @param {number} def default when unset/invalid
 * @returns {number}
 */
function intEnv(name, def) {
  const n = parseInt(process.env[name], 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

/**
 * Central runtime configuration. All values come from env with safe defaults.
 */
const config = Object.freeze({
  port: intEnv('PORT', 8000),
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartsiren',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8200',
  sumoBridgeUrl: process.env.SUMO_BRIDGE_URL || 'http://localhost:8100',
  watchdogTimeoutMs: intEnv('WATCHDOG_TIMEOUT_MS', 60000),
  watchdogIntervalMs: intEnv('WATCHDOG_INTERVAL_MS', 5000),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  legacyAmbulancesFile:
    process.env.LEGACY_AMBULANCES_FILE || path.join(__dirname, '..', 'activeambulances.json'),
});

module.exports = config;