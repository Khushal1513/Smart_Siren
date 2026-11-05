/**
 * Hand-written request validation (no zod, so no extra dependency).
 * Each validator either calls next() or responds 400 {error, details}.
 */
import { MISSION_STATUS_VALUES, SEVERITY } from '../config/constants.js';

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function reject(res, details) {
  return res.status(400).json({ error: 'Validation failed', details });
}

/** router.param callback: validates the :id param. */
export function validateIdParam(req, res, next, value) {
  if (!OBJECT_ID_RE.test(String(value))) return reject(res, ['id must be a 24-char hex ObjectId']);
  return next();
}

/** POST /api/missions body: { vehicleId, route?, severity? } */
export function validateCreateMission(req, res, next) {
  const b = req.body;
  const errs = [];
  if (!isObj(b)) return reject(res, ['body must be a JSON object']);

  if (typeof b.vehicleId !== 'string' || !b.vehicleId.trim() || b.vehicleId.length > 64) {
    errs.push('vehicleId must be a non-empty string (max 64)');
  }
  let route = [];
  if (b.route !== undefined) {
    if (!Array.isArray(b.route) || b.route.length > 200) {
      errs.push('route must be an array (max 200 stops)');
    } else {
      b.route.forEach((r, i) => {
        if (!isObj(r) || typeof r.signalId !== 'string' || !r.signalId.trim()) {
          errs.push(`route[${i}].signalId must be a non-empty string`);
        }
        if (!isObj(r) || !isNum(r.distanceAlongRouteM) || r.distanceAlongRouteM < 0) {
          errs.push(`route[${i}].distanceAlongRouteM must be a number >= 0`);
        }
      });
      route = b.route.map((r) => ({ signalId: r && r.signalId, distanceAlongRouteM: r && r.distanceAlongRouteM }));
    }
  }
  if (b.severity !== undefined && !(Number.isInteger(b.severity) && b.severity >= SEVERITY.MIN && b.severity <= SEVERITY.MAX)) {
    errs.push(`severity must be an integer ${SEVERITY.MIN}-${SEVERITY.MAX}`);
  }
  let simulationConfig;
  if (b.simulationConfig !== undefined) {
    if (!isObj(b.simulationConfig)) {
      errs.push('simulationConfig must be an object');
    } else {
      const { mode, vehicleSource = 'REGISTERED', originEdgeId, destinationEdgeId } = b.simulationConfig;
      if (!['DEMO', 'LIVE'].includes(mode)) errs.push('simulationConfig.mode must be DEMO or LIVE');
      if (!['REGISTERED', 'SYNTHETIC_DEMO'].includes(vehicleSource)) {
        errs.push('simulationConfig.vehicleSource must be REGISTERED or SYNTHETIC_DEMO');
      }
      if (typeof originEdgeId !== 'string' || !originEdgeId.trim()) {
        errs.push('simulationConfig.originEdgeId must be a non-empty string');
      }
      if (typeof destinationEdgeId !== 'string' || !destinationEdgeId.trim()) {
        errs.push('simulationConfig.destinationEdgeId must be a non-empty string');
      }
      simulationConfig = {
        mode,
        vehicleSource,
        originEdgeId: typeof originEdgeId === 'string' ? originEdgeId.trim() : originEdgeId,
        destinationEdgeId: typeof destinationEdgeId === 'string' ? destinationEdgeId.trim() : destinationEdgeId,
      };
    }
  }
  if (errs.length) return reject(res, errs);

  req.body = { vehicleId: b.vehicleId.trim(), route, severity: b.severity };
  if (simulationConfig) req.body.simulationConfig = simulationConfig;
  return next();
}

/** POST /api/missions/:id/position body: { lat, lng, speedKmh?, ts?, etaP50?, etaP90? } */
export function validatePosition(req, res, next) {
  const b = req.body;
  const errs = [];
  if (!isObj(b)) return reject(res, ['body must be a JSON object']);

  if (!isNum(b.lat) || b.lat < -90 || b.lat > 90) errs.push('lat must be a number in [-90, 90]');
  if (!isNum(b.lng) || b.lng < -180 || b.lng > 180) errs.push('lng must be a number in [-180, 180]');
  if (b.speedKmh !== undefined && (!isNum(b.speedKmh) || b.speedKmh < 0 || b.speedKmh > 400)) {
    errs.push('speedKmh must be a number in [0, 400]');
  }
  if (b.ts !== undefined && Number.isNaN(new Date(b.ts).getTime())) errs.push('ts must be a valid date');
  ['etaP50', 'etaP90'].forEach((k) => {
    if (b[k] !== undefined && (!isNum(b[k]) || b[k] < 0)) errs.push(`${k} must be a number >= 0`);
  });
  if (errs.length) return reject(res, errs);

  req.body = { lat: b.lat, lng: b.lng, speedKmh: b.speedKmh, ts: b.ts, etaP50: b.etaP50, etaP90: b.etaP90 };
  return next();
}

/** GET /api/missions query: status?, limit?, skip? -> req.validatedQuery */
export function validateListQuery(req, res, next) {
  const { status, limit, skip } = req.query || {};
  const errs = [];
  const out = {};
  if (status !== undefined) {
    if (!MISSION_STATUS_VALUES.includes(status)) errs.push(`status must be one of ${MISSION_STATUS_VALUES.join('|')}`);
    else out.status = status;
  }
  if (limit !== undefined) {
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1 || n > 200) errs.push('limit must be an integer 1-200');
    else out.limit = n;
  }
  if (skip !== undefined) {
    const n = Number(skip);
    if (!Number.isInteger(n) || n < 0) errs.push('skip must be an integer >= 0');
    else out.skip = n;
  }
  if (errs.length) return reject(res, errs);
  req.validatedQuery = out;
  return next();
}

/** POST /api/missions/:id/abort body: { reason? } (body optional) */
export function validateAbort(req, res, next) {
  const b = req.body || {};
  if (b.reason !== undefined && (typeof b.reason !== 'string' || b.reason.length > 200)) {
    return reject(res, ['reason must be a string (max 200)']);
  }
  req.body = { reason: b.reason };
  return next();
}
