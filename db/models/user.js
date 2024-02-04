const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    trim:true,
    default : ''
  },
  email: {
    type: String,
    required: true,
    trim:true
  },
  password: {
    type: String,
    required: true,
    trim:true
  },
  reportingTo: {
    type: String,
  },
  teamCategory:{
    type:String
  },
  profilePic: {
    type: String,
    default : ''
  },
  designation: {
    type: String,
  },
  address:{
    type:String
  },
  geolocation:{
    type:String
  },
  role: {
    type: String,
    default: "user",
  },
  attendance:{
    type:Array,
    default:[]
  },
  hrName:{
    type:String,
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