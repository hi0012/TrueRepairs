const { spawn } = require("child_process");
const path = require("path");


//Spawns the Python scraper process and returns parsed JSON data.

async function scrapeRockAuto({ make, year, model, engine, category, subcategory }) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "rockautoscrape.py");

    // Pass as positional arguments (Python expects sys.argv[1:])
    const py = spawn("python", [
      scriptPath,
      make,
      year,
      model,
      engine,
      category,
      subcategory,
    ]);

    let data = "";
    let errorData = "";

    // Capture normal output and errors
    py.stdout.on("data", (chunk) => (data += chunk.toString()));
    py.stderr.on("data", (chunk) => (errorData += chunk.toString()));

    // Handle process exit
    py.on("close", (code) => {
      if (code !== 0) {
        console.error("Python stderr:", errorData);
        return reject(new Error(`Python exited with code ${code}`));
      }

      try {
        const parsed = JSON.parse(data);
        resolve(parsed);
      } catch (err) {
        console.error("Failed to parse JSON:", err.message);
        console.error("Raw output:", data);
        reject(new Error(`Failed to parse Python output: ${err.message}`));
      }
    });
  });
}

module.exports = { scrapeRockAuto };


// TEST BLOCK
if (require.main === module) {
  (async () => {
    try {
      const result = await scrapeRockAuto({
        make: "CHEVROLET",
        year: "2020",
        model: "CORVETTE",
        engine: "6.2L V8",
        category: "ELECTRICAL",
        subcategory: "BATTERY",
      });

      console.log("Scraped parts:\n", result);
    } catch (err) {
      console.error("Error:", err);
    }
  })();
}
