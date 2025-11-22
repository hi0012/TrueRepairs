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

const COST = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/cost_table.json"), "utf-8"));

let visionClientInstance = null;
function visionClient() {
  if (!visionClientInstance) {
    const vision = require("@google-cloud/vision");
    const path = require("path");
    visionClientInstance = new vision.ImageAnnotatorClient({
      keyFilename: path.join(__dirname, "../../keys/gcv.json"),
    });
  }
  return visionClientInstance;
}

function pickPartFromVision(labels = [], objects = []) {
  const weightedText = [
    ...labels.map((l) => l.description.toLowerCase()),
    ...objects.flatMap((o) => Array(3).fill(o.name?.toLowerCase() || ""))
  ].join(" | ");

  const got = (t) => weightedText.includes(t);

  // ====== REGION DETECTION FROM BOUNDING BOX ======
  let region = "middle";
  try {
    const allY = objects.flatMap(o =>
      o.boundingPoly?.normalizedVertices?.map(v => v.y) || []
    );
    if (allY.length) {
      const avg = allY.reduce((a, b) => a + b, 0) / allY.length;
      if (avg < 0.33) region = "upper";
      else if (avg > 0.66) region = "lower";
    }
  } catch {}

  // ====== STRONG FRONT/REAR SIGNALS ONLY ======
  let isFront = false;
  let isRear = false;

  if (got("hood") || got("grille") || got("radiator")) isFront = true;
  if (got("trunk") || got("tailgate") || got("license") || got("plate")) isRear = true;

  // Region helps decide direction when mixed labels
  if (!isFront && !isRear) {
    if (region === "upper") {
      if (got("hood")) isFront = true;
      if (got("trunk")) isRear = true;
    }
    if (region === "lower") {
      // lower = bumper zone; decide based on strongest labels
      if (got("grille") || got("hood") || got("radiator")) isFront = true;
      if (got("trunk") || got("license") || got("plate")) isRear = true;
    }
  }

  // If still undecided → fallback to label hints
  if (!isFront && !isRear) {
    if (got("hood") || got("grille")) isFront = true;
    if (got("trunk") || got("license")) isRear = true;
  }

  // ====== BUMPER DECISION ======
  if (got("bumper") || got("bumper cover")) {
    if (isFront) return { part: "Front Bumper Cover", defaultOp: "replace" };
    if (isRear) return { part: "Rear Bumper Cover", defaultOp: "replace" };

    // Region fallback
    if (region === "lower") return { part: "Front Bumper Cover", defaultOp: "replace" };
  }

  // ====== HOOD/TRUNK ======
  if (got("hood")) return { part: "Hood", defaultOp: "replace" };
  if (got("trunk") || got("tailgate")) return { part: "Trunk Lid", defaultOp: "replace" };

  // ====== HEADLIGHT / TAIL ======
  if (got("headlight") || got("headlamp")) return { part: "Headlamp (Left)", defaultOp: "replace" };
  if (got("taillight") || got("tail light")) return { part: "Tail Light", defaultOp: "replace" };

  // ====== FENDERS ======
  if (got("fender")) {
    if (isFront) return { part: "Fender (Front Left)", defaultOp: "replace" };
    if (isRear) return { part: "Quarter Panel (Rear Left)", defaultOp: "replace" };
    return { part: "Fender", defaultOp: "replace" };
  }

  // ====== BODY DAMAGE ======
  if (got("dent") || got("impact") || got("damage")) {
    if (isFront) return { part: "Front Bumper Cover", defaultOp: "refinish" };
    if (isRear) return { part: "Rear Bumper Cover", defaultOp: "refinish" };
    return { part: "Body Panel", defaultOp: "refinish" };
  }

  // ====== FINAL FALLBACK ======
  if (isFront) return { part: "Front Bumper Cover", defaultOp: "replace" };
  if (isRear) return { part: "Rear Bumper Cover", defaultOp: "replace" };

  return { part: "Front Bumper Cover", defaultOp: "replace" };
}

function safeSeg(s) {
  return String(s || "unknown").replace(/[^a-z0-9._-]/gi, "_");
}

router.get("/estimate/ping", (req, res) => res.json({ ok: true }));

router.post("/estimate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "image file is required" });

    const email = (req.body.email || "guest@truerepairs.ai").trim().toLowerCase();
    const client = visionClient();

    const [labelResp] = await client.labelDetection({ image: { content: req.file.buffer } });
    const [objectResp] = await client.objectLocalization({ image: { content: req.file.buffer } });

    let objects = objectResp?.localizedObjectAnnotations || [];
    const labels = (labelResp.labelAnnotations || [])
      .filter(l => l.score >= 0.60)
      .map(l => ({ description: l.description, score: l.score }));

    console.log("VISION LABELS:", labels.map(l => l.description));
    console.log("VISION OBJECTS:", objects.map(o => o.name));

    const guess = pickPartFromVision(labels, objects);

    const chosenPart = guess?.part || null;
    const operation = guess?.defaultOp || "replace";

    if (!chosenPart || !COST[chosenPart] || !COST[chosenPart][operation]) {
      return res.json({ detected: false, message: "Could not confidently determine a repairable part." });
    }

    const laborRate = Number(req.body.laborRate || process.env.DEFAULT_LABOR_RATE || 110);
    const row = COST[chosenPart][operation];
    const parts = row.parts_avg ?? 0;
    const hours = row.labor_hours ?? 0;
    const paint = row.paint_materials ?? 0;
    const misc = 50;
    const total = Math.round(parts + hours * laborRate + paint + misc);

    const folder = `truerepairs/${safeSeg(email)}`;
    const uploadStream = () =>
      new Promise((resolve, reject) => {
        const up = cloudinary.uploader.upload_stream(
          { folder, resource_type: "image", overwrite: false },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        streamifier.createReadStream(req.file.buffer).pipe(up);
      });
    const original = await uploadStream();

    const thumb = cloudinary.url(original.public_id, {
      type: "upload",
      transformation: [{ width: 480, height: 480, crop: "fill", gravity: "auto" }],
      secure: true
    });

    const doc = await Estimate.create({
      userEmail: email,
      imageUrl: original.secure_url,
      thumbUrl: thumb,
      cloudinaryPublicId: original.public_id,
      imageType: req.file.mimetype || "image/jpeg",
      visionLabels: labels,
      visionObjects: objects,
      selection: { part: chosenPart, operation },
      breakdown: { parts, laborHours: hours, laborRate, paintMaterials: paint, misc },
      totalEstimated: total
    });

    res.json({
      detected: true,
      id: doc._id,
      imageUrl: doc.imageUrl,
      thumbUrl: doc.thumbUrl,
      selection: doc.selection,
      breakdown: doc.breakdown,
      totalEstimated: doc.totalEstimated
    });
  } catch (e) {
    res.status(500).json({ message: e.message || "estimation failed" });
  }
});

router.get("/estimates", async (req, res) => {
  try {
    const email = (req.query.email || "guest@truerepairs.ai").trim().toLowerCase();
    const items = await Estimate.find({ userEmail: email }).sort({ createdAt: -1 }).lean();
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
        await cloudinary.uploader.destroy(doc.cloudinaryPublicId, { resource_type: "image" });
      } catch {}
    }
    await doc.deleteOne();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "delete failed" });
  }
});

module.exports = router;
