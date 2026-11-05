/**
 * @file createStore.js
 * @description Lightweight reactive store using useSyncExternalStore without external dependencies.
 */
import { useSyncExternalStore } from 'react';

/**
 * Creates a reactive state store.
 * @param {Function} initialStateFn - Initial state generator function
 * @returns {Object} Store interface { getState, setState, subscribe, useStore }
 */
export function createStore(initialStateFn) {
  let state = initialStateFn();
  const listeners = new Set();

  const getState = () => state;

  const setState = (partial) => {
    const nextState = typeof partial === 'function' ? partial(state) : partial;
    if (nextState !== state) {
      state = Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener());
    }
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const useStore = (selector = (s) => s) => {
    return useSyncExternalStore(
      subscribe,
      () => selector(getState()),
      () => selector(getState())
    );
  };

  return { getState, setState, subscribe, useStore };
}