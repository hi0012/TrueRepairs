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

const externalRoutes = require("./src/routes/external");
const historyRoutes = require("./src/routes/history");

const TEMP_SECRET = process.env.TEMP_SECRET;
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

connectDB();
// ---- VIN history: list (GET) ----
// GET /api/history?email=you@example.com
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
});

app.post("/api/history", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const vin = (req.body.vin || "").trim().toUpperCase();
    if (!email || !vin) return res.status(400).json({ message: "email and vin are required" });

    // reuse your existing vehdb client
    const apiResp = await vehdb.get(`/vin-decode/${vin}`);
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



app.get("/", (req, res) => res.send("TrueRepairs API"));
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/db-health", (req, res) => {
  res.json({
    connected: mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState
  });
});

app.use("/api", externalRoutes);
app.use("/api", historyRoutes);

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
    if (existingUser) return res.json({ success: false, message: "This email is already associated with an account." });
    const token = jwt.sign({ email, password }, TEMP_SECRET, { expiresIn: "15m" });
    const resetURL = `${process.env.CLIENT_URL2 || process.env.CLIENT_URL}/verify/${token}`;
    const msg = {
      to: email,
      from: { email: process.env.FROM_EMAIL, name: "TrueRepairs Support" },
      subject: "Verify Your Account.",
      text: `Verify your account using the link below (valid 1 hour): ${resetURL}`,
      html: `<p>Verify your account using the link below (valid 1 hour):</p><p><a href="${resetURL}">Verify Account</a></p>`
    };
    await sgMail.send(msg);
    res.json({ success: true, message: "Verification email sent! Please check your inbox." });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/verify/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, TEMP_SECRET);
    const existingUser = await UserModel.findOne({ email: decoded.email });
    if (existingUser) return res.redirect(`${process.env.CLIENT_URL}/?verified=exists`);
    const hashedPassword = await bcrypt.hash(decoded.password, 10);
    await UserModel.create({ email: decoded.email, password: hashedPassword });
    res.redirect(`${process.env.CLIENT_URL}/?verified=true`);
  } catch {
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
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();
    const resetURL = `${process.env.CLIENT_URL}/reset-password/${token}`;
    const msg = {
      to: email,
      from: { email: process.env.FROM_EMAIL, name: "TrueRepairs Support" },
      subject: "Reset your password",
      text: `Reset your password using the link below (valid 1 hour): ${resetURL}`,
      html: `<p>Reset your password using the link below (valid 1 hour):</p><p><a href="${resetURL}">Reset password</a></p>`
    };
    await sgMail.send(msg);
    res.send({ ok: true });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const user = await UserModel.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: "Invalid or expired token." });
    user.password = await bcrypt.hash(password, 10);
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
    if (!user) return res.status(404).json({ message: "User not found." });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect." });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated successfully!" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/send-support", async (req, res) => {
  try {
    const { name, email, feedback } = req.body;
    const msg = {
      to: "truerepairs.noreply@gmail.com",
      from: { email: "truerepairs.noreply@gmail.com", name: "TrueRepairs Support" },
      subject: "New Support Message from Contact Form",
      text: `From: ${name || "Anonymous"} (${email})\n\n${feedback}`
    };
    await sgMail.send(msg);
    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`App is running on :${port}`);
});
