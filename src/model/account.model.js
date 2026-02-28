const mongoose = require("mongoose");
const ledgerModel = require("./ledger.model");

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Account must be associated with a user"],
      index: true, // Adding an index for faster lookups by user
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "FROZEN", "CLOSED"],
        message: "Status must be either ACTIVE, FROZEN, or CLOSED",
      },
      default: "ACTIVE",
    },
    currency: {
      type: String,
      required: [true, "Currency is required for creating an account"],
      uppercase: true,
      match: [/^[A-Z]{3}$/, "Currency must be a valid 3-letter ISO code."],
      default: "INR",
    },
  },
  {
    timestamps: true,
  },
);

accountSchema.index({ user: 1, status: 1 }); // Compound index for user and status to optimize queries filtering by these fields

// Virtual property to calculate the current balance of the account
accountSchema.methods.getBalance = async function () {
    
  // Use aggregation to calculate the total credits and debits for this account from the ledger entries
  const result = await ledgerModel.aggregate([
    // Match ledger entries for this account
    {
      $match: {
        account: this._id,
      },
    },
    // Group by account and calculate total credits and debits
    {
      $group: {
        _id: null,
        totalCredits: {
          // Use $cond to sum only the amounts where type is CREDIT
          $sum: {
            $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0],
          },
        },
        totalDebits: {
          // Use $cond to sum only the amounts where type is DEBIT
          $sum: {
            $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0],
          },
        },
      },
    },
    {
      // Project the final balance by subtracting total debits from total credits
      $project: {
        _id: 0,
        balance: { $subtract: ["$totalCredits", "$totalDebits"] },
      },
    },
  ]);

  // If there are no ledger entries, return a balance of 0
  if (result.length === 0) {
    return 0;
  }

  // Return the calculated balance from the aggregation result
  return result[0].balance;
};

const accountModel = mongoose.model("account", accountSchema);

module.exports = accountModel;
