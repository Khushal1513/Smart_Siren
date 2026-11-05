/**
 * @file mockMissionApi.js
 * @description In-memory mock backend implementing mission state machine, validation, 500 cap, and watchdog.
 */

let missions = [
  {
    _id: 'mock-1',
    vehicleId: 'AMB-101',
    status: 'CREATED',
    route: [
      { signalId: 'SIG-01', distanceAlongRouteM: 0 },
      { signalId: 'SIG-02', distanceAlongRouteM: 500 },
    ],
    positions: [],
    etaP50: 120,
    etaP90: 180,
    severity: 3,
    startedAt: null,
    arrivedAt: null,
    closedAt: null,
    lastPositionAt: null,
    abortReason: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const subscribers = new Set();

/**
 * Subscribes to mock real-time events.
 * @param {Function} cb - Event callback
 * @returns {Function} Unsubscribe function
 */
export function subscribe(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function emitUpdate(event, payload) {
  subscribers.forEach((cb) => cb(event, payload));
}

function createError(status, message, details = []) {
  const err = new Error(message);
  err.status = status;
  err.details = details;
  return err;
}

/**
 * Creates a mock mission.
 */
export async function createMission(payload) {
  if (!payload || !payload.vehicleId || typeof payload.vehicleId !== 'string' || payload.vehicleId.trim() === '') {
    throw createError(400, 'Validation error', ['vehicleId is required and must be a non-empty string']);
  }
  if (payload.vehicleId.length > 64) {
    throw createError(400, 'Validation error', ['vehicleId must be at most 64 characters']);
  }
  if (payload.severity !== undefined && (payload.severity < 1 || payload.severity > 5)) {
    throw createError(400, 'Validation error', ['severity must be between 1 and 5']);
  }

  const now = new Date().toISOString();
  const newMission = {
    _id: `mock-${Date.now()}`,
    vehicleId: payload.vehicleId,
    status: 'CREATED',
    route: payload.route || [],
    positions: [],
    etaP50: 300,
    etaP90: 450,
    severity: payload.severity || 3,
    startedAt: null,
    arrivedAt: null,
    closedAt: null,
    lastPositionAt: null,
    abortReason: null,
    createdAt: now,
    updatedAt: now,
  };

  missions.unshift(newMission);
  return { ...newMission };
}

/**
 * Lists mock missions.
 */
export async function listMissions({ status, limit = 50, skip = 0 } = {}) {
  let filtered = [...missions];
  if (status) {
    filtered = filtered.filter((m) => m.status === status);
  }
  const count = filtered.length;
  const sliced = filtered.slice(skip, skip + limit).map((m) => {
    const { positions, ...rest } = m;
    return rest;
  });
  return { data: sliced, count };
}

/**
 * Gets a single mock mission.
 */
export async function getMission(id) {
  const m = missions.find((item) => item._id === id);
  if (!m) throw createError(404, 'Mission not found');
  return { ...m };
}

/**
 * Activates a mock mission.
 */
export async function activateMission(id) {
  const m = missions.find((item) => item._id === id);
  if (!m) throw createError(404, 'Mission not found');
  if (m.status !== 'CREATED') {
    throw createError(409, `Illegal transition from ${m.status} to ACTIVE`, ['Mission must be in CREATED state to activate']);
  }
  m.status = 'ACTIVE';
  m.startedAt = new Date().toISOString();
  m.updatedAt = new Date().toISOString();
  m.lastPositionAt = new Date().toISOString();

  // Watchdog timer simulation (60s timeout)
  if (m._watchdog) clearTimeout(m._watchdog);
  m._watchdog = setTimeout(() => {
    if (m.status === 'ACTIVE') {
      m.status = 'ABORTED';
      m.abortReason = 'WATCHDOG_TIMEOUT';
      m.updatedAt = new Date().toISOString();
      emitUpdate('mission:update', { missionId: m._id, status: 'ABORTED', position: null, etaP50: m.etaP50, etaP90: m.etaP90 });
    }
  }, 60000);

  emitUpdate('mission:update', { missionId: m._id, status: 'ACTIVE', position: null, etaP50: m.etaP50, etaP90: m.etaP90 });
  return { ...m };
}

/**
 * Adds position to mock active mission.
 */
export async function addPosition(id, payload) {
  const m = missions.find((item) => item._id === id);
  if (!m) throw createError(404, 'Mission not found');
  if (m.status !== 'ACTIVE') {
    throw createError(409, 'Positions can only be added while ACTIVE', [`Current status is ${m.status}`]);
  }
  if (!payload || payload.lat === undefined || payload.lng === undefined) {
    throw createError(400, 'Validation error', ['lat and lng are required']);
  }

  const pos = {
    lat: payload.lat,
    lng: payload.lng,
    speedKmh: payload.speedKmh !== undefined ? payload.speedKmh : 50,
    ts: payload.ts || new Date().toISOString(),
  };

  m.positions.push(pos);
  if (m.positions.length > 500) {
    m.positions.shift(); // Cap at 500
  }

  if (payload.etaP50 !== undefined) m.etaP50 = payload.etaP50;
  if (payload.etaP90 !== undefined) m.etaP90 = payload.etaP90;

  m.lastPositionAt = new Date().toISOString();
  m.updatedAt = new Date().toISOString();

  // Refresh watchdog
  if (m._watchdog) clearTimeout(m._watchdog);
  m._watchdog = setTimeout(() => {
    if (m.status === 'ACTIVE') {
      m.status = 'ABORTED';
      m.abortReason = 'WATCHDOG_TIMEOUT';
      m.updatedAt = new Date().toISOString();
      emitUpdate('mission:update', { missionId: m._id, status: 'ABORTED', position: null, etaP50: m.etaP50, etaP90: m.etaP90 });
    }
  }, 60000);

  emitUpdate('mission:update', {
    missionId: m._id,
    status: m.status,
    position: pos,
    etaP50: m.etaP50,
    etaP90: m.etaP90,
  });

  return { ...m };
}

/**
 * Marks mock mission arrived.
 */
export async function markArrived(id) {
  const m = missions.find((item) => item._id === id);
  if (!m) throw createError(404, 'Mission not found');
  if (m.status !== 'ACTIVE') {
    throw createError(409, `Illegal transition from ${m.status} to ARRIVED`, ['Mission must be ACTIVE']);
  }
  if (m._watchdog) clearTimeout(m._watchdog);
  m.status = 'ARRIVED';
  m.arrivedAt = new Date().toISOString();
  m.updatedAt = new Date().toISOString();

  emitUpdate('mission:update', { missionId: m._id, status: 'ARRIVED', position: null, etaP50: m.etaP50, etaP90: m.etaP90 });
  return { ...m };
}

/**
 * Closes mock mission.
 */
export async function closeMission(id) {
  const m = missions.find((item) => item._id === id);
  if (!m) throw createError(404, 'Mission not found');
  if (m.status !== 'ARRIVED') {
    throw createError(409, `Illegal transition from ${m.status} to CLOSED`, ['Mission must be ARRIVED']);
  }
  m.status = 'CLOSED';
  m.closedAt = new Date().toISOString();
  m.updatedAt = new Date().toISOString();

  emitUpdate('mission:update', { missionId: m._id, status: 'CLOSED', position: null, etaP50: m.etaP50, etaP90: m.etaP90 });
  return { ...m };
}

/**
 * Aborts mock mission.
 */
export async function abortMission(id, reason) {
  const m = missions.find((item) => item._id === id);
  if (!m) throw createError(404, 'Mission not found');
  if (m.status !== 'CREATED' && m.status !== 'ACTIVE') {
    throw createError(409, `Illegal transition from ${m.status} to ABORTED`, ['Mission can only be aborted from CREATED or ACTIVE']);
  }
  if (m._watchdog) clearTimeout(m._watchdog);
  m.status = 'ABORTED';
  m.abortReason = reason || 'Manual abort';
  m.updatedAt = new Date().toISOString();

  emitUpdate('mission:update', { missionId: m._id, status: 'ABORTED', position: null, etaP50: m.etaP50, etaP90: m.etaP90 });
  return { ...m };
}