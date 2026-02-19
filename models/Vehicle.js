const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  make: String,
  model: String,
  year: Number,
  pricePerDay: Number,
  image: String,
  available: { type: Boolean, default: true },
  category: String,
  location: String, // <-- added location
});

module.exports = mongoose.model("Vehicle", vehicleSchema);