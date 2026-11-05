'use strict';

const svc = require('../services/mission/missionService');
// Reuse the existing wrapper; supports `module.exports = fn` and `{ asyncHandler }`.
const asyncHandlerMod = require('../utils/asyncHandler');
const asyncHandler = asyncHandlerMod.asyncHandler || asyncHandlerMod;

exports.create = asyncHandler(async (req, res) => {
  const mission = await svc.createMission(req.body);
  res.status(201).json({ data: mission });
});

exports.activate = asyncHandler(async (req, res) => {
  res.json({ data: await svc.activateMission(req.params.id) });
});

exports.addPosition = asyncHandler(async (req, res) => {
  res.json({ data: await svc.addPosition(req.params.id, req.body) });
});

exports.arrive = asyncHandler(async (req, res) => {
  res.json({ data: await svc.markArrived(req.params.id) });
});

exports.close = asyncHandler(async (req, res) => {
  res.json({ data: await svc.closeMission(req.params.id) });
});

exports.abort = asyncHandler(async (req, res) => {
  res.json({ data: await svc.abortMission(req.params.id, req.body.reason || 'MANUAL') });
});

exports.list = asyncHandler(async (req, res) => {
  const items = await svc.listMissions(req.validatedQuery || {});
  res.json({ data: items, count: items.length });
});

exports.get = asyncHandler(async (req, res) => {
  res.json({ data: await svc.getMission(req.params.id) });
});