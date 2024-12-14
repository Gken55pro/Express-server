const mongoose = require("mongoose");
const bycrpt = require("bcrypt");

// user schema
const userSchema = new mongoose.Schema({
    name: {
        type: String, 
        required: [true, "name is reqired"]
    },
    email: {
        type: String, 
        required: [true, "email is reqired"],
        lowercase: true
    },
    password: {
        type: String, 
        required: [true, "password is reqired"],
        minLenght: [6]
    },
    image: {
        type: String
    },
    address: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    birth: {
        type: String
    },
    discountCode: {
        type: String
    },
    cart: [
        {
            _id: {type: String},
            name: {type: String},
            category: {type: String},
            amount: {type: Number},
            image: {type: String},
            price: {type: Number}
        }
    ],
    pending: [
        {
            _id: {type: String},
            name: {type: String},
            category: {type: String},
            amount: {type: Number},
            image: {type: String},
            price: {type: Number}
        }
    ],
    history: [
        {
            _id: {type: String},
            name: {type: String},
            category: {type: String},
            amount: {type: Number},
            image: {type: String},
            price: {type: Number}
        }
    ],
    message: [
        {
            _id: {type: String},
            name: {type: String},
            email: {type: String},
            body: {type: String},
            status: {type: String},
            date: {type: String}
        }
    ]

});



// hash password

userSchema.pre("save", async function(next){
    const salt = await bycrpt.genSalt();
    const hashedPassword = await bycrpt.hash(this.password, salt);
    console.log(hashedPassword)
    this.password = hashedPassword;
    next();
})


// user model
const User = mongoose.model("users", userSchema);

module.exports = User;