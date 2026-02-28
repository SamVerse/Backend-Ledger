const accountModel = require("../model/account.model");

// Controller to create a new account for the authenticated user
async function createAccountController(req, res) {
    const user = req.user; // This is set by the authMiddleware 

    try {
        // Check if the user has maximum allowed accounts (e.g., 3 accounts per user)
        const accountCount = await accountModel.countDocuments({ user: user.id });

        if (accountCount >= 3) {
            return res.status(400).json({
                success: false,
                message: "User has reached the maximum number of allowed accounts (3)"
            });
        }

        // Create a new account for the authenticated user
        const account = await accountModel.create({ user: user.id });

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            account: account
        });
    } catch (error) {
        console.error("Error creating account:", error);
        res.status(500).json({
            success: false,
            message: "Error creating account",
            error: error.message
        });
    }
}

// Controller to get all accounts for the authenticated user
async function getUserAccountsController(req, res) {
    const user = req.user; // This is set by the authMiddleware

    try {
        // Fetch all accounts for the authenticated user
        const accounts = await accountModel.find({ user: user.id });

        res.status(200).json({
            success: true,
            message: "Accounts retrieved successfully",
            accounts: accounts
        });
    } catch (error) {
        console.error("Error fetching accounts:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching accounts",
            error: error.message
        });
    }
}

async function getAccountBalanceController(req, res) {
    const user = req.user; // This is set by the authMiddleware
    const { accountId } = req.params;
    
    try {
        // Fetch the account and ensure it belongs to the authenticated user
        const account = await accountModel.findOne({ _id: accountId, user: user.id });
        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account not found or does not belong to the user"
            });
        }

        // Get the current balance using the getBalance method defined in the account model
        const balance = await account.getBalance();
        res.status(200).json({
            success: true,
            message: "Account balance retrieved successfully",
            balance: balance
        });
    } catch (error) {
        console.error("Error fetching account balance:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching account balance",
            error: error.message
        });
    }
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
};