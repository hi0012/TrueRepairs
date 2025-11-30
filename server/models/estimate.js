const mongoose = require("mongoose");

const ImageInfoSchema = new mongoose.Schema({
  imageUrl: String,
  thumbUrl: String,
  cloudinaryPublicId: String,
  view: String
  },
  { _id: false }
);

const DamageSchema = new mongoose.Schema({
  part: String,
  operation: String,
  severity: String,
  maxConfidence: Number,
  sources: [Number]
  },
  { _id: false }
);

const VehicleSchema = new mongoose.Schema({
  year: String,
  make: String,
  model: String,
  trim: String,
  engine: String
  },
  { _id: false }
);

const EstimateSchema = new mongoose.Schema({
  userEmail: { type: String, index: true, required: true },
  imageUrl: String,
  thumbUrl: String,
  cloudinaryPublicId: String,
  imageType: String,

  breakdown: {
    parts: Number,
    laborHours: Number,
    laborRate: Number,
    paintMaterials: Number,
    paintTotal: Number,
    misc: Number
  },

  totalEstimated: Number,

  images: [ImageInfoSchema],
  vehicle: VehicleSchema,
  damages: [DamageSchema],

  parts: [{
    name: String,
    normalized: String,
    operation: String,
    severity: String,
    cost: Number,
    paintCost: Number,
    info_url: String
    }
  ],
  aiRaw: mongoose.Schema.Types.Mixed,
  vin: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Estimate", EstimateSchema);

// Hisham Issa {100%}