const { createAccountController, getUserAccountsController, getAccountBalanceController } = require('../controller/account.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const express = require('express');

const router = express.Router();

/* 
- POST - /api/accounts/
- Create a new account 
- Private route - requires authentication
*/

router.post("/", authMiddleware, createAccountController);

/* 
- GET - /api/accounts/
- Get all accounts for the authenticated user
- Private route - requires authentication
*/

router.get("/", authMiddleware, getUserAccountsController);   

/* 
- GET - /api/accounts/balance/:accountId
- Get the current balance of a specific account by its ID
- Private route - requires authentication
*/

router.get("/balance/:accountId", authMiddleware, getAccountBalanceController);

module.exports = router;