const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
    title: { type: String, required: true },
    vehicle: {
      year: Number,
      make: String,
      model: String,
      engine: String
    },
    
    summary: {
      uniqueParts: { type: Number, default: 0 },
      minPrice: { type: Number, default: 0 },
      maxPrice: { type: Number, default: 0 },
      inStockPct: { type: Number, default: 0 }
    },
   
    items: [
      {
        brand: String,
        partNumber: String,
        description: String,
        bestPrice: Number,
        stock: String,
        url: String
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);
