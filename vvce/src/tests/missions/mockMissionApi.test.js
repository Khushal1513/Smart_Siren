/**
 * @file mockMissionApi.test.js
 * @description Unit tests for mockMissionApihappy path, validation errors 400, not found 404, illegal 409, and 500 cap.
 */
import { describe, it, expect } from 'vitest';
import * as mockApi from '../../services/mockMissionApi.js';

describe('mockMissionApi', () => {
  it('creates and retrieves a mission successfully', async () => {
    const created = await mockApi.createMission({ vehicleId: 'TEST-AMB', severity: 4 });
    expect(created._id).toBeDefined();
    expect(created.vehicleId).toBe('TEST-AMB');
    expect(created.status).toBe('CREATED');

    const fetched = await mockApi.getMission(created._id);
    expect(fetched._id).toBe(created._id);
  });

  it('throws 400 validation error on missing vehicleId', async () => {
    await expect(mockApi.createMission({ vehicleId: '' })).rejects.toThrow();
  });

  it('throws 404 on unknown mission ID', async () => {
    await expect(mockApi.getMission('non-existent')).rejects.toThrow();
  });

  it('enforces state transition rules and throws 409 on illegal transition', async () => {
    const created = await mockApi.createMission({ vehicleId: 'AMB-ILLEGAL' });
    // Cannot close from CREATED
    await expect(mockApi.closeMission(created._id)).rejects.toThrow();
  });

  it('caps positions at 500', async () => {
    const created = await mockApi.createMission({ vehicleId: 'AMB-CAP' });
    await mockApi.activateMission(created._id);

    for (let i = 0; i < 510; i++) {
      await mockApi.addPosition(created._id, { lat: 12 + i * 0.0001, lng: 77, speedKmh: 50 });
    }

    const m = await mockApi.getMission(created._id);
    expect(m.positions.length).toBe(500);
  });
});