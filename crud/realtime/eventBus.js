'use strict';

const { EventEmitter } = require('events');

/**
 * Process-wide event bus singleton. Services emit, the socket server forwards.
 * Node caches modules, so every require() returns the same instance.
 */
const bus = new EventEmitter();
bus.setMaxListeners(50);

module.exports = bus;