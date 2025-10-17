const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("[DB] No MONGO_URI/MONGODB_URI found");
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("[DB] Mongo error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
