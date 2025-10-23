const express = require("express");
const Report = require("../../models/Report");
const router = express.Router();

// Quick smoke test
router.get("/health", (req, res) => {
  res.json({ ok: true, service: "reports" });
});

// Create demo report
router.post("/", async (req, res, next) => {
  try {
    const report = await Report.create(req.body);
    res.status(201).json(report);
  } catch (e) { next(e); }
});

// List reports
router.get("/", async (req, res, next) => {
  try {
    const q = {};
    const { year, make, model, engine } = req.query;
    if (year || make || model || engine) {
      q["vehicle.year"] = year ? Number(year) : undefined;
      q["vehicle.make"] = make || undefined;
      q["vehicle.model"] = model || undefined;
      q["vehicle.engine"] = engine || undefined;
      Object.keys(q).forEach(k => q[k] === undefined && delete q[k]);
    }
    const items = await Report.find(q).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items });
  } catch (e) { next(e); }
});

// Get one
router.get("/:id", async (req, res, next) => {
  try {
    const item = await Report.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) { next(e); }
});

module.exports = router;
