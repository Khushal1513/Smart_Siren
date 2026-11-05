/**
 * @file missionTransitions.test.js
 * @description Unit tests for mission transition rules (all 25 pairs).
 */
import { describe, it, expect } from 'vitest';
import { canTransition, allowedActions } from '../../components/domain/missions/missionTransitions.js';

describe('missionTransitions', () => {
  const statuses = ['CREATED', 'ACTIVE', 'ARRIVED', 'CLOSED', 'ABORTED'];

  const expectedMatrix = {
    CREATED: { CREATED: false, ACTIVE: true, ARRIVED: false, CLOSED: false, ABORTED: true },
    ACTIVE: { CREATED: false, ACTIVE: false, ARRIVED: true, CLOSED: false, ABORTED: true },
    ARRIVED: { CREATED: false, ACTIVE: false, ARRIVED: false, CLOSED: true, ABORTED: false },
    CLOSED: { CREATED: false, ACTIVE: false, ARRIVED: false, CLOSED: false, ABORTED: false },
    ABORTED: { CREATED: false, ACTIVE: false, ARRIVED: false, CLOSED: false, ABORTED: false },
  };

  it('validates all 25 from/to state pairs correctly', () => {
    statuses.forEach((from) => {
      statuses.forEach((to) => {
        const result = canTransition(from, to);
        expect(result).toBe(expectedMatrix[from][to]);
      });
    });
  });

  it('returns correct allowed actions per status', () => {
    expect(allowedActions('CREATED')).toEqual(['activate', 'abort']);
    expect(allowedActions('ACTIVE')).toEqual(['arrive', 'abort', 'position']);
    expect(allowedActions('ARRIVED')).toEqual(['close']);
    expect(allowedActions('CLOSED')).toEqual([]);
    expect(allowedActions('ABORTED')).toEqual([]);
  });
});