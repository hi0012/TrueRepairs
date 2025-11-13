const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");

// GET
router.get("/", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const items = await Vehicle.find({ email }).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (err) {
    console.error("GET /api/vehicles error:", err);
    res.status(500).json({ message: "Server error fetching vehicles" });
  }
});

// POST
router.post("/", async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    console.error("POST /api/vehicles error:", err);
    res.status(500).json({ message: "Server error saving vehicle" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const result = await Vehicle.deleteOne({ _id: req.params.id });
    res.json({ ok: result.deletedCount > 0 });
  } catch (err) {
    console.error("DELETE /api/vehicles error:", err);
    res.status(500).json({ ok: false });
  }
});

module.exports = router;
