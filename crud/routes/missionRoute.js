'use strict';

const express = require('express');
const ctrl = require('../controller/missionController');
const v = require('../middleware/validate');

const router = express.Router();

router.param('id', v.validateIdParam);

router.post('/', v.validateCreateMission, ctrl.create);
router.get('/', v.validateListQuery, ctrl.list);
router.get('/:id', ctrl.get);
router.post('/:id/activate', ctrl.activate);
router.post('/:id/position', v.validatePosition, ctrl.addPosition);
router.post('/:id/arrive', ctrl.arrive);
router.post('/:id/close', ctrl.close);
router.post('/:id/abort', v.validateAbort, ctrl.abort);

// Local error handler so AppError statuses (404/409) are honoured regardless of app-level handlers.
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[missions]', err);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message, details: err.details });
});

module.exports = router;