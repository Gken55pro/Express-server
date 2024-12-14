const mongoose = require("mongoose");



const discountSchema = new mongoose.Schema(
    { 
        code: {type: String},
        percentage: {type: Number},
        currentUseCount: {type: Number},
        limit: {type: Number},
        date: {type: String},
        users: [
            {type: String}
        ]
    }
);

const Discount = mongoose.model("discounts", discountSchema);

module.exports = Discount;