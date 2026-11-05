import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import TrafficSignal from '../../model/trafficSignalModel.js';
import { registerTrafficSignal, updateTrafficSignal } from '../../controller/trafficSignalController.js';

let mongoServer;

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await TrafficSignal.deleteMany({});
});

describe('traffic signal API', () => {
  test('registers the frontend form fields and a searchable location', async () => {
    const req = {
      body: {
        signalId: ' ts-101 ',
        city: 'Mysuru',
        area: 'VVCE',
        intersection: 'Campus Main Gate',
        signalType: 'smart',
        hasPedestrianCrossing: true,
        hasCamera: false,
        status: 'active',
      },
    };
    const res = createResponse();

    await registerTrafficSignal(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      signalId: 'TS-101',
      city: 'Mysuru',
      area: 'VVCE',
      intersection: 'Campus Main Gate',
      location: 'Campus Main Gate, VVCE, Mysuru',
      signalType: 'smart',
      hasPedestrianCrossing: true,
      hasCamera: false,
      status: 'active',
    });
    await expect(TrafficSignal.countDocuments()).resolves.toBe(1);
  });

  test('rejects missing required frontend fields', async () => {
    const res = createResponse();

    await registerTrafficSignal({ body: { signalId: 'TS-102' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.details).toEqual(['city', 'area', 'intersection']);
    await expect(TrafficSignal.countDocuments()).resolves.toBe(0);
  });

  test('rejects duplicate signal IDs', async () => {
    await TrafficSignal.create({
      signalId: 'TS-103',
      city: 'Mysuru',
      area: 'VVCE',
      intersection: 'North Gate',
      location: 'North Gate, VVCE, Mysuru',
    });
    const res = createResponse();

    await registerTrafficSignal({
      body: {
        signalId: 'ts-103',
        city: 'Mysuru',
        area: 'VVCE',
        intersection: 'South Gate',
      },
    }, res);

    expect(res.statusCode).toBe(409);
    await expect(TrafficSignal.countDocuments()).resolves.toBe(1);
  });

  test('updates signal status and rejects unknown statuses', async () => {
    await TrafficSignal.create({
      signalId: 'TS-104',
      city: 'Mysuru',
      area: 'VVCE',
      intersection: 'East Gate',
      location: 'East Gate, VVCE, Mysuru',
    });
    const updated = createResponse();

    await updateTrafficSignal({ body: { signalId: 'ts-104', status: 'maintenance' } }, updated);

    expect(updated.statusCode).toBe(200);
    expect(updated.body.status).toBe('maintenance');

    const invalid = createResponse();
    await updateTrafficSignal({ body: { signalId: 'TS-104', status: 'broken' } }, invalid);
    expect(invalid.statusCode).toBe(400);
  });
});
