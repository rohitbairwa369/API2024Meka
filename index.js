const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const express = require("express");
const app = express();
const cors = require("cors");
const { mongoose } = require("./db/mongoose");
const bodyParser = require("body-parser");
const { User } = require("./db/models/user");
const { Inbox } = require("./db/models/inbox");

app.use(cors());
// Import the verifyToken middleware
const verifyToken = require("./middleware/varifyToken");

// Load middleware
// app.use(verifyToken)
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

// Registration
app.post("/admin/register", (req, res) => {
  // encrypt password
  User.find({ email: req.body.email }).then((data) => {
    if (data.length > 0) {
      res.send({ errorMessage: "Email already taken" });
    } else {
      let hashpassword = bcrypt.hashSync(req.body.password, 8);
      let newlist = new User({
        email: req.body.email,
        password: hashpassword,
        role:'admin'
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
      res.send({ auth: true, token: token, role: err.role, userId: err._id });
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
      const userData= result;
      let filteredUserData = {}
      Object.keys(userData._doc).forEach(key=>{
        if(key!='password' && key!='attendance'){
          filteredUserData[key] = result[key]
        }
       })
      res.send(filteredUserData);
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
      res.send({'message':'Successfully Updated'})
  },(err)=>{
    res.send({'message':err})
  })
});
});


app.put('/user/attendance', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token) res.send({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.send({ auth: false, token: "Invalid Token" });

      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        { $push: { attendance: req.body } },
        { new: true }
      );

      res.json(updatedUser.attendance.reverse());
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/user/attendance/in/:tdate', async (req, res) => {
  try {
    const token = req.headers["x-access-token"];
    if (!token) return res.send({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.send({ auth: false, token: "Invalid Token" });

      const tdate = req.params.tdate;

      const result = await User.findByIdAndUpdate(
        user.id,
        {
          $set: { 
            'attendance.$[element].status': req.body.status,
            'attendance.$[element].in': req.body.in
           },
        },
        { arrayFilters: [{ 'element.date': tdate }], new: true }
      );

      if (!result) {
        return res.status(404).json({ error: 'User not found.' });
      }

      res.json(result);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/user/attendance/out/:tdate', async (req, res) => {
  try {
    const token = req.headers["x-access-token"];
    if (!token) return res.send({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.send({ auth: false, token: "Invalid Token" });

      const tdate = req.params.tdate;

      const result = await User.findByIdAndUpdate(
        user.id,
        {
          $set: { 
            'attendance.$[element].out': req.body.out,
            'attendance.$[element].hours': calculateTotalHours(req.body.in,req.body.out)
           },
        },
        { arrayFilters: [{ 'element.date': tdate }], new: true }
      );

      if (!result) {
        return res.status(404).json({ error: 'User not found.' });
      }

      res.json(result.attendance.reverse());
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

  // Access to this route is only allowed if the token is valid
app.get('/verify/token', (req, res) => {
  jwt.verify(token, config.secret, async (err, user) => {
    if (err) return res.send({ auth: false, token: "Invalid Token" });
    const UserData = await User.findById(user.id);
    res.json({auth:true,message:'Access Granted',role:UserData['role']})
  })
});

app.get('/user/attendance', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token) res.send({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.send({ auth: false, token: "Invalid Token" });
      const UserData = await User.findById(user.id);
      res.json(UserData.attendance);
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/user/attendance/:month/:year', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token) res.send({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.send({ auth: false, token: "Invalid Token" });

      const userData = await User.findById(user.id);
      const filteredAttendance = userData.attendance.filter(item => {
        return item.month ? item.month.toLowerCase() === req.params.month.toLowerCase() && item.year == req.params.year :[];
      });

      res.json(filteredAttendance.reverse());
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/user/attendance/:year', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token) res.send({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.send({ auth: false, token: "Invalid Token" });

      const userData = await User.findById(user.id);
      const filteredAttendance = userData.attendance.filter(item => {
        return item.year === req.params.year 
      });

      res.json(filteredAttendance);
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/user/attendance/absent/:year', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token) res.send({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.send({ auth: false, token: "Invalid Token" });

      const userData = await User.findById(user.id);
      const filteredAttendance = userData.attendance.filter(item => {
        return (item.year === req.params.year && item.status.toLowerCase() == 'absent');
      });

      res.json(filteredAttendance);
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/user/attendance/:month/:year/:status', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token) res.send({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.send({ auth: false, token: "Invalid Token" });

      const userData = await User.findById(user.id);
      const filteredAttendance = userData.attendance.filter(item => {
        return  item.month.toLowerCase() === req.params.month.toLowerCase() && item.year == req.params.year && item.status.toLowerCase() == req.params.status.toLowerCase();
      });

      res.json(filteredAttendance);
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


function calculateTotalHours(startTime, endTime) {
  // Convert date and time strings to Date objects
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  // Calculate the time difference in milliseconds
  const timeDifference = endDate - startDate;

  // Calculate hours and minutes from the time difference
  const hours = Math.floor(timeDifference / (1000 * 60 * 60));
  const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

  // Return the total hours as a float
  const totalHours = hours + minutes / 60;
  return totalHours.toFixed(2);
}

//api for inbox messages
app.get('/messages', verifyToken, (req, res) => {
  Inbox.find({}).then(item=>{
    res.send(item)
  },err=>{
    res.send(item)
  })
});

app.post('/messages', (req, res) => {

  let token = req.headers["x-access-token"];
  if (!token) res.send({ auth: false, token: "No Token Provided" });

  jwt.verify(token, config.secret, async (err, user) => {
    if (err) return res.send({ auth: false, token: "Invalid Token" });

    const userData = await User.findById(user.id);

    if(userData && userData.role == 'admin'){
      // Assuming the request body contains data for the Inbox
      var inboxData = req.body;
    
      // Create a new Inbox instance using the provided data
      const newInbox = new Inbox(inboxData);
    
      // Save the new Inbox to the database
      newInbox.save()
        .then(result => {
          res.send(result);
        })
        .catch(err => {
          res.status(500).send(err);
        });
      }else{
        res.send({message:'Permission Denied!'})
      }
  })

});