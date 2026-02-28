const mongoose = require("mongoose");
const accountModel = require("../model/account.model");
const transactionModel = require("../model/transaction.model");
const ledgerModel = require("../model/ledger.model");
const emailService = require("../services/email.service");
const { isSameAccount, isValidObjectId } = require("../utils/account.utils");

/* 
- Create a new transaction between two accounts.
- The 10-Step Transaction Flow:
  1) Validate Request: Ensure the request body contains all required fields (fromAccount, toAccount, amount, currency, idempotencyKey) and that they are valid.
  2) Idempotency Check: Check if a transaction with the same idempotencyKey already exists. If it does, return the existing transaction to prevent duplicate processing.
  3) Check Account Status: Verify that both the source (fromAccount) and destination (toAccount) accounts exist and are active.
  4) Derive sender balance from ledger entries: Calculate the current balance of the source account by summing all related ledger entries (debits and credits).
  5) Check Sufficient Funds: Ensure that the source account has sufficient funds to cover the transaction amount.
  6) Create Transaction Record: Create a new transaction record in the database with status set to "PENDING".
  7) Create Ledger Entries: Create corresponding ledger entries for both accounts
  (a "DEBIT" entry for the source account and a "CREDIT" entry for the destination account).
  8) Update Transaction Status: If all operations are successful, update the transaction status to "COMPLETED". If any operation fails, update the status to "FAILED".
  9) Commit or Rollback: If using a database that supports transactions, commit the transaction if successful or rollback if any step fails to ensure data integrity.
  10) Send an email notification to both account holders about the transaction status.
  11) Return Response: Send an appropriate response back to the client indicating the success or failure of the transaction along with relevant details.
*/

async function createTransactionController(req, res) {
  const {
    fromAccount,
    toAccount,
    amount,
    currency,
    description,
    idempotencyKey,
  } = req.body;
  
  const user = req.user; // This is set by the authMiddleware

  // Step 1: Validate request
  if (!fromAccount || !toAccount || !amount || !currency || !idempotencyKey) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: fromAccount, toAccount, amount, currency, and idempotencyKey are all required.",
    });
  }

  //   Validate that the amount is a positive number
  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid amount: amount must be a positive number.",
    });
  }

  if (!isValidObjectId(fromAccount) || !isValidObjectId(toAccount)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid account format: fromAccount and toAccount must be valid account IDs.",
    });
  }

  if (isSameAccount(fromAccount, toAccount)) {
    return res.status(400).json({
      success: false,
      message: "Self transfer is not allowed: fromAccount and toAccount must be different.",
    });
  }

  const fromUserAccount = await accountModel
    .findOne({ _id: fromAccount, user: user.id })
    .populate("user", "email name");
  const toUserAccount = await accountModel
    .findOne({ _id: toAccount })
    .populate("user", "email name");

  if (!fromUserAccount || !toUserAccount) {
    return res.status(404).json({
      success: false,
      message: "Invalid account(s): Both fromAccount and toAccount must exist.",
    });
  }

  if (!fromUserAccount.user?.email || !toUserAccount.user?.email) {
    return res.status(400).json({
      success: false,
      message:
        "Unable to send notifications: account owner email is missing for one or both accounts.",
    });
  }

  //   Check if both currency codes are the same for fromAccount and toAccount. If not, return an error (for simplicity, we are not handling currency conversion in this implementation).
  if (
    fromUserAccount.currency !== currency ||
    toUserAccount.currency !== currency
  ) {
    return res.status(400).json({
      success: false,
      message: "Currency mismatch: Both accounts must have the same currency.",
    });
  }

  // Step 2: Idempotency Check
  const isTransactionAlreadyExists = await transactionModel.findOne({
    idempotencyKey,
  });
  if (isTransactionAlreadyExists) {
    if (isTransactionAlreadyExists.status === "COMPLETED") {
      return res.status(200).json({
        success: true,
        message: "Transaction already processed successfully.",
        transaction: isTransactionAlreadyExists,
      });
    }

    if (isTransactionAlreadyExists.status === "PENDING") {
      return res.status(202).json({
        success: true,
        message: "Transaction is currently being processed.",
      });
    }

    if (isTransactionAlreadyExists.status === "FAILED") {
      return res.status(409).json({
        success: false,
        message:
          "A previous transaction attempt with the same idempotencyKey failed. Please try again with a new idempotencyKey.",
      });
    }
    if (isTransactionAlreadyExists.status === "REVERSED") {
      return res.status(409).json({
        success: false,
        message:
          "A previous transaction attempt with the same idempotencyKey was reversed. Please try again with a new idempotencyKey.",
      });
    }
  }

  // Step 3: Check Account Status
  if (
    fromUserAccount.status !== "ACTIVE" ||
    toUserAccount.status !== "ACTIVE"
  ) {
    return res.status(403).json({
      success: false,
      message:
        "One or both accounts are not active. Transactions can only be made between active accounts.",
    });
  }

  // Using a session to ensure atomicity of the transaction and ledger entry creation
  const session = await mongoose.startSession();
  let transaction = null;

  try {
    session.startTransaction();
    // Step 4: Derive sender balance from ledger entries
    const senderBalance = await fromUserAccount.getBalance();

    // Step 5: Check Sufficient Funds
    if (senderBalance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Insufficient balance in the source account. Available balance: ${senderBalance}, Requested amount: ${amount}`,
      });
    }

    // Step 6: Create Transaction Record
    const transactions = await transactionModel.create(
      [
        {
          fromAccount: fromUserAccount._id,
          toAccount: toUserAccount._id,
          amount,
          currency,
          description,
          idempotencyKey,
          status: "PENDING",
        },
      ],
      { session },
    );
    transaction = transactions[0];

    // Step 7: Create Ledger Entries
    await ledgerModel.create(
      [
        {
          account: fromUserAccount._id,
          amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
      ],
      { session },
    );

    await ledgerModel.create(
      [
        {
          account: toUserAccount._id,
          amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

    // Step 8: Update Transaction Status
    transaction.status = "COMPLETED";
    await transaction.save({ session });

    // Step 9: Commit the transaction
    await session.commitTransaction();
  } catch (error) {
    // If any error occurs, abort the transaction and rollback changes
    await session.abortTransaction();

    // Mark transaction as FAILED (if it was created)
    session.endSession();

    const isTransactionRetryError =
      typeof error?.message === "string" &&
      error.message.includes(
        "Please retry your operation or multi-document transaction.",
      );

    return res.status(500).json({
      success: false,
      message: isTransactionRetryError
        ? "Another transaction is still being processed for this account. Please wait a moment and try again."
        : "An error occurred while processing the transaction.",
      error: error.message,
    });
  }

  session.endSession();

  // Step 10: Send email notifications
  try {
    // This sends a transaction notification email to the sender (fromAccount) with details of the debit transaction
    await emailService.sendTransactionNotification(fromUserAccount.user.email, {
      type: "DEBIT",
      amount,
      currency,
      toAccount: toUserAccount._id,
      description,
      status: transaction.status,
    });

    // This sends a transaction notification email to the recipient (toAccount) with details of the credit transaction
    await emailService.sendTransactionNotification(toUserAccount.user.email, {
      type: "CREDIT",
      amount,
      currency,
      fromAccount: fromUserAccount._id,
      description,
      status: transaction.status,
    });

    // Step 11: Return Response
    return res.status(201).json({
      success: true,
      message: "Transaction completed successfully.",
      transaction,
    });
  } catch (emailError) {
    console.error(
      "Failed to send email notifications for transaction:",
      emailError,
    );
    // Note: The transaction has already been completed at this point, so we do not want to roll back the transaction due to email failures.
    return res.status(201).json({
      success: true,
      message:
        "Transaction completed successfully, but failed to send email notifications.",
      emailError: emailError.message,
    });
  }
}

// This controller is used to fund a new account with initial funds from a system account. It will be protected by authSystemUserMiddleware to ensure that only system users can access it.
async function createInitialFundsTransactionController(req, res) {
    const { toAccount, amount, currency, idempotencyKey } = req.body;
    const systemUser = req.user; // This is set by the authSystemUserMiddleware

    // Step 1: Validate request
    if (!toAccount || !amount || !currency || !idempotencyKey) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields: toAccount, amount, currency, and idempotencyKey are all required."
        });
    }

    // Validate that the amount is a positive number
    if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid amount: amount must be a positive number."
        });
    }

    // Validate that toAccount is a valid ObjectId
    if (!isValidObjectId(toAccount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid toAccount format: provide a valid destination account ID.",
      });
    }

    // Strictly resolve destination by Account ID only, not by user or other parameters, to avoid ambiguity and ensure we are crediting the correct account.
    const toUserAccount = await accountModel
      .findOne({ _id: toAccount })
      .populate("user", "email name");

    if (!toUserAccount) {
      return res.status(404).json({
        success: false,
        message: "Invalid account: destination account does not exist.",
      });
    }

    // For initial funding, we will use a system account associated with the authenticated system user. We will look for an ACTIVE account with the specified currency for the system user to use as the source of funds.
    const fromUserAccount = await accountModel.findOne({
      user: systemUser._id,
      currency,
      status: "ACTIVE",
    });

    if (!fromUserAccount) {
      return res.status(404).json({
        success: false,
        message: `System user account for currency ${currency} not found for the authenticated system user.`,
      });
    }

    if (isSameAccount(fromUserAccount._id, toUserAccount._id)) {
      return res.status(400).json({
        success: false,
        message: "Self transfer is not allowed: source and destination accounts must be different.",
      });
    }
    
    // Check Account Status
    if (toUserAccount.status !== "ACTIVE") {
        return res.status(403).json({
            success: false,
            message: "The destination account is not active. Transactions can only be made to active accounts."
        });
    }

    // Checking if the destination account's currency matches the transaction currency.
    if (toUserAccount.currency !== currency) {
        return res.status(400).json({
            success: false,
            message: "Currency mismatch: The destination account must have the same currency as the transaction.",
        });
    }

    // Using a session to ensure atomicity of the transaction and ledger entry creation
    const session = await mongoose.startSession();
    let transaction = null;

    try {
        session.startTransaction();
        // Create Transaction Record
        // Pass array to create method to use session
        const transactions = await transactionModel.create([{
            fromAccount: fromUserAccount._id,
            toAccount: toUserAccount._id,
            amount,
            currency,
            description: "Initial funds from system account",
            idempotencyKey,
            status: "PENDING"
        }], { session });

        transaction = transactions[0];

        // Create Ledger Entries
        await ledgerModel.create([{
            account: fromUserAccount._id,
            amount,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session });

        await ledgerModel.create([{
            account: toUserAccount._id,
            amount,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session });

        // Update Transaction Status
        transaction.status = "COMPLETED";
        await transaction.save({ session });
        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        if (transaction && transaction._id) {
            // Using separate update call as transaction object might not be saved if error happened before save()
            // But since we created it inside transaction, aborting rolls it back anyway?
            // Actually, if we want to keep a record of FAILED transaction, it must be committed or done outside this transaction scope.
            // For now, let's just abort. The record won't exist if aborted.
            // If we want to persist failure, we need a new session or no session.
        }
        
        session.endSession();

        const isTransactionRetryError =
          typeof error?.message === "string" &&
          error.message.includes("Please retry your operation or multi-document transaction.");

        return res.status(500).json({
            success: false,
          message: isTransactionRetryError
            ? "Another transaction is still being processed for this account. Please wait a moment and try again."
            : "An error occurred while processing the initial funds transaction.",
            error: error.message
        });
    }
    session.endSession();
    
    // Send email notification only if transaction was successful (and thus committed)
    try {
        if (toUserAccount.user && toUserAccount.user.email) {
            await emailService.sendTransactionNotification(toUserAccount.user.email, {
                type: "CREDIT",
                amount,
                currency,
                fromAccount: fromUserAccount._id,
                description: "Initial funds from system account",
                status: transaction.status
            });
        }

        return res.status(201).json({
            success: true,
            message: "Initial funds transaction completed successfully.",
            transaction: transaction
        });
    }

    catch (emailError) {
        console.error("Failed to send email notification for initial funds transaction:", emailError);
        return res.status(201).json({
            success: true,
            message: "Initial funds transaction completed successfully, but failed to send email notification.",
        transaction,
            emailError: emailError.message
        });
    }
}

module.exports = {
  createTransactionController,
  createInitialFundsTransactionController,
};
