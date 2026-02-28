const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Transaction must have a source account"],
        index: true   // Adding an index for faster lookups by fromAccount
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Transaction must have a destination account"],
        index: true   // Adding an index for faster lookups by toAccount
    },
    status: {
        type: String,
        enum: {
            values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
            message: "Status must be either 'PENDING', 'COMPLETED', 'FAILED', or 'REVERSED'" 
        },
        default: "PENDING"
    },
    amount: {
        type: Number,
        required: [true, "Transaction amount is required"],
        min: [0.01, "Transaction amount must be at least 0.01"]
    },
    currency: {
        type: String,
        required: [true, "Currency is required for a transaction"],
        uppercase: true,
        match: [
            /^[A-Z]{3}$/,   
            'Currency must be a valid 3-letter ISO code.'
        ]
    },
    description: {
        type: String,
        trim: true,
        maxlength: [255, "Description cannot exceed 255 characters"]
    },
    idempotencyKey: {
        type: String,
        required: [true, "Idempotency key is required for a transaction"],
        unique: true,
        index: true   // Adding an index for faster lookups by idempotencyKey
    }
}, {
    timestamps: true
});

const Transaction = mongoose.model("transaction", transactionSchema);

module.exports = Transaction;