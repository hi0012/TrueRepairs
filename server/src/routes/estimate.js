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

    // Load Google Cloud credentials from /server/keys/gcv.json
    visionClientInstance = new vision.ImageAnnotatorClient({
      keyFilename: path.join(__dirname, "../../keys/gcv.json"),
    });
  }
  return visionClientInstance;
}

function pickPartFromVision(labels = [], objects = []) {
  // Weighted text
  const weightedText = [
    ...labels.map(l => l.description.toLowerCase()),
    ...objects.flatMap(o => Array(3).fill(o.name.toLowerCase()))
  ].join(" | ");

  // Synonym groups
  const synonyms = {
    trunk: ["boot", "tailgate", "rear hatch", "liftgate"],
    bumper: ["fascia", "valance", "bumper cover"],
    hood: ["bonnet"],
    grille: ["front fascia", "radiator grille"],
    fender: ["quarter panel", "wing"],
    damage: ["dent", "crack", "impact", "collision"]
  };

  function gotAny(baseWord) {
    const group = [baseWord, ...(synonyms[baseWord] || [])];
    return group.some(word => weightedText.includes(word));
  }

  const got = (n) => weightedText.includes(n);

  // Region detection using object bounding boxes
  let region = "middle";
  try {
    const allY = objects.flatMap(o => o.boundingPoly?.normalizedVertices?.map(v => v.y) || []);
    if (allY.length) {
      const avgY = allY.reduce((a, b) => a + b, 0) / allY.length;
      if (avgY < 0.33) region = "upper";
      else if (avgY > 0.66) region = "lower";
    }
  } catch (_) {}

  // Context detection
  const isFront = got("front") || gotAny("grille") || gotAny("hood") || got("headlight") || got("radiator");
  const isRear = got("rear") || gotAny("trunk") || got("taillight") || got("tail") || got("license") || got("vehicle registration") || got("brake light") || got("plate");
  const isLeft = got("left") || got("driver");
  const isRight = got("right") || got("passenger");

  // Rear impacts
  const rearHints = ["trunk", "license", "plate", "registration", "brake light", "tail light", "taillight"];
  const hasRearHints = rearHints.some(h => weightedText.includes(h));

  if (gotAny("trunk") || hasRearHints) {
    // if any bumper term shows up + rear hints => Rear bumper
    if (gotAny("bumper")) return { part: "Rear Bumper Cover", defaultOp: "replace" };
    // if no bumper but trunk/plate/brake light visible => Trunk lid
    return { part: "Trunk Lid", defaultOp: "replace" };
  }

  // Front impacts
  if (got("front bumper") || (gotAny("bumper") && isFront)) return { part: "Front Bumper Cover", defaultOp: "replace" };
  if (got("headlight") || got("headlamp")) return { part: "Headlamp (Left)", defaultOp: "replace" };
  if (gotAny("hood")) return { part: "Hood", defaultOp: "replace" };
  if (gotAny("grille")) return { part: "Grille", defaultOp: "replace" };

  // Side impacts
  if (got("door")) {
    if (isRear && isLeft) return { part: "Rear Door Shell (Left)", defaultOp: "replace" };
    if (isRear && isRight) return { part: "Rear Door Shell (Right)", defaultOp: "replace" };
    if (isFront && isLeft) return { part: "Front Door Shell (Left)", defaultOp: "replace" };
    if (isFront && isRight) return { part: "Front Door Shell (Right)", defaultOp: "replace" };
    return { part: "Door Shell", defaultOp: "replace" };
  }

  if (gotAny("fender")) {
    if (isFront && isRight) return { part: "Fender (Front Right)", defaultOp: "replace" };
    if (isFront && isLeft) return { part: "Fender (Front Left)", defaultOp: "replace" };
    if (isRear) return { part: "Quarter Panel (Rear Left)", defaultOp: "replace" };
    return { part: "Fender", defaultOp: "replace" };
  }

  // Cosmetic / damage-only
  if (gotAny("damage") || got("scratch")) {
    if (isRear) return { part: "Rear Bumper Cover", defaultOp: "refinish" };
    if (isFront) return { part: "Front Bumper Cover", defaultOp: "refinish" };
    if (region === "lower") return { part: "Bumper Cover", defaultOp: "refinish" };
    return { part: "Body Panel", defaultOp: "refinish" };
  }

  // Use bounding region only as a tiebreaker
  if (!isFront && !isRear) {
    if (region === "lower") return { part: "Rear Bumper Cover", defaultOp: "replace" };
    if (region === "upper") return { part: "Trunk Lid", defaultOp: "replace" };
  }

  // FINAL fallback for generic car photos
  const genericLabels = ["car", "vehicle", "sedan", "automobile", "bumper", "transport", "motor vehicle"];
  const hasOnlyGeneric = labels.length > 0 &&
    labels.every(l => genericLabels.some(g => l.description.toLowerCase().includes(g)));

  if (hasOnlyGeneric) {
    const likelyRear = got("license") || got("tail") || got("trunk") || got("rear") || got("red light");
    const likelyFront = got("headlight") || got("grille") || got("front") || got("hood");

    if (likelyRear) return { part: "Rear Bumper Cover", defaultOp: "replace" };
    if (likelyFront) return { part: "Front Bumper Cover", defaultOp: "replace" };

    // Default fallback
    return { part: "Rear Bumper Cover", defaultOp: "replace" };
  }

  // Default fallback
  if (isRear) return { part: "Rear Bumper Cover", defaultOp: "replace" };
  if (isFront) return { part: "Front Bumper Cover", defaultOp: "replace" };

  // Nothing matched confidently
  return null;
}


function safeSeg(s) { return String(s || "unknown").replace(/[^a-z0-9._-]/gi, "_"); }

router.get("/estimate/ping", (req, res) => res.json({ ok: true }));

router.post("/estimate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "image file is required" });
    const email = (req.body.email || "guest@truerepairs.ai").trim().toLowerCase();

    const client = visionClient();
    const [labelResp] = await client.labelDetection({ image: { content: req.file.buffer } });
    let objects = [];
    try {
      const [objectResp] = await client.objectLocalization({ image: { content: req.file.buffer } });
      objects = (objectResp.localizedObjectAnnotations || []).map(o => ({ name: o.name, score: o.score }));
    } catch (_) {}
    const labels = (labelResp.labelAnnotations ||  []) .filter(l => l.score >= 0.6) .map(l => ({ description: l.description, score: l.score }));
    console.log("VISION LABELS:", labels.map(l => l.description));
    console.log("VISION OBJECTS:", objects.map(o => o.name));
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
    const email = (req.query.email || "guest@truerepairs.ai").trim().toLowerCase();
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
