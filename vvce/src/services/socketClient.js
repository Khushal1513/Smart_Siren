/**
 * @file socketClient.js
 * @description Lazy singleton Socket.IO client with connection status reporting.
 */
let socketInstance = null;
let socketInitialization = null;
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
 * Initializes the Socket.IO listener.
 */
export function initSocket() {
  if (!socketInitialization) {
    socketInitialization = initializeSocket();
  }
  return socketInitialization;
}

async function initializeSocket() {
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

    const events = ['mission:update', 'signal:update', 'preemption:plan', 'metrics:update', 'simulation:update'];
    events.forEach((ev) => {
      socketInstance.on(ev, (data) => {
        dispatchEvent(ev, data);
      });
    });
  } catch (err) {
    console.error('Socket.IO initialization failed; mission REST API remains available:', err);
    setStatus('polling');
  }
}