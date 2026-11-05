import { apiClient } from './apiClient.js';

export async function getSimulationRun(missionId) {
  const response = await apiClient(`/api/simulations/${missionId}`);
  return response.data;
}

export async function getSimulationConfig() {
  const response = await apiClient('/api/simulations/config');
  return response.data;
}

export async function getArrivedMissionReplays() {
  const response = await apiClient('/api/simulations');
  return response.data;
}

export async function replayArrivedMissions() {
  const response = await apiClient('/api/simulations/replay-arrived', { method: 'POST' });
  return response.data;
}
