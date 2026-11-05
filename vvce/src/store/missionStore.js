/**
 * @file missionStore.js
 * @description Mission state store managing missions, selection, filter, events, and connection status.
 */
import { createStore } from './createStore.js';

export const missionStore = createStore(() => ({
  missionsById: {},
  order: [],
  selectedId: null,
  filterStatus: '',
  connection: 'disconnected',
  events: [],
  loading: false,
  error: null,
}));

/**
 * Actions for missionStore.
 */
export const missionActions = {
  setMissions(missions) {
    const missionsById = {};
    const order = [];
    missions.forEach((m) => {
      missionsById[m._id] = m;
      order.push(m._id);
    });
    missionStore.setState({ missionsById, order, loading: false, error: null });
  },

  upsertMission(mission) {
    const state = missionStore.getState();
    const exists = !!state.missionsById[mission._id];
    const missionsById = { ...state.missionsById, [mission._id]: mission };
    let order = [...state.order];
    if (!exists) {
      order.unshift(mission._id);
    }
    missionStore.setState({ missionsById, order });
  },

  applySocketUpdate(payload) {
    const { missionId, status, position, etaP50, etaP90 } = payload;
    const state = missionStore.getState();
    const existing = state.missionsById[missionId];

    if (existing) {
      const positions = position ? [...(existing.positions || []), position] : existing.positions;
      if (positions.length > 500) positions.shift();

      const updated = {
        ...existing,
        status: status || existing.status,
        positions,
        etaP50: etaP50 !== undefined ? etaP50 : existing.etaP50,
        etaP90: etaP90 !== undefined ? etaP90 : existing.etaP90,
        updatedAt: new Date().toISOString(),
      };
      if (status === 'ACTIVE' && !updated.startedAt) updated.startedAt = new Date().toISOString();
      if (status === 'ARRIVED' && !updated.arrivedAt) updated.arrivedAt = new Date().toISOString();
      if (status === 'CLOSED' && !updated.closedAt) updated.closedAt = new Date().toISOString();
      if (status === 'ABORTED' && !updated.abortReason) updated.abortReason = payload.abortReason || 'Socket update abort';

      missionStore.setState({
        missionsById: { ...state.missionsById, [missionId]: updated },
      });
    } else {
      // Unknown missionId, flag for refetch or insert minimal skeleton
      missionActions.upsertMission({
        _id: missionId,
        vehicleId: 'Unknown',
        status: status || 'ACTIVE',
        positions: position ? [position] : [],
        etaP50: etaP50 || 0,
        etaP90: etaP90 || 0,
        createdAt: new Date().toISOString(),
      });
    }
  },

  selectMission(id) {
    missionStore.setState({ selectedId: id });
  },

  setFilter(status) {
    missionStore.setState({ filterStatus: status });
  },

  pushEvent(eventObj) {
    const state = missionStore.getState();
    const events = [eventObj, ...state.events].slice(0, 100);
    missionStore.setState({ events });
  },

  setConnection(status) {
    missionStore.setState({ connection: status });
  },

  setLoading(loading) {
    missionStore.setState({ loading });
  },

  setError(error) {
    missionStore.setState({ error, loading: false });
  },
};