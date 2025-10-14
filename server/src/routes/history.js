const express = require("express");
const router = express.Router();
const Lookup = require("../../models/lookup");
const VDB = require("../services/vehdb");

router.get("/history", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "email is required" });

    const results = await Lookup.find({ userEmail: email })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ items: results });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/history", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const vin = (req.body.vin || "").trim().toUpperCase();
    if (!email || !vin) return res.status(400).json({ message: "email and vin are required" });

    const apiResp = await VDB.vinDecode(vin);
    const payload = { vehicledb: apiResp.data };

    await Lookup.create({ userEmail: email, vin, data: payload });

    res.json(payload);
  } catch (e) {
    res.status(e.response?.status || 500).json({ message: e.message || "Lookup failed" });
  }
});

router.delete("/history/:id", async (req, res) => {
  try {
    await Lookup.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

module.exports = router;
