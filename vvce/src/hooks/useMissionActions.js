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
  deleteMission as apiDelete,
} from '../services/missionApi.js';
import { missionActions } from '../store/missionStore.js';

/**
 * Hook for mission mutation actions.
 * @returns {Object} Action functions and action states
 */
export function useMissionActions() {
  const [pendingAction, setPendingAction] = useState(null);
  const [actionError, setActionError] = useState(null);

  const wrapAction = useCallback(async (actionName, fn, selectMission = (result) => result) => {
    setPendingAction(actionName);
    setActionError(null);
    let isMounted = true;
    try {
      const result = await fn();
      const mission = selectMission(result);
      if (isMounted && mission) {
        missionActions.upsertMission(mission);
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
    activateMission: (id) => wrapAction('activate', () => apiActivate(id), (result) => result.mission),
    addPosition: (id, pos) => wrapAction('position', () => apiAddPosition(id, pos)),
    markArrived: (id) => wrapAction('arrive', () => apiArrive(id)),
    closeMission: (id) => wrapAction('close', () => apiClose(id)),
    abortMission: (id, reason) => wrapAction('abort', () => apiAbort(id, reason)),
    deleteMission: (id) => wrapAction('delete', async () => {
      await apiDelete(id);
      missionActions.removeMission(id);
    }),
  };
}