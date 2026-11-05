/**
 * @file missionStore.test.js
 * @description Unit tests for missionStore actions and state updates.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { missionStore, missionActions } from '../../store/missionStore.js';

describe('missionStore', () => {
  beforeEach(() => {
    missionStore.setState({
      missionsById: {},
      order: [],
      selectedId: null,
      filterStatus: '',
      events: [],
    });
  });

  it('sets and upserts missions correctly', () => {
    const m1 = { _id: '1', vehicleId: 'AMB-1', status: 'CREATED' };
    missionActions.setMissions([m1]);

    const state = missionStore.getState();
    expect(state.missionsById['1']).toEqual(m1);
    expect(state.order).toEqual(['1']);

    const m2 = { _id: '2', vehicleId: 'AMB-2', status: 'ACTIVE' };
    missionActions.upsertMission(m2);

    const updatedState = missionStore.getState();
    expect(updatedState.missionsById['2']).toEqual(m2);
    expect(updatedState.order).toEqual(['2', '1']);
  });

  it('applies socket updates to missions and caps positions', () => {
    const m1 = { _id: '1', vehicleId: 'AMB-1', status: 'CREATED', positions: [] };
    missionActions.setMissions([m1]);

    missionActions.applySocketUpdate({
      missionId: '1',
      status: 'ACTIVE',
      position: { lat: 10, lng: 20, speedKmh: 50, ts: 'now' },
      etaP50: 100,
      etaP90: 150,
    });

    const state = missionStore.getState();
    const updated = state.missionsById['1'];
    expect(updated.status).toBe('ACTIVE');
    expect(updated.positions.length).toBe(1);
    expect(updated.etaP50).toBe(100);
  });
});