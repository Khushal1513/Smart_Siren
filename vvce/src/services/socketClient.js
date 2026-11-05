/**
 * @file socketClient.js
 * @description Lazy singleton Socket.IO client with fallback to mock event emitter and connection status reporting.
 */
import * as mockMissionApi from './mockMissionApi.js';

let socketInstance = null;
const statusListeners = new Set();
const eventListeners = new Map();
let currentStatus = 'disconnected';

function setStatus(status) {
  currentStatus = status;
  statusListeners.forEach((cb) => cb(status));
}

/**
 * Subscribes to connection status changes.
 * @param {Function} cb - Callback receiving status string
 * @returns {Function} Unsubscribe function
 */
export function onStatus(cb) {
  statusListeners.add(cb);
  cb(currentStatus);
  return () => statusListeners.delete(cb);
}

/**
 * Subscribes to real-time events.
 * @param {string} event - Event name
 * @param {Function} handler - Event handler callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeEvent(event, handler) {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event).add(handler);

  // Initialize client if needed
  initSocket();

  return () => {
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.delete(handler);
    }
  };
}

function dispatchEvent(event, data) {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.forEach((fn) => fn(data));
  }
}

/**
 * Initializes the Socket.IO or mock listener.
 */
export async function initSocket() {
  if (socketInstance) return;

  const useMock = import.meta.env.VITE_USE_MOCK === 'true';
  if (useMock) {
    setStatus('mock');
    mockMissionApi.subscribe((event, payload) => {
      dispatchEvent(event, payload);
    });
    return;
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

  try {
    setStatus('disconnected');
    const { io } = await import('socket.io-client');
    socketInstance = io(socketUrl, {
      reconnectionAttempts: 5,
      timeout: 5000,
    });

    socketInstance.on('connect', () => {
      setStatus('connected');
    });

    socketInstance.on('disconnect', () => {
      setStatus('disconnected');
    });

    socketInstance.on('connect_error', () => {
      setStatus('polling');
    });

    const events = ['mission:update', 'signal:update', 'preemption:plan', 'metrics:update'];
    events.forEach((ev) => {
      socketInstance.on(ev, (data) => {
        dispatchEvent(ev, data);
      });
    });
  } catch (err) {
    console.warn('Socket.IO initialization failed, using mock events fallback:', err);
    setStatus('mock');
    mockMissionApi.subscribe((event, payload) => {
      dispatchEvent(event, payload);
    });
  }
}