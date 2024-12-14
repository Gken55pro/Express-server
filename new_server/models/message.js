const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    userId: {type: String},
    adminId: {type: String},
    adminName: {type: String},
    userName: {type: String},
    userEmail: {type: String},
    userStatus: {type: String},
    adminStatus: {type: String},
    date: {type: String},
    content: [
        {
            _id: {type: String},
             name: {type: String},
              body: {type: String},
               status: {type: String},
                date: {type: String}
        }
    ]
});

const Message = mongoose.model("messages", messageSchema);

module.exports = Message;