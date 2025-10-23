const express = require("express");
const Report = require("../../models/Report");
const router = express.Router();

// health
router.get("/health", (_req, res) => res.json({ ok: true, service: "reports" }));

// CREATE
router.post("/", async (req, res, next) => {
  try {
    const { title, userEmail, vehicle, parts, summary } = req.body;

    // coerce/clean so we always save numbers
    const cleanParts = Array.isArray(parts)
      ? parts.map((p) => ({
          name: String(p?.name ?? "Unknown"),
          low: Number(p?.low) || 0,
          high: Number(p?.high) || 0,
          avg: Number(p?.avg) || 0,
        }))
      : [];

    const cleanSummary = {
      totalLow: Number(summary?.totalLow) || 0,
      totalHigh: Number(summary?.totalHigh) || 0,
      totalAvg: Number(summary?.totalAvg) || 0,
    };

    const doc = await Report.create({
      title:
        title ||
        `${vehicle?.year ?? ""} ${vehicle?.make ?? ""} ${vehicle?.model ?? ""}`.trim(),
      userEmail: String(userEmail || "").toLowerCase(),
      vehicle: {
        year: String(vehicle?.year || ""),
        make: String(vehicle?.make || ""),
        model: String(vehicle?.model || ""),
        engine: String(vehicle?.engine || ""),
      },
      parts: cleanParts,
      summary: cleanSummary,
    });

    res.status(201).json({ ok: true, report: doc });
  } catch (e) {
    next(e);
  }
});

// LIST (supports ?email=... plus optional vehicle filters)
router.get("/", async (req, res, next) => {
  try {
    const q = {};
    if (req.query.email) q.userEmail = String(req.query.email).toLowerCase();
    if (req.query.year) q["vehicle.year"] = String(req.query.year);
    if (req.query.make) q["vehicle.make"] = String(req.query.make);
    if (req.query.model) q["vehicle.model"] = String(req.query.model);
    if (req.query.engine) q["vehicle.engine"] = String(req.query.engine);

    const items = await Report.find(q).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// GET ONE
router.get("/:id", async (req, res, next) => {
  try {
    const item = await Report.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

// DELETE one
router.delete("/:id", async (req, res, next) => {
  try {
    const r = await Report.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});



module.exports = router;
