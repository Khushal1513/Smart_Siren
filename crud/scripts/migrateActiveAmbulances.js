'use strict';

/**
 * One-time migration: legacy activeambulances.json -> missions collection.
 * Never deletes or modifies the JSON file. Idempotent via legacyKey (hash of each entry).
 *
 * Usage: node scripts/migrateActiveAmbulances.js [path/to/file.json] [--status=CLOSED|ACTIVE]
 * Default status is CLOSED, because legacy "active" entries are stale. ACTIVE missions get
 * aborted by the watchdog after WATCHDOG_TIMEOUT_MS without positions.
 */
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Mission = require('../model/Mission');
const config = require('../config');
const { MISSION_STATUS } = require('../config/constants');

const pick = (o, keys) => keys.map((k) => o[k]).find((v) => v !== undefined && v !== null);

/**
 * Map one legacy entry to a Mission document, or null if unusable.
 * @param {object} entry
 * @param {string} status target status
 * @param {Date} now
 */
function mapLegacy(entry, status, now = new Date()) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const vehicleId = pick(entry, ['vehicleId', 'ambulanceId', 'vehicleNumber', 'id']);
  if (vehicleId === undefined || String(vehicleId).trim() === '') return null;

  const loc = entry.location && typeof entry.location === 'object' ? entry.location : {};
  const lat = Number(pick(entry, ['lat', 'latitude']) ?? pick(loc, ['lat', 'latitude']));
  const lng = Number(pick(entry, ['lng', 'lon', 'longitude']) ?? pick(loc, ['lng', 'lon', 'longitude']));
  const hasPos = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const doc = {
    vehicleId: String(vehicleId).trim(),
    status,
    severity: 3,
    positions: hasPos ? [{ lat, lng, speedKmh: 0, ts: now }] : [],
    legacyKey: crypto.createHash('sha1').update(JSON.stringify(entry)).digest('hex'),
  };
  if (status === MISSION_STATUS.ACTIVE) {
    doc.startedAt = now;
    doc.lastPositionAt = now;
  } else {
    doc.startedAt = now;
    doc.arrivedAt = now;
    doc.closedAt = now;
  }
  return doc;
}

/**
 * Run the migration against an already-connected mongoose.
 * @param {{file?:string, status?:string}} [opts]
 * @returns {Promise<{total:number,created:number,skipped:number,invalid:number,note?:string}>}
 */
async function migrate({ file = config.legacyAmbulancesFile, status = MISSION_STATUS.CLOSED } = {}) {
  const result = { total: 0, created: 0, skipped: 0, invalid: 0 };
  if (![MISSION_STATUS.CLOSED, MISSION_STATUS.ACTIVE].includes(status)) {
    throw new Error('status must be CLOSED or ACTIVE');
  }
  if (!fs.existsSync(file)) return { ...result, note: `file not found: ${file}` };

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return { ...result, note: `malformed JSON: ${err.message}` };
  }
  if (!Array.isArray(parsed)) return { ...result, note: 'expected a JSON array' };

  result.total = parsed.length;
  for (const entry of parsed) {
    const doc = mapLegacy(entry, status);
    if (!doc) {
      result.invalid += 1;
      continue;
    }
    if (await Mission.exists({ legacyKey: doc.legacyKey })) {
      result.skipped += 1;
      continue;
    }
    try {
      await Mission.create(doc);
      result.created += 1;
    } catch (err) {
      result.invalid += 1;
      console.warn(`[migrate] skipped ${doc.vehicleId}: ${err.message}`);
    }
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const statusArg = args.find((a) => a.startsWith('--status='));
  await mongoose.connect(config.mongoUri);
  try {
    const res = await migrate({ file, status: statusArg ? statusArg.split('=')[1] : undefined });
    console.log('[migrate] result:', res);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[migrate] failed', err);
    process.exit(1);
  });
}

module.exports = { migrate, mapLegacy };