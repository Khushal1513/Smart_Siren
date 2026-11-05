import { describe, expect, test } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateMissionSimulation, publicSimulationConfig } from '../../services/simulation/simulationContract.js';
import { AppError } from '../../services/mission/errors.js';

const configPath = new URL('../../../sim/config/manual_values.json', import.meta.url);
const networkConfig = JSON.parse(await readFile(fileURLToPath(configPath), 'utf8'));

function expectStatus(callback, status) {
  try {
    callback();
    throw new Error('Expected callback to throw an AppError');
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(status);
  }
}

describe('simulation contract', () => {
  const mission = {
    vehicleId: 'VEH-123',
    status: 'CREATED',
    simulationConfig: {
      mode: 'DEMO',
      originEdgeId: 'S1_S2',
      destinationEdgeId: 'S3_S4',
    },
  };
  const vehicle = { vehicleId: 'VEH-123' };

  test('accepts a registered canonical vehicle and explicit synthetic endpoints', () => {
    expect(validateMissionSimulation(mission, vehicle, networkConfig)).toEqual(mission.simulationConfig);
  });

  test('rejects unknown vehicles, missing endpoints, and live mode explicitly', () => {
    expectStatus(() => validateMissionSimulation(mission, null, networkConfig), 422);
    expectStatus(() => validateMissionSimulation({ ...mission, simulationConfig: null }, vehicle, networkConfig), 422);
    expectStatus(() => validateMissionSimulation({
      ...mission,
      simulationConfig: { ...mission.simulationConfig, mode: 'LIVE' },
    }, vehicle, networkConfig), 501);
  });

  test('rejects unknown or restricted endpoints instead of substituting a destination', () => {
    expectStatus(() => validateMissionSimulation({
      ...mission,
      simulationConfig: { ...mission.simulationConfig, destinationEdgeId: 'S2_S3' },
    }, vehicle, networkConfig), 422);
    expectStatus(() => validateMissionSimulation({
      ...mission,
      simulationConfig: { ...mission.simulationConfig, destinationEdgeId: 'NOT_A_REAL_EDGE' },
    }, vehicle, networkConfig), 422);
  });

  test('rejects already active missions and labels the returned topology synthetic', () => {
    expectStatus(() => validateMissionSimulation({ ...mission, status: 'ACTIVE' }, vehicle, networkConfig), 409);

    expect(publicSimulationConfig(networkConfig)).toMatchObject({
      mode: 'DEMO',
      source: 'SYNTHETIC_DEMO',
      liveInputsAvailable: false,
    });
  });
});
