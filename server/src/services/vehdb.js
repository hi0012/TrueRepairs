const axios = require("axios");

const VDB = axios.create({
  baseURL: "https://api.vehicledatabases.com",
  headers: { "x-AuthKey": process.env.VEHICLEDB_AUTH_KEY },
  timeout: 10000
});

module.exports = {
  vinDecode: (vin) => VDB.get(`/vin-decode/${vin}`)
};
