const mongoose = require("mongoose");

// Define sub-schemas for parts, vehicle, and summary. Represents a single part line-item inside a report.
const PartSchema = new mongoose.Schema({
  name: { type: String, default: "Unknown" },
  low: { type: Number, default: 0 },
  high: { type: Number, default: 0 },
  avg: { type: Number, default: 0 },},
  { _id: false }
);

// Stores the vehicle metadata associated with this specific report.
const VehicleSchema = new mongoose.Schema({
  year: String,
  make: String,
  model: String,
  engine: String,},
  { _id: false }
);

// Holds the final totals for the entire report:
const SummarySchema = new mongoose.Schema({
  totalLow: { type: Number, default: 0 },
  totalHigh: { type: Number, default: 0 },
  totalAvg: { type: Number, default: 0 },},
  { _id: false }
);

// ReportSchema (MAIN DOCUMENT) The entire saved report structure stored in MongoDB.
const ReportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  userEmail: { type: String, required: true, index: true, lowercase: true },

  vehicle: VehicleSchema,
  parts: [PartSchema],
  summary: SummarySchema,},
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);

// Robert Simovski
// Sources: https://mongoosejs.com/docs/