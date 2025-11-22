const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const UserModel = require('../../models/users.js');

router.post("/deactivate-account", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;