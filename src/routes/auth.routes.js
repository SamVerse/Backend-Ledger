const express = require('express');
const { userRegisterController, userLoginController, userLogoutController } = require('../controller/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

/* POST - /api/auth/register */
router.post('/register', userRegisterController);

/* POST - /api/auth/login */
router.post('/login', userLoginController);

/* POST - /api/auth/logout */
router.post('/logout', authMiddleware, userLogoutController);

module.exports = router;