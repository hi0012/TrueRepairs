const mongoose = require("mongoose");

const LookupSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, index: true },
    vin: { type: String, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

LookupSchema.index({ userEmail: 1, createdAt: -1 });

module.exports = mongoose.model("Lookup", LookupSchema);
