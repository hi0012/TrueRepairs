const mongoose = require("mongoose");

const PartSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Unknown" },
    low: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    avg: { type: Number, default: 0 },
  },
  { _id: false }
);

const VehicleSchema = new mongoose.Schema(
  {
    year: String,
    make: String,
    model: String,
    engine: String,
  },
  { _id: false }
);

const SummarySchema = new mongoose.Schema(
  {
    totalLow: { type: Number, default: 0 },
    totalHigh: { type: Number, default: 0 },
    totalAvg: { type: Number, default: 0 },
  },
  { _id: false }
);

const ReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    userEmail: { type: String, required: true, index: true, lowercase: true },

    vehicle: VehicleSchema,
    parts: [PartSchema],
    summary: SummarySchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);
