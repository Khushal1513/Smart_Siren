/**
 * @file useMissionActions.js
 * @description Hook providing wrapped mission actions with pending state and error handling.
 */
import { useState, useCallback } from 'react';
import {
  createMission as apiCreate,
  activateMission as apiActivate,
  addPosition as apiAddPosition,
  markArrived as apiArrive,
  closeMission as apiClose,
  abortMission as apiAbort,
} from '../services/missionApi.js';
import { missionActions } from '../store/missionStore.js';

/**
 * Hook for mission mutation actions.
 * @returns {Object} Action functions and action states
 */
export function useMissionActions() {
  const [pendingAction, setPendingAction] = useState(null);
  const [actionError, setActionError] = useState(null);

  const wrapAction = useCallback(async (actionName, fn) => {
    setPendingAction(actionName);
    setActionError(null);
    let isMounted = true;
    try {
      const result = await fn();
      if (isMounted && result) {
        missionActions.upsertMission(result);
      }
      return result;
    } catch (err) {
      if (isMounted) {
        setActionError({ action: actionName, message: err.message, details: err.details || [] });
      }
      throw err;
    } finally {
      if (isMounted) {
        setPendingAction(null);
      }
    }
  }, []);

  return {
    pendingAction,
    actionError,
    clearError: () => setActionError(null),
    createMission: (payload) => wrapAction('create', () => apiCreate(payload)),
    activateMission: (id) => wrapAction('activate', () => apiActivate(id)),
    addPosition: (id, pos) => wrapAction('position', () => apiAddPosition(id, pos)),
    markArrived: (id) => wrapAction('arrive', () => apiArrive(id)),
    closeMission: (id) => wrapAction('close', () => apiClose(id)),
    abortMission: (id, reason) => wrapAction('abort', () => apiAbort(id, reason)),
  };
}