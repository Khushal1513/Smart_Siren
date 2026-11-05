/**
 * @file missionTransitions.js
 * @description Pure mirror of backend mission transition table and state rules.
 */

const TRANSITION_TABLE = {
  CREATED: ['ACTIVE', 'ABORTED'],
  ACTIVE: ['ARRIVED', 'ABORTED'],
  ARRIVED: ['CLOSED'],
  CLOSED: [],
  ABORTED: [],
};

/**
 * Checks if a transition between two statuses is legal.
 * @param {string} from - Current status
 * @param {string} to - Target status
 * @returns {boolean} True if legal
 */
export function canTransition(from, to) {
  const allowed = TRANSITION_TABLE[from] || [];
  return allowed.includes(to);
}

/**
 * Returns allowed action verbs for a given status.
 * @param {string} status - Current mission status
 * @returns {Array<string>} Allowed actions
 */
export function allowedActions(status) {
  switch (status) {
    case 'CREATED':
      return ['activate', 'abort'];
    case 'ACTIVE':
      return ['arrive', 'abort', 'position'];
    case 'ARRIVED':
      return ['close'];
    default:
      return [];
  }
}