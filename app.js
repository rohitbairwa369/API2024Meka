require('dotenv').config();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const express = require("express");
const app = express();
const cors = require("cors");
const { mongoose } = require("./db/mongoose");
const bodyParser = require("body-parser");
const { User } = require("./db/models/user");
const { Inbox } = require("./db/models/inbox");

// CORS configuration
app.use(cors({
    origin: 'http://54.145.150.121:3000', // Replace with your HTTPS client origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

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

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("Server is listening on port 3000");
});

// Registration
app.post("/user/register", async (req, res) => {
  try {
    // Verify token
    let token = req.headers["x-access-token"];
    if (!token) return res.status(401).json({ auth: false, token: "No Token Provided" });;
    
    const decoded = jwt.verify(token, config.secret);
    const userId = decoded.id;
    
    // Fetch user holidays
    const userHolidays = await User.findOne({_id: userId});

    // Check if email is already taken
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.send({ errorMessage: "Email already taken" });
    }

    // Hash password
    const hashpassword = bcrypt.hashSync(req.body.password, 8);

    // Create new user
    const newUser = new User({
      email: req.body.email,
      password: hashpassword,
      name: req.body.name,
      gender: req.body.gender,
      birthDate: Date(),
      holidays: userHolidays.holidays
    });

    // Save new user
    const savedUser = await newUser.save();
    
    res.send({success:true,error:false,message:"User Added Successfully"});
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Server error" });
  }
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
      // console.log(req.body.password, err.password);
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
  if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });
  //jwt verify
  jwt.verify(token, config.secret, (err, user) => {
    if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });
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
     let userData = content || []
     let filteredData = []
     userData.forEach(i=>{
        if(i.role!='admin'){
          filteredData.push({
            _id:i._id,
            name:i.name,
            email:i.email,
            reportingTo: i.reportingTo || 'none',
            teamCategory:i.teamCategory || 'none',
            profilePic: i.profilePic || '../../assets/userProfile.jpg',
            designation:i.designation || 'intern',
            address:i.address || 'none',
          })
        }
      })
      res.send(filteredData);
    })
    .catch((e) => {
      res.send(e);
    });
});

app.get("/birthday/:month",verifyToken, (req, res) => {
  const { month } = req.params;

  // Validate month input
  const monthNumber = parseInt(month);
  if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return res.status(400).json({ error: "Invalid month provided. Month must be a number between 1 and 12." });
  }

  // Find users whose birthday falls in the given month
  User.find({}).then((users) => {
    const usersWithBirthdayInMonth = users.filter(user => {
      const userBirthdayMonth = new Date(user.birthDate).getMonth() + 1; // Month is zero-based in JavaScript
      return userBirthdayMonth === monthNumber;
    }).map(user => ({
      _id : user.id,
      profilePic: user.profilePic,
      name: user.name,
      email: user.email,
      birthday: user.birthDate
    }));

    res.json(usersWithBirthdayInMonth);
  }).catch((error) => {
    res.status(500).json({ error: "Internal Server Error" });
  });
});

app.get("/user/:id",verifyToken,(req, res) => {
   // Get ID from request parameters
   const userId = req.params.id;

   // Find user by ID
   User.findById(userId)
     .then((user) => {
       if (!user) {
         return res.status(404).json({ success: false, message: 'User not found' });
       }
       res.status(200).json({ success: true, ...user._doc });
     })
     .catch((err) => {
       res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
     });
});


app.put('/user', (req, res) => {
  const updateData = req.body;
  let token = req.headers["x-access-token"];
  // console.log(token)
  if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });
  //jwt verify
  jwt.verify(token, config.secret, async (err, user) => {
    if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });
   
  await User.findByIdAndUpdate(user.id, updateData).then((content) => {
      res.send({'message':'Successfully Updated'})
  },(err)=>{
    res.send({'message':err})
  })
});
});

app.delete('/user/:id', (req, res) => {
  let token = req.headers["x-access-token"];
  if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });
  
  //jwt verify
  jwt.verify(token, config.secret, async (err, user) => {
    if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

    isUserAdmin = await User.findById(user.id)
    if(isUserAdmin.role == "admin"){
    await User.findByIdAndDelete(req.params.id).then(() => {
      res.send({ message: 'User successfully deleted' });
    }).catch((err) => {
      res.status(500).send({ message: 'Error deleting user', error: err });
    });
  }else{
    res.status(500).send({ message: 'You are not admin!', error: true });
  }
  });
});



//add holidays
app.put('/holidays', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token) return res.status(401).json({ auth: false, message: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, decoded) => {
      if (err) return res.status(401).json({ auth: false, message: "Invalid Token" });

      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ auth: false, message: "User not found" });

      if (user.role !== 'admin') return res.status(403).json({ auth: false, message: "Unauthorized" });

      const newHolidays = req.body;
      if (!newHolidays || !Array.isArray(newHolidays)) {
        return res.status(400).json({ message: "Invalid holidays data" });
      }

      // Update holidays for all users
      await User.updateMany({}, { $addToSet: { holidays: { $each: newHolidays } } });

      res.json({ message: 'Holidays updated successfully for all users' });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/holidays/:month', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token) return res.status(401).json({ auth: false, message: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, decoded) => {
      if (err) return res.status(401).json({ auth: false, message: "Invalid Token" });

      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ auth: false, message: "User not found" });

      const holidays =  user.holidays || []
      filteredHolidayByMonth =holidays.filter(item=>{
        return item.month == req.params.month
      })
      res.json(filteredHolidayByMonth);
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/holidays/reset', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token) return res.status(401).json({ auth: false, message: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, decoded) => {
      if (err) return res.status(401).json({ auth: false, message: "Invalid Token" });

      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ auth: false, message: "User not found" });

      if (user.role !== 'admin') return res.status(403).json({ auth: false, message: "Unauthorized" });

      // Update holidays for all users
      await User.updateMany({holidays: [] });

      res.json({ message: 'Holidays reset successfully for all users' });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});


app.put('/user/attendance/clockin/:month/:year', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        { $push: { attendance: req.body } },
        { new: true }
      );
      const filteredAttendance = updatedUser.attendance.filter(item => {
        return item.month ? item.month.toLowerCase() === req.params.month.toLowerCase() && item.year == req.params.year :[];
      });
      const todaysDate = new Date()
      res.json(filteredAttendance.sort((a,b)=>b.date-a.date).filter(item=>item.date<=todaysDate.getDate()));
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/user/attendance/requestleave', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });
    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

      let canRequest = await User.findById(user.id)
      canRequestBoolean = canRequest.attendance.filter(item=>{
        return item.month == req.body[0].month && item.date == req.body[0].date 
      })
      var filteredDatesArray = req.body;
      var monthsHoliday = canRequest.holidays.filter(item=>{
        return item.month == req.body[0].month
      })
      var holidaysInYear = canRequest.holidays
      if(holidaysInYear){
        // newFiltered =filteredAttendance.filter(item => !holidaysInYear.includes(item));
        const holidayDates = holidaysInYear.map(holiday => `${holiday.month}-${holiday.date}-${holiday.year}`);

        var newFilteredArray = filteredDatesArray.filter(entry => {
        const entryDate = `${entry.month}-${entry.date}-${entry.year}`;
        return !holidayDates.includes(entryDate);
        });
           }
      if(canRequestBoolean.length==0){
        const updatedUser = await User.findByIdAndUpdate(
          user.id,
          { $push: { attendance: { $each: newFilteredArray } } },
          { new: true }
      );
      res.json({error: false ,message:'Leave Requested Successfully!'});
      }else{
        res.json({error: true ,message:'Invalid Request'});
      }
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/user/attendance/in/:tdate', async (req, res) => {
  try {
    const token = req.headers["x-access-token"];
    if (!token) return res.status(401).json({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

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

app.put('/user/attendance/out/:month/:year/:tdate', async (req, res) => {
  try {
    const token = req.headers["x-access-token"];
    if (!token) return res.status(401).json({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

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

      const filteredAttendance = result.attendance.filter(item => {
        return item.month ? item.month.toLowerCase() === req.params.month.toLowerCase() && item.year == req.params.year :[];
      });
      const todaysDate = new Date()
      res.json(filteredAttendance.sort((a,b)=>b.date-a.date).filter(item=>item.date<=todaysDate.getDate()));
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

  // Access to this route is only allowed if the token is valid
app.get('/verify/token', (req, res) => {
  jwt.verify(token, config.secret, async (err, user) => {
    if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });
    const UserData = await User.findById(user.id);
    res.json({auth:true,message:'Access Granted',role:UserData['role']})
  })
});

app.get('/user/attendance/clockin/:month/:year', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });
      const UserData = await User.findById(user.id);
      const filteredAttendance = UserData.attendance.filter(item => {
        return item.month ? item.month.toLowerCase() === req.params.month.toLowerCase() && item.year == req.params.year :[];
      });
      res.json(filteredAttendance);
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/user/attendance/:month/:year', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

      const userData = await User.findById(user.id);
      const filteredAttendance = userData.attendance.filter(item => {
        return item.month ? item.month.toLowerCase() === req.params.month.toLowerCase() && item.year == req.params.year :[];
      });
            const todaysDate = new Date()
      res.json(filteredAttendance.sort((a,b)=>b.date-a.date).filter(item=>item.date<=todaysDate.getDate()));
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/user/attendance/full/:month/:year', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

      const userData = await User.findById(user.id);
      const filteredAttendance = userData.attendance.filter(item => {
        return item.month ? item.month.toLowerCase() === req.params.month.toLowerCase() && item.year == req.params.year :[];
      });
            const todaysDate = new Date()
      res.json(filteredAttendance.sort((a,b)=>b.date-a.date));
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/user/attendance/:year', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

      const userData = await User.findById(user.id);
      const filteredAttendance = userData.attendance.filter(item => {
        return item.year === req.params.year 
      });
      res.json(filteredAttendance.sort((a,b)=>b.date-a.date));
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/user/attendance/absent/:year', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

      const userData = await User.findById(user.id);
      const filteredAttendance = userData.attendance.filter(item => {
        return (item.year === req.params.year && item.status.toLowerCase() == 'absent');
      });

      res.json(filteredAttendance.sort((a,b)=>b.date-a.date));
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/user/attendance/:month/:year/:status', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

      const userData = await User.findById(user.id);
      const filteredAttendance = userData.attendance.filter(item => {
        return  item.month.toLowerCase() === req.params.month.toLowerCase() && item.year == req.params.year && item.status.toLowerCase() == req.params.status.toLowerCase();
      });
      holidaysInYear = userData.holidays;
      if(holidaysInYear){
        var newHolidayListbyMonth = holidaysInYear.filter(item=>{
           return item.month == req.params.month
         })
       }
       var newFilredAttendanceWithHolidays = [...filteredAttendance ,...newHolidayListbyMonth]
      res.json(newFilredAttendanceWithHolidays);
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/user/attendance/:month/:year/:id/:status', async (req, res) => {
  try {
    let token = req.headers["x-access-token"];
    if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });

    jwt.verify(token, config.secret, async (err, user) => {
      if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

      const adminData = await User.findById(user.id);
      const holidaysInYear = adminData.holidays;
      if(adminData.role == 'admin'){
        internData = await User.findById(req.params.id)
        const filteredAttendance = internData.attendance.filter(item => {
          return  item.month.toLowerCase() === req.params.month.toLowerCase() && item.year == req.params.year && item.status.toLowerCase() == req.params.status.toLowerCase();
        });
        if(holidaysInYear){
        // newFiltered =filteredAttendance.filter(item => !holidaysInYear.includes(item));
        const holidayDates = holidaysInYear.map(holiday => `${holiday.month}-${holiday.date}-${holiday.year}`);

        const filteredArray = filteredAttendance.filter(entry => {
        const entryDate = `${entry.month}-${entry.date}-${entry.year}`;
        return !holidayDates.includes(entryDate);
        });
        let averageHrs = 0;
        let totalHrs = 0;
        let dayhours = []
        let dayDates = []
        filteredArray.forEach(item=>{
          totalHrs += parseInt(item.hours);
          dayhours.push(item.hours)
          dayDates.push(`${item.month}-${item.date}-${item.year}`)
        })
        averageHrs = totalHrs/filteredArray.length;
        internInfo = {
            name:internData.name,
            email:internData.email,
            reportingTo: internData.reportingTo || 'none',
            teamCategory:internData.teamCategory || 'none',
            profilePic: internData.profilePic || '../../assets/userProfile.jpg',
            designation:internData.designation || 'intern',
            attendanceForLeaves:filteredArray,
            address:internData.address || 'none',
            totalLeaves: filteredArray.length,
            averageHours:averageHrs,
            analiticsData : {
              hours:dayhours,
              dates:dayDates
            }
        }

        res.json(internInfo);
        }
      }else{
        res.status(500).json({ error: 'You are not admin' })
      }
    })
  } catch (error) {
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
    res.send(item.reverse())
  },err=>{
    res.send(item.reverse())
  })
});

app.post('/messages', (req, res) => {

  let token = req.headers["x-access-token"];
  if (!token)  res.status(401).json({ auth: false, token: "No Token Provided" });

  jwt.verify(token, config.secret, async (err, user) => {
    if (err) return res.status(401).json({ auth: false, token: "Invalid Token" });

    const userData = await User.findById(user.id);

    if(userData){
      // Assuming the request body contains data for the Inbox
      var inboxData = {
        name : userData.name,
        email: userData.email,
        toFromAbsent: req.body.toFromAbsent,
        message : req.body.message,
        category: req.body.category
      }
    
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
