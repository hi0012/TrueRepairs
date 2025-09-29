// visionSmokeTest.js
const fs = require("fs");
const vision = require("@google-cloud/vision");

async function run() {
  const client = new vision.ImageAnnotatorClient(); // uses GOOGLE_APPLICATION_CREDENTIALS
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error("Usage: node visionSmokeTest.js <path-to-image>");
    process.exit(1);
  }

  const [result] = await client.labelDetection(imagePath);
  const labels = (result.labelAnnotations || []).map(l => ({
    description: l.description,
    score: l.score
  }));

  const out = {
    ranAt: new Date().toISOString(),
    imageTested: imagePath,
    labels
  };

  fs.writeFileSync("vision_smoketest.json", JSON.stringify(out, null, 2));
  console.log("Wrote vision_smoketest.json");
}

run().catch(err => {
  console.error("Vision smoke test failed:", err.message);
  process.exit(1);
});