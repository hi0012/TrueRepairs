const mongoose = require("mongoose");

const EstimateSchema = new mongoose.Schema({
  userEmail: { type: String, index: true, required: true },
  imageUrl: String,
  thumbUrl: String,
  cloudinaryPublicId: String,
  imageType: String,
  visionLabels: [{ description: String, score: Number }],
  visionObjects: [{ name: String, score: Number }],
  selection: { part: String, operation: String },
  breakdown: { parts: Number, laborHours: Number, laborRate: Number, paintMaterials: Number, misc: Number },
  totalEstimated: Number
}, { timestamps: true });

module.exports = mongoose.model("Estimate", EstimateSchema);
