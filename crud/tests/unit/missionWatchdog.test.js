import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as svc from '../../services/mission/missionService.js';
import { tick, startMissionWatchdog } from '../../jobs/missionWatchdog.js';
import bus from '../../realtime/eventBus.js';
import Mission from '../../model/Mission.js';
import { EVENTS } from '../../config/constants.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(() => Mission.deleteMany({}));

describe('missionWatchdog', () => {
  test('aborts ACTIVE missions silent for > timeout and emits event', async () => {
    const stale = await svc.createMission({ vehicleId: 'W-1' });
    const fresh = await svc.createMission({ vehicleId: 'W-2' });
    const created = await svc.createMission({ vehicleId: 'W-3' });
    await svc.activateMission(stale._id);
    await svc.activateMission(fresh._id);
    await Mission.updateOne({ _id: stale._id }, { lastPositionAt: new Date(Date.now() - 120000) });

    const seen = [];
    const h = (p) => seen.push(p);
    bus.on(EVENTS.MISSION_WATCHDOG_ABORT, h);
    const n = await tick({ timeoutMs: 60000 });
    bus.off(EVENTS.MISSION_WATCHDOG_ABORT, h);

    expect(n).toBe(1);
    expect(seen).toEqual([{ missionId: String(stale._id), reason: 'WATCHDOG_TIMEOUT', timeoutMs: 60000 }]);
    expect((await svc.getMission(stale._id)).status).toBe('ABORTED');
    expect((await svc.getMission(stale._id)).abortReason).toBe('WATCHDOG_TIMEOUT');
    expect((await svc.getMission(fresh._id)).status).toBe('ACTIVE');
    expect((await svc.getMission(created._id)).status).toBe('CREATED');
  });

  test('startMissionWatchdog returns a stoppable handle', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const w = startMissionWatchdog({ intervalMs: 1000000, timeoutMs: 1000 });
    expect(typeof w.stop).toBe('function');
    w.stop();
    console.log.mockRestore();
  });
});