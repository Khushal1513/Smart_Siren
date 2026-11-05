/**
 * @file useMissions.js
 * @description Hook to load and refresh missions based on the current status filter.
 */
import { useEffect, useCallback } from 'react';
import { missionStore, missionActions } from '../store/missionStore.js';
import { listMissions } from '../services/missionApi.js';

/**
 * Hook for loading missions list.
 * @returns {Object} { missions, loading, error, refresh }
 */
export function useMissions() {
  const filterStatus = missionStore.useStore((s) => s.filterStatus);
  const loading = missionStore.useStore((s) => s.loading);
  const error = missionStore.useStore((s) => s.error);
  const missionsById = missionStore.useStore((s) => s.missionsById);
  const order = missionStore.useStore((s) => s.order);

  const missions = order.map((id) => missionsById[id]).filter(Boolean);

  const refresh = useCallback(async () => {
    missionActions.setLoading(true);
    let isMounted = true;
    try {
      const res = await listMissions({ status: filterStatus || undefined });
      if (isMounted) {
        missionActions.setMissions(res.data);
      }
    } catch (err) {
      if (isMounted) {
        missionActions.setError(err.message);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [filterStatus]);

  useEffect(() => {
    let active = true;
    missionActions.setLoading(true);
    listMissions({ status: filterStatus || undefined })
      .then((res) => {
        if (active) missionActions.setMissions(res.data);
      })
      .catch((err) => {
        if (active) missionActions.setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [filterStatus]);

  return { missions, loading, error, refresh };
}