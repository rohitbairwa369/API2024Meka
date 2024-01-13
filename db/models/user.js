const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,

  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
 manager: {
    type: String,
  },

  profilePic: {
    type: String,
  },
  designation: {
    type: String,
  },
  role: {
    type: String,
    default: "user",
  },
  attendance:{
type:Array,
default:[]

  },
  date: {
    type: Date,
    default: Date.now(),
    get: function (date) {
      return date.toLocaleString();
    },
  },
});


const User = mongoose.model('User', UserSchema);
 
module.exports = { User }