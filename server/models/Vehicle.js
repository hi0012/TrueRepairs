const mongoose = require("mongoose");

// Vehicle schema for storing vehicle metadata associated with a user.
const VehicleSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  // VIN number or (optional if user manually enters vehicle details)
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
  data: { type: mongoose.Schema.Types.Mixed },},
  { timestamps: true }
);

VehicleSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model("Vehicle", VehicleSchema);

// Robert Simovski {100%}
// Sources: https://mongoosejs.com/docs/
