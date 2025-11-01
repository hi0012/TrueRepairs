const fs = require("fs");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({default: f}) => f(...args));
const FormData = require("form-data");

(async () => {
  const imgPath = process.argv[2];
  if (!imgPath || !fs.existsSync(imgPath)) {
    console.error("Image path missing or not found");
    process.exit(1);
  }
  const fd = new FormData();
  fd.append("file", fs.createReadStream(path.resolve(imgPath)));
  fd.append("laborRate", "110");
  fd.append("email", "guest@truerepairs.ai");
  const r = await fetch("http://localhost:5000/api/estimate", { method: "POST", body: fd });
  const text = await r.text();
  console.log("STATUS:", r.status);
  console.log(text);
})();
