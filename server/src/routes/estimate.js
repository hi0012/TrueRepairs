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

// Load Toyota Parts Pricing
let TOYOTA_PARTS = {};
try {
  TOYOTA_PARTS = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../data/ToyotaParts.json"),
      "utf-8"
    )
  );
} catch (err) {
  console.error("Could not load ToyotaParts.json:", err);
}

function safeSeg(s) {
  return String(s || "unknown").replace(/[^a-z0-9._-]/gi, "_");
}

router.get("/estimate/ping", (req, res) => res.json({ ok: true }));

router.post("/estimate", upload.array("files", 6), async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: "At least one image file is required" });
    }

    // User + Vehicle Fields
    const email = (req.body.email || "guest@truerepairs.ai").trim().toLowerCase();
    const laborRate = Number(req.body.laborRate || 110);

    const selectedYear = req.body.year?.trim();
    const selectedModel = req.body.model?.trim()?.toUpperCase();
    const selectedTrim = req.body.trim?.trim()?.toUpperCase() || "";
    const selectedEngine = req.body.engine?.trim();

    console.log("DEBUG Selected Vehicle:", {
      selectedYear,
      selectedModel,
      selectedTrim,
      selectedEngine
    });

    const aiResult = await analyzeCarImages(req.files);
    const damages = aiResult.mergedDamages || [];
    const normalizePart = (name) => {
      const lower = name.toLowerCase();

      if (lower.includes("fender")) return "Fender";
      if (lower.includes("bumper")) return "Bumper Cover";

      if (lower.includes("headlamp") || lower.includes("headlight"))
        return "Headlamp Assembly";

      if (lower.includes("taillamp") || lower.includes("tail lamp") || lower.includes("tail light"))
        return "Tail Lamp Assembly";

      if (lower.includes("hood")) return "Hood";
      if (lower.includes("trunk")) return "Trunk Lid";
      if (lower.includes("grille")) return "Grille";

      if (lower.includes("mirror")) return "Outside Mirror & Glass Assembly";
      if (lower.includes("door")) return "Outside Door Handle";
      if (lower.includes("quarter")) return "Quarter Panel";

      return name;
    };

    function findPartList(normalizedKey) {
      if (!selectedYear || !selectedModel || !selectedEngine) return [];

      const yearBlock = TOYOTA_PARTS[selectedYear];
      if (!yearBlock) return [];

      const modelBlock = yearBlock[selectedModel];
      if (!modelBlock) return [];

      const engineBlock = modelBlock[selectedEngine];
      if (!engineBlock) return [];

      const bodyLamp = engineBlock["Body & Lamp Assembly"];
      if (!bodyLamp) return [];

      const matched = Object.keys(bodyLamp).find(
        (k) => k.toLowerCase() === normalizedKey.toLowerCase()
      );

      return matched ? bodyLamp[matched] : [];
    }
    function getPriceObj(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return { price: 125, info_url: null };
      }

      let valid = items.filter(p => p.price && p.price > 0);

      if (valid.length === 0) {
        return { price: 120, info_url: null };
      }

      valid.sort((a, b) => a.price - b.price);

      return {
        price: valid[0].price,
        info_url: valid[0].info_url || null
      };
    }
    const paintableParts = [
      "Fender",
      "Bumper Cover",
      "Quarter Panel",
      "Hood",
      "Trunk Lid",
      "Door",
      "Grille",
      "Outside Door Handle",
      "Mirror Housing"
    ];

    const PAINT_COST = 80;

    function getPaintCost(normalizedKey) {
      if (paintableParts.includes(normalizedKey)) return PAINT_COST;
      return 0;
    }
    let totalParts = 0;
    let totalPaint = 0;
    let totalHours = 0;
    const misc = 50;

    const detailedParts = damages.map((dmg) => {
      const normalizedKey = normalizePart(dmg.part);
      const list = findPartList(normalizedKey);
      const { price, info_url } = getPriceObj(list);

      const paintCost = getPaintCost(normalizedKey);

      totalParts += price;
      totalPaint += paintCost;
      totalHours += 1;

      return {
        name: dmg.part,
        normalized: normalizedKey,
        operation: dmg.operation,
        severity: dmg.worstSeverity || "unknown",
        cost: Number(price.toFixed(2)),
        paintCost,
        info_url
      };
    });

    const total = Math.round(
      totalParts +
      totalPaint +
      totalHours * laborRate +
      misc
    );
    const folder = `truerepairs/${safeSeg(email)}`;
    const uploadedImages = [];

    async function uploadOne(file) {
      return new Promise((resolve, reject) => {
        const up = cloudinary.uploader.upload_stream(
          { folder, resource_type: "image", overwrite: false },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        streamifier.createReadStream(file.buffer).pipe(up);
      });
    }

    for (let i = 0; i < req.files.length; i++) {
      const original = await uploadOne(req.files[i]);

      const thumb = cloudinary.url(original.public_id, {
        type: "upload",
        transformation: [{ width: 480, height: 480, crop: "fill", gravity: "auto" }],
        secure: true
      });

      uploadedImages.push({
        imageUrl: original.secure_url,
        thumbUrl: thumb,
        cloudinaryPublicId: original.public_id,
        index: i,
      });
    }
    const breakdown = {
      parts: totalParts,
      laborHours: totalHours,
      laborRate,
      paintMaterials: totalPaint,
      misc
    };

    const doc = await Estimate.create({
      userEmail: email,
      imageUrl: uploadedImages[0]?.imageUrl,
      thumbUrl: uploadedImages[0]?.thumbUrl,
      cloudinaryPublicId: uploadedImages[0]?.cloudinaryPublicId,
      imageType: req.files[0].mimetype,
      breakdown,
      totalEstimated: total,
      images: uploadedImages,
      vehicle: { year: selectedYear, model: selectedModel, trim: selectedTrim, engine: selectedEngine },
      damages,
      parts: detailedParts,
      aiRaw: aiResult.raw
    });

    res.json({
      detected: damages.length > 0,
      id: doc._id,
      breakdown,
      totalEstimated: total,
      vehicle: doc.vehicle,
      damages,
      parts: detailedParts,
      images: uploadedImages
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
          resource_type: "image",
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
