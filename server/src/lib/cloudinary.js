const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dxwh7jelz",
  api_key: process.env.CLOUDINARY_API_KEY || "666922169117563",
  api_secret: process.env.CLOUDINARY_API_SECRET || "L-4VJT4R_98wmciKnJL_NiDpupE",
  secure: true
});

module.exports = cloudinary;
