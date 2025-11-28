const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");

// GET. Fetch all vehicles belonging to a specific user (by email)
router.get("/", async (req, res) => {
  try {
    // Validate email query parameter and if bad, return 400
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Query vehicles by email
    const items = await Vehicle.find({ email }).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (err) {
    console.error("GET /api/vehicles error:", err);
    res.status(500).json({ message: "Server error fetching vehicles" });
  }
});

// POST. Creates a new vehicle entry in the database.
router.post("/", async (req, res) => {
  try {
    // Create a new instance of the Vehicle model using request body data and save to DB
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    console.error("POST /api/vehicles error:", err);
    res.status(500).json({ message: "Server error saving vehicle" });
  }
});

// DELETE. Deletes a vehicle by MongoDB document ID
router.delete("/:id", async (req, res) => {
  try {
    // Attempt deletion of a document matching the provided ID and return success status
    const result = await Vehicle.deleteOne({ _id: req.params.id });
    res.json({ ok: result.deletedCount > 0 });
  } catch (err) {
    console.error("DELETE /api/vehicles error:", err);
    res.status(500).json({ ok: false });
  }
});

module.exports = router;

// Robert Simovski
// Sources:
// https://expressjs.com/
// https://mongoosejs.com/docs/