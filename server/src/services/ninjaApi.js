const axios = require("axios");
const VEHICLES_API_KEY = process.env.NINJA_API_KEY;

const ninjaClient = axios.create({
  baseURL: "https://api.api-ninjas.com/v1",
  headers: { "X-Api-Key": VEHICLES_API_KEY },
  timeout: 10000,
});

// Get car specs by make/model/year
async function getCarSpecs({ make, model, year, offset = 0, limit = 50 }) {
  const params = {};
  if (make) params.make = make;
  if (model) params.model = model;
  if (year) params.year = year;
  params.limit = limit;
  params.offset = offset;

  const res = await ninjaClient.get("/cars", { params });
  return res.data;
}

// Decode VIN
async function vinDecode(vin) {
  try {
    if (!vin) throw new Error("VIN is required");
    const res = await ninjaClient.get(`/vinlookup`, { params: { vin } });
    return res.data;
  } catch (err) {
    console.error("VIN decode error:", err.response?.data || err.message);
    throw err;
  }
}

module.exports = { getCarSpecs, vinDecode };
