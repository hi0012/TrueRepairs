const mongoose = require("mongoose");

const ImageInfoSchema = new mongoose.Schema(
  {
    imageUrl: String,
    thumbUrl: String,
    cloudinaryPublicId: String,
    view: String
  },
  { _id: false }
);

const DamageSchema = new mongoose.Schema(
  {
    part: String,
    operation: String,
    severity: String,
    maxConfidence: Number,
    sources: [Number]
  },
  { _id: false }
);

const VehicleGuessSchema = new mongoose.Schema(
  {
    make: String,
    model: String,
    yearRange: String,
    confidence: Number,
    vinMake: String,
    vinModel: String,
    vinYear: Number,
    vinMatch: Boolean
  },
  { _id: false }
);

const EstimateSchema = new mongoose.Schema(
  {
    userEmail: { type: String, index: true, required: true },

    // legacy single-image fields (kept for backward compatibility)
    imageUrl: String,
    thumbUrl: String,
    cloudinaryPublicId: String,
    imageType: String,
    visionLabels: [{ description: String, score: Number }],
    visionObjects: [{ name: String, score: Number }],
    selection: { part: String, operation: String },
    breakdown: {
      parts: Number,
      laborHours: Number,
      laborRate: Number,
      paintMaterials: Number,
      misc: Number
    },
    totalEstimated: Number,

    // new multi-image + AI fields
    images: [ImageInfoSchema],
    vehicle: VehicleGuessSchema,
    damages: [DamageSchema],
    aiRaw: mongoose.Schema.Types.Mixed,
    vin: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Estimate", EstimateSchema);
