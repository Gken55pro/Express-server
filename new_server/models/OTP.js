const mongoose = require("mongoose");
const bycrpt = require("bcrypt");

const OTPSchema = new mongoose.Schema({
    email: {type: String},
    OTPPIN: {type: String},
    status: {type: String}
})

const OTP = mongoose.model("otps", OTPSchema);

module.exports = OTP;