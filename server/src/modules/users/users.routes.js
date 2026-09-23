const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/rbac.middleware');

// Protect all user management endpoints behind authentication
router.use(authenticateToken);

// Mount user operations gated strictly by DB-driven USERS permissions
router.get('/', requirePermission('USERS', 'READ'), usersController.getUsers);
router.get('/:id', requirePermission('USERS', 'READ'), usersController.getUserById);
router.post('/', requirePermission('USERS', 'CREATE'), usersController.createUser);
router.put('/:id', requirePermission('USERS', 'UPDATE'), usersController.updateUser);
router.patch('/:id/deactivate', requirePermission('USERS', 'UPDATE'), usersController.deactivateUser);
router.post('/:id/reassign', requirePermission('USERS', 'UPDATE'), usersController.reassignStages);

module.exports = router;
