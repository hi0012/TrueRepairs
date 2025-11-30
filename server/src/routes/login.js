const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const UserModel = require('../../models/users.js');

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if(!email) {
      return res.status(400).json({success: false, message: "Email is required"})
    }
    if(!password) {
      return res.status(400).json({success: false, message: "Password is required"})
    }
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(400).json({success: false, message: "User does not exist. Please try again."});

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({success: false, message: "The password is incorrect. Please try again."});

    res.json({ success: true, user: { id: user._id, email: user.email } });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// Jibran Iq1bal {100%}