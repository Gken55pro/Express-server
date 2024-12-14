const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    payersID: {type: String},
    name: {type: String},
    email: {type: String},
    address: {type: String},
    phoneNumber: {type: String},
    city: {type: String},
    state: {type: String},
    postalCode: {type: String},
    paymentMethod: {type: String},
    date: {type: String},
    itemNum: {type: String},
    totalAmount: {type: Number},
    products: [
        {
            _id: {type: String},
            name: {type: String},
            category: {type: String},
            amount: {type: Number},
            image: {type: String},
            price: {type: Number}
        }
    ]
});

const Order = mongoose.model("orders", orderSchema);

module.exports = Order;