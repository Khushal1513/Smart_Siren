'use strict';

/** Mission lifecycle statuses. */
const MISSION_STATUS = Object.freeze({
  CREATED: 'CREATED',
  ACTIVE: 'ACTIVE',
  ARRIVED: 'ARRIVED',
  CLOSED: 'CLOSED',
  ABORTED: 'ABORTED',
});
const MISSION_STATUS_VALUES = Object.freeze(Object.values(MISSION_STATUS));

/** Signal preemption states (used by later tasks, defined here as the shared source). */
const PREEMPTION_STATE = Object.freeze({
  NORMAL: 'NORMAL',
  PREEMPT_PENDING: 'PREEMPT_PENDING',
  PREEMPT_ACTIVE: 'PREEMPT_ACTIVE',
  RECOVERY: 'RECOVERY',
});

const PREEMPTION_ACTIONS = Object.freeze(['ADVISORY', 'EXTEND_GREEN', 'EARLY_GREEN', 'FULL_PREEMPT']);

/** Max positions kept per mission (oldest dropped first). */
const MAX_POSITIONS = 500;

const SEVERITY = Object.freeze({ MIN: 1, MAX: 5, DEFAULT: 3 });

/** Event names. The first four are the Socket.IO contract (section 7). */
const EVENTS = Object.freeze({
  MISSION_UPDATE: 'mission:update',
  SIGNAL_UPDATE: 'signal:update',
  PREEMPTION_PLAN: 'preemption:plan',
  METRICS_UPDATE: 'metrics:update',
  /** Internal only, not forwarded to sockets. */
  MISSION_WATCHDOG_ABORT: 'mission:watchdog',
});

/** Events forwarded from the event bus to Socket.IO clients. */
const SOCKET_FORWARDED_EVENTS = Object.freeze([
  EVENTS.MISSION_UPDATE,
  EVENTS.SIGNAL_UPDATE,
  EVENTS.PREEMPTION_PLAN,
  EVENTS.METRICS_UPDATE,
]);

module.exports = {
  MISSION_STATUS,
  MISSION_STATUS_VALUES,
  PREEMPTION_STATE,
  PREEMPTION_ACTIONS,
  MAX_POSITIONS,
  SEVERITY,
  EVENTS,
  SOCKET_FORWARDED_EVENTS,
};