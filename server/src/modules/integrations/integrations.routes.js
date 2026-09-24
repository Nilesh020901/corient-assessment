const express = require('express');
const router = express.Router();
const integrationsController = require('./integrations.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/rbac.middleware');

router.use(authenticateToken);

// OpenProject Work Package Integration Stubs
router.post('/openproject/sync/:stageId', requirePermission('WORKFLOW', 'UPDATE'), integrationsController.syncOpenProjectStage);
router.get('/openproject/status/:projectId', requirePermission('PROJECTS', 'READ'), integrationsController.getOpenProjectStatus);

// Timesheet Labor Tracking Integration Stubs
router.post('/timesheet/log', requirePermission('WORKFLOW', 'UPDATE'), integrationsController.logTimesheet);
router.get('/timesheet/stage/:stageId', requirePermission('WORKFLOW', 'READ'), integrationsController.getStageTimesheets);

module.exports = router;
