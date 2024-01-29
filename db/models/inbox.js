const mongoose = require("mongoose");

const InboxSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  message:{
    type:String,
    required: true,
    trim:true
  },
  date: {
    type: Date,
    default: Date.now(),
    get: function (date) {
      return date.toLocaleString();
    },
  },
});


const Inbox = mongoose.model('Inbox', InboxSchema);
 
module.exports = { Inbox }