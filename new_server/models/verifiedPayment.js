const mongoose = require("mongoose");

const verifiedTransactionSchema = new mongoose.Schema({
    email: {type: String},
    reference: {type: String},
    receipt: {type: String}
});

const VerifiedTransactions = new mongoose.model("verified_transactions", verifiedTransactionSchema);

module.exports = VerifiedTransactions;