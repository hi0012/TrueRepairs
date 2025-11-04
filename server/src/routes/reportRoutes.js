const express = require("express");
const fs = require("fs");
const path = require("path");
const Report = require("../../models/Report");

const router = express.Router();

/* HEALTH CHECK */
router.get("/health", (_req, res) => res.json({ ok: true, service: "reports" }));

router.get("/local", async (req, res, next) => {
  try {
    const year   = String(req.query.year || "").trim();
    const model  = String(req.query.model || "").trim();
    const engine = String(req.query.engine || "").trim();

    const categoryQ = String(req.query.category || "").trim();
    const parttypeQ = String(req.query.parttype || "").trim();

    if (!year || !model || !engine) {
      return res.status(400).json({ error: "Missing year, model, or engine" });
    }

    const filePath = path.resolve(__dirname, "../data/ToyotaParts.json");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "ToyotaParts.json not found", filePath });
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const norm = (s) => String(s).toLowerCase().replace(/\s+/g, "").replace(/[\/\-_.]/g, "");
    const splitList = (s) => String(s || "").split(",").map(t => t.trim()).filter(Boolean);

    const catFilter = new Set(splitList(categoryQ).map(norm));
    const ptList    = splitList(parttypeQ).map(norm);
    const ptFilter  = new Set(ptList);

    const hasCatFilter = catFilter.size > 0;
    const hasPtFilter  = ptFilter.size > 0;

    const yearData = data[year];
    if (!yearData) return res.status(404).json({ error: `No data for year ${year}` });

    const modelKey = Object.keys(yearData).find((k) => norm(k) === norm(model));
    if (!modelKey) return res.status(404).json({ error: `Model ${model} not found for ${year}` });

    const modelData = yearData[modelKey];
    const engineKey =
      Object.keys(modelData).find((k) => norm(k) === norm(engine)) ||
      Object.keys(modelData).find((k) => norm(k).includes(norm(engine)) || norm(engine).includes(norm(k)));
    if (!engineKey) {
      return res.status(404).json({ error: `Engine ${engine} not found for ${year} ${modelKey}` });
    }

    const engineData = modelData[engineKey];

    const collectedParts = [];
    let totalLow = 0, totalHigh = 0, totalAvg = 0;

    for (const [category, parttypes] of Object.entries(engineData)) {
      const categoryNorm = norm(category);

      // If a strict category filter is present, require a match.
      if (hasCatFilter && !catFilter.has(categoryNorm)) continue;

      for (const [parttype, items] of Object.entries(parttypes || {})) {
        const ptNorm = norm(parttype);

        let ptMatch = !hasPtFilter
          || ptFilter.has(ptNorm)
          || ptList.some((req) => ptNorm.includes(req) || req.includes(ptNorm))
          || ptFilter.has(categoryNorm);

        if (!ptMatch) continue;

        const valid = (items || []).filter((i) => Number.isFinite(i?.price) && i.price > 0);
        if (!valid.length) continue;

        const prices = valid.map((i) => i.price);
        const low  = Math.min(...prices);
        const high = Math.max(...prices);
        const avg  = prices.reduce((a, b) => a + b, 0) / prices.length;

        totalLow  += low;
        totalHigh += high;
        totalAvg  += avg;

        collectedParts.push({
          name: `${category} → ${parttype}`,
          category,
          parttype,
          low,
          high,
          avg: +avg.toFixed(2),
        });
      }
    }

    return res.json({
      ok: true,
      vehicle: { year, make: "TOYOTA", model: modelKey, engine: engineKey },
      parts: collectedParts,
      summary: {
        totalLow:  +totalLow.toFixed(2),
        totalHigh: +totalHigh.toFixed(2),
        totalAvg:  +totalAvg.toFixed(2),
      },
    });
  } catch (err) {
    console.error("Local Toyota report error:", err);
    next(err);
  }
});


/*CREATE */
router.post("/", async (req, res, next) => {
  try {
    const { title, userEmail, vehicle, parts, summary } = req.body;

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
  } catch (err) {
    console.error("Create report error:", err);
    next(err);
  }
});

/*LIST*/
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
  } catch (err) {
    console.error("List reports error:", err);
    next(err);
  }
});

/*GET ONE*/
router.get("/:id", async (req, res, next) => {
  try {
    const item = await Report.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (err) {
    console.error("Get single report error:", err);
    next(err);
  }
});

/*DELETE ONE*/
router.delete("/:id", async (req, res, next) => {
  try {
    const r = await Report.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete report error:", err);
    next(err);
  }
});

module.exports = router;
