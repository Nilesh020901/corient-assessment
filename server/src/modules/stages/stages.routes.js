const express = require('express');
const router = express.Router({ mergeParams: true });
const stagesController = require('./stages.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/rbac.middleware');
const { filterClientData } = require('../../middlewares/clientFilter.middleware');

// Protect all workflow stage operations behind authentication
router.use(authenticateToken);

// Automatically strip confidential fields from stage responses for Client role
router.use(filterClientData);

// Stage status operations guarded by granular permissions
router.patch('/:stageId/status', requirePermission('WORKFLOW', 'STATUS_UPDATE'), stagesController.updateStageStatus);
router.get('/:stageId/status-history', requirePermission('WORKFLOW', 'READ'), stagesController.getStageHistory);
router.patch('/:stageId/assign', requirePermission('WORKFLOW', 'UPDATE'), stagesController.assignStageOwner);
router.post('/:stageId/remarks', requirePermission('WORKFLOW', 'UPDATE'), stagesController.addStageRemarksOrDocs);

module.exports = router;
