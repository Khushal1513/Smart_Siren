'use strict';

const Mission = require('../model/Mission');
const svc = require('../services/mission/missionService');
const bus = require('../realtime/eventBus');
const config = require('../config');
const { MISSION_STATUS, EVENTS } = require('../config/constants');

/**
 * One watchdog pass: abort ACTIVE missions with no position for `timeoutMs`.
 * Emits "mission:watchdog" per abort (mission:update is emitted by abortMission).
 * @param {{timeoutMs?:number, now?:Date}} [opts]
 * @returns {Promise<number>} number of missions aborted
 */
async function tick({ timeoutMs = config.watchdogTimeoutMs, now = new Date() } = {}) {
  const cutoff = new Date(now.getTime() - timeoutMs);
  const stale = await Mission.find({
    status: MISSION_STATUS.ACTIVE,
    $or: [{ lastPositionAt: { $lt: cutoff } }, { lastPositionAt: null, startedAt: { $lt: cutoff } }],
  }).select('_id');

  let aborted = 0;
  for (const { _id } of stale) {
    try {
      await svc.abortMission(_id, 'WATCHDOG_TIMEOUT');
      aborted += 1;
      bus.emit(EVENTS.MISSION_WATCHDOG_ABORT, { missionId: String(_id), reason: 'WATCHDOG_TIMEOUT', timeoutMs });
    } catch (err) {
      if (err.status !== 409 && err.status !== 404) console.error('[watchdog] abort failed', err);
    }
  }
  return aborted;
}

/**
 * Start the periodic watchdog.
 * @param {{intervalMs?:number, timeoutMs?:number}} [opts]
 * @returns {{stop:()=>void, tick:Function}}
 */
function startMissionWatchdog({ intervalMs = config.watchdogIntervalMs, timeoutMs = config.watchdogTimeoutMs } = {}) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return; // skip overlapping passes
    running = true;
    try {
      const n = await tick({ timeoutMs });
      if (n) console.log(`[watchdog] aborted ${n} stale mission(s)`);
    } catch (err) {
      console.error('[watchdog] tick error', err);
    } finally {
      running = false;
    }
  }, intervalMs);
  if (timer.unref) timer.unref();
  console.log(`[watchdog] started (every ${intervalMs}ms, timeout ${timeoutMs}ms)`);
  return { stop: () => clearInterval(timer), tick: () => tick({ timeoutMs }) };
}

module.exports = { startMissionWatchdog, tick };