require("dotenv").config(); 
const express = require('express')
const connectDB = require('./db.js')
const cors = require("cors")
const UserModel = require('./models/users.js')
const bcrypt = require('bcryptjs')
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const TEMP_SECRET = process.env.TEMP_SECRET;
const sgMail = require("@sendgrid/mail"); 

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express()
app.use(express.json())
app.use(cors())

connectDB()

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.json("User does not exist. Please try again.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json("The password is incorrect. Please try again.");
    }

    res.json({
      success: true,
      user: { id: user._id, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
})

app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body
    // check if email already exists
    const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.json({
          success: false,
          message: "This email is already associated with an account."
        });
      }
        
      const token = jwt.sign(
        { email, password },
        TEMP_SECRET,
        { expiresIn: "15m" }
      );
      const resetURL = `${process.env.CLIENT_URL2}/verify/${token}`;

      //const verificationLink = `http://localhost:3000/verify/${token}`;
      //console.log("Verification link:", verificationLink);

      const msg = {
        to: email,
        from: { email: process.env.FROM_EMAIL, name: "TrueRepairs Support" },
        subject: "Verify Your Account.",
        text: `Verify your account using the link below (valid 1 hour): ${resetURL}`,
        html: `<p>Verify your account using the link below (valid 1 hour):</p><p><a href="${resetURL}">Verify Account</a></p>`,
      };

      try {
        await sgMail.send(msg);
        return res.json({ 
          success: true,
          message: "Verification email sent! Please check your inbox."
        });
      } catch (err) {
        console.error("SendGrid error:", err);
        return res.status(500).send({ ok: false });
      }
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

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: decoded.email });
    if (existingUser) {
      return res.redirect(`${process.env.CLIENT_URL}/?verified=exists`);
    }

    const hashedPassword = await bcrypt.hash(decoded.password, 10);

    const newUser = await UserModel.create({
      email: decoded.email,
      password: hashedPassword,
    });

    console.log("Verified & created:", newUser.email);

    // Redirect to frontend with success flag
    res.redirect(`${process.env.CLIENT_URL}/?verified=true`);
  } catch (err) {
    console.error("Verification error:", err);
    res.redirect(`${process.env.CLIENT_URL}/?verified=false`);
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


app.post("/update-password", async (req, res) => {
  try {
    const { currentPassword, newPassword, email } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Compare
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const alreadyHashed = newPassword.startsWith("$2a$") || newPassword.startsWith("$2b$");
    const hashedPassword = alreadyHashed ? newPassword : await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    return res.json({ message: "Password reset successful!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
})


app.listen(5000, ()=> {
  console.log("App is running")
})