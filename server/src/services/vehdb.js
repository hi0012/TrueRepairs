const axios = require("axios");

const VDB = axios.create({
  baseURL: "https://api.vehicledatabases.com/v1",
  headers: { "x-api-key": process.env.VEHICLEDB_AUTH_KEY },
  timeout: 10000,
});

async function vinDecode(vin) {
  if (!vin) throw new Error("VIN is required");
  const res = await VDB.get(`/decode`, {
    params: { vin },
  });
  return res.data;
}

module.exports = { vinDecode };
