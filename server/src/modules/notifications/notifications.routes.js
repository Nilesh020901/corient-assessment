const express = require('express');
const router = express.Router();
const notificationsController = require('./notifications.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/', notificationsController.getMyNotifications);
router.patch('/:id/read', notificationsController.markAsRead);
router.patch('/read-all', notificationsController.markAllAsRead);

module.exports = router;
