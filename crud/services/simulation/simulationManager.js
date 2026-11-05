import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mongoose from 'mongoose';
import Mission from '../../model/Mission.js';
import Vehicle from '../../model/Vehicle.js';
import SimulationRun from '../../model/SimulationRun.js';
import bus from '../../realtime/eventBus.js';
import { EVENTS } from '../../config/constants.js';
import config from '../../config/index.js';
import { AppError } from '../mission/errors.js';
import * as missionService from '../mission/missionService.js';
import { publicSimulationConfig, validateMissionSimulation } from './simulationContract.js';

const execFileAsync = promisify(execFile);
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const publisherPath = path.resolve(moduleDirectory, '../../../sim/publisher.py');
const configPath = path.resolve(moduleDirectory, '../../../sim/config/manual_values.json');
const networkConfig = JSON.parse(await readFile(configPath, 'utf8'));

let runner = null;
let runnerReady = null;
let shuttingDown = false;
let busListenerAttached = false;
const activationPromises = new Map();
const arrivedReplayPromises = new Map();
const startWaiters = new Map();

function publicRun(run) {
  if (!run) return null;
  return typeof run.toObject === 'function' ? run.toObject() : run;
}

function resolveStartWaiter(runId, error, run) {
  const waiter = startWaiters.get(runId);
  if (!waiter) return;
  clearTimeout(waiter.timer);
  startWaiters.delete(runId);
  if (error) waiter.reject(error);
  else waiter.resolve(run);
}

function waitForStart(runId) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      startWaiters.delete(runId);
      reject(new AppError(503, 'SUMO runner did not confirm that the simulation started in time'));
    }, config.simulationStartupTimeoutMs);
    startWaiters.set(runId, { resolve, reject, timer });
  });
}

async function preflight() {
  try {
    await execFileAsync(config.simulationPython, [publisherPath, '--check'], {
      timeout: 60000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    const details = error.stderr?.trim() || error.message;
    throw new AppError(503, `SUMO demo is unavailable: ${details}`);
  }
}

function failPendingStarts(error) {
  for (const [runId] of startWaiters) resolveStartWaiter(runId, error);
}

function handleRunnerMessage(message) {
  if (!message || typeof message !== 'object') return;
  if (message.type === 'ready') {
    runnerReady?.resolve();
    return;
  }
  if (message.type === 'process_error') {
    console.error('[simulation] SUMO runner error:', message.message);
    if (!runnerReady?.settled) {
      runnerReady?.reject(new AppError(503, message.message || 'SUMO runner failed to initialize'));
    }
    return;
  }
  if (message.type === 'run_update') {
    void updateRun(message).then(async (run) => {
      if (!run) return;
      if (run.status === 'RUNNING') resolveStartWaiter(run.runId, null, run);
      if (run.status === 'COMPLETED') {
        resolveStartWaiter(run.runId, null, run);
        const mission = await Mission.findById(run.missionId);
        if (mission?.status === 'ACTIVE') {
          await missionService.markArrived(run.missionId);
        }
        await stopRunnerWhenIdle();
      }
      if (run.status === 'CANCELLED' || run.status === 'FAILED') {
        resolveStartWaiter(run.runId, new AppError(503, run.error || `Simulation ${run.status.toLowerCase()}`));
        await stopRunnerWhenIdle();
      }
    }).catch((error) => console.error('[simulation] failed to persist runner update:', error));
    return;
  }
  if (message.type === 'run_error') {
    void markRunFailed(message.runId, message.missionId, message.message);
    return;
  }
  if (message.type === 'stopped') {
    runnerReady?.resolve();
  }
}

export async function updateRun(message) {
  const sequence = Number(message.sequence);
  if (!Number.isInteger(sequence) || sequence < 0) return null;

  const changes = {
    status: message.status,
    lastSequence: sequence,
    lastUpdateAt: message.timestamp ? new Date(message.timestamp) : new Date(),
  };
  const fields = [
    'route',
    'currentEdgeId',
    'position',
    'speedKmh',
    'headingDegrees',
    'simulationTimeSeconds',
    'traffic',
    'restrictions',
    'signalState',
    'conflictState',
    'rerouteReason',
    'error',
  ];
  for (const field of fields) {
    const terminalTelemetryMissing = message.status === 'COMPLETED'
      && ['currentEdgeId', 'position', 'speedKmh', 'headingDegrees'].includes(field)
      && message[field] === null;
    if (Object.hasOwn(message, field) && !terminalTelemetryMissing) changes[field] = message[field];
  }
  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(message.status)) changes.completedAt = new Date();

  const filter = {
    runId: message.runId,
    status: { $in: ['STARTING', 'RUNNING'] },
    lastSequence: { $lt: sequence },
  };
  let run;
  if (message.status === 'RUNNING') {
    run = await SimulationRun.findOneAndUpdate(
      { ...filter, startedAt: null },
      { $set: { ...changes, startedAt: new Date() } },
      { new: true, runValidators: true }
    );
  }
  if (!run) {
    run = await SimulationRun.findOneAndUpdate(
      filter,
      { $set: changes },
      { new: true, runValidators: true }
    );
  }
  if (run) {
    bus.emit(EVENTS.SIMULATION_UPDATE, publicRun(run));
  }
  return run;
}

async function markRunFailed(runId, missionId, message) {
  const run = await SimulationRun.findOne({ runId, status: { $in: ['STARTING', 'RUNNING'] } });
  if (!run) return;
  const updated = await SimulationRun.findOneAndUpdate(
    { _id: run._id, status: { $in: ['STARTING', 'RUNNING'] } },
    {
      $set: {
        status: 'FAILED',
        error: message || 'SUMO runner failed',
        completedAt: new Date(),
        lastUpdateAt: new Date(),
        lastSequence: run.lastSequence + 1,
      },
    },
    { new: true }
  );
  resolveStartWaiter(runId, new AppError(503, updated?.error || 'SUMO runner failed'));
  if (updated) bus.emit(EVENTS.SIMULATION_UPDATE, publicRun(updated));
  const mission = await Mission.findById(missionId);
  if (mission?.status === 'ACTIVE') {
    await missionService.abortMission(missionId, 'SIMULATION_START_FAILED');
  }
}

function startRunner() {
  if (runner && runner.exitCode === null && !runner.killed) return runnerReady.promise;
  shuttingDown = false;
  const ready = {};
  ready.promise = new Promise((resolve, reject) => {
    ready.resolve = resolve;
    ready.reject = reject;
  });
  ready.settled = false;
  const resolveReady = ready.resolve;
  const rejectReady = ready.reject;
  ready.resolve = () => {
    if (ready.settled) return;
    ready.settled = true;
    resolveReady();
  };
  ready.reject = (error) => {
    if (ready.settled) return;
    ready.settled = true;
    rejectReady(error);
  };
  runnerReady = ready;
  runner = spawn(config.simulationPython, [publisherPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let output = '';
  runner.stdout.setEncoding('utf8');
  runner.stdout.on('data', (chunk) => {
    output += chunk;
    const lines = output.split(/\r?\n/);
    output = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        handleRunnerMessage(JSON.parse(line));
      } catch (error) {
        console.error('[simulation] invalid SUMO runner output:', error.message);
      }
    }
  });
  runner.stderr.setEncoding('utf8');
  runner.stderr.on('data', (chunk) => {
    console.error('[simulation] SUMO:', chunk.trim());
  });
  runner.on('error', (error) => {
    ready.reject(new AppError(503, `Could not launch SUMO runner: ${error.message}`));
    failPendingStarts(new AppError(503, `Could not launch SUMO runner: ${error.message}`));
  });
  runner.on('close', (code) => {
    runner = null;
    if (!ready.settled) {
      ready.reject(new AppError(503, `SUMO runner exited before becoming ready (code ${code})`));
    }
    if (!shuttingDown && code !== 0) {
      const error = new AppError(503, `SUMO runner exited unexpectedly (code ${code})`);
      ready.reject(error);
      failPendingStarts(error);
      void failActiveRuns(error.message);
    }
  });
  return ready.promise;
}

async function failActiveRuns(message) {
  const activeRuns = await SimulationRun.find({ status: { $in: ['STARTING', 'RUNNING'] } });
  for (const run of activeRuns) await markRunFailed(run.runId, String(run.missionId), message);
}

async function sendCommand(command) {
  if (!runner?.stdin?.writable) {
    throw new AppError(503, 'SUMO runner is not accepting commands');
  }
  await new Promise((resolve, reject) => {
    runner.stdin.write(`${JSON.stringify(command)}\n`, (error) => {
      if (error) reject(new AppError(503, `Could not send command to SUMO runner: ${error.message}`));
      else resolve();
    });
  });
}

async function startMissionSimulation(missionId) {
  const existingPromise = activationPromises.get(missionId);
  if (existingPromise) return existingPromise;
  const promise = startMissionSimulationOnce(missionId);
  activationPromises.set(missionId, promise);
  try {
    return await promise;
  } finally {
    activationPromises.delete(missionId);
  }
}

async function startMissionSimulationOnce(missionId) {
  const mission = await Mission.findById(missionId);
  if (!mission) throw new AppError(404, `Mission ${missionId} not found`);

  const existingRun = await SimulationRun.findOne({ missionId: mission._id });
  if (existingRun) {
    if (['STARTING', 'RUNNING', 'COMPLETED'].includes(existingRun.status)) {
      return { mission, simulation: existingRun };
    }
    throw new AppError(409, `This mission already has a ${existingRun.status.toLowerCase()} simulation run; duplicate runs are disabled`);
  }

  const vehicle = await Vehicle.findOne({ vehicleId: mission.vehicleId });
  const simulationConfig = validateMissionSimulation(mission, vehicle, networkConfig);
  await preflight();

  let run;
  try {
    run = await SimulationRun.create({
      runId: randomUUID(),
      missionId: mission._id,
      vehicleId: mission.vehicleId,
      mode: 'DEMO',
      status: 'STARTING',
      originEdgeId: simulationConfig.originEdgeId,
      destinationEdgeId: simulationConfig.destinationEdgeId,
    });
  } catch (error) {
    if (error.code === 11000) {
      const winner = await SimulationRun.findOne({ missionId: mission._id });
      if (winner?.status === 'RUNNING' || winner?.status === 'COMPLETED') {
        return { mission, simulation: winner };
      }
      throw new AppError(409, 'A simulation run already exists for this mission');
    }
    throw error;
  }

  let activatedMission;
  try {
    activatedMission = mission.status === 'CREATED'
      ? await missionService.activateMission(mission._id)
      : mission;
    await startRunner();
    const started = waitForStart(run.runId);
    await sendCommand({
      type: 'start',
      runId: run.runId,
      missionId: String(mission._id),
      vehicleId: mission.vehicleId,
      severity: mission.severity,
      originEdgeId: simulationConfig.originEdgeId,
      destinationEdgeId: simulationConfig.destinationEdgeId,
    });
    const startedRun = await started;
    return { mission: activatedMission, simulation: startedRun };
  } catch (error) {
    await SimulationRun.findByIdAndUpdate(run._id, {
      $set: { status: 'FAILED', error: error.message, completedAt: new Date(), lastUpdateAt: new Date() },
    });
    resolveStartWaiter(run.runId, error);
    if (activatedMission) {
      try {
        await missionService.abortMission(mission._id, 'SIMULATION_START_FAILED');
      } catch (abortError) {
        if (abortError.status !== 409) console.error('[simulation] failed to abort mission after startup failure:', abortError);
      }
    }
    throw error instanceof AppError ? error : new AppError(503, `Simulation startup failed: ${error.message}`);
  }
}

async function replayArrivedMissionOnce(sourceMission, force = false) {
  const existingReplay = await SimulationRun.findOne({ sourceMissionId: sourceMission._id });
  const activeReplay = existingReplay && ['STARTING', 'RUNNING'].includes(existingReplay.status)
    ? existingReplay
    : null;
  if (activeReplay) return activeReplay;
  if (!force && existingReplay) return existingReplay;

  const savedConfig = sourceMission.simulationConfig?.toObject?.() || sourceMission.simulationConfig;
  const simulationConfig = savedConfig?.mode === 'DEMO'
    && savedConfig.originEdgeId
    && savedConfig.destinationEdgeId
    ? savedConfig
    : {
      mode: 'DEMO',
      vehicleSource: 'SYNTHETIC_DEMO',
      originEdgeId: 'S1_S2',
      destinationEdgeId: 'S3_S4',
    };
  const replayMission = {
    ...sourceMission.toObject(),
    _id: new mongoose.Types.ObjectId(),
    vehicleId: `SIM-${sourceMission._id}`,
    status: 'ACTIVE',
    simulationConfig: {
      ...simulationConfig,
      mode: 'DEMO',
      vehicleSource: 'SYNTHETIC_DEMO',
    },
  };
  const validatedConfig = validateMissionSimulation(replayMission, null, networkConfig);
  await preflight();

  const runId = randomUUID();
  const run = existingReplay
    ? await SimulationRun.findByIdAndUpdate(
      existingReplay._id,
      {
        $set: {
          runId,
          missionId: replayMission._id,
          vehicleId: replayMission.vehicleId,
          mode: 'DEMO',
          source: 'SYNTHETIC_DEMO',
          status: 'STARTING',
          originEdgeId: validatedConfig.originEdgeId,
          destinationEdgeId: validatedConfig.destinationEdgeId,
          route: [],
          currentEdgeId: null,
          position: null,
          speedKmh: null,
          headingDegrees: null,
          simulationTimeSeconds: 0,
          traffic: [],
          restrictions: [],
          signalState: null,
          conflictState: null,
          rerouteReason: null,
          error: null,
          lastSequence: -1,
          lastUpdateAt: null,
          startedAt: null,
          completedAt: null,
        },
      },
      { new: true, runValidators: true }
    )
    : await SimulationRun.create({
      runId,
      missionId: replayMission._id,
      sourceMissionId: sourceMission._id,
      vehicleId: replayMission.vehicleId,
      mode: 'DEMO',
      status: 'STARTING',
      originEdgeId: validatedConfig.originEdgeId,
      destinationEdgeId: validatedConfig.destinationEdgeId,
    });

  try {
    await startRunner();
    const started = waitForStart(run.runId);
    await sendCommand({
      type: 'start',
      runId: run.runId,
      missionId: String(replayMission._id),
      sourceMissionId: String(sourceMission._id),
      vehicleId: replayMission.vehicleId,
      severity: replayMission.severity,
      originEdgeId: validatedConfig.originEdgeId,
      destinationEdgeId: validatedConfig.destinationEdgeId,
    });
    return await started;
  } catch (error) {
    await SimulationRun.findByIdAndUpdate(run._id, {
      $set: { status: 'FAILED', error: error.message, completedAt: new Date(), lastUpdateAt: new Date() },
    });
    resolveStartWaiter(run.runId, error);
    throw error instanceof AppError ? error : new AppError(503, `Arrived-mission replay failed: ${error.message}`);
  }
}

async function replayArrivedMission(sourceMission, force = false) {
  const missionId = String(sourceMission._id);
  const existingPromise = arrivedReplayPromises.get(missionId);
  if (existingPromise) return existingPromise;
  const promise = replayArrivedMissionOnce(sourceMission, force);
  arrivedReplayPromises.set(missionId, promise);
  try {
    return await promise;
  } finally {
    arrivedReplayPromises.delete(missionId);
  }
}

async function getSimulationRun(missionId) {
  const run = await SimulationRun.findOne({ missionId });
  if (!run) throw new AppError(404, `No simulation run exists for mission ${missionId}`);
  return run;
}

async function listArrivedMissionReplays() {
  return SimulationRun.find({ sourceMissionId: { $exists: true, $ne: null } })
    .sort({ createdAt: -1 })
    .limit(100);
}

async function replayArrivedMissions(force = false) {
  const missions = await Mission.find({ status: 'ARRIVED' }).sort({ arrivedAt: 1, _id: 1 });
  const runs = [];
  for (const mission of missions) {
    runs.push(await replayArrivedMission(mission, force));
  }
  return runs;
}

async function stopRunForMission(missionId, reason) {
  const run = await SimulationRun.findOne({ missionId, status: { $in: ['STARTING', 'RUNNING'] } });
  if (!run) return;
  if (runner?.stdin?.writable) {
    await sendCommand({ type: 'cancel', runId: run.runId, reason });
  } else {
    const cancelled = await SimulationRun.findByIdAndUpdate(
      run._id,
      {
        $set: {
          status: 'CANCELLED',
          error: reason,
          completedAt: new Date(),
          lastUpdateAt: new Date(),
          lastSequence: run.lastSequence + 1,
        },
      },
      { new: true }
    );
    if (cancelled) bus.emit(EVENTS.SIMULATION_UPDATE, publicRun(cancelled));
  }
}

async function stopRunnerWhenIdle() {
  if (!runner?.stdin?.writable) return;
  const active = await SimulationRun.exists({ status: { $in: ['STARTING', 'RUNNING'] } });
  if (!active) {
    await sendCommand({ type: 'shutdown' });
  }
}

async function onMissionUpdate(payload) {
  if (!['CLOSED', 'ABORTED'].includes(payload.status)) return;
  try {
    await stopRunForMission(payload.missionId, `Mission ${payload.status.toLowerCase()} by operator`);
  } catch (error) {
    console.error('[simulation] failed to stop terminal mission run:', error);
  }
}

export async function initializeSimulationManager() {
  if (!busListenerAttached) {
    bus.on(EVENTS.MISSION_UPDATE, onMissionUpdate);
    busListenerAttached = true;
  }
  const staleRuns = await SimulationRun.find({ status: { $in: ['STARTING', 'RUNNING'] } });
  for (const run of staleRuns) {
    const failed = await SimulationRun.findByIdAndUpdate(
      run._id,
      {
        $set: {
          status: 'FAILED',
          error: 'Backend restarted; the prior SUMO process is no longer available',
          completedAt: new Date(),
          lastUpdateAt: new Date(),
          lastSequence: run.lastSequence + 1,
        },
      },
      { new: true }
    );
    if (failed) bus.emit(EVENTS.SIMULATION_UPDATE, publicRun(failed));
  }

  const activeMissions = await Mission.find({ status: 'ACTIVE' });
  for (const mission of activeMissions) {
    try {
      await startMissionSimulation(String(mission._id));
    } catch (error) {
      console.error(
        `[simulation] active mission ${mission._id} (${mission.vehicleId}) was not loaded: ${error.message}`
      );
    }
  }

  try {
    await replayArrivedMissions();
  } catch (error) {
    console.error(`[simulation] ARRIVED mission replay initialization failed: ${error.message}`);
  }
}

export async function shutdownSimulationManager() {
  if (busListenerAttached) {
    bus.off(EVENTS.MISSION_UPDATE, onMissionUpdate);
    busListenerAttached = false;
  }
  if (runner?.stdin?.writable) {
    shuttingDown = true;
    await sendCommand({ type: 'shutdown' });
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (runner && runner.exitCode === null) runner.kill();
        resolve();
      }, 5000);
      runner?.once('close', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  failPendingStarts(new AppError(503, 'Backend is shutting down'));
}

export function getSimulationConfiguration() {
  return publicSimulationConfig(networkConfig);
}

export { getSimulationRun, listArrivedMissionReplays, replayArrivedMissions, startMissionSimulation };
