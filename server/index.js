// Load env
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Core deps
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { spawn } = require("child_process");

// App deps
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
const { scrapeRockAuto } = require("./src/services/rockauto");
const reportRoutes = require("./src/routes/reportRoutes.js");

// Env
const TEMP_SECRET = process.env.TEMP_SECRET;
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// App
const app = express();
app.use(cors());
app.use(express.json());

// Root + reports first
app.get("/", (req, res) => res.json({ ok: true, message: "TrueRepairs API" }));
app.use("/api/reports", reportRoutes);

// RockAuto categories
app.post("/api/rockauto/categories", (req, res) => {
  const { make, year, model, engine } = req.body;
  const scriptPath = path.join(__dirname, "src", "services", "rockautoCategories.py");
  const py = spawn("python", [scriptPath, make, year, model, engine]);

  let data = "";
  py.stdout.on("data", (chunk) => (data += chunk.toString()));
  py.stderr.on("data", (chunk) => console.error("PyErr:", chunk.toString()));
  py.on("close", () => {
    try { res.json(JSON.parse(data)); }
    catch { res.status(500).json({ error: "Failed to parse Python output" }); }
  });
});

// RockAuto subcategories
app.post("/api/rockauto/subcategories", (req, res) => {
  const { make, year, model, engine, category } = req.body;
  const scriptPath = path.join(__dirname, "src", "services", "rockautoSubcategories.py");
  const py = spawn("python", [scriptPath, make, year, model, engine, category]);

  let data = "";
  py.stdout.on("data", (chunk) => (data += chunk.toString()));
  py.stderr.on("data", (chunk) => console.error("PyErr:", chunk.toString()));
  py.on("close", () => {
    try { res.json(JSON.parse(data)); }
    catch { res.status(500).json({ error: "Failed to parse Python output" }); }
  });
});

// RockAuto scrape
app.post("/api/scrape-rockauto", async (req, res) => {
  try {
    const { make, year, model, engine, category, subcategory } = req.body;

    if (!make || !year || !model || !engine || !category || !subcategory) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const scriptPath = path.join(__dirname, "src", "services", "rockautoscrape.py");

    // Helpful trace to your Node console:
    console.log("[SCRAPE] payload:", { make, year, model, engine, category, subcategory });
    const py = spawn("python", [scriptPath, make, year, model, engine, category, subcategory], {
      env: process.env,
    });

    let out = "";
    let err = "";

    py.stdout.on("data", (chunk) => (out += chunk.toString()));
    py.stderr.on("data", (chunk) => (err += chunk.toString()));
    py.on("close", (code) => {
      // Python prints ONLY JSON to stdout; all logs go to stderr
      try {
        const parts = out ? JSON.parse(out) : {};
        return res.json({
          success: true,
          parts,     // grouped dict from Python
          debug: err // Python logs so you can see matches/clicks/timeouts
        });
      } catch (e) {
        console.error("[SCRAPE] JSON parse error:", e, "RAW:", out);
        return res.status(500).json({
          success: false,
          error: "Failed to parse Python output",
          raw: out,
          debug: err,
        });
      }
    });
  } catch (err) {
    console.error("[SCRAPE] route error:", err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Car details
app.get("/api/cardetails/makes", async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) return res.status(400).json({ message: "Year required" });

    let allData = [], offset = 0;
    const limit = 50;
    while (true) {
      const data = await getCarSpecs({ year, limit, offset });
      if (!data.length) break;
      allData = allData.concat(data);
      offset += limit;
      if (data.length < limit) break;
    }
    const cap = (str = "") => str.toLowerCase().split(" ").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
    const uniqueMakes = [...new Set(allData.map(c => cap(c.make)))].sort();
    res.json(uniqueMakes);
  } catch {
    res.status(500).json({ message: "Failed to load makes" });
  }
});

app.get("/api/cardetails/models", async (req, res) => {
  try {
    const { year, make } = req.query;
    if (!year || !make) return res.status(400).json({ message: "Year and make required" });

    let allData = [], offset = 0;
    const limit = 50;
    while (true) {
      const data = await getCarSpecs({ year, make, limit, offset });
      if (!data.length) break;
      allData = allData.concat(data);
      offset += limit;
      if (data.length < limit) break;
    }
    const cap = (str = "") =>
      str.toLowerCase().split(/([\s-]+)/).map((part) =>
        /^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part
      ).join("");
    const uniqueModels = [...new Set(allData.map(c => cap(c.model)))].sort();
    res.json(uniqueModels);
  } catch (err) {
    console.error("Error in /models:", err.message);
    res.status(500).json({ message: "Failed to load models" });
  }
});

app.get("/api/cardetails/details", async (req, res) => {
  try {
    const { year, make, model } = req.query;
    if (!year || !make || !model) return res.status(400).json({ message: "Missing params" });
    const data = await getCarSpecs({ year, make, model });
    res.json(data);
  } catch {
    res.status(500).json({ message: "Failed to load details" });
  }
});

// Vehicles CRUD
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

// VIN decode + history
app.post("/api/vehicleinfo", async (req, res) => {
  try {
    const { vin, email } = req.body;
    if (!vin || !email) return res.status(400).json({ message: "VIN and email required" });

    function formatFuel(fuel) {
      if (!fuel) return "Unknown";
      const f = fuel.toLowerCase();
      if (f === "gas") return "Gasoline";
      if (f === "diesel") return "Diesel";
      if (f === "electric") return "Electric";
      return fuel.charAt(0).toUpperCase() + fuel.slice(1);
    }
    function formatDrivetrain(drive) {
      if (!drive) return "Unknown";
      const d = drive.toLowerCase();
      if (d === "awd") return "AWD";
      if (d === "fwd") return "FWD";
      if (d === "rwd") return "RWD";
      if (d === "4wd") return "4WD";
      return drive.toUpperCase();
    }

    let payload;
    try {
      const apiResp = await vehdb.vinDecode(vin);
      payload = { source: "VehicleDatabase", data: apiResp.data };
    } catch {
      const ninjaResp = await vinDecode(vin);
      payload = { source: "NinjaAPI", data: ninjaResp };

      if (ninjaResp.manufacturer && ninjaResp.model && ninjaResp.year) {
        const specsList = await getCarSpecs({
          make: ninjaResp.manufacturer, model: ninjaResp.model, year: ninjaResp.year
        });
        const specs = specsList?.[0];
        if (specs) {
          payload.data = {
            ...ninjaResp,
            engine: specs.displacement ? `${specs.displacement}L ${specs.cylinders || ""}-Cyl`.trim() : "Unknown",
            fuel_type: specs.fuel_type || "Unknown",
            drive: specs.drive || "Unknown",
            transmission: specs.transmission || "Unknown",
            city_mpg: specs.city_mpg || "Unknown",
            highway_mpg: specs.highway_mpg || "Unknown",
          };
        }
      }
    }

    const v = payload.data || {};
    const make = v.make || v.manufacturer || v.brand || "Unknown";
    const model = v.model || "Unknown";
    const year = v.year || "Unknown";
    const trim = v.trim || "Unknown";
    const engine = (v.engine || v.engine_size)
      ? String(v.engine || v.engine_size).replace(/\b([a-z])/g, (c) => c.toUpperCase())
      : "Unknown";
    const fuel = formatFuel(v.fuel_type);
    const drivetrain = formatDrivetrain(v.drive || v.drivetrain);
    const transmission = v.transmission || "Unknown";
    const mpg_city = v.city_mpg || "Unknown";
    const mpg_highway = v.highway_mpg || "Unknown";
    const vehicleClass = v.class || "Unknown";
    const nickname = `${year} ${make} ${model}`.trim() || "Unnamed Vehicle";

    const newVehicle = new Vehicle({
      email, vin, nickname, year, make, model, trim, engine, fuel,
      drivetrain, transmission, mpg_city, mpg_highway, class: vehicleClass, data: v,
    });
    await newVehicle.save();
    await Lookup.create({ userEmail: email, vin, data: payload });

    res.json({ message: `${nickname} added successfully!`, source: payload.source, vehicle: newVehicle });
  } catch (err) {
    console.error("Unexpected VIN lookup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Lookup history
app.get("/api/history", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "email is required" });

    const items = await Lookup.find({ userEmail: email })
      .sort({ createdAt: -1 }).limit(20).lean();

    res.json({ items });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/history", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const vin = (req.body.vin || "").trim().toUpperCase();
    if (!email || !vin) return res.status(400).json({ message: "email and vin are required" });

    const apiResp = await vehdb.vinDecode(vin);
    const payload = { vehicledb: apiResp.data };
    await Lookup.create({ userEmail: email, vin, data: payload });
    res.json(payload);
  } catch (e) {
    res.status(e.response?.status || 500).json({ message: e.message || "Lookup failed" });
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

// Health
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/db-health", (req, res) => {
  res.json({
    connected: mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
  });
});

// Auth
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) return res.json("User does not exist. Please try again.");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.json("The password is incorrect. Please try again.");

    res.json({ success: true, user: { id: user._id, email: user.email } });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "This email is already associated with an account." });
    }

    const token = jwt.sign({ email, password }, TEMP_SECRET, { expiresIn: "15m" });
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
      return res.json({ success: true, message: "Verification email sent! Please check your inbox." });
    } catch (err) {
      console.error("SendGrid error:", err);
      return res.status(500).send({ ok: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, TEMP_SECRET);

    const existingUser = await UserModel.findOne({ email: decoded.email });
    if (existingUser) return res.redirect(`${process.env.CLIENT_URL}/?verified=exists`);

    const newUser = await UserModel.create({ email: decoded.email, password: decoded.password });
    console.log("Verified & created:", newUser.email);
    res.redirect(`${process.env.CLIENT_URL}/?verified=true`);
  } catch (err) {
    console.error("Verification error:", err);
    res.redirect(`${process.env.CLIENT_URL}/?verified=false`);
  }
});

app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(400).json({ message: "No account with that email found." });

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hr
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
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired token." });

    user.password = password; 
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/update-password", async (req, res) => {
  try {
    const { currentPassword, newPassword, email } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect." });

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
    const msg = {
      to: "truerepairs.noreply@gmail.com",
      from: { email: "truerepairs.noreply@gmail.com", name: "TrueRepairs Support" },
      subject: "New Support Message from Contact Form",
      text: `From: ${name || "Anonymous"} (${email})\n\n${feedback}`,
    };
    await sgMail.send(msg);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("SendGrid error:", error);
    res.status(500).json({ success: false });
  }
});

// API 404 catch-all
app.use("/api", (req, res) => {
  return res.status(404).json({ message: "Not Found", path: req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ message: err.message || "Server error" });
});

// Start only after DB connects
(async () => {
  try {
    await connectDB();
    app.listen(5000, () => {
      console.log("App is running on http://localhost:5000");
    });
  } catch (e) {
    console.error("Mongo connection failed:", e.message);
    process.exit(1);
  }
})();
