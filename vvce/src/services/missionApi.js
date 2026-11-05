/**
 * @file missionApi.js
 * @description Mission REST API client backed by the MongoDB API.
 */
import { apiClient } from './apiClient.js';

/**
 * Creates a new emergency mission.
 * @param {Object} payload - Mission creation payload
 * @returns {Promise<Object>} Created mission object
 */
export async function createMission(payload) {
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
  const res = await apiClient(`/api/missions/${id}`);
  return res.data;
}

/**
 * Activates a mission.
 * @param {string} id - Mission ID
 * @returns {Promise<Object>} Updated mission object
 */
export async function activateMission(id) {
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
  const res = await apiClient(`/api/missions/${id}/arrive`, { method: 'POST' });
  return res.data;
}

/**
 * Closes a mission.
 * @param {string} id - Mission ID
 * @returns {Promise<Object>} Updated mission object
 */
export async function closeMission(id) {
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
  const res = await apiClient(`/api/missions/${id}/abort`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}

/**
 * Deletes a mission from persistent storage.
 * @param {string} id - Mission ID
 * @returns {Promise<Object>} Delete result
 */
export async function deleteMission(id) {
  const res = await apiClient(`/api/missions/${id}`, { method: 'DELETE' });
  return res.data;
}