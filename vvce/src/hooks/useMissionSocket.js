/**
 * @file useMissionSocket.js
 * @description Subscribes to real-time socket events and handles polling fallback when disconnected.
 */
import { useEffect } from 'react';
import { initSocket, subscribeEvent, onStatus } from '../services/socketClient.js';
import { missionActions } from '../store/missionStore.js';
import { listMissions, getMission } from '../services/missionApi.js';

/**
 * Hook managing socket connection, event logging, and polling fallback.
 */
export function useMissionSocket() {
  useEffect(() => {
    initSocket();

    const unsubStatus = onStatus((status) => {
      missionActions.setConnection(status);
    });

    const handleEvent = (eventName, payload) => {
      missionActions.pushEvent({
        id: Math.random().toString(36).substring(2, 9),
        event: eventName,
        payload,
        timestamp: new Date().toLocaleTimeString(),
      });

      if (eventName === 'mission:update') {
        missionActions.applySocketUpdate(payload);
        // If mission unknown in store, fetch full record
        const state = missionActions;
        // fetch if needed
      }
    };

    const unsub1 = subscribeEvent('mission:update', (p) => handleEvent('mission:update', p));
    const unsub2 = subscribeEvent('signal:update', (p) => handleEvent('signal:update', p));
    const unsub3 = subscribeEvent('preemption:plan', (p) => handleEvent('preemption:plan', p));
    const unsub4 = subscribeEvent('metrics:update', (p) => handleEvent('metrics:update', p));

    // Polling fallback if status is polling or disconnected
    const pollInterval = setInterval(async () => {
      const conn = missionStore.getState().connection;
      if (conn === 'polling' || conn === 'disconnected') {
        try {
          const res = await listMissions();
          missionActions.setMissions(res.data);
        } catch (e) {
          // ignore poll error
        }
      }
    }, 3000);

    return () => {
      unsubStatus();
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      clearInterval(pollInterval);
    };
  }, []);
}

import { missionStore } from '../store/missionStore.js';