
require('dotenv').config();
const mongoose = require('mongoose');
 
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_URL).then(() => {
    console.log("Connected to MongoDB successfully :)");
}).catch((e) => {
    console.log("Error while attempting to connect to MongoDB");
    console.log(e);
});
 
// To prevent deprectation warnings (from MongoDB native driver)
// mongoose.set('useCreateIndex', true);
// mongoose.set('useFindAndModify', false);
 
 
 
module.exports = {
    mongoose
};