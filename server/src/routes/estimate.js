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
    visionClientInstance = new vision.ImageAnnotatorClient();
  }
  return visionClientInstance;
}

function pickPartFromVision(labels = [], objects = []) {
  const text = [
    ...labels.map(l => l.description.toLowerCase()),
    ...objects.map(o => o.name.toLowerCase())
  ].join(" | ");
  const got = (n) => text.includes(n);
  if (got("front bumper") || (got("bumper") && got("front"))) return { part: "Front Bumper Cover", defaultOp: "replace" };
  if (got("rear bumper") || (got("bumper") && got("rear"))) return { part: "Rear Bumper Cover", defaultOp: "replace" };
  if (got("headlight") || got("headlamp")) return { part: "Headlamp (Left)", defaultOp: "replace" };
  if (got("fender")) return { part: "Fender (Front Left)", defaultOp: "replace" };
  if (got("scratch") && (got("bumper") || got("automotive bumper"))) return { part: "Front Bumper Cover", defaultOp: "refinish" };
  return null;
}

function safeSeg(s) { return String(s || "unknown").replace(/[^a-z0-9._-]/gi, "_"); }

router.get("/estimate/ping", (req, res) => res.json({ ok: true }));

router.post("/estimate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "image file is required" });
    const email = (req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "email is required" });

    const client = visionClient();
    const [labelResp] = await client.labelDetection({ image: { content: req.file.buffer } });
    let objects = [];
    try {
      const [objectResp] = await client.objectLocalization({ image: { content: req.file.buffer } });
      objects = (objectResp.localizedObjectAnnotations || []).map(o => ({ name: o.name, score: o.score }));
    } catch (_) {}
    const labels = (labelResp.labelAnnotations || []).map(l => ({ description: l.description, score: l.score }));
    const guess = pickPartFromVision(labels, objects);

    const uiPart = (req.body.part || "").trim();
    const uiOp = (req.body.op || "").trim().toLowerCase();
    const chosenPart = uiPart || guess?.part || null;
    const operation = (uiOp && (uiOp === "replace" || uiOp === "refinish")) ? uiOp : (guess?.defaultOp || "replace");
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
    const msg = e?.response?.data?.error?.message || e?.message || "estimation failed";
    res.status(500).json({ message: msg });
  }
});

router.get("/estimates", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "email is required" });
    const items = await Estimate.find({ userEmail: email }).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: "list failed" });
  }
});

router.get("/estimates/:id", async (req, res) => {
  try {
    const doc = await Estimate.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "not found" });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ message: "read failed" });
  }
});

router.delete("/estimates/:id", async (req, res) => {
  try {
    const doc = await Estimate.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "not found" });
    if (doc.cloudinaryPublicId) {
      try { await cloudinary.uploader.destroy(doc.cloudinaryPublicId, { resource_type: "image" }); } catch (_) {}
    }
    await doc.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "delete failed" });
  }
});

module.exports = router;
