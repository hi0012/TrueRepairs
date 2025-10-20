const express = require("express");
const router = express.Router();
const VDB = require("../services/vehdb");

let CarMD = null;
if (process.env.CARMD_AUTH_KEY && process.env.CARMD_PARTNER_TOKEN) {
  CarMD = require("../services/carmd");
}

router.get("/vehicle/:vin", async (req, res) => {
  try {
    const { vin } = req.params;
    const vehdbData = await VDB.vinDecode(vin);
    let carmdData = null;
    if (CarMD) {
      try { carmdData = await CarMD.decodeVin(vin); } catch {}
    }
    res.json({ vehicledb: vehdbData?.data || null, carmd: carmdData?.data || null });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.get("/vehicle/:vin/warranty", async (req, res) => {
  if (!CarMD) return res.json({ warning: "CarMD not configured" });
  try { const r = await CarMD.warranty(req.params.vin); res.json(r.data); }
  catch (e) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

router.get("/vehicle/:vin/maintenance", async (req, res) => {
  if (!CarMD) return res.json({ warning: "CarMD not configured" });
  try {
    const { mileage = 60000, unit = "mi" } = req.query;
    const r = await CarMD.maintenanceAtMileage(req.params.vin, mileage, unit);
    res.json(r.data);
  } catch (e) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

router.get("/vehicle/:vin/recalls", async (req, res) => {
  if (!CarMD) return res.json({ warning: "CarMD not configured" });
  try { const r = await CarMD.recalls(req.params.vin); res.json(r.data); }
  catch (e) { res.status(e.response?.status || 500).json({ error: e.message }); }
});

module.exports = router;
