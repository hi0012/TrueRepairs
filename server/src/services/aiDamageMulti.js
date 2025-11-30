require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const OpenAI = require("openai");
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

function bufferToDataUrl(buffer, mimetype) {
  const base64 = buffer.toString("base64");
  const type = mimetype && mimetype.startsWith("image/") ? mimetype : "image/jpeg";
  return `data:${type};base64,${base64}`;
}

function mergeVehicleGuesses(images) {
  const guesses = images.map(i => i.vehicleGuess).filter(Boolean);

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
        map.set(key, {part: dmg.part, operation: operation, worstSeverity: severity, maxConfidence: confidence, sources: [idx]});
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
    text: `
    YOU ARE AN AUTO BODY DAMAGE ESTIMATOR.

    Your job is to evaluate ONLY exterior bolt-on body parts, LEFT and RIGHT sides treated independently, but ONLY when visible.

    ====================================================
    VISIBLE-SIDE RULE (MANDATORY)
    ====================================================
    You MUST evaluate a side ONLY if that side is physically visible in the image.

    • If LEFT side is visible → evaluate LEFT parts only.
    • If RIGHT side is visible → evaluate RIGHT parts only.
    • If BOTH sides are visible → evaluate both sides.
    • If a side is NOT visible → DO NOT report any part from that side.

    ABSOLUTELY FORBIDDEN:
    • Inferring unseen parts.
    • Guessing the condition of the opposite side.
    • Reporting damage for parts not shown in the image.

    This rule OVERRIDES all other rules.

    ====================================================
    ALLOWED EXTERIOR PARTS (ONLY THESE)
    ====================================================
    You may ONLY report damage to these exterior bolt-on components:

    • Headlamp (left / right)
    • Taillamp (left / right)
    • Front bumper cover
    • Rear bumper cover
    • Hood
    • Trunk lid
    • Front fender (driver/left)
    • Front fender (passenger/right)
    • Doors (left/right, front/rear)
    • Mirrors (left / right)
    • Quarter panels (left / right)
    • Grille

    DO NOT report:
    radiator support, tie bar, crash bar, condenser, reinforcement, frame rails, brackets, inner metal, fans, absorbers, apron, or any internal/structural parts.

    ====================================================
    HEADLAMP & TAILLAMP RULES
    ====================================================
    A lamp is DAMAGED only if:
    • lens is cracked, shattered, broken, or punctured, OR
    • lamp housing is missing or displaced, OR
    • lamp is completely missing.

    A lamp is INTACT if:
    • the lens shape is visible,
    • no cracks are present,
    • the lamp is mounted in a normal position.

    ====================================================
    TAILLAMP FALSE-POSITIVE PREVENTION RULE
    ====================================================
    Do NOT mark a taillamp as damaged based on:
    • reflections,
    • glare,
    • sun hotspots,
    • trunk deformation nearby,
    • bumper deformation,
    • shadows,
    • crease reflections.

    Only report taillamp damage if the lamp itself is visibly broken, missing, or displaced.

    ====================================================
    FENDER ACCURACY RULE
    ====================================================
    Evaluate ONLY the OUTER FENDER SKIN.

    Do NOT confuse the following with fender damage:
    • exposed inner frame metal,
    • radiator support,
    • headlamp brackets,
    • crash bar components,
    • plastic inner liners.

    Fender damage requires:
    • creases,
    • bends,
    • distortion,
    • crushing,
    • tearing,
    • missing outer skin.

    ====================================================
    BUMPER RULE
    ====================================================
    A bumper cover is damaged only when:
    • cracked,
    • torn,
    • crushed,
    • missing.

    ====================================================
    HOOD & TRUNK RULE
    ====================================================
    Report hood or trunk damage when:
    • bent,
    • creased,
    • kinked,
    • misaligned,
    • shape is distorted.

    ====================================================
    MISSING PART RULE
    ====================================================
    If a visible exterior part is missing:
    • operation: "replace"
    • severity: "major"

    ====================================================
    REPORT FIELDS FOR EACH DAMAGE
    ====================================================
    For every damaged part, return:
    • part
    • operation ("replace" or "refinish")
    • severity ("minor", "moderate", "major")
    • confidence (0.0-1.0)
    • notes (short explanation)

    ====================================================
    STRICT JSON OUTPUT FORMAT
    ====================================================

    Return ONLY valid JSON in EXACTLY this structure:

    {
      "images": [
        {
          "index": number,
          "view": string,
          "vehicleGuess": {
            "make": string,
            "model": string,
            "yearRange": string,
            "confidence": number
          },
          "damages": [
            {
              "part": string,
              "operation": "replace" | "refinish",
              "severity": "minor" | "moderate" | "major",
              "confidence": number,
              "notes": string
            }
          ]
        }
      ]
    }

    NO commentary outside JSON. NO explanations. JSON ONLY.
    `.trim()
  });

  imageFiles.forEach((file, idx) => {
    const dataUrl = bufferToDataUrl(file.buffer, file.mimetype);
    contentParts.push({type: "text", text: `Image index: ${idx}.`});
    contentParts.push({type: "image_url", image_url: { url: dataUrl }});
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{role: "system", content: "You are a careful assistant that only returns valid JSON and never includes extra commentary."},{role: "user", content: contentParts}]
  });

  let parsed;
  try {
    parsed = JSON.parse(completion.choices[0].message.content || "{}");
  } catch (e) {
    throw new Error("AI response was not valid JSON");
  }

  const images = Array.isArray(parsed.images) ? parsed.images : [];
  const normalizedImages = images.map(img => ({index: typeof img.index === "number" ? img.index : 0, view: img.view || "unknown", vehicleGuess: img.vehicleGuess || null, damages: Array.isArray(img.damages) ? img.damages : []}));
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

// Histham Issa {70%}
// Robert Simovski {30%}