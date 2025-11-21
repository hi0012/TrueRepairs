require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function bufferToDataUrl(buffer, mimetype) {
  const base64 = buffer.toString("base64");
  const type = mimetype && mimetype.startsWith("image/") ? mimetype : "image/jpeg";
  return `data:${type};base64,${base64}`;
}

function mergeVehicleGuesses(images) {
  const guesses = images
    .map(i => i.vehicleGuess)
    .filter(Boolean);

  if (!guesses.length) return null;

  let best = guesses[0];
  for (let i = 1; i < guesses.length; i++) {
    if ((guesses[i].confidence || 0) > (best.confidence || 0)) {
      best = guesses[i];
    }
  }
  return best;
}

function mergeDamages(images) {
  const map = new Map();

  images.forEach((img, idx) => {
    (img.damages || []).forEach(dmg => {
      if (!dmg || !dmg.part) return;
      const key = String(dmg.part).toLowerCase();

      const severity = dmg.severity || "minor";
      const operation = dmg.operation === "refinish" ? "refinish" : "replace";
      const confidence = typeof dmg.confidence === "number" ? dmg.confidence : 0;

      if (!map.has(key)) {
        map.set(key, {
          part: dmg.part,
          operation: operation,
          worstSeverity: severity,
          maxConfidence: confidence,
          sources: [idx]
        });
      } else {
        const existing = map.get(key);
        existing.sources.push(idx);
        if (confidence > existing.maxConfidence) {
          existing.maxConfidence = confidence;
        }
        const order = ["minor", "moderate", "major"];
        if (order.indexOf(severity) > order.indexOf(existing.worstSeverity)) {
          existing.worstSeverity = severity;
        }
        if (operation === "replace") {
          existing.operation = "replace";
        }
      }
    });
  });

  return Array.from(map.values());
}

async function analyzeCarImages(imageFiles) {
  if (!imageFiles || !imageFiles.length) {
    throw new Error("at least one image is required");
  }

  const contentParts = [];
  contentParts.push({
    type: "text",
    text:
      "You are an auto body repair estimator. " +
      "For each image, determine: (1) which exterior view it shows (front, rear, left, right, or unknown), " +
      "(2) your best guess at the vehicle make, model, and approximate year range, and " +
      "(3) a list of clearly visible damaged exterior body parts. " +
      "For each damage, include: part name (for example: 'Front Bumper Cover', 'Rear Bumper Cover', 'Fender (Front Left)', 'Headlamp (Left)'), " +
      "operation ('replace' or 'refinish'), severity ('minor', 'moderate', or 'major'), and a confidence from 0 to 1. " +
      "If you are not sure about make, model, or year, set them to 'unknown' and use a low confidence. " +
      "Do not invent details. Do not mention the car's brand names in free text, only inside the structured fields. " +
      "Reply ONLY as JSON with this shape: " +
      "{ \"images\": [ { \"index\": number, \"view\": string, \"vehicleGuess\": { \"make\": string, \"model\": string, \"yearRange\": string, \"confidence\": number }, \"damages\": [ { \"part\": string, \"operation\": string, \"severity\": string, \"confidence\": number, \"notes\": string } ] } ] }."
  });

  imageFiles.forEach((file, idx) => {
    const dataUrl = bufferToDataUrl(file.buffer, file.mimetype);
    contentParts.push({
      type: "text",
      text: `Image index: ${idx}.`
    });
    contentParts.push({
      type: "image_url",
      image_url: { url: dataUrl }
    });
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a careful assistant that only returns valid JSON and never includes extra commentary."
      },
      {
        role: "user",
        content: contentParts
      }
    ]
  });

  let parsed;
  try {
    parsed = JSON.parse(completion.choices[0].message.content || "{}");
  } catch (e) {
    throw new Error("AI response was not valid JSON");
  }

  const images = Array.isArray(parsed.images) ? parsed.images : [];

  const normalizedImages = images.map(img => ({
    index: typeof img.index === "number" ? img.index : 0,
    view: img.view || "unknown",
    vehicleGuess: img.vehicleGuess || null,
    damages: Array.isArray(img.damages) ? img.damages : []
  }));

  const vehicle = mergeVehicleGuesses(normalizedImages);
  const mergedDamages = mergeDamages(normalizedImages);

  return {
    vehicle: vehicle,
    images: normalizedImages,
    mergedDamages: mergedDamages,
    raw: parsed
  };
}

module.exports = {
  analyzeCarImages
};
