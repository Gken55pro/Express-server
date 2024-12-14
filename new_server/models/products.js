const mongoose = require("mongoose");
const bycrpt = require("bcrypt");

const productSchema = new mongoose.Schema({
    name: {type: String},
    image: {type: String},
    Price: {type: Number},
    category: {type: String},
    discount: {type: Number},
    status: {type: String},
    amount: {type: Number},
    rating: {type: Number},
    count: {type: Number},
    description: {type: String},
    secondaryImages:[
            {
                _id: {type: Number},
                 image: {type: String}
            }
        ],
    reviews: [
            {
                _id: {type: String},
                 name: {type: String},
                  rating: {type: Number},
                   date: {type: String},
                    reviewBody: {type: String}
            }
        ]
});

const Product = mongoose.model("products", productSchema);

module.exports = Product;