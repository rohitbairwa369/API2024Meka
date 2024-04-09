const mongoose = require("mongoose");

const InboxSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default : ''
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
  toFromAbsent:{
    type:Array
  },
  category:{
    type:String
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