const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/rbac.middleware');

// Protect audit log endpoints behind authentication
router.use(authenticateToken);

// Explicitly block Client users with HTTP 403 Forbidden to maintain strict compliance separation
router.use((req, res, next) => {
  if (req.user && req.user.role === 'CLIENT') {
    return res.status(403).json({ message: 'Forbidden: Client role is strictly prohibited from accessing audit logs' });
  }
  next();
});

// Guard audit querying with dynamic AUDIT permissions
router.get('/', requirePermission('AUDIT', 'READ'), auditController.getAuditLogs);

module.exports = router;
