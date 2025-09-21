const express = require('express')
const connectDB = require('./db.js')
const cors = require("cors")
const UserModel = require('./models/users.js')
const bcrypt = require('bcryptjs')

const app = express()
app.use(express.json())
app.use(cors())

connectDB()

app.post("/login", (req, res) => {
    const {email, password} = req.body;
    UserModel.findOne({ email: email })
    .then(user => {
      if (user) {
        // Compare plain text password with hashed password in DB
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            return res.json("Error while checking password");
          }

          if (isMatch) {
            res.json({
              success: true,
              user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
              }
            });
          } else {
            res.json("The password is incorrect. Please try again.");
          }
        });
      } else {
        res.json("User does not exist. Please try again.");
      }
    });
})

app.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body

        // check if email already exists
        const existingUser = await UserModel.findOne({ email })
        if (existingUser) {
            return res.json({
                success: false,
                message: "This email is already associated with an account."
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // create new user if not found
        const newUser = await UserModel.create({
            firstName,
            lastName,
            email,
            password: hashedPassword
        });

        res.json({
        success: true,
        user: {
            id: newUser._id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email
        }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
})


app.listen(3000, ()=> {
    console.log("App is running");
})