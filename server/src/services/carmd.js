const axios = require("axios");

const carmd = axios.create({
  baseURL: "https://api.carmd.com/v3.0",
  headers: {
    "content-type": "application/json",
    authorization: process.env.CARMD_AUTH_KEY,
    "partner-token": process.env.CARMD_PARTNER_TOKEN
  },
  timeout: 10000
});

module.exports = {
  decodeVin: vin => carmd.get("/decode", { params: { vin } }),
  warranty: vin => carmd.get("/warranty", { params: { vin } }),
  maintenanceAtMileage: (vin, mileage, unit = "mi") => carmd.get("/maintenance", { params: { vin, mileage, unit } }),
  upcomingRepairs: (vin, mileage, unit = "mi") => carmd.get("/upcoming", { params: { vin, mileage, unit } }),
  recalls: vin => carmd.get("/recall", { params: { vin } })
};
