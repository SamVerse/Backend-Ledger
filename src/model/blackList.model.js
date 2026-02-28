const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "Token is required to blacklist"],
        unique: [true, "This token is already blacklisted"],
    }
},{
    timestamps: true,
});

tokenBlacklistSchema.index({ createdAt: 1 },{
    expireAfterSeconds: 60 * 60 * 24 * 2, // Automatically remove blacklisted  tokens after 2 days..
} );

const tokenBlacklistModel = mongoose.model("tokenBlacklist", tokenBlacklistSchema);

module.exports = tokenBlacklistModel;