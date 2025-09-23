const express = require('express')
const connectDB = require('./db.js')
const cors = require("cors")
const UserModel = require('./models/users.js')
const bcrypt = require('bcryptjs')
const crypto = require("crypto"); 

const app = express()
app.use(express.json())
app.use(cors())

connectDB()

app.post("/login", (req, res) => {
    const { email, password } = req.body;
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

        //const hashedPassword = await bcrypt.hash(password, 10);

        // create new user if not found
        const newUser = await UserModel.create({
            firstName,
            lastName,
            email,
            password
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

app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email })

    if (!user) {
      return res.status(400).json({ message: "No account with that email found." })
    }

    // Generate token
    const token = crypto.randomBytes(20).toString("hex")

    // Save token + expiry
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000 // 1 hr
    await user.save();

    // Reset link points to your frontend
    const resetURL = `http://localhost:5173/reset-password/${token}`

    // For now, log instead of emailing
    console.log("Password reset link:", resetURL)

    res.json({ message: "Password reset link generated. Check console for link." })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// Reset password route
app.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    user.password = password;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password reset successful!" })
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" })
  }
})


app.listen(3000, ()=> {
    console.log("App is running")
})