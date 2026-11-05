import Mission from '../../model/Mission.js';
import bus from '../../realtime/eventBus.js';
import { TRANSITIONS } from './missionStateMachine.js';
import { AppError } from './errors.js';
import {
  MISSION_STATUS as S,
  MISSION_STATUS_VALUES,
  MAX_POSITIONS,
  EVENTS,
} from '../../config/constants.js';

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
 * Atomic compare-and-set transition.
 * 1. Read the current status.
 * 2. Validate from -> to against the transition table.
 * 3. Update only if the status in the database is STILL `from`.
 * A concurrent change makes the update match nothing, which returns 409,
 * so a mission can never skip through two states in one race.
 *
 * @param {string} id
 * @param {string} to target status
 * @param {(changes:object)=>void} [mutate] adds extra $set fields
 */
async function applyTransition(id, to, mutate) {
  const current = await load(id);
  const from = current.status;

  if (!(TRANSITIONS[from] || []).includes(to)) {
    throw new AppError(409, `Illegal mission transition ${from} -> ${to}`);
  }

  const timestamp = new Date();
  const changes = { status: to };
  if (to === S.ACTIVE) changes.startedAt = timestamp;
  if (to === S.ARRIVED) changes.arrivedAt = timestamp;
  if (to === S.CLOSED || to === S.ABORTED) changes.closedAt = timestamp;
  if (mutate) mutate(changes);

  const mission = await Mission.findOneAndUpdate(
    { _id: id, status: from },
    { $set: changes },
    { new: true, runValidators: true }
  );
  if (!mission) {
    throw new AppError(409, `Mission ${id} changed concurrently; transition to ${to} not applied`);
  }
  emitUpdate(mission);
  return mission;
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
  return applyTransition(id, S.ACTIVE, (changes) => {
    changes.lastPositionAt = changes.startedAt;
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
  applyTransition(id, S.ABORTED, (changes) => {
    changes.abortReason = reason;
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

export {
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