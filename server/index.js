const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { spawn } = require("child_process");

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
const reportRoutes = require("./src/routes/reportRoutes.js");
// const externalRoutes = require("./src/routes/external.js");
//const estimateRoutes = require("./src/routes/estimate");
const fs = require("fs");
const toyotaData = JSON.parse(fs.readFileSync(path.join(__dirname, "src", "data", "toyotaENGTRIM.json"), "utf-8"));

const TEMP_SECRET = process.env.TEMP_SECRET;
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());
//app.use("/api", estimateRoutes); //

app.use("/api", estimateRoutes);

app.get("/", (req, res) => {
  res.json({ ok: true, message: "TrueRepairs API" });
});

app.use("/api/reports", reportRoutes);

// Return all Toyota years
app.get("/api/years", (req, res) => {
  const years = toyotaData.map((item) => item.year);
  res.json(years);
});

// Return makes
app.get("/api/makes", (req, res) => {
  res.json(["Toyota"]);
});

// Return all models for a given year
app.get("/api/models/:year", (req, res) => {
  const { year } = req.params;
  const yearData = toyotaData.find((y) => y.year === parseInt(year));
  if (!yearData) return res.json([]);
  const models = yearData.models.map((m) => m.model);
  res.json(models);
});

// engines or drivetrain info
app.get("/api/engines/:year/:model", (req, res) => {
  const { year, model } = req.params;
  const yearData = toyotaData.find((y) => y.year === parseInt(year));
  const modelData = yearData?.models.find(
    (m) => m.model.toLowerCase() === model.toLowerCase()
  );
  if (!modelData) return res.json([]);
  const engines = modelData.engines.map((e) => e.engine);
  res.json(engines);
});

app.get("/api/trims/:year/:model/:engine", (req, res) => {
  const { year, model, engine } = req.params;
  const yearData = toyotaData.find(y => y.year == year);
  if (!yearData) return res.json([]);

  const modelData = yearData.models.find(m => m.model === model);
  if (!modelData) return res.json([]);

  const engineData = modelData.engines.find(e => e.engine === engine);
  if (!engineData) return res.json([]);

  res.json(engineData.trims || []);
});

app.post("/api/manual-vehicle", async (req, res) => {
  try {
    const { year, make, model, engine, trim, email } = req.body;
    if (!year || !make || !model || !engine || !trim || !email)
      return res.status(400).json({
        message: "Year, make, model, engine, trim, and email are required",
      });

    // Formatters
    const cap = (s = "") => s.split(" ").map(w => w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

    const yearStr = String(year);
    const makeFormatted = cap(make);
    const modelFormatted = cap(model);
    const engineFormatted = engine.trim();
    const trimFormatted = cap(trim);

    let fuel = "Gas";
    let drivetrain = "FWD";

    const yearData = toyotaData.find((y) => String(y.year) === yearStr);
    if (yearData) {
      const modelData = yearData.models.find(
        (m) => m.model.toLowerCase() === modelFormatted.toLowerCase()
      );
      if (modelData) {
        const engineData = modelData.engines.find(
          (e) => e.engine.toLowerCase() === engineFormatted.toLowerCase()
        );
        if (engineData) {
          if (engineData.fuel) fuel = engineData.fuel;
          if (engineData.drivetrain) drivetrain = engineData.drivetrain;
        }
      }
    }

    const nickname = `${yearStr} ${makeFormatted} ${modelFormatted} ${trimFormatted}`.trim();

    // Save to DB
    const newVehicle = new Vehicle({
      email,
      nickname,
      year: yearStr,
      make: makeFormatted,
      model: modelFormatted,
      engine: engineFormatted,
      trim: trimFormatted,
      fuel,
      drivetrain,
      transmission: "AUTO",
      mpg_city: "Unknown",
      mpg_highway: "Unknown",
      class: "Unknown",
    });

    await newVehicle.save();

    res.json({
      message: "Manual vehicle added successfully!",
      vehicle: newVehicle,
    });
  } catch {
    res.status(500).json({ message: "Failed to add manual vehicle." });
  }
});

app.get("/api/cardetails/details", async (req, res) => {
  try {
    const { year, make, model } = req.query;
    if (!year || !make || !model) {
      return res.status(400).json({ message: "Missing params" });
    }

    const data = await getCarSpecs({ year, make, model });
    res.json(data);
  } catch {
    res.status(500).json({ message: "Failed to load details" });
  }
});

app.get("/api/vehicles", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const vehicles = await Vehicle.find({ email });
    res.json({ items: vehicles });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/vehicles", async (req, res) => {
  try {
    const newVehicle = new Vehicle(req.body);
    await newVehicle.save();
    res.json(newVehicle);
  } catch {
    res.status(500).json({ message: "Error saving vehicle" });
  }
});

app.delete("/api/vehicles/:id", async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete" });
  }
});

app.post("/api/vehicleinfo", async (req, res) => {
  try {
    const { vin, email } = req.body;
    if (!vin || !email) {
      return res.status(400).json({ message: "VIN and email required" });
    }

    const capWords = (str = "") =>
      String(str)
        .toLowerCase()
        .split(/([\s-]+)/)
        .map((p) => (/^[a-z]/.test(p) ? p[0].toUpperCase() + p.slice(1) : p))
        .join("");

    const formatFuel = (fuel) => {
      if (!fuel) return "Unknown";
      const f = String(fuel).toLowerCase();
      if (f === "gas") return "Gasoline";
      if (f === "diesel") return "Diesel";
      if (f === "electric") return "Electric";
      return fuel.charAt(0).toUpperCase() + fuel.slice(1);
    };

    const formatDrivetrain = (drive) => {
      if (!drive) return "Unknown";
      const d = String(drive).toLowerCase();
      if (d === "awd") return "AWD";
      if (d === "fwd") return "FWD";
      if (d === "rwd") return "RWD";
      if (d === "4wd") return "4WD";
      return String(drive).toUpperCase();
    };

    // Decode with Ninja
    const ninjaResp = await vinDecode(vin);
    let payload = { source: "NinjaAPI", data: ninjaResp || {} };
    let v = payload.data || {};

    let makeBase = v.make || v.manufacturer || v.brand;
    let modelBase = v.model || v.model_name || v.series;
    let yearBase = v.year || v.model_year;

    // Enrich using Ninja car specs if anything key is missing
    const missingKey =
      (!v.engine && !v.engine_size) ||
      !v.fuel_type ||
      !(v.drive || v.drivetrain) ||
      !v.transmission ||
      !v.city_mpg ||
      !v.highway_mpg;

    if (makeBase && modelBase && yearBase && missingKey) {
      try {
        const specsList = await getCarSpecs({
          make: makeBase,
          model: modelBase,
          year: yearBase,
        });
        if (specsList && specsList.length) {
          const s = specsList[0];
          const enrichedEngine = s.displacement
            ? `${s.displacement}L ${s.cylinders || ""}-Cyl`.trim()
            : v.engine || v.engine_size || "Unknown";

          v = {
            ...v,
            engine: enrichedEngine,
            fuel_type: v.fuel_type || s.fuel_type || "Unknown",
            drive: v.drive || v.drivetrain || s.drive || "Unknown",
            transmission: v.transmission || s.transmission || "Unknown",
            city_mpg: v.city_mpg || s.city_mpg || "Unknown",
            highway_mpg: v.highway_mpg || s.highway_mpg || "Unknown",
          };
          payload.data = v;
        }
      } catch {}
    }

    // Normalize for save
    const make  = capWords(v.make || v.manufacturer || v.brand || "Unknown");
    const model = capWords(v.model || v.model_name || v.series || "Unknown");
    const year = String(v.year || v.model_year || "Unknown");
    const trim = capWords(v.trim || "");

    const engine =
      v.engine || v.engine_size
        ? String(v.engine || v.engine_size).replace(
            /\b([a-z])/g,
            (c) => c.toUpperCase()
          )
        : "Unknown";

    const fuel = formatFuel(v.fuel_type);
    const drivetrain = formatDrivetrain(v.drive || v.drivetrain);
    const transmission = v.transmission || "Unknown";
    const mpg_city = v.city_mpg || "Unknown";
    const mpg_highway = v.highway_mpg || "Unknown";
    const vehicleClass = v.class || "Unknown";
    const nickname = `${year} ${make} ${model}`.trim() || "Unnamed Vehicle";

    // Persist
    const newVehicle = new Vehicle({
      email,
      vin,
      nickname,
      year,
      make,
      model,
      trim,
      engine,
      fuel,
      drivetrain,
      transmission,
      mpg_city,
      mpg_highway,
      class: vehicleClass,
      data: v,
    });
    await newVehicle.save();

    await Lookup.create({ userEmail: email, vin, data: payload });

    return res.json({
      message: `${nickname} added successfully!`,
      source: payload.source,
      vehicle: newVehicle,
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "email is required" });

    const items = await Lookup.find({ userEmail: email })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ items });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/history", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const vin = (req.body.vin || "").trim().toUpperCase();
    if (!email || !vin) {
      return res.status(400).json({ message: "email and vin are required" });
    }

    const apiResp = await vehdb.vinDecode(vin);
    const payload = { vehicledb: apiResp.data };
    await Lookup.create({ userEmail: email, vin, data: payload });
    res.json(payload);
  } catch (e) {
    res
      .status(e.response?.status || 500)
      .json({ message: e.message || "Lookup failed" });
  }
});

app.delete("/api/history/:id", async (req, res) => {
  try {
    await Lookup.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/db-health", (req, res) => {
  res.json({
    connected: mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
  });
});

app.post("/login", async (req, res) => {
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

app.post("/register", async (req, res) => {
  try {
    const { email, password, passwordConfirm } = req.body;
    const existingUser = await UserModel.findOne({ email });
    if(!email) {
      return res.status(400).json({success: false, message: "Email is required"})
    }
    if(!password) {
      return res.status(400).json({success: false, message: "Password is required"})
    }
    if(!passwordConfirm) {
      return res.status(400).json({success: false, message: "Confirm password is required"})
    }
    if(password !== passwordConfirm) {
      return res.status(400).json({success: false, message: "Password and confirm password do not match."})
    }
    if (existingUser) {
      return res.status(400).json({ success: false, message: "This email is already associated with an account." });
    }

    const token = jwt.sign({ email, password }, TEMP_SECRET, {
      expiresIn: "15m",
    });
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
        message: "Verification email sent! Please check your inbox.",
      });
    } catch (err) {
      return res.status(500).send({ ok: false });
    }
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, TEMP_SECRET);

    const existingUser = await UserModel.findOne({ email: decoded.email });
    if (existingUser) {
      return res.redirect(`${process.env.CLIENT_URL}/?verified=exists`);
    }

    const newUser = await UserModel.create({
      email: decoded.email,
      password: decoded.password,
    });
    res.redirect(`${process.env.CLIENT_URL}/?verified=true`);
  } catch {
    res.redirect(`${process.env.CLIENT_URL}/?verified=false`);
  }
});

app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "No account with that email found." });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
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
    } catch {
      return res.status(500).send({ ok: false });
    }
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful!" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/update-password", async (req, res) => {
  try {
    const { currentPassword, newPassword, email } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: "Password updated successfully!" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/send-support", async (req, res) => {
  try {
    const { name, email, feedback } = req.body;
    if(!email) {
      return res.status(400).json({success: false, message: "Email is required"})
    }
    if(!feedback) {
      return res.status(400).json({success: false, message: "Feedback is required"})
    }
    const msg = {
      to: "truerepairs.noreply@gmail.com",
      from: { email: "truerepairs.noreply@gmail.com", name: "TrueRepairs Support" },
      subject: "New Support Message from Contact Form",
      text: `From: ${name || "Anonymous"} (${email})\n\n${feedback}`,
    };
    await sgMail.send(msg);
    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

app.post("/update-profile", async (req, res) => {
  try {
    const { currentEmail, newEmail } = req.body;
    if (!currentEmail || !newEmail) {
      return res.status(400).json({
        success: false,
        message: "Both currentEmail and newEmail are required",
      });
    }

    const user = await UserModel.findOne({ email: currentEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const emailExists = await UserModel.findOne({ email: newEmail });
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: "Email already in use",
      });
    }

    user.email = newEmail;
    await user.save();

    res.json({
      success: true,
      message: "Email updated successfully",
      user: { email: user.email },
    });
  } catch {
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

app.post("/delete-account", async (req, res) => {
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

    await Promise.all([UserModel.deleteOne({ email })]);

    return res.json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch {
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message || "Server error" });
});

(async () => {
  try {
    await connectDB();

    app.use("/api", (req, res) => {
      return res.status(404).json({ message: "Not Found", path: req.originalUrl });
    });

    app.listen(5000, () => {
      console.log("App is running on http://localhost:5000");
    });
  } catch (e) {
    console.error("Mongo connection failed:", e.message);
    process.exit(1);
  }
})();
