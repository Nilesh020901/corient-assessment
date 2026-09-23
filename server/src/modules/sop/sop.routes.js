const express = require('express');
const router = express.Router();
const sopController = require('./sop.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/rbac.middleware');

// Protect all SOP management endpoints behind authentication
router.use(authenticateToken);

// SOP template CRUD operations guarded by SOP permissions
router.get('/', requirePermission('SOP', 'READ'), sopController.getTemplates);
router.get('/:id', requirePermission('SOP', 'READ'), sopController.getTemplateById);
router.post('/', requirePermission('SOP', 'CREATE'), sopController.createTemplate);
router.put('/:id', requirePermission('SOP', 'UPDATE'), sopController.updateTemplate);
router.delete('/:id', requirePermission('SOP', 'DELETE'), sopController.deleteTemplate);

// Stage configuration endpoints
router.post('/:id/stages', requirePermission('SOP', 'UPDATE'), sopController.addStage);
router.put('/:id/stages/:stageId', requirePermission('SOP', 'UPDATE'), sopController.updateStage);
router.put('/:id/stages-reorder', requirePermission('SOP', 'UPDATE'), sopController.reorderStages);
router.delete('/:id/stages/:stageId', requirePermission('SOP', 'UPDATE'), sopController.deleteStage);

// Immutable SOP publication endpoint
router.post('/:id/publish', requirePermission('SOP', 'PUBLISH'), sopController.publishTemplate);

module.exports = router;
