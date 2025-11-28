const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const UserModel = require('../../models/users.js'); 
const Vehicle = require('../../models/Vehicle.js');
const Lookup = require('../../models/lookup.js');   
const Report = require('../../models/Report.js');   
const Estimate = require('../../models/estimate.js');

router.post("/delete-account", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password." });
    }

    await Promise.all([
      UserModel.deleteOne({ email }),
      Vehicle.deleteMany({ email }),
      Lookup.deleteMany({ userEmail: email }),
      Report.deleteMany({ userEmail: email }),
      Estimate.deleteMany({ userEmail: email })
    ]);

    return res.json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch {
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;