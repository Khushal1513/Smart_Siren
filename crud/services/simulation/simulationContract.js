import { AppError } from '../mission/errors.js';

export function validateMissionSimulation(mission, vehicle, networkConfig) {
  if (!vehicle) {
    throw new AppError(422, `Registered vehicle ${mission.vehicleId} was not found`);
  }
  if (mission.status !== 'CREATED') {
    throw new AppError(409, `Simulation activation requires a CREATED mission; current status is ${mission.status}`);
  }

  const simulationConfig = mission.simulationConfig;
  if (!simulationConfig) {
    throw new AppError(422, 'Simulation setup is missing; select the synthetic demo mode and its origin and destination edges');
  }
  if (simulationConfig.mode !== 'DEMO') {
    throw new AppError(501, 'Live-data simulation is not configured; only the labeled synthetic DEMO mode is available');
  }

  const edgeIds = new Set(networkConfig.edges.map((edge) => edge.id));
  if (!edgeIds.has(simulationConfig.originEdgeId)) {
    throw new AppError(422, `Unknown synthetic SUMO origin edge: ${simulationConfig.originEdgeId}`);
  }
  if (!edgeIds.has(simulationConfig.destinationEdgeId)) {
    throw new AppError(422, `Unknown synthetic SUMO destination edge: ${simulationConfig.destinationEdgeId}`);
  }

  const blocked = new Set(
    networkConfig.demoRestrictions
      .filter((restriction) => restriction.enabled && ['BLOCKED', 'CLOSED'].includes(restriction.status.toUpperCase()))
      .map((restriction) => restriction.sumoEdgeId)
  );
  if (blocked.has(simulationConfig.originEdgeId)) {
    throw new AppError(422, `Synthetic origin edge ${simulationConfig.originEdgeId} is restricted`);
  }
  if (blocked.has(simulationConfig.destinationEdgeId)) {
    throw new AppError(422, `Synthetic destination edge ${simulationConfig.destinationEdgeId} is restricted`);
  }

  return simulationConfig;
}

export function publicSimulationConfig(networkConfig) {
  return {
    mode: 'DEMO',
    source: 'SYNTHETIC_DEMO',
    label: 'Synthetic SUMO demo; not real roads, live traffic, GPS, or physical signal control',
    nodes: networkConfig.nodes,
    edges: networkConfig.edges,
    restrictions: networkConfig.demoRestrictions,
    signals: networkConfig.signals,
    liveInputsAvailable: false,
  };
}
