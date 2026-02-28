const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Ledger entry must be associated with an account"],
        index: true,   // Adding an index for faster lookups by account
        immutable: true  // Once set, the account reference cannot be changed
    },
    amount: {
        type: Number,
        required: [true, "Ledger entry amount is required"],
        min: [0.01, "Ledger entry amount must be at least 0.01"],
        immutable: true  // Once set, the amount cannot be changed
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required: [true, "Ledger entry must be associated with a transaction"],
        index: true,   // Adding an index for faster lookups by transaction
        immutable: true  // Once set, the transaction reference cannot be changed
    },
    type: {
        type: String,
        enum: {
            values: ["DEBIT", "CREDIT"],
            message: "Ledger entry type must be either 'DEBIT' or 'CREDIT'"
        },
        required: [true, "Ledger entry type is required"],
        immutable: true  // Once set, the type cannot be changed
    },
})

// Prevent updates and deletions of ledger entries after creation
function preventLedgerModification(next) {
    if (!this.isNew) {
        return next(new Error("Ledger entries cannot be modified or deleted after creation"));
    }
    next();
}

// Apply the pre-hooks to prevent modifications and deletions of ledger entries
ledgerSchema.pre("findOneAndUpdate", preventLedgerModification);
ledgerSchema.pre("findOneAndDelete", preventLedgerModification);
ledgerSchema.pre("findOneAndReplace", preventLedgerModification);
ledgerSchema.pre("updateOne", preventLedgerModification);
ledgerSchema.pre("updateMany", preventLedgerModification);
ledgerSchema.pre("deleteOne", preventLedgerModification);
ledgerSchema.pre("deleteMany", preventLedgerModification);
ledgerSchema.pre("remove", preventLedgerModification);
ledgerSchema.pre("replaceOne", preventLedgerModification);


const Ledger = mongoose.model("ledger", ledgerSchema);

module.exports = Ledger;