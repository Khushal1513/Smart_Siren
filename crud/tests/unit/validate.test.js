'use strict';

const v = require('../../middleware/validate');

function run(mw, req) {
  const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  const next = jest.fn();
  mw(req, res, next);
  return { res, next };
}

describe('validate middleware', () => {
  test('create: accepts valid, trims and whitelists', () => {
    const req = { body: { vehicleId: ' AMB-1 ', severity: 4, extra: 'x', route: [{ signalId: 'S1', distanceAlongRouteM: 10 }] } };
    const { next } = run(v.validateCreateMission, req);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ vehicleId: 'AMB-1', route: [{ signalId: 'S1', distanceAlongRouteM: 10 }], severity: 4 });
  });

  test.each([
    [{}],
    [{ vehicleId: '' }],
    [{ vehicleId: 'A', severity: 9 }],
    [{ vehicleId: 'A', route: [{ signalId: '', distanceAlongRouteM: -1 }] }],
  ])('create: rejects %j', (body) => {
    const { res, next } = run(v.validateCreateMission, { body });
    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('position: valid and invalid', () => {
    expect(run(v.validatePosition, { body: { lat: 12, lng: 77, speedKmh: 30 } }).next).toHaveBeenCalled();
    expect(run(v.validatePosition, { body: { lat: 200, lng: 77 } }).res.statusCode).toBe(400);
    expect(run(v.validatePosition, { body: { lat: 1, lng: 1, ts: 'garbage' } }).res.statusCode).toBe(400);
  });

  test('list query: parses and validates', () => {
    const req = { query: { status: 'ACTIVE', limit: '10', skip: '0' } };
    expect(run(v.validateListQuery, req).next).toHaveBeenCalled();
    expect(req.validatedQuery).toEqual({ status: 'ACTIVE', limit: 10, skip: 0 });
    expect(run(v.validateListQuery, { query: { status: 'NOPE' } }).res.statusCode).toBe(400);
    expect(run(v.validateListQuery, { query: { limit: '999' } }).res.statusCode).toBe(400);
  });

  test('id param validation', () => {
    const res = { status() { return this; }, json() { return this; } };
    const next = jest.fn();
    v.validateIdParam({}, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledTimes(1);
    const bad = run((req, r, n) => v.validateIdParam(req, r, n, 'xyz'), {});
    expect(bad.res.statusCode).toBe(400);
  });

  test('abort: reason optional, must be string', () => {
    expect(run(v.validateAbort, { body: undefined }).next).toHaveBeenCalled();
    expect(run(v.validateAbort, { body: { reason: 5 } }).res.statusCode).toBe(400);
  });
});