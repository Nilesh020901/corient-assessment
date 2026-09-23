const express = require('express');
const router = express.Router();
const projectsController = require('./projects.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/rbac.middleware');
const { filterClientData } = require('../../middlewares/clientFilter.middleware');

// Protect all project endpoints behind authentication
router.use(authenticateToken);

// Automatically strip confidential fields from project responses for Client role
router.use(filterClientData);

// Project endpoints guarded strictly by dynamic PROJECTS permissions
router.get('/', requirePermission('PROJECTS', 'READ'), projectsController.getProjects);
router.get('/:id', requirePermission('PROJECTS', 'READ'), projectsController.getProjectById);
router.post('/', requirePermission('PROJECTS', 'CREATE'), projectsController.createProject);
router.put('/:id', requirePermission('PROJECTS', 'UPDATE'), projectsController.updateProject);
router.delete('/:id', requirePermission('PROJECTS', 'DELETE'), projectsController.deleteProject);

module.exports = router;
