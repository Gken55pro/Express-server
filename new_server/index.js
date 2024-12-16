// required variables
require("dotenv").config();
const express = require('express');
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb")
const CORS = require("cors");
const jwt = require("jsonwebtoken")
const bycrpt = require("bcrypt");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");
const multer = require("multer");

// models/schemas
const User  = require("./models/userSchema");
const Admin = require("./models/Admin");
const Product = require("./models/products");
const OTP = require("./models/OTP");
const InitData = require("./models/initData");
const Discount = require("./models/discount");
const Transaction = require("./models/transaction");
const Receipt = require("./models/receipt");
const Order = require("./models/order");
const Fulfilled = require("./models/fullfilled");
const VerifiedTransactions = require("./models/verifiedPayment");
const Message = require("./models/message");
const path = require("path");
const fs = require("fs");
const { error } = require("console");


// we define app
const app = express();

// app.use values 
app.use(express.static('public'));
app.use(express.static('product_images'));
app.use(express.urlencoded({extended: true}))
app.use(express.json());
app.use(cookieParser());
app.use(CORS({origin: true, methods: ["GET", "POST", "PATCH", "DELETE"], credentials: true}));

// connection values
const URL = process.env.MONGO_DB_CONNECTION_STRING;
const connectionParams = {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true};
const PORT = process.env.PORT || 8000;

// connect to database
const connectToDb = async ()=>{ 
    await mongoose.connect(URL, connectionParams)
    .then(()=>{
        app.listen(PORT, ()=>{
            console.log(`Connected to database and listening at port ${PORT}`)
        })
    })
    .catch((err)=>{
        console.log("Could not connect to database")
        console.log(err)
    })
}

// invoke the function
connectToDb();

// sample update
app.get("/sample_get", (req, res)=>{
    try{
        res.status(200).json({message: "update is okay"})
    }catch(err){
        res.status(400).json({error: "error"})
    }
});

// Auth API's user

// max age
const maxAge = 60 * 60 * 24 * 7;

// create jwt token
const createToken = async(id, tokenMaxAge)=>{
    const token = await jwt.sign({id}, process.env.JWT_SECRET_KEY, {expiresIn: tokenMaxAge})
    return({token: token});
}

// duplicate auth email

const emailAuth = async(email)=>{
    const duplicate = await User.findOne({email: email});
    if(duplicate){
        return(true)
    }
}

// error handler
const HandleError = async(err, emailDuplicate)=>{
    let error = {name: "", email: "", password: ""};

    if(err.message === "invalid email"){
        error.email = "Invalid email"
    }

    if(err.message === "invalid password"){
        error.password = "Invalid password"
    }


    if(emailDuplicate === true){
        error.email = "Email is already in use"
    };
    console.log(emailDuplicate)

    if(err.message.includes("users validation failed")){
        Object.values(err.errors).forEach(({properties})=>{
            error[properties.path] = properties.message;
        })
    }
    return(error)
};

// login user auth
const userAuth = async(email, inputPassword)=>{
    const user = await User.findOne({email: email});
    if(user){
        const auth = await bycrpt.compare(inputPassword, user.password);
        if(auth){
            return(
                {_id: user._id}
            )
        }else throw Error("invalid password")
    }else throw Error("invalid email")
};

// pick random
const pickRandom = ()=>{
    const randomNum = Math.floor(Math.random() * 10);
    return(randomNum);
}

// generate otp
const generateOtp = async()=>{
    let OTPToken = "";
    for(i = 1; i <= 4 ; i++){
        const random = pickRandom();

        if(OTPToken === ""){
            OTPToken = `${random}`;
        }else{
        OTPToken += `${random}`;
        }
    };
    const salt = await bycrpt.genSalt();
    const hashedOTPToken = await bycrpt.hash(OTPToken, salt);
    console.log(OTPToken)
    return({OTPPIN: OTPToken, hashedOTPToken: hashedOTPToken});
};

// messenger
const Messenger = async(sendersEmail, receiversEmail, subject, text)=>{
    // transport
    const transport = await nodemailer.createTransport({
        service: "gmail",
        auth: {user: sendersEmail, pass: process.env.APP_PASSWORD} 
    });
    // mail options
    const mail = {
        from: sendersEmail,
        to: receiversEmail,
        subject: subject,
        text: text
    };
    // send transport
    const action = await transport.sendMail(mail)
    .then(()=>{return(true)})
    .catch(()=>{
        return(false)
    });
    return(action);
};

// uploader
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, `./public`);
    }, filename: function(req, file, cb){
        cb(null, file.originalname)
    }
});
const upload = multer({storage: storage});


// check user
app.get("/check_user", async(req, res)=>{
    try{
        const token = req.cookies.JWT;
        if(token){
            const auth = await jwt.verify(token, process.env.JWT_SECRET_KEY, async(err, decodedToken)=>{
                if(!err){
                    const { _id } = await User.findOne({_id: new ObjectId(decodedToken.id)})
                    return({_id: _id})
                }
            }); 
            if(auth){
                const { _id } = auth;
                res.status(200).json({id: _id});
            }else throw Error("error");
        }else throw Error("error");

    }catch(err){
        console.log(err)
        res.status(400).json({error: "Not logged in"})
    }
})

// signup user
app.post("/sign_up", async(req, res)=>{
    const { name, email, password, image, address, phoneNumber, birth, discountCode, cart, pending, history, message } = req.body;
    const duplicate = await emailAuth(email)
        try{
        const data = { name, email, password, image, address, phoneNumber, birth, discountCode, cart, pending, history, message};
        
        const newUser = await User.create(data);
        const { _id } = newUser;
        const { token } = await createToken(_id, maxAge); 
        const sendEmail = await Messenger(process.env.APP_EMAIL, email, "Account", `Your account has been created successfully, welcome to stungiant !`)
        .then(()=>{return(true)})
        .catch(()=>{return(false)});
        if(sendEmail){
          res.cookie("JWT", token, {maxAge: maxAge * 1000, httpOnly: true, secure: true, sameSite: true}).status(200).json({message: "Signup successful !", user: _id});
        }
    }catch(err){
        const error = await HandleError(err, duplicate);
        console.log(error)
        res.status(400).json({errorMessage: "Signup failed !", error: error})
    }
});

// login
app.post("/login", async(req, res)=>{
    try{
        const { email, password } = req.body;
        const auth = await userAuth(email, password);
        const { _id } = auth;
        const { token } = await createToken(_id, maxAge); 
        res.cookie("JWT", token, {maxAge: maxAge * 1000, httpOnly: true, secure: true, sameSite: true}).status(200).json({message: "Login successful !", user: _id});
    }catch(err){
        const error = await HandleError(err);
        res.status(400).json({errorMessage: "Login failed !", error: error})
    }

});

// log_out
app.get("/log_out", (req, res)=>{
    try{
    res.cookie("JWT", "", {maxAge: 1000, httpOnly: true, secure: true, sameSite: true}).status(200).json({message: "Logout successful !"});
    }catch(err){
        res.status(400).json({errorMessage: "Logout failed !"})
    }
});

// send OTP verification code
app.post('/send_verification_code', async(req, res)=>{
    try{
        const { email } = req.body;
        const { OTPPIN, hashedOTPToken } = await generateOtp();
        const newMaxAge = 1 * 60 * 60;
        const { _id } = await OTP.create({email: email, OTPPIN: hashedOTPToken, status: "Not verified"});
        const { token } = await createToken(_id, newMaxAge)
        const sendEmail = await Messenger(process.env.APP_EMAIL, email, "OTP", `Your OTP pin is ${OTPPIN}`)
        .then(()=>{return(true)})
        .catch(()=>{return(false)});
        if(sendEmail){
          res.cookie("OTP", token, {maxAge: newMaxAge * 1000}).status(200).json({message: "verification code sent successfully", url: "/verify_otp"});
        }
    }catch(err){
        res.status(400).json({error: "Could not send verification code"})
    }
});

// verify OTP
app.patch("/verify_OTP", async(req, res)=>{
    try{
        const verificationCode = req.body;
        const token = req.cookies.OTP;
        await jwt.verify(token, process.env.JWT_SECRET_KEY, async(err, decodedToken)=>{
            if(!err){
                const { OTPPIN } = await OTP.findOne({_id: new ObjectId(decodedToken.id)});
                const auth = await bycrpt.compare(verificationCode.OTPPIN, OTPPIN);
                if(auth){
                    await OTP.updateOne({_id: new ObjectId(decodedToken.id)}, {$set: {status: "verified"}});
                }else throw Error("auth failed")
            }
        });
        res.status(200).json({message: "OTP verification successful", url: "/reset_password"})
    }catch(err){
        res.status(400).json({error: "OTP verification failed"})
    }
});

// change password
app.patch('/reset_password', async(req, res)=>{
    try{
        const { newPassword } = req.body;
        const token = req.cookies.OTP;
        await jwt.verify(token, process.env.JWT_SECRET_KEY, async(err, decodedToken)=>{
            if(!err){
                const { email, status } = await OTP.findOne({_id: new ObjectId(decodedToken.id)});
                if(status === "verified"){
                    const salt = await bycrpt.genSalt();
                    const hashedPassword = await bycrpt.hash(newPassword, salt)
                    await User.updateOne({email: email}, {password: hashedPassword, url: "/login"});
                }else throw Error("Not verified")
                await OTP.deleteOne({_id: new ObjectId(decodedToken.id)});
            }
        });
        res.cookie("OTP", "", {maxAge: 1000}).status(200).json({message: "Password reset successful"})
    }catch(err){
        res.status(400).json({error: "Password reset failed"})
    }
});


// End of auth API's user




// All main fetch //


// users

// fetch single user
app.get("/users/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const user = await User.findOne({_id: new ObjectId(id)});
        res.status(200).json({user: user})
    }catch(err){
        res.status(500).json({error: "fetch failed"})
    }
})

// fetch all users
app.get("/users", async(req, res)=>{
    let Data = [];

   await User
  .find({}, (err, data)=>{
    data.forEach((element)=>{Data.push(element)})
  })
  .sort({name:1})
  .then(()=>{
    res.status(200).json(Data)
  })
  .catch(()=>{
    res.status(500).json({err: 'could not fetch the document !'})
  })
});

// delete user
app.delete("/delete_user/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const action = await User.deleteOne({_id: new ObjectId(id)});
        if(action){
            res.status(200).json({message: "User successfully deleted"})
        }
    }catch(err){
        res.status(400).json({error: "Could not delete user"});
    }
});

// update user details
app.patch("/update_user/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const detail = req.body;
        const action = await User.updateOne({_id: new ObjectId(id)}, detail)
        if(action){
            res.status(400).json({message:"Updated details successfully"})
        }
    }catch(err){
        res.status(400).json({error:"Could not update details"});
    };
});

// update profile image
app.patch("/upload_profile_image/:id", upload.single("user_image"), async(req, res)=>{
    try{
        const { id } = req.params;
        const filename = req.file.originalname;
        const isUploaded = await User.updateOne({_id: new ObjectId(id)}, {$set: {image: filename}});
        if(isUploaded){
            res.status(400).json({message:"Image uploaded successfully"})
        }
    }catch(err){
        console.log(err)
        res.status(400).json({error:"Could not upload image"});
    };
});

// send user image
app.get("/user_image/:id", (req, res)=>{
    try{
        const { id } = req.params;
        const image = path.join(__dirname, "public", id);
        res.status(200).sendFile(image)
    }catch(err){
        res.status(400).json({error: "error"})
    };
});

// end of users




// admins

// handle Admin error

const HandleAdminError = async(err, duplicate, passkey)=>{
    let error = {name: "", email: "", password: "", passkey: ""};
    
    if(passkey === false){
        error.passkey = "invalid passkey"
    };
    if(duplicate === true){
        error.email = "email is already in use"
    };
    if(err.message === "invalid email"){
        error.email = "invalid email"
    };
    if(err.message === "invalid password"){
        error.password = "invalid password"
    };
    if(err.message.includes("admins validation failed")){
        Object.values(err.errors).forEach(({properties})=>{
            error[properties.path] = properties.message;
        })
    };
    return(error); 
};

// pass_key validator
const passKeyValidator = async(passkey)=>{
    if(passkey === process.env.PASS_KEY){
        return("sub_admin")
    }else if(passkey === process.env.PASS_KEY_ALPHA){
        return("alpha")
    }else{
        return(false)
    }
};

// email validator
const adminEmailValidator = async(email)=>{
    const isIncluded = await Admin.findOne({email: email});
    if(isIncluded){
        return(true)
    }
};

// hash password
const hashPassword = async(password)=>{
    if(password){
        const salt = await bycrpt.genSalt();
        const hashedPassword = await bycrpt.hash(password, salt);
        return(hashedPassword);
    }
};

// login auth
const AdminAuth = async(email, password)=>{
    const admin = await Admin.findOne({email: email});
    if(email){
        const auth = await bycrpt.compare(password, admin.password);
        if(auth){
            const { _id } = admin;
            return({_id: _id});
        }else throw Error("invalid password");
    }else throw Error("invalid email");
}

// check admin
app.get('/check_admin', async(req, res)=>{
    try{
        const token = req.cookies.Admin_Token;
        if(token){
            const auth = await jwt.verify(token, process.env.JWT_SECRET_KEY, async(err, decodedToken)=>{
                if(!err){
                    const { _id } = await Admin.findOne({_id: new ObjectId(decodedToken)});
                    return(_id)
                }
            });
            if(auth){
            res.status(200).json({id: auth});
            }else throw Error("error");
        }else throw Error("error");
    }catch(err){
        res.status(400).json({error: "Not logged in", url: "/admin_login"});
    }
    
});

// admin sign up
app.post('/create_admin', async(req, res)=>{
    const { name, email, password, passkey, image, address, phoneNumber, date } = req.body;
    const status = await passKeyValidator(passkey);
    const validateEmail = await adminEmailValidator(email);

    try{
        const hashedPassword = await hashPassword(password);
        const createAdmin = await Admin.create({name, email, password: hashedPassword, image, address, phoneNumber, status: status, date});
        const { _id } = createAdmin;
        const { token } = await createToken(_id, maxAge);
        res.cookie("Admin_Token", token, {maxAge: maxAge * 1000, httpOnly: true, secure: true, sameSite: true}).status(200).json({message: "Account creation successful", url: "/admin_page"})
    }catch(err){
        const error = await HandleAdminError(err, validateEmail, status);
        res.status(400).json(error);
    }
});

// admin login
app.post('/login_admin', async(req, res)=>{
    try{
        const { email, password } = req.body;
        const { _id } = await AdminAuth(email, password);
        const { token } = await createToken(_id, maxAge);
        res.cookie("Admin_Token", token, {maxAge: maxAge * 1000, httpOnly: true, secure: true, sameSite: true}).status(200).json({message: "Login successful", url: "/admin_page"})
    }catch(err){
        console.log(err)
        const error = await HandleAdminError(err);
        console.log(error)
        res.status(400).json(error);
    }
});

// logout admin
app.get('/logout_admin', async(req, res)=>{
    try{
        res.cookie("Admin_Token", "", {maxAge: 1000}).status(200).json({message: "Logout successfully", url: "/admin_login"})
    }catch(err){
        res.status(400).json({error: "Logout failed"})
    }
});

// fetch single admin
app.get('/admin/:id', async(req, res)=>{
    try{
        const { id } = req.params;
        const admin = await Admin.findOne({_id: new ObjectId(id)});
        res.status(200).json(admin)
    }catch(err){
        res.status(400).json({error: "error"})
    }
});

// fetch all admins
app.get("/admins", async(req, res)=>{
    let Data = [];

   await Admin
  .find({}, (err, data)=>{
    data.forEach((element)=>{Data.push(element)})
  })
  .sort({name:1})
  .then(()=>{
    res.status(200).json(Data)
  })
  .catch(()=>{
    res.status(500).json({err: 'could not fetch the document !'})
  })
})

// delete admin
app.delete('/delete_admin/:id', async(req, res)=>{
    try{
        const { id } = req.params;
        const action = await Admin.deleteOne({_id: new ObjectId(id)});
        if(action){
        res.status(200).json({message: "Admin deleted successfully"})
        };
    }catch(err){
        res.status(400).json({error: "Could not delete admin"})
    }
});

// end of admins



// products

// fetch single product
app.get("/products/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const data = await Product.findOne({_id: new ObjectId(id)});
        res.status(200).json(data)
    }catch(err){
        res.status(500).json({error: "fetch failed"})
    }
});

// fetch all products
app.get("/products", async(req, res)=>{
    let Data = [];

   await Product
  .find({}, (err, data)=>{
    data.forEach((element)=>{Data.push(element)})
  })
  .sort({name:1})
  .then(()=>{
    res.status(200).json(Data)
  })
  .catch(()=>{
    res.status(500).json({err: 'could not fetch the document !'})
  })
});

// send product image
app.get("/product_image/:id", (req, res)=>{
    try{
        const { id } = req.params;
        const image = path.join(__dirname, "product_images", id);
        res.status(200).sendFile(image)
    }catch(err){
        console.log(err)
        res.status(400).json({error: "error"})
    };
});

// add product
const proStorage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, `./product_images`);
    }, filename: function(req, file, cb){
        cb(null, file.originalname)
    }
});
const proUpload = multer({storage: proStorage}).array("files", 4);

// add product images
app.post("/add_product_image", async(req, res)=>{
    await proUpload(req, res, (err)=>{
        if(err){
            res.status(400).json({error: "could not upload product image"});
        }else{
            res.status(200).json({url: "/add_product_details"});
        }
    });
});

// add product details
app.post("/add_product_details", async(req, res)=>{
    try{
        const data = req.body;
        const action = await Product.create(data);
        if(action){
           res.status(200).json({message: "New product uploaded successfully"});
        }
    }catch(err){
        res.status(400).json({error: "failed to upload product detail"});
    };
});

// refresh product count
app.patch("/refresh_product_count/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const action = await Product.updateOne({_id: new ObjectId(id)}, {$set: {count: 0}});
        if(action){
            res.status(200).json({message: "Refresh successful"})
        }
    }catch(err){
        res.status(400).json({error: "Could not refresh count"});
    };
});

// add to cart
app.patch('/add_to_cart/:id', async(req, res)=>{
    try{
        const { _id, name, category, amount, image } = req.body;
        const { id } = req.params;
        let cart;
        await User.findOne({_id: new ObjectId(id)}, {cart: 1})
        .then((data)=>{cart = data.cart})
        .catch(()=>{});
        // check if product is in user's cart
        const isIncluded = await cart.filter((data)=>{
            return(data._id === _id)
        });
        // import product price
        const { Price } = await Product.findOne({_id: new ObjectId(_id)}, {Price: 1});

        if(isIncluded.length === 0){
            // add to cart if not in cart
            const newCartProduct = {_id, name, category, amount, image, price: Price};
            const addToCart = await User.updateOne({_id: new ObjectId(id)}, {$push: {cart: newCartProduct}});
            if(addToCart){
                res.status(200).json({message: "Added to cart successfully"});
            }
        }else{
            // update product if in cart
            const originalProduct = isIncluded[0];
            const originalProductAmount = isIncluded[0].amount;
            const newCartProduct = {_id, name, category, amount: amount + originalProductAmount, image, price: Price};
            console.log(originalProductAmount);
            const addToCart = await User.updateOne({_id: new ObjectId(id)}, {$push: {cart: newCartProduct}});
            const removeFromCart = await User.updateOne({_id: new ObjectId(id)}, {$pull: {cart: originalProduct}});
            if(addToCart && removeFromCart){
            res.status(200).json({message: "Added to cart successfully"});
            }
        }

    }catch(err){
        res.status(400).json({error: "Could not add to cart"})
    }
});

// remove from cart
app.patch('/remove_from_cart/:id', async(req, res)=>{
    try{
        const { id } = req.params;
        const product = req.body;
        const updateCart = await User.updateOne({_id: new ObjectId(id)}, {$pull: {cart: product}});
        if(updateCart){
        res.status(200).json({message: "Removed from cart successfully"});
        };
    }catch(err){
        res.status(400).json({error: "Could not remove from cart"})
    }
});

// submit review
app.patch('/add_product_review/:id', async(req, res)=>{
    try{
        const { id } = req.params;
        const review = req.body;
        const updateProductReview = await Product.updateOne({_id: new ObjectId(id)}, {$push: {reviews: review}});
        if(updateProductReview){
        res.status(200).json({message: "Review successfully added"});
        }
    }catch(err){
        res.status(400).json({error: "Could not add review"});
    }
});

// remove review
app.patch('/remove_product_review/:id', async(req, res)=>{
    try{
        const { id } = req.params;
        const review = req.body;
        const updateProductReview = await Product.updateOne({_id: new ObjectId(id)}, {$pull: {reviews: review}});
        if(updateProductReview){
        res.status(200).json({message: "Review successfully removed"});
        }
    }catch(err){
        res.status(400).json({error: "Could not remove review"})
    }
});

// update product rating
app.patch("/update_product_rating/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const { rating } = req.body;
        const updateRating = await Product.updateOne({_id: new ObjectId(id)}, {rating: rating});
        if(updateRating){
            res.status(200).json({message: "Rating updated"})
        }
    }catch(err){
        res.status(400).json({error: "Failed to update rating"})
    }
});

// delete product
app.delete("/delete_product_from_database/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const { image, secondaryImages } = await Product.findOne({_id: new ObjectId(id)});
        const deletePrimaryImage = await fs.unlinkSync(`./product_images/${image}`, (err)=>{
        });
        const deleteSecondaryImage = secondaryImages.forEach(async(data)=>{
            if(data.image !== image){
                await fs.unlinkSync(`./product_images/${data.image}`);
            }
        });
        const action = await Product.deleteOne({_id: new ObjectId(id)});
        if(action){
            res.status(200).json({message: "Product successfully deleted"})
        }
    }catch(err){
        console.log(err)
        res.status(400).json({error: "Could not delete product"});
    }
});




// payments

// initialize payments
app.post("/initialize_transaction/:id", async(request, response)=>{

    try{

        const { id } = request.params;
        const initializationData = request.body;
        const { email } = initializationData;
        let AuthPrice;
        let Cart;
        const { discountCode, cart } = await User.findOne({_id: new ObjectId(id)});
        Cart = cart;

        // calculate price, tax, and shipping fee
        const price = Math.round(Cart.reduce((total, data)=>{return(total + (data.price * data.amount))}, 0));
        const shippingFee = Math.round(cart.reduce((total, data)=>{return(total + (data.amount * 3))}, 0));
        const tax = Math.round((price/100) * 10);
        const totalPrice = price + shippingFee + tax;
        
        //  check for discount code
        if(discountCode === "No discountCode"){
            AuthPrice = totalPrice;
        }else{
            const { percentage } = await Discount.findOne({code: discountCode});
             const discountedPercentage = Math.round((totalPrice/100) * percentage);
             const discountPrice = Math.round(totalPrice - discountedPercentage);
             AuthPrice = discountPrice;
        };

        // delete init data if any
        // create new initialization data
        const createNewInitData = await InitData.create(initializationData);

        console.log(AuthPrice, totalPrice, shippingFee, tax)

        const https = require('https')

        const params = JSON.stringify({
        "email": `${email}`,
        "amount": `${AuthPrice * 1700}00`,
        "init_ID": `${createNewInitData._id}`
        })

        const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/initialize',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
        }
        }

        const req = https.request(options, res => {
        let data = ''

        res.on('data', (chunk) => {
            data += chunk
        });

        res.on('end', () => {
            const serverResponse = JSON.parse(data)
            if(serverResponse){
                console.log(serverResponse);
                const authUrl = serverResponse.data.authorization_url;
                response.status(200).json({message: "initialization successful", authorization_url: authUrl})
            }else throw Error("error")
        })
        }).on('error', error => {
        console.error(error)
        })

        req.write(params)
        req.end()
        

    }catch(err){
        console.log(err)
        response.status(400).json({error: "request failed"})
    }
});

// verify payments
app.patch("/verify_transaction/:id", async(req, response)=>{

    try{
        const { id } = req.params;
        const { reference } = req.body;

        // check if payment has been verified
        const isVerified = await VerifiedTransactions.findOne({reference: reference});

        if(!isVerified){
            const https = require('https')

            const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/transaction/verify/${reference}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
            }
            }

            const request = https.request(options, res => {
            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            });

            res.on('end', async() => {
                const serverResponse = JSON.parse(data);
                const initEmail = serverResponse.data.customer.email;
                const amount = serverResponse.data.amount;
                if(serverResponse){
                    
                    // find initialization data 
                    const initializationData = await InitData.findOne({email: initEmail});
                    const { payersID, name, email, address, phoneNumber, city, state, postalCode, paymentMethod, itemNum, date, products } = initializationData;
                    
                    // create transaction data
                    const createTransaction = await Transaction.create({payersID, name, email, address, phoneNumber, city, state, postalCode, paymentMethod, status: "current", date, itemNum, totalAmount: amount});
                    
                    // create receipt
                    const createReceipt = await Receipt.create({payersID, name, email, address, phoneNumber, city, state, postalCode, paymentMethod, status: "current", date, itemNum, totalAmount: amount, products});
                    
                    // create order
                    const createOrder = await Order.create({ payersID, name, email, address, phoneNumber, city, state, postalCode, paymentMethod, itemNum, date, totalAmount: amount, products});
                    
                    // add product to user's pending
                    const addToPending = await User.updateOne({_id: new ObjectId(id)}, {$push: {pending: {$each: products}}});
                    
                    // delete product from user's cart
                    const removeFromCart = await User.updateOne({_id: new ObjectId(id)}, {$pull: {cart: {$in: products}}});

                    // update discount code
                    const { discountCode } = await User.findOne({_id: new ObjectId(id)});
                    if(discountCode !== "No discountCode"){
                    // set user's discount current count
                      const updateDiscountCount = await Discount.updateOne({code: discountCode}, {$inc: {currentUseCount: 1}});
                      // set discount code users
                      const updateDiscountUsers = await Discount.updateOne({code: discountCode}, {$push: {users: payersID}});
                      // set user's discount code
                      const resetDiscount = await User.updateOne({_id: new ObjectId(id)}, {$set: {discountCode: "No discountCode"}});
                    }

                    // delete initialization data 
                    const deleteInitData = await InitData.deleteOne({email: initEmail});
                    
                    // create verified payment
                    const createVerifiedPayment = await VerifiedTransactions.create({ email, reference, receipt: createReceipt._id});
                    
                    // send email to user
                    const userEmailSubject = "Payment for products";
                    const userEmailText = "We have received your payment for some of our products. Products will be delivered on 15 days time. You can now view your products in my dashboard, under pending. Thanks for shopping with stungiant !";
                    const sendEmailUser = await Messenger(process.env.APP_EMAIL, email, userEmailSubject, userEmailText)
                    .then(()=>{return(true)})
                    .catch(()=>{return(false)});
                    
                    // semd email to company's email
                    const sendEmailCompany = await Messenger(process.env.APP_EMAIL, process.env.Company_EMAIL, "Transaction", `User ${name}: ${email} has made payment for some products`)
                    .then(()=>{return(true)})
                    .catch(()=>{return(false)});
                    
                    if(createTransaction && createReceipt && createOrder && addToPending && removeFromCart && deleteInitData && createVerifiedPayment && sendEmailUser && sendEmailCompany){
                    response.status(200).json({message: "Payment verified !", receipt: createReceipt._id})
                    }else throw Error("Verification failed");

                }
            })
            }).on('error', error => {
            console.error(error)
            })
            request.end();
        }else{
            const { receipt } = isVerified;
            response.status(200).json({message: "Payment verified !", receipt: receipt})
        }

    }catch(err){
        console.log(err);
        res.status(400).json({error: "Verification failed"})
    }
});



// test messenger
app.get("/send_email", async(req, res)=>{
    const sendEmail = await Messenger("gken85016@gmail.com", "stungiant2@gmail.com", "Email API test", "All good !")
    .then(()=>{return(true)})
    .catch(()=>{return(false)});
    if(sendEmail === true){
        res.status(200).json({message: "email sent"})
    }else{
        res.status(400).json({error: "email not sent"})
    }
});


// fetch all transactions
app.get("/transaction", async(req, res)=>{
    let Data = [];

   await Transaction
  .find({}, (err, data)=>{
    data.forEach((element)=>{Data.push(element)})
  })
  .sort({name:1})
  .then(()=>{
    res.status(200).json(Data)
  })
  .catch(()=>{
    res.status(500).json({err: 'could not fetch the document !'})
  })
});

// transaction status
app.patch("/change_transaction_status/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const action = await Transaction.updateOne({_id: new ObjectId(id)}, {status: "seen"});
        if(action){
            res.status(200).json({message: "Transaction status updated"});
        }
    }
    catch(err){
        res.status(400).json({error: "Could update transaction status"})
    }
});

// order

// fetch all orders
app.get("/orders", async(req, res)=>{
    let Data = [];

   await Order
  .find({}, (err, data)=>{
    data.forEach((element)=>{Data.push(element)})
  })
  .sort({name:1})
  .then(()=>{
    res.status(200).json(Data)
  })
  .catch(()=>{
    res.status(500).json({err: 'could not fetch the document !'})
  })
});

// fullfill order
app.get("/fullfill_order/:id", async(req, res)=>{
    try{
        const { id } = req.params;
            // find order
            const order = await Order.findOne({_id: new ObjectId(id)});
            if(order){
            const { payersID, name, email, address, phoneNumber, city, state, postalCode, paymentMethod, itemNum, date, totalAmount, products} = order;
            // create fullfilled order
            const createFullfilledOrder = await Fulfilled.create({ payersID, name, email, address, phoneNumber, city, state, postalCode, paymentMethod, itemNum, date, totalAmount, products});
            // update users history
            const updateHistory = await User.updateOne({_id: new ObjectId(payersID)}, {$push: {history: {$each: products}}});
            // delete users pending
            const deletePending = await User.updateOne({_id: new ObjectId(payersID)}, {$pull: {pending: {$in: products}}});
            // increment product count property by amount
            const updateProducts = await products.forEach(async(product)=>{
                // loop through products array and update each one of them using their amounts
                const update = await Product.updateOne({_id: new ObjectId(product._id)}, {$inc: {count: product.amount}});
                if(update){
                    return(true)
                }
            });
            // delete order
            const deleteOrder = await Order.deleteOne({_id: new ObjectId(id)});

            res.status(200).json({message: "Order fullfilled successfully"});
        }
    }catch(err){
        console.log(err)
        res.status(400).json({error: "Could not fullfill order"});
    };
});

// fetch all fullfilled order
app.get("/fullfilled_orders", async(req, res)=>{
    let Data = [];

   await Fulfilled
  .find({}, (err, data)=>{
    data.forEach((element)=>{Data.push(element)})
  })
  .sort({name:1})
  .then(()=>{
    res.status(200).json(Data)
  })
  .catch(()=>{
    res.status(500).json({err: 'could not fetch the document !'})
  })
})

// receipt

// fetch user receipt
app.get("/user_receipt/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const data = await Receipt.findOne({_id: new ObjectId(id)});
        res.status(200).json([data])
    }catch(err){
        res.status(500).json({error: "fetch failed"})
    }
});

// fetch user receipts
app.get("/user_receipts/:id", async(req, res)=>{

    const { id } = req.params;
    let Data = [];

   await Receipt
  .find({payersID: id}, (err, data)=>{
    data.forEach((element)=>{Data.push(element)})
  })
  .sort({name:1})
  .then(()=>{
    res.status(200).json(Data)
  })
  .catch(()=>{
    res.status(500).json({err: 'could not fetch the document !'})
  })
});

// fetch all receipt
app.get("/receipts", async(req, res)=>{
    let Data = [];

   await Receipt
  .find({}, (err, data)=>{
    data.forEach((element)=>{Data.push(element)})
  })
  .sort({name:1})
  .then(()=>{
    res.status(200).json(Data)
  })
  .catch(()=>{
    res.status(500).json({err: 'could not fetch the document !'})
  })
});

// receipt status
app.patch("/change_receipt_status/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const action = await Receipt.updateOne({_id: new ObjectId(id)}, {status: "seen"});
        if(action){
            res.status(200).json({message: "Receipt status updated"});
        }
    }
    catch(err){
        res.status(400).json({error: "Could update receipt status"})
    }
});

// discount 

// verify discount code
app.patch("/verify_discount_code/:id", async(req, res)=>{
    const { id } = req.params;
    const { discountCode } = req.body;
    const {code, users, currentUseCount, limit } = await Discount.findOne({code: discountCode});
    const alreadyUsed = users.filter((user)=>{return(user === id)});
    if(code){
        if(alreadyUsed.length === 0){
            if(currentUseCount !== limit){
                const action = await User.updateOne({_id: new ObjectId(id)}, {discountCode: discountCode});
                if(action){
                    res.status(200).json({message: "Discount code applied successfully"});
                }
            }else{
                res.status(400).json({error: "Oops, discount code has reached it peak use"})
            }
        }else{
            res.status(400).json({error: "Oops, you've already used this discount code"})
        }
    }else{
        res.status(400).json({error: "invalid discount code"})
    }
    
});

// reset discount code
app.patch("/reset_discount_code/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const action = await User.updateOne({_id: new ObjectId(id)}, { discountCode: "No discountCode"});
        if(action){
            res.status(200).json({message: "Discount code removed successfully"})
        }
    }catch(err){
        res.status(400).json({error: "Could not remove discount code"})
    }
});

// fetch discount code
app.get("/import_discount_code_user/:id", async(req, res)=>{
    try{
        console.log("triggered")
        const { id } = req.params;
        const { discountCode } = await User.findOne({_id: new ObjectId(id)});
        console.log(discountCode)
        const doc = await Discount.findOne({code: discountCode});
        if(doc){
            res.status(200).json(doc)
        }else throw Error("error")
    }catch(err){
        res.status(400).json({error: "Could not get discount"});
    }
});

// fetch discount codes
app.get("/discount", async(req, res)=>{
    let Data = [];

   await Discount
  .find({}, (err, data)=>{
    data.forEach((element)=>{Data.push(element)})
  })
  .sort({name:1})
  .then(()=>{
    res.status(200).json(Data)
  })
  .catch(()=>{
    res.status(500).json({err: 'could not fetch the document !'})
  })
});

// add discount
app.post("/add_discount_code_to_database", async(req, res)=>{
    try{
        const discount = req.body;
        const action = await Discount.create(discount);
        if(action){
            res.status(200).json({message: "Discount added successfully to database"})
        }
    }catch(err){
        res.status(400).json({error: "Could not add discount to database"})
    };
});

// delete discount
app.delete("/delete_discount_code_from_database/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const action = await Discount.deleteOne({_id: new ObjectId(id)});
        if(action){
            res.status(200).json({message: "Discount code successfully deleted"})
        }
    }catch(err){
        res.status(400).json({error: "Could not delete discount code"});
    }
});


// message

// import user admin message
app.get("/user_admin_message/:id", async(req, res)=>{
    let Data = [];

    const { id } = req.params;
   await Message.find({userId: id}, (err, data)=>{
    data.forEach((element)=>{Data.push(element)})
  })
  .then(()=>{
    res.status(200).json(Data)
  })
  .catch((err)=>{
    res.status(500).json({err: 'could not fetch the document !'})
  })
})
 
// fetch all messages
app.get("/messages/:id", async(req, res)=>{
    let Data = [];
   const { id } = req.params;
   await Message
  .find({adminId: id}, (err, data)=>{
    data.forEach((element)=>{Data.push(element)})
  })
  .sort({name:1})
  .then(()=>{
    res.status(200).json(Data)
  })
  .catch(()=>{
    res.status(500).json({err: 'could not fetch the document !'})
  })
});

// client send chat
app.patch("/client_send_message_to_admin", async(req, res)=>{
    try{
        const { userId, adminId, adminName, userName, userEmail, content} = req.body;
        const date = new Date().toLocaleDateString("en-us", {day: "2-digit", month: "2-digit", year: "numeric"});
        const MessageBox = await Message.findOne({adminId: adminId, userId: userId});

        if(MessageBox){
            const { _id } = MessageBox;
            const updateMessageBox = await Message.updateOne({_id: new ObjectId(_id)}, {$push: {content: content}});
            const updateMessageBoxStatus = await Message.updateOne({_id: new ObjectId(_id)}, {$set: {adminStatus: "current", userStatus: "seen", date: date}});
            if(updateMessageBox && updateMessageBoxStatus){
                res.status(200).json({message: "message sent successfully"})
            };
        }else{
            const { _id } = await Message.create({ userId, adminId, adminName, userName, userEmail, adminStatus: "current", userStatus: "seen", content: [], date: date });
            const updateMessageBox = await Message.updateOne({_id: new ObjectId(_id)}, {$push: {content: content}});
            if(updateMessageBox){
                res.status(200).json({message: "message sent successfully"})
            };
        }
    }catch(err){
        res.status(400).json({error: "could not send message"})
    }
});

// admin send chat
app.patch("/admin_send_message_to_client", async(req, res)=>{
    try{
        const { userId, adminId, adminName, userName, userEmail, content} = req.body;
        const date = new Date().toLocaleDateString("en-us", {day: "2-digit", month: "2-digit", year: "numeric"});
        const MessageBox = await Message.findOne({adminId: adminId, userId: userId});

        if(MessageBox){
            const { _id } = MessageBox;
            const updateMessageBox = await Message.updateOne({_id: new ObjectId(_id)}, {$push: {content: content}});
            const updateMessageBoxStatus = await Message.updateOne({_id: new ObjectId(_id)}, {$set: {userStatus: "current", adminStatus: "seen", date: date}});
            if(updateMessageBox && updateMessageBoxStatus){
                res.status(200).json({message: "message sent successfully"})
            };
        }else{
            const { _id } = await Message.create({ userId, adminId, adminName, userName, userEmail, adminStatus: "seen", userStatus: "current", content: [], date: date });
            const updateMessageBox = await Message.updateOne({_id: new ObjectId(_id)}, {$push: {content: content}});
            if(updateMessageBox){
                res.status(200).json({message: "message sent successfully"})
            };
        }
    }catch(err){
        res.status(400).json({error: "could not send message"})
    }
});

// delete message
app.delete("/delete_message/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const action = await Message.deleteOne({_id: new ObjectId(id)});
        if(action){
            res.status(200).json({message: "Message successfully deleted"})
        }
    }catch(err){
        res.status(400).json({error: "Could not delete message"});
    }
});

// user message status
app.get("/user_set_message_status/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const updateMessageStatus = await Message.updateOne({_id: new ObjectId(id)}, {userStatus: "seen"});
        if(updateMessageStatus){
            res.status(200).json({message: "Message status updated"})
        };
    }catch(err){
        res.status(400).json({error: "Could not update message status"});
    };
});

// admin message status
app.get("/admin_set_message_status/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const updateMessageStatus = await Message.updateOne({_id: new ObjectId(id)}, {adminStatus: "seen"});
        if(updateMessageStatus){
            res.status(200).json({message: "Message status updated"})
        };
    }catch(err){
        res.status(400).json({error: "Could not update message status"});
    };
});

// send general message
app.patch("/send_message_to_user_platform", async(req, res)=>{
    try{
        const data = req.body;
        const action = await User.updateOne({email: data.email}, {$push: {message: data.message}});
        if(action){
            res.status(200).json({message: "Message sent to user successfully"});
        };
    }catch(err){
        console.log(err)
        res.status(400).json({error: "Failed to send message"});
    };
});

// delete general message
app.patch("/delete_general_message/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const data = req.body;
        const action = await User.updateOne({_id: new ObjectId(id)}, {$pull: {message: data}});
        if(action){
            res.status(200).json({message: "Message deleted successfully"});
        };
    }catch(err){
        res.status(400).json({error: "Failed to delete message"});
    };
});
