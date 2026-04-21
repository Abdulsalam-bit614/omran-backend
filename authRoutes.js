const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// مسار التسجيل: /api/auth/register
router.post('/register', authController.register);

// مسار الدخول: /api/auth/login
router.post('/login', authController.login);

module.exports = router;
