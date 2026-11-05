'use strict';

const bus = require('./eventBus');
const config = require('../config');
const { SOCKET_FORWARDED_EVENTS } = require('../config/constants');

/**
 * Attach Socket.IO to an existing http.Server and forward event-bus events
 * (mission:update, signal:update, preemption:plan, metrics:update).
 * Fallback: if socket.io is not installed, logs a warning and returns null
 * (REST keeps working, realtime is skipped).
 *
 * @param {import('http').Server} httpServer
 * @param {{corsOrigins?: string[]}} [opts]
 * @returns {import('socket.io').Server|null}
 */
function attachSocketServer(httpServer, opts = {}) {
  let Server;
  try {
    ({ Server } = require('socket.io'));
  } catch (_) {
    console.warn('[socket] socket.io not installed; realtime disabled');
    return null;
  }
  if (!httpServer || typeof httpServer.on !== 'function') {
    throw new TypeError('attachSocketServer requires an http.Server');
  }

  const io = new Server(httpServer, {
    cors: { origin: opts.corsOrigins || config.corsOrigins, methods: ['GET', 'POST'] },
  });

  const handlers = SOCKET_FORWARDED_EVENTS.map((name) => {
    const handler = (payload) => io.emit(name, payload);
    bus.on(name, handler);
    return [name, handler];
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected ${socket.id}`);
  });

  const detach = () => handlers.forEach(([n, h]) => bus.off(n, h));
  httpServer.on('close', detach);
  io.detachBus = detach;
  return io;
}

module.exports = { attachSocketServer };