const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    trim:true,
    default : ''
  },
  gender:{
    type:String
  },
  email: {
    type: String,
    required: true,
    trim:true
  },
  holidays:{
    type:Array,
    default:[]
  },
  birthDate:{
  type:Date
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
    default : '../../assets/userProfile.jpg'
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
  contact:{
    type:Number
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