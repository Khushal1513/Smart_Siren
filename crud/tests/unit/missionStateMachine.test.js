import { describe, expect, test } from '@jest/globals';
import {
  TRANSITIONS,
  canTransition,
  transition,
  IllegalTransitionError,
} from '../../services/mission/missionStateMachine.js';
import { MISSION_STATUS_VALUES } from '../../config/constants.js';

const LEGAL = new Set([
  'CREATED->ACTIVE',
  'CREATED->ABORTED',
  'ACTIVE->ARRIVED',
  'ACTIVE->ABORTED',
  'ARRIVED->CLOSED',
]);

describe('missionStateMachine', () => {
  describe('canTransition (all 25 from/to pairs)', () => {
    for (const from of MISSION_STATUS_VALUES) {
      for (const to of MISSION_STATUS_VALUES) {
        const legal = LEGAL.has(`${from}->${to}`);
        test(`${from} -> ${to} is ${legal ? 'legal' : 'illegal'}`, () => {
          expect(canTransition(from, to)).toBe(legal);
        });
      }
    }
    test('unknown states are illegal', () => {
      expect(canTransition('NOPE', 'ACTIVE')).toBe(false);
      expect(canTransition('CREATED', 'NOPE')).toBe(false);
    });
  });

  describe('transition()', () => {
    const now = new Date('2026-01-01T00:00:00Z');

    test.each([
      ['CREATED', 'ACTIVE', 'startedAt'],
      ['ACTIVE', 'ARRIVED', 'arrivedAt'],
      ['ARRIVED', 'CLOSED', 'closedAt'],
      ['CREATED', 'ABORTED', 'closedAt'],
      ['ACTIVE', 'ABORTED', 'closedAt'],
    ])('%s -> %s sets %s', (from, to, field) => {
      const m = { status: from };
      const out = transition(m, to, now);
      expect(out).toBe(m);
      expect(m.status).toBe(to);
      expect(m[field]).toBe(now);
    });

    test.each(
      MISSION_STATUS_VALUES.flatMap((f) => MISSION_STATUS_VALUES.map((t) => [f, t])).filter(
        ([f, t]) => !LEGAL.has(`${f}->${t}`)
      )
    )('illegal %s -> %s throws and leaves mission untouched', (from, to) => {
      const m = { status: from };
      expect(() => transition(m, to)).toThrow(IllegalTransitionError);
      expect(m).toEqual({ status: from });
    });

    test('throws TypeError for non-objects', () => {
      expect(() => transition(null, 'ACTIVE')).toThrow(TypeError);
    });

    test('table is frozen and terminal states have no exits', () => {
      expect(Object.isFrozen(TRANSITIONS)).toBe(true);
      expect(TRANSITIONS.CLOSED).toEqual([]);
      expect(TRANSITIONS.ABORTED).toEqual([]);
    });
  });
});