const express = require('express');
const router = express.Router();
const rolesController = require('./roles.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/rbac.middleware');

// Protect all role management endpoints behind valid authentication tokens
router.use(authenticateToken);

// Mount role and permission management endpoints guarded strictly by granular permissions
router.get('/', requirePermission('ROLES', 'READ'), rolesController.getRoles);
router.get('/permissions/all', requirePermission('ROLES', 'READ'), rolesController.getPermissions);
router.put('/:id/permissions', requirePermission('ROLES', 'UPDATE'), rolesController.updateRolePermissions);

module.exports = router;
