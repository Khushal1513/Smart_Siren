import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as svc from '../../services/mission/missionService.js';
import bus from '../../realtime/eventBus.js';
import Mission from '../../model/Mission.js';
import { MAX_POSITIONS, EVENTS } from '../../config/constants.js';

let mongod;
const events = [];
const onUpdate = (p) => events.push(p);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Mission.init();
  bus.on(EVENTS.MISSION_UPDATE, onUpdate);
});

afterAll(async () => {
  bus.off(EVENTS.MISSION_UPDATE, onUpdate);
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Mission.deleteMany({});
  events.length = 0;
});

describe('missionService', () => {
  test('createMission defaults to CREATED, severity 3, emits update', async () => {
    const m = await svc.createMission({ vehicleId: 'AMB-1', route: [{ signalId: 'S1', distanceAlongRouteM: 100 }] });
    expect(m.status).toBe('CREATED');
    expect(m.severity).toBe(3);
    expect(m.route).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ missionId: String(m._id), status: 'CREATED', position: null });
  });

  test('createMission persists explicit simulation configuration for activation', async () => {
    const simulationConfig = {
      mode: 'DEMO',
      vehicleSource: 'REGISTERED',
      originEdgeId: 'S1_S2',
      destinationEdgeId: 'S3_S4',
    };
    const m = await svc.createMission({ vehicleId: 'VEH-1', simulationConfig });

    expect(m.simulationConfig.toObject()).toEqual(simulationConfig);
    await expect(svc.getMission(m._id)).resolves.toMatchObject({ simulationConfig });
  });

  test('createMission rejects missing vehicleId', async () => {
    await expect(svc.createMission({})).rejects.toMatchObject({ status: 400 });
  });

  test('full happy path CREATED -> ACTIVE -> ARRIVED -> CLOSED sets timestamps', async () => {
    const m = await svc.createMission({ vehicleId: 'AMB-2' });
    const a = await svc.activateMission(m._id);
    expect(a.status).toBe('ACTIVE');
    expect(a.startedAt).toBeInstanceOf(Date);
    const r = await svc.markArrived(m._id);
    expect(r.arrivedAt).toBeInstanceOf(Date);
    const c = await svc.closeMission(m._id);
    expect(c.status).toBe('CLOSED');
    expect(c.closedAt).toBeInstanceOf(Date);
  });

  test('addPosition appends, updates ETA and emits mission:update with position', async () => {
    const m = await svc.createMission({ vehicleId: 'AMB-3' });
    await svc.activateMission(m._id);
    events.length = 0;
    const u = await svc.addPosition(m._id, { lat: 12.97, lng: 77.59, speedKmh: 40, etaP50: 120, etaP90: 180 });
    expect(u.positions).toHaveLength(1);
    expect(u.etaP50).toBe(120);
    expect(events[0]).toMatchObject({
      status: 'ACTIVE',
      etaP50: 120,
      etaP90: 180,
      position: { lat: 12.97, lng: 77.59, speedKmh: 40 },
    });
  });

  test('addPosition caps positions to the last 500', async () => {
    const m = await svc.createMission({ vehicleId: 'AMB-4' });
    await svc.activateMission(m._id);
    const total = MAX_POSITIONS + 5;
    for (let i = 0; i < total; i += 1) {
      await svc.addPosition(m._id, { lat: 10, lng: 70 + i / 10000, speedKmh: i % 50 });
    }
    const fresh = await svc.getMission(m._id);
    expect(fresh.positions).toHaveLength(MAX_POSITIONS);
    // oldest 5 dropped: first kept position is index 5
    expect(fresh.positions[0].lng).toBeCloseTo(70 + 5 / 10000, 6);
  }, 60000);

  test('addPosition on non-ACTIVE mission -> 409; unknown id -> 404; bad coords -> 400', async () => {
    const m = await svc.createMission({ vehicleId: 'AMB-5' });
    await expect(svc.addPosition(m._id, { lat: 1, lng: 1 })).rejects.toMatchObject({ status: 409 });
    await expect(svc.addPosition(new mongoose.Types.ObjectId(), { lat: 1, lng: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(svc.addPosition(m._id, { lat: 'x', lng: 1 })).rejects.toMatchObject({ status: 400 });
  });

  test('illegal transitions throw 409', async () => {
    const m = await svc.createMission({ vehicleId: 'AMB-6' });
    await expect(svc.markArrived(m._id)).rejects.toMatchObject({ status: 409 });
    await expect(svc.closeMission(m._id)).rejects.toMatchObject({ status: 409 });
  });

  test('concurrent identical transitions: exactly one wins, the others get 409', async () => {
    const mission = await svc.createMission({ vehicleId: 'AMB-CONCURRENT' });

    const results = await Promise.allSettled([
      svc.activateMission(mission._id),
      svc.activateMission(mission._id),
      svc.activateMission(mission._id),
    ]);

    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(2);
    failed.forEach((r) => expect(r.reason.status).toBe(409));
    expect((await svc.getMission(mission._id)).status).toBe('ACTIVE');
  });

  test('concurrent activate and abort always end in a consistent legal state', async () => {
    const mission = await svc.createMission({ vehicleId: 'AMB-RACE' });

    await Promise.allSettled([
      svc.activateMission(mission._id),
      svc.abortMission(mission._id, 'RACE'),
    ]);

    const final = await svc.getMission(mission._id);
    expect(['ACTIVE', 'ABORTED']).toContain(final.status);
    if (final.status === 'ABORTED') {
      expect(final.closedAt).toBeInstanceOf(Date);
      expect(final.abortReason).toBe('RACE');
    } else {
      expect(final.closedAt).toBeNull();
    }
  });

  test('abortMission from CREATED and ACTIVE stores reason; not from ARRIVED', async () => {
    const a = await svc.createMission({ vehicleId: 'AMB-7' });
    const abortedA = await svc.abortMission(a._id, 'TEST');
    expect(abortedA.status).toBe('ABORTED');
    expect(abortedA.abortReason).toBe('TEST');

    const b = await svc.createMission({ vehicleId: 'AMB-8' });
    await svc.activateMission(b._id);
    expect((await svc.abortMission(b._id)).status).toBe('ABORTED');

    const c = await svc.createMission({ vehicleId: 'AMB-9' });
    await svc.activateMission(c._id);
    await svc.markArrived(c._id);
    await expect(svc.abortMission(c._id)).rejects.toMatchObject({ status: 409 });
  });

  test('getMission 404 for unknown id', async () => {
    await expect(svc.getMission(new mongoose.Types.ObjectId())).rejects.toMatchObject({ status: 404 });
  });

  test('deleteMission removes a persisted mission and returns 404 when missing', async () => {
    const mission = await svc.createMission({ vehicleId: 'AMB-DELETE' });

    const deleted = await svc.deleteMission(mission._id);

    expect(String(deleted._id)).toBe(String(mission._id));
    await expect(svc.getMission(mission._id)).rejects.toMatchObject({ status: 404 });
    await expect(svc.deleteMission(mission._id)).rejects.toMatchObject({ status: 404 });
  });

  test('listMissions filters by status and rejects invalid status', async () => {
    const a = await svc.createMission({ vehicleId: 'L-1' });
    await svc.createMission({ vehicleId: 'L-2' });
    await svc.activateMission(a._id);
    const active = await svc.listMissions({ status: 'ACTIVE' });
    expect(active).toHaveLength(1);
    expect(active[0].vehicleId).toBe('L-1');
    expect(await svc.listMissions({})).toHaveLength(2);
    await expect(svc.listMissions({ status: 'BOGUS' })).rejects.toMatchObject({ status: 400 });
  });

  test('a throwing listener does not break the mission flow', async () => {
    const bad = () => {
      throw new Error('boom');
    };
    bus.on(EVENTS.MISSION_UPDATE, bad);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(svc.createMission({ vehicleId: 'AMB-X' })).resolves.toBeDefined();
    bus.off(EVENTS.MISSION_UPDATE, bad);
    console.error.mockRestore();
  });
});