const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    vin: { type: String },
    nickname: { type: String },
    year: { type: String },
    make: { type: String },
    model: { type: String },
    trim: { type: String },
    engine: { type: String },
    fuel: { type: String },
    drivetrain: { type: String },
    transmission: { type: String },
    mpg_city: { type: String },
    mpg_highway: { type: String },
    class: { type: String },

    data: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

VehicleSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model("Vehicle", VehicleSchema);
