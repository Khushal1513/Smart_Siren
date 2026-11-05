import * as svc from '../services/mission/missionService.js';
import asyncHandler from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
  const mission = await svc.createMission(req.body);
  res.status(201).json({ data: mission });
});

export const activate = asyncHandler(async (req, res) => {
  res.json({ data: await svc.activateMission(req.params.id) });
});

export const addPosition = asyncHandler(async (req, res) => {
  res.json({ data: await svc.addPosition(req.params.id, req.body) });
});

export const arrive = asyncHandler(async (req, res) => {
  res.json({ data: await svc.markArrived(req.params.id) });
});

export const close = asyncHandler(async (req, res) => {
  res.json({ data: await svc.closeMission(req.params.id) });
});

export const abort = asyncHandler(async (req, res) => {
  res.json({ data: await svc.abortMission(req.params.id, req.body.reason || 'MANUAL') });
});

export const list = asyncHandler(async (req, res) => {
  const items = await svc.listMissions(req.validatedQuery || {});
  res.json({ data: items, count: items.length });
});

export const get = asyncHandler(async (req, res) => {
  res.json({ data: await svc.getMission(req.params.id) });
});