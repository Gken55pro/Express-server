const mongoose = require("mongoose");

const initDataSchema = new mongoose.Schema(
    {
        payersID: {type: String},
        name: {type: String},
        email: {type: String},
        address: {type: String},
        phoneNumber: {type: String},
        city: {type: String},
        state: {type: String},
        postalCode: {type: String},
        paymentMethod: {type: String},
        itemNum: {type: String},
        date: {type: String},
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
        }
);


const InitData = mongoose.model("initialize_transaction_datas", initDataSchema);

module.exports = InitData