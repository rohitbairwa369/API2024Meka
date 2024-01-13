const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const express = require("express");
const app = express();
const cors = require("cors");
const { mongoose } = require("./db/mongoose");
const bodyParser = require("body-parser");
const { User } = require("./db/models/user");

app.use(cors());
// Import the verifyToken middleware
const verifyToken = require("./middleware/varifyToken");

// Load middleware
app.use(bodyParser.json({ limit: "300mb" }));
app.use(bodyParser.urlencoded({ limit: "300mb", extended: true }));

// const AuthController = require('./controller/AuthController');
// app.use('/auth',AuthController)

const config = {
  secret: "SuperSecret",
};

app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});

// Registration
app.post("/user/register", (req, res) => {
  // encrypt password
  User.find({ email: req.body.email }).then((data) => {
    if (data.length > 0) {
      res.send({ errorMessage: "Email already taken" });
    } else {
      let hashpassword = bcrypt.hashSync(req.body.password, 8);
      let newlist = new User({
        email: req.body.email,
        password: hashpassword,
      });
      newlist.save().then((listdoc) => {
        res.send(listdoc);
      });
    }
  });
});

app.post("/user/login", (req, res) => {
  User.findOne({ email: req.body.email }).then((err) => {
    if (!err) {
      return res.send({ auth: false, token: "No User Found" });
    } else {
      const passIsValid =
        bcrypt.compareSync(req.body.password, err.password) ||
        req.body.password == err.password;
      console.log(req.body.password, err.password);
      if (!passIsValid) {
        return res.send({ auth: false, token: "Invalid Password" });
      }
      // in case both valid
      let token = jwt.sign({ id: err._id }, config.secret, {
        expiresIn: 86400,
      }); //24 hr
      res.send({ auth: true, token: token, role: "user", userId: err._id });
    }
  });
});

app.get("/user", (req, res) => {
  let token = req.headers["x-access-token"];
  if (!token) res.send({ auth: false, token: "No Token Provided" });
  //jwt verify
  jwt.verify(token, config.secret, (err, user) => {
    if (err) return res.send({ auth: false, token: "Invalid Token" });
    User.findById(user.id).then((result) => {
      res.send(result);
    });
  });
});

app.get("/users",verifyToken,(req, res) => {
  User.find({})
    .then((content) => {
      res.send(content);
    })
    .catch((e) => {
      res.send(e);
    });
});

app.put('/user', (req, res) => {
  const updateData = req.body;
  let token = req.headers["x-access-token"];
  // console.log(token)
  if (!token) res.send({ auth: false, token: "No Token Provided" });
  //jwt verify
  jwt.verify(token, config.secret, (err, user) => {
    if (err) return res.send({ auth: false, token: "Invalid Token" });
   
  User.findByIdAndUpdate(user.id, updateData).then((content) => {
      res.send(content)
  })
});
});


// app.put('/user/:id/attendance', async (req, res) => {
//   try {
//       const user = await User.findById(req.params.id);
 
//       if (!user) {
//         return res.status(404).json({ error: 'Test not found' });
//       }
 
//       let attendanceData = user.attendance || [];
 
//       attendanceData.push(req.body);
 
//       const updatedUser = await User.findByIdAndUpdate(
//         req.params.id,
//         { $set: { attendance: attendanceData } },
//         { new: true } // To get the updated document
//       );
 
//       res.json(updatedUser);
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: 'Internal Server Error' });
//     }
// });