/**
 * @file apiClient.js
 * @description Fetch wrapper with JSON serialization, AbortController 10s timeout, and backend error normalization.
 */

/**
 * Performs an HTTP request against the API backend.
 * @param {string} endpoint - API path (e.g. '/api/missions')
 * @param {RequestInit} [options={}] - Fetch options
 * @returns {Promise<any>} Unwrapped data or throws normalized error
 */
export async function apiClient(endpoint, options = {}) {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const url = `${baseUrl}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let body = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
    }

    if (!response.ok) {
      const error = new Error(body?.error || `HTTP error! status: ${response.status}`);
      error.status = response.status;
      error.details = body?.details || [];
      throw error;
    }

    return body;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutError = new Error('Request timed out after 10 seconds');
      timeoutError.status = 408;
      timeoutError.details = ['The server took too long to respond.'];
      throw timeoutError;
    }
    throw err;
  }
}