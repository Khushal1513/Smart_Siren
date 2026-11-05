/**
 * @file apiClient.test.js
 * @description Unit tests for apiClient error mapping and fetch wrapping.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '../../services/apiClient.js';

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed json on success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: 'success' }),
    });

    const res = await apiClient('/api/test');
    expect(res).toEqual({ data: 'success' });
  });

  it('throws normalized error with status and details on failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Bad Request', details: ['Invalid field'] }),
    });

    let error;
    try {
      await apiClient('/api/test');
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.message).toBe('Bad Request');
    expect(error.status).toBe(400);
    expect(error.details).toEqual(['Invalid field']);
  });
});