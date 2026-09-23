const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

// Define authentication endpoints accessible without prior authorization tokens
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

module.exports = router;
