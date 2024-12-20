const mongoose = require("mongoose");

const mongooseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "name is required"]
    },
    email: {
        type: String, 
        required: [true, "email is required"],
        lowercase: true
    },
    password: {
        type: String, 
        required: [true, "password is required"],
        minLenght: [6]
    },
    image: {type: String},
    address: {type: String},
    phoneNumber: {type: String},
    status: {type: String},
    date: {type: String},
});

const Admin = mongoose.model("admins", mongooseSchema);

module.exports = Admin;