import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SimulationRun from '../../model/SimulationRun.js';
import { updateRun } from '../../services/simulation/simulationManager.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await SimulationRun.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await SimulationRun.deleteMany({});
});

describe('simulation run persistence', () => {
  test('allows one durable run per mission', async () => {
    const missionId = new mongoose.Types.ObjectId();
    const run = {
      runId: 'run-one',
      missionId,
      vehicleId: 'VEH-123',
      mode: 'DEMO',
      status: 'STARTING',
      originEdgeId: 'S1_S2',
      destinationEdgeId: 'S3_S4',
    };
    await SimulationRun.create(run);
    await expect(SimulationRun.create({ ...run, runId: 'run-two' })).rejects.toMatchObject({ code: 11000 });
  });

  test('allows ordinary runs without a historical source mission ID', async () => {
    const base = {
      vehicleId: 'VEH-ORDINARY',
      mode: 'DEMO',
      status: 'STARTING',
      originEdgeId: 'S1_S2',
      destinationEdgeId: 'S3_S4',
    };
    await SimulationRun.create({
      ...base,
      runId: 'ordinary-one',
      missionId: new mongoose.Types.ObjectId(),
    });
    const secondRun = await SimulationRun.create({
      ...base,
      runId: 'ordinary-two',
      missionId: new mongoose.Types.ObjectId(),
    });
    expect(secondRun.sourceMissionId).toBeUndefined();
  });

  test('allows only one replay record per source mission', async () => {
    const sourceMissionId = new mongoose.Types.ObjectId();
    const replay = {
      runId: 'replay-one',
      missionId: new mongoose.Types.ObjectId(),
      sourceMissionId,
      vehicleId: `SIM-${sourceMissionId}`,
      mode: 'DEMO',
      status: 'COMPLETED',
      originEdgeId: 'S1_S2',
      destinationEdgeId: 'S3_S4',
    };
    await SimulationRun.create(replay);
    await expect(SimulationRun.create({
      ...replay,
      runId: 'replay-two',
      missionId: new mongoose.Types.ObjectId(),
    })).rejects.toMatchObject({ code: 11000 });
  });

  test('persists ordered telemetry and ignores stale runner sequences', async () => {
    const missionId = new mongoose.Types.ObjectId();
    await SimulationRun.create({
      runId: 'run-sequence',
      missionId,
      vehicleId: 'VEH-456',
      mode: 'DEMO',
      status: 'STARTING',
      originEdgeId: 'S1_S2',
      destinationEdgeId: 'S3_S4',
    });

    const newest = await updateRun({
      runId: 'run-sequence',
      missionId: String(missionId),
      sequence: 2,
      status: 'RUNNING',
      timestamp: '2026-11-06T00:00:02.000Z',
      position: { x: 120, y: 0 },
      route: ['S1_S2', 'S2_N1', 'N1_N2', 'N2_S3', 'S3_S4'],
    });
    expect(newest.lastSequence).toBe(2);
    expect(newest.position).toMatchObject({ x: 120, y: 0 });

    const stale = await updateRun({
      runId: 'run-sequence',
      missionId: String(missionId),
      sequence: 1,
      status: 'RUNNING',
      timestamp: '2026-11-06T00:00:01.000Z',
      position: { x: 40, y: 0 },
    });
    expect(stale).toBeNull();
    const saved = await SimulationRun.findOne({ runId: 'run-sequence' });
    expect(saved.lastSequence).toBe(2);
    expect(saved.position.x).toBe(120);
  });

  test('does not let later telemetry reopen a terminal run', async () => {
    const missionId = new mongoose.Types.ObjectId();
    await SimulationRun.create({
      runId: 'run-terminal',
      missionId,
      vehicleId: 'VEH-789',
      mode: 'DEMO',
      status: 'STARTING',
      originEdgeId: 'S1_S2',
      destinationEdgeId: 'S3_S4',
    });

    await updateRun({
      runId: 'run-terminal',
      sequence: 1,
      status: 'COMPLETED',
      timestamp: '2026-11-06T00:00:02.000Z',
    });
    const lateUpdate = await updateRun({
      runId: 'run-terminal',
      sequence: 2,
      status: 'RUNNING',
      timestamp: '2026-11-06T00:00:03.000Z',
      position: { x: 40, y: 0 },
    });

    expect(lateUpdate).toBeNull();
    const saved = await SimulationRun.findOne({ runId: 'run-terminal' });
    expect(saved.status).toBe('COMPLETED');
    expect(saved.lastSequence).toBe(1);
  });

  test('preserves the last position and edge when the completion event has no active vehicle telemetry', async () => {
    const missionId = new mongoose.Types.ObjectId();
    await SimulationRun.create({
      runId: 'run-final-position',
      missionId,
      vehicleId: 'VEH-999',
      mode: 'DEMO',
      status: 'STARTING',
      originEdgeId: 'S1_S2',
      destinationEdgeId: 'S3_S4',
    });

    await updateRun({
      runId: 'run-final-position',
      sequence: 1,
      status: 'RUNNING',
      timestamp: '2026-11-06T00:00:01.000Z',
      currentEdgeId: 'N2_S3',
      position: { x: 798, y: 150 },
      speedKmh: 33,
      headingDegrees: 90,
    });
    await updateRun({
      runId: 'run-final-position',
      sequence: 2,
      status: 'COMPLETED',
      timestamp: '2026-11-06T00:00:02.000Z',
      currentEdgeId: null,
      position: null,
      speedKmh: null,
      headingDegrees: null,
    });

    const saved = await SimulationRun.findOne({ runId: 'run-final-position' });
    expect(saved).toMatchObject({
      status: 'COMPLETED',
      currentEdgeId: 'N2_S3',
      position: { x: 798, y: 150 },
      speedKmh: 33,
      headingDegrees: 90,
    });
  });
});
