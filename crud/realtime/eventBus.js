import { EventEmitter } from 'node:events';

/**
 * Process-wide event bus singleton. Services emit, the socket server forwards.
 * Node caches ESM modules, so every import receives the same instance.
 */
const bus = new EventEmitter();
bus.setMaxListeners(50);

export default bus;