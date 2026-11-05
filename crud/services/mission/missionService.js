'use strict';

const Mission = require('../../model/Mission');
const bus = require('../../realtime/eventBus');
const { transition, IllegalTransitionError } = require('./missionStateMachine');
const { AppError } = require('./errors');
const {
  MISSION_STATUS: S,
  MISSION_STATUS_VALUES,
  MAX_POSITIONS,
  EVENTS,
} = require('../../config/constants');

/**
 * Build the "mission:update" payload (contract section 7).
 * @param {object} m mission doc
 */
function toUpdatePayload(m) {
  const last = m.positions && m.positions.length ? m.positions[m.positions.length - 1] : null;
  return {
    missionId: String(m._id),
    status: m.status,
    position: last ? { lat: last.lat, lng: last.lng, speedKmh: last.speedKmh, ts: last.ts } : null,
    etaP50: m.etaP50 ?? null,
    etaP90: m.etaP90 ?? null,
  };
}

function emitUpdate(m) {
  try {
    bus.emit(EVENTS.MISSION_UPDATE, toUpdatePayload(m));
  } catch (err) {
    // A bad listener must never break the mission flow.
    console.error('[mission] listener error', err);
  }
}

async function load(id) {
  const m = await Mission.findById(id);
  if (!m) throw new AppError(404, `Mission ${id} not found`);
  return m;
}

/**
 * Load, transition, optionally mutate, save and emit.
 * @param {string} id
 * @param {string} to
 * @param {(m:object)=>void} [mutate]
 */
async function applyTransition(id, to, mutate) {
  const m = await load(id);
  try {
    transition(m, to);
  } catch (err) {
    if (err instanceof IllegalTransitionError) throw new AppError(409, err.message);
    throw err;
  }
  if (mutate) mutate(m);
  await m.save();
  emitUpdate(m);
  return m;
}

/**
 * @param {{vehicleId:string, route?:Array, severity?:number}} input
 */
async function createMission(input = {}) {
  if (!input.vehicleId || typeof input.vehicleId !== 'string') {
    throw new AppError(400, 'vehicleId is required');
  }
  const m = await Mission.create({
    vehicleId: input.vehicleId,
    route: input.route || [],
    severity: input.severity,
    status: S.CREATED,
  });
  emitUpdate(m);
  return m;
}

/** CREATED -> ACTIVE. Starts the watchdog grace window via lastPositionAt. */
async function activateMission(id) {
  return applyTransition(id, S.ACTIVE, (m) => {
    m.lastPositionAt = new Date();
  });
}

/**
 * Append a position (capped to the last MAX_POSITIONS) to an ACTIVE mission.
 * @param {string} id
 * @param {{lat:number,lng:number,speedKmh?:number,ts?:Date|string,etaP50?:number,etaP90?:number}} p
 */
async function addPosition(id, p = {}) {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) {
    throw new AppError(400, 'lat and lng must be finite numbers');
  }
  const ts = p.ts ? new Date(p.ts) : new Date();
  if (Number.isNaN(ts.getTime())) throw new AppError(400, 'ts is not a valid date');

  const set = { lastPositionAt: new Date() };
  if (Number.isFinite(p.etaP50)) set.etaP50 = p.etaP50;
  if (Number.isFinite(p.etaP90)) set.etaP90 = p.etaP90;

  const updated = await Mission.findOneAndUpdate(
    { _id: id, status: S.ACTIVE },
    {
      $push: {
        positions: {
          $each: [{ lat: p.lat, lng: p.lng, speedKmh: Number.isFinite(p.speedKmh) ? p.speedKmh : 0, ts }],
          $slice: -MAX_POSITIONS,
        },
      },
      $set: set,
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    const exists = await Mission.exists({ _id: id });
    if (!exists) throw new AppError(404, `Mission ${id} not found`);
    throw new AppError(409, 'Positions can only be added to an ACTIVE mission');
  }
  emitUpdate(updated);
  return updated;
}

/** ACTIVE -> ARRIVED. */
const markArrived = (id) => applyTransition(id, S.ARRIVED);

/** ARRIVED -> CLOSED. */
const closeMission = (id) => applyTransition(id, S.CLOSED);

/**
 * CREATED|ACTIVE -> ABORTED.
 * @param {string} id
 * @param {string} [reason]
 */
const abortMission = (id, reason = 'MANUAL') =>
  applyTransition(id, S.ABORTED, (m) => {
    m.abortReason = reason;
  });

const getMission = (id) => load(id);

/**
 * @param {{status?:string, limit?:number, skip?:number}} [filter]
 */
async function listMissions({ status, limit = 50, skip = 0 } = {}) {
  const q = {};
  if (status) {
    if (!MISSION_STATUS_VALUES.includes(status)) throw new AppError(400, `Invalid status ${status}`);
    q.status = status;
  }
  return Mission.find(q).select('-positions').sort({ createdAt: -1 }).skip(skip).limit(limit);
}

module.exports = {
  createMission,
  activateMission,
  addPosition,
  markArrived,
  closeMission,
  abortMission,
  getMission,
  listMissions,
  toUpdatePayload,
};