require("dotenv").config(); 
const express = require('express')
const connectDB = require('./db.js')
const cors = require("cors")
const UserModel = require('./models/users.js')
const bcrypt = require('bcryptjs')
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const TEMP_SECRET = process.env.TEMP_SECRET;
const crypto = require("crypto"); 
const sgMail = require("@sendgrid/mail"); 

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express()
app.use(express.json())
app.use(cors())

connectDB()

app.post("/login", (req, res) => {
    const { identifier, password } = req.body;
    UserModel.findOne({
      $or: [{ email: identifier }, { userName: identifier }]
    })
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
                userName: user.userName,
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
        const { userName, email, password } = req.body

        // check if email already exists
        const existingUser = await UserModel.findOne({
          $or: [{ email }, { userName }]
        });

        if (existingUser) {
          return res.json({
            success: false,
            message: existingUser.email === email
              ? "This email is already associated with an account."
              : "This username is already taken."
          });
        }
        
        const token = jwt.sign(
          { userName, email, password },
          TEMP_SECRET,
          { expiresIn: "15m" }
        );

        const verificationLink = `http://localhost:3000/verify/${token}`;
        console.log("Verification link:", verificationLink);

        //not sure where this message is going
        res.json({
          success: true,
          message: "Verification link generated (check console)."
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
})

app.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, TEMP_SECRET);

    // create user in DB after verification
    const newUser = await UserModel.create({
      userName: decoded.userName,
      email: decoded.email,
      password: decoded.password
    });

    res.json({
      success: true,
      message: "Email verified! Account created.",
      user: {
        id: newUser._id,
        userName: newUser.userName,
        email: newUser.email
      }
    });

  } catch (err) {
    console.error(err);
    res.status(400).json({
      success: false,
      message: "Invalid or expired verification link"
    });
  }
});

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
    const resetURL = `${process.env.CLIENT_URL}/reset-password/${token}`;

    // For now, log instead of emailing
    //console.log("Password reset link:", resetURL)

    //res.json({ message: "Password reset link generated. Check console for link." })

    const msg = {
      to: email,
      from: { email: process.env.FROM_EMAIL, name: "TrueRepairs Support" },
      subject: "Reset your password",
      text: `Reset your password using the link below (valid 1 hour): ${resetURL}`,
      html: `<p>Reset your password using the link below (valid 1 hour):</p><p><a href="${resetURL}">Reset password</a></p>`,
    };

    try {
      await sgMail.send(msg);
      return res.send({ ok: true });
    } catch (err) {
      console.error("SendGrid error:", err);
      return res.status(500).send({ ok: false });
    }

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