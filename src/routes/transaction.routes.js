const { Router } = require("express");
const { authMiddleware, authSystemUserMiddleware } = require("../middleware/auth.middleware");
const { createTransactionController, createInitialFundsTransactionController } = require("../controller/transaction.controller");


const router = Router();

/* 
- POST - /api/transactions 
- Create a new transaction between two accounts. 
*/
router.post("/", authMiddleware, createTransactionController);

/* 
- POST - /api/transactions/systems/initial-funds
- This endpoint is used to fund a new account with initial funds from a system account.
*/
router.post("/systems/initial-funds", authSystemUserMiddleware, createInitialFundsTransactionController);


module.exports = router;