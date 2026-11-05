import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { socket, io } = vi.hoisted(() => ({
  socket: { on: vi.fn() },
  io: vi.fn(),
}));

vi.mock('socket.io-client', () => ({ io }));

describe('socketClient initialization', () => {
  beforeEach(() => {
    socket.on.mockReset();
    io.mockReset().mockReturnValue(socket);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('uses the Socket.IO client for mission updates', async () => {
    const { initSocket } = await import('../../services/socketClient.js');

    await Promise.all([initSocket(), initSocket(), initSocket()]);

    expect(io).toHaveBeenCalledTimes(1);
    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ reconnectionAttempts: 5, timeout: 5000 })
    );
  });
});
