const mongoose = require("mongoose");

const transacSchema = new mongoose.Schema({
    payersID: {type: String},
    name: {type: String},
    email: {type: String},
    address: {type: String},
    phoneNumber: {type: String},
    city: {type: String},
    state: {type: String},
    postalCode: {type: String},
    paymentMethod: {type: String},
    status: {type: String},
    date: {type: String},
    itemNum: {type: String},
    totalAmount: {type: Number}
});

const Transaction = mongoose.model("transactions", transacSchema);

module.exports = Transaction;