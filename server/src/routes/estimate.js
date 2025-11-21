require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const fs = require("fs");
const path = require("path");
const cloudinary = require("../lib/cloudinary");
const streamifier = require("streamifier");
const Estimate = require("../../models/estimate");
const { analyzeCarImages } = require("../services/aiDamageMulti");

const COST = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/cost_table.json"), "utf-8")
);

function safeSeg(s) {
  return String(s || "unknown").replace(/[^a-z0-9._-]/gi, "_");
}

router.get("/estimate/ping", (req, res) => res.json({ ok: true }));

router.post("/estimate", upload.array("files", 6), async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: "at least one image file is required" });
    }

    const email = (req.body.email || "guest@truerepairs.ai").trim().toLowerCase();
    const vin = (req.body.vin || "").trim().toUpperCase();
    const laborRate = Number(
      req.body.laborRate || process.env.DEFAULT_LABOR_RATE || 110
    );

    const aiResult = await analyzeCarImages(req.files);

    const vehicle = aiResult.vehicle || null;

    const damages = aiResult.mergedDamages || [];

    let totalParts = 0;
    let totalHours = 0;
    let totalPaint = 0;
    const misc = 50;

    damages.forEach(dmg => {
      if (!dmg || !dmg.part) return;
      const partName = dmg.part;
      const op = dmg.operation === "refinish" ? "refinish" : "replace";

      const row = COST[partName] && COST[partName][op];
      if (!row) return;

      const parts = row.parts_avg || 0;
      const hours = row.labor_hours || 0;
      const paint = row.paint_materials || 0;

      totalParts += parts;
      totalHours += hours;
      totalPaint += paint;
    });

    const total = Math.round(totalParts + totalHours * laborRate + totalPaint + misc);

    const folder = `truerepairs/${safeSeg(email)}`;
    const uploadedImages = [];

    async function uploadOne(file) {
      return new Promise((resolve, reject) => {
        const up = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "image",
            overwrite: false
          },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        streamifier.createReadStream(file.buffer).pipe(up);
      });
    }

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const original = await uploadOne(file);

      const thumb = cloudinary.url(original.public_id, {
        type: "upload",
        transformation: [
          { width: 480, height: 480, crop: "fill", gravity: "auto" }
        ],
        secure: true
      });

      const matchingImageInfo =
        aiResult.images.find(img => img.index === i) || null;

      uploadedImages.push({
        imageUrl: original.secure_url,
        thumbUrl: thumb,
        cloudinaryPublicId: original.public_id,
        view: matchingImageInfo ? matchingImageInfo.view : "unknown"
      });
    }

    const mainImage = uploadedImages[0] || null;
    const mainDamage = damages[0] || null;

    const breakdown = {
      parts: totalParts,
      laborHours: totalHours,
      laborRate: laborRate,
      paintMaterials: totalPaint,
      misc: misc
    };

    const doc = await Estimate.create({
      userEmail: email,
      imageUrl: mainImage ? mainImage.imageUrl : undefined,
      thumbUrl: mainImage ? mainImage.thumbUrl : undefined,
      cloudinaryPublicId: mainImage ? mainImage.cloudinaryPublicId : undefined,
      imageType: req.files[0].mimetype || "image/jpeg",

      selection: mainDamage
        ? { part: mainDamage.part, operation: mainDamage.operation }
        : undefined,
      breakdown: breakdown,
      totalEstimated: total,

      images: uploadedImages,
      vehicle: vehicle
        ? {
            make: vehicle.make || null,
            model: vehicle.model || null,
            yearRange: vehicle.yearRange || null,
            confidence: vehicle.confidence || null
          }
        : undefined,
      damages: damages,
      aiRaw: aiResult.raw || null,
      vin: vin || null
    });

    res.json({
      detected: damages.length > 0,
      id: doc._id,
      imageUrl: doc.imageUrl,
      thumbUrl: doc.thumbUrl,
      selection: doc.selection,
      breakdown: doc.breakdown,
      totalEstimated: doc.totalEstimated,
      vehicle: doc.vehicle,
      damages: doc.damages,
      images: doc.images
    });
  } catch (e) {
    console.error("estimate error:", e);
    res.status(500).json({ message: e.message || "estimation failed" });
  }
});

router.get("/estimates", async (req, res) => {
  try {
    const email = (req.query.email || "guest@truerepairs.ai")
      .trim()
      .toLowerCase();
    const items = await Estimate.find({ userEmail: email })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items });
  } catch {
    res.status(500).json({ message: "list failed" });
  }
});

router.get("/estimates/:id", async (req, res) => {
  try {
    const doc = await Estimate.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "not found" });
    res.json(doc);
  } catch {
    res.status(500).json({ message: "read failed" });
  }
});

router.delete("/estimates/:id", async (req, res) => {
  try {
    const doc = await Estimate.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "not found" });
    if (doc.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(doc.cloudinaryPublicId, {
          resource_type: "image"
        });
      } catch {}
    }
    if (doc.images && doc.images.length) {
      for (const img of doc.images) {
        if (img.cloudinaryPublicId) {
          try {
            await cloudinary.uploader.destroy(img.cloudinaryPublicId, {
              resource_type: "image"
            });
          } catch {}
        }
      }
    }
    await doc.deleteOne();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "delete failed" });
  }
});

module.exports = router;
