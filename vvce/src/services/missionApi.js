/**
 * @file missionApi.js
 * @description Mission REST API client that delegates to mock if VITE_USE_MOCK is true.
 */
import { apiClient } from './apiClient.js';
import * as mockApi from './mockMissionApi.js';

const useMock = () => import.meta.env.VITE_USE_MOCK === 'true';

/**
 * Creates a new emergency mission.
 * @param {Object} payload - Mission creation payload
 * @returns {Promise<Object>} Created mission object
 */
export async function createMission(payload) {
  if (useMock()) return mockApi.createMission(payload);
  const res = await apiClient('/api/missions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

/**
 * Lists missions with optional filtering and pagination.
 * @param {Object} [params] - Query parameters (status, limit, skip)
 * @returns {Promise<{data: Array, count: number}>} Missions list and count
 */
export async function listMissions(params = {}) {
  if (useMock()) return mockApi.listMissions(params);
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.limit !== undefined) searchParams.set('limit', params.limit);
  if (params.skip !== undefined) searchParams.set('skip', params.skip);

  const query = searchParams.toString();
  const endpoint = `/api/missions${query ? `?${query}` : ''}`;
  const res = await apiClient(endpoint);
  return { data: res.data, count: res.count };
}

/**
 * Retrieves a single mission by ID with positions.
 * @param {string} id - Mission ID
 * @returns {Promise<Object>} Mission object
 */
export async function getMission(id) {
  if (useMock()) return mockApi.getMission(id);
  const res = await apiClient(`/api/missions/${id}`);
  return res.data;
}

/**
 * Activates a mission.
 * @param {string} id - Mission ID
 * @returns {Promise<Object>} Updated mission object
 */
export async function activateMission(id) {
  if (useMock()) return mockApi.activateMission(id);
  const res = await apiClient(`/api/missions/${id}/activate`, { method: 'POST' });
  return res.data;
}

/**
 * Sends a position update for an active mission.
 * @param {string} id - Mission ID
 * @param {Object} positionPayload - Position and telemetry data
 * @returns {Promise<Object>} Updated mission object
 */
export async function addPosition(id, positionPayload) {
  if (useMock()) return mockApi.addPosition(id, positionPayload);
  const res = await apiClient(`/api/missions/${id}/position`, {
    method: 'POST',
    body: JSON.stringify(positionPayload),
  });
  return res.data;
}

/**
 * Marks a mission as arrived.
 * @param {string} id - Mission ID
 * @returns {Promise<Object>} Updated mission object
 */
export async function markArrived(id) {
  if (useMock()) return mockApi.markArrived(id);
  const res = await apiClient(`/api/missions/${id}/arrive`, { method: 'POST' });
  return res.data;
}

/**
 * Closes a mission.
 * @param {string} id - Mission ID
 * @returns {Promise<Object>} Updated mission object
 */
export async function closeMission(id) {
  if (useMock()) return mockApi.closeMission(id);
  const res = await apiClient(`/api/missions/${id}/close`, { method: 'POST' });
  return res.data;
}

/**
 * Aborts a mission.
 * @param {string} id - Mission ID
 * @param {string} [reason] - Abort reason
 * @returns {Promise<Object>} Updated mission object
 */
export async function abortMission(id, reason) {
  if (useMock()) return mockApi.abortMission(id, reason);
  const res = await apiClient(`/api/missions/${id}/abort`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}