/**
 * Pure mission state machine. No database or I/O.
 *   CREATED -> ACTIVE -> ARRIVED -> CLOSED
 *   ABORTED reachable from CREATED and ACTIVE.
 */
import { MISSION_STATUS as S } from '../../config/constants.js';

/** Allowed-transition table. */
export const TRANSITIONS = Object.freeze({
  [S.CREATED]: Object.freeze([S.ACTIVE, S.ABORTED]),
  [S.ACTIVE]: Object.freeze([S.ARRIVED, S.ABORTED]),
  [S.ARRIVED]: Object.freeze([S.CLOSED]),
  [S.CLOSED]: Object.freeze([]),
  [S.ABORTED]: Object.freeze([]),
});

export class IllegalTransitionError extends Error {
  constructor(from, to) {
    super(`Illegal mission transition ${from} -> ${to}`);
    this.name = 'IllegalTransitionError';
    this.status = 409;
    this.from = from;
    this.to = to;
  }
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canTransition(from, to) {
  return Object.prototype.hasOwnProperty.call(TRANSITIONS, from) && TRANSITIONS[from].includes(to);
}

/**
 * Apply a transition in place and set the matching timestamp.
 * ACTIVE -> startedAt, ARRIVED -> arrivedAt, CLOSED/ABORTED -> closedAt.
 * @param {{status:string}} mission any object with a `status` (e.g. a Mongoose doc)
 * @param {string} to target status
 * @param {Date} [now] injectable clock for tests
 * @returns the same mission object
 * @throws {IllegalTransitionError}
 */
export function transition(mission, to, now = new Date()) {
  if (!mission || typeof mission !== 'object') {
    throw new TypeError('mission must be an object');
  }
  if (!canTransition(mission.status, to)) {
    throw new IllegalTransitionError(mission.status, to);
  }
  mission.status = to;
  switch (to) {
    case S.ACTIVE:
      mission.startedAt = now;
      break;
    case S.ARRIVED:
      mission.arrivedAt = now;
      break;
    case S.CLOSED:
    case S.ABORTED:
      mission.closedAt = now;
      break;
    default:
      break;
  }
  return mission;
}
