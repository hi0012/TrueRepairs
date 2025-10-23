require("dotenv").config({ path: "../.env" });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./db.js");
const UserModel = require("./models/users.js");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
const Lookup = require("./models/lookup.js");
const vehdb = require("./src/services/vehdb");
const Vehicle = require("./models/Vehicle.js");
const { getCarSpecs, vinDecode } = require("./src/services/ninjaApi");
// const externalRoutes = require("./src/routes/external.js");
const estimateRoutes = require("./src/routes/estimate"); // <-- ADDED

const TEMP_SECRET = process.env.TEMP_SECRET;
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", estimateRoutes); // <-- ADDED

connectDB();

app.get("/api/cardetails/makes", async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) return res.status(400).json({ message: "Year required" })

    let allData = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const data = await getCarSpecs({ year, limit, offset });
      if (!data.length) break;

      allData = allData.concat(data);
      offset += limit;
      hasMore = data.length === limit;
    }
    const cap = (str = "") =>
      str
        .toLowerCase()
        .split(" ")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");

    const uniqueMakes = [
      ...new Set(allData.map((c) => cap(c.make)))
    ].sort();

    console.log(`Found ${uniqueMakes.length} makes`);
    res.json(uniqueMakes);
  } catch (err) {
    res.status(500).json({ message: "Failed to load makes" })
  }
})


app.get("/api/cardetails/models", async (req, res) => {
  try {
    const { year, make } = req.query;
    if (!year || !make)
      return res.status(400).json({ message: "Year and make required" })
    let allData = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const data = await getCarSpecs({ year, make, limit, offset });
      if (!data.length) break;
      allData = allData.concat(data);
      offset += limit;
      hasMore = data.length === limit;
    }

    // Capitalize helper
    const cap = (str = "") =>
      str
        .toLowerCase()
        .split(/([\s-]+)/)
        .map((part) =>
          /^[a-z]/.test(part)
            ? part.charAt(0).toUpperCase() + part.slice(1)
            : part
        )
        .join("");

    // Apply to each model and remove duplicates
    const uniqueModels = [...new Set(allData.map((c) => cap(c.model)))].sort();

    res.json(uniqueModels);
  } catch (err) {
    console.error("Error in /models:", err.message);
    res.status(500).json({ message: "Failed to load models" });
  }
})


app.post("/api/manual-vehicle", async (req, res) => {
  try {
    const { year, make, model, trim, email } = req.body;

    if (!year || !make || !model || !email) {
      return res.status(400).json({ message: "Year, make, model, and email required" })
    }

    // Fetch specs from API Ninja
    const specs = await getCarSpecs({ year, make, model })
    const carData = specs?.[0];

    if (!carData) {
      return res.status(404).json({ message: "Vehicle specs not found." })
    }

    // Capitalize helper
    const cap = (str = "") =>
      str
        .toLowerCase()
        .split(" ")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");

    const yearStr = String(year);
    const makeFormatted = cap(make);
    const modelFormatted = cap(model);
    const trimFormatted = trim && trim.trim() !== "" ? cap(trim) : "";

    // Engine & drivetrain info
    const engine = carData.displacement
      ? `${carData.displacement}L ${carData.cylinders || ""}-Cyl`.trim()
      : "Unknown";

    let fuel = carData.fuel_type ? cap(carData.fuel_type) : "Unknown";
    if (fuel.toLowerCase() === "gas") fuel = "Gasoline";

    const drivetrain = carData.drive ? carData.drive.toUpperCase() : "FWD";
    const transmission = carData.transmission?.toUpperCase() || "AUTO";

    // Build nickname
    const nickname = `${yearStr} ${makeFormatted} ${modelFormatted}${
      trimFormatted ? ` ${trimFormatted}` : ""
    }`.trim();

    // Construct final vehicle entry
    const newVehicle = new Vehicle({
      email,
      nickname,
      year: yearStr,
      make: makeFormatted,
      model: modelFormatted,
      trim: trimFormatted,
      engine,
      fuel,
      drivetrain,
      transmission,
      mpg_city: carData.city_mpg || "Unknown",
      mpg_highway: carData.highway_mpg || "Unknown",
      class: carData.class || "Unknown",
    });

    await newVehicle.save();

    res.json({
      message: "Manual vehicle added successfully!",
      vehicle: {
        ...newVehicle.toObject(),
        data: {
          engine: { engine_size: engine },
          fuel: { fuel_type: fuel },
          drivetrain: { drive_type: drivetrain },
        },
      },
    });
  } catch (err) {
    console.error("Error adding manual vehicle:", err);
    res.status(500).json({ message: "Failed to add manual vehicle." });
  }
})

app.get("/api/cardetails/details", async (req, res) => {
  try {
    const { year, make, model } = req.query;
    if (!year || !make || !model)
      return res.status(400).json({ message: "Missing params" });

    const data = await getCarSpecs({ year, make, model });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to load details" });
  }
})

app.get("/api/vehicles", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const vehicles = await Vehicle.find({ email });
    res.json({ items: vehicles });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
})

app.post("/api/vehicles", async (req, res) => {
  try {
    const newVehicle = new Vehicle(req.body);
    await newVehicle.save();
    res.json(newVehicle);
  } catch (err) {
    res.status(500).json({ message: "Error saving vehicle" });
  }
})

app.delete("/api/vehicles/:id", async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete" });
  }
})

app.post("/api/vehicleinfo", async (req, res) => {
  try {
    const { vin, email } = req.body;
    if (!vin || !email)
      return res.status(400).json({ message: "VIN and email required" });

    const apiResp = await vehdb.vinDecode(vin);
    const payload = { vehicledb: apiResp.data };

    await Lookup.create({ userEmail: email, vin, data: payload });
    res.json(payload);
  } catch (e) {
    console.error(e);
    res
      .status(e.response?.status || 500)
      .json({ message: e.message || "VIN lookup failed" });
  }
})

app.get("/api/history", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "email is required" });

    const items = await Lookup.find({ userEmail: email })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
})

app.post("/api/history", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const vin = (req.body.vin || "").trim().toUpperCase();
    if (!email || !vin)
      return res
        .status(400)
        .json({ message: "email and vin are required" });

    const apiResp = await vehdb.vinDecode(vin);
    const payload = { vehicledb: apiResp.data };

    await Lookup.create({ userEmail: email, vin, data: payload });
    res.json(payload);
  } catch (e) {
    res
      .status(e.response?.status || 500)
      .json({ message: e.message || "Lookup failed" });
  }
})

app.delete("/api/history/:id", async (req, res) => {
  try {
    await Lookup.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// ---------- ADDED: simple passthrough VIN endpoint ----------
app.get("/api/vehicle/:vin", async (req, res) => {
  try {
    const r = await vehdb.vinDecode(req.params.vin);
    res.json({ vehicledb: r.data });
  } catch (e) {
    res.status(e.response?.status || 500).json({ message: e.message || "Lookup failed" });
  }
});
// ------------------------------------------------------------

app.get("/", (req, res) => res.send("TrueRepairs API"));
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/db-health", (req, res) => {
  res.json({
    connected: mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
  });
})

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

    if (!user.isActive) {
      user.isActive = true;
      await user.save();
    }

    res.json({
      success: true,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
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

    const newUser = await UserModel.create({
      email: decoded.email,
      password: decoded.password,
    });

    console.log("Verified & created:", newUser.email);
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

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${token}`;

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

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    user.password = newPassword;

    await user.save();

    return res.json({ message: "Password updated successfully!" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
})

app.post("/send-support", async (req, res) => {
  try {
    const { name, email, feedback } = req.body;

    const msg = {
      to: "truerepairs.noreply@gmail.com",
      from: {
        email: "truerepairs.noreply@gmail.com",
        name: "TrueRepairs Support",
      },
      subject: "New Support Message from Contact Form",
      text: `From: ${name || "Anonymous"} (${email})\n\n${feedback}`,
    }

    await sgMail.send(msg);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("SendGrid error:", error);
    res.status(500).json({ success: false });
  }
})

app.post("/update-profile", async (req, res) => {
  try {
    const { currentEmail, newEmail } = req.body;

    // Validate input
    if (!currentEmail || !newEmail) {
      return res.status(400).json({
        success: false,
        message: "Both currentEmail and newEmail are required",
      });
    }

    // Find user by current email
    const user = await UserModel.findOne({ email: currentEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if new email already exists
    const emailExists = await UserModel.findOne({ email: newEmail });
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Update user email
    user.email = newEmail;
    await user.save();

    res.json({
      success: true,
      message: "Email updated successfully",
      user: { email: user.email },
    });

  } catch (err) {
    console.error("Error in /update-profile:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

app.post("/deactivate-account", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    user.isActive = false;
    await user.save();

    res.json({ success: true, message: "Account deactivated successfully" });
  } catch (err) {
    console.error("Deactivate account error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/delete-account", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Incorrect password." });

    await Promise.all([
      UserModel.deleteOne({ email }),
      //Order.deleteMany({ userEmail: email }),
      //Review.deleteMany({ userEmail: email })
    ]);

    return res.json({ success: true, message: "Account deleted successfully." });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});


app.listen(5000, ()=> {
  console.log("App is running")
})
