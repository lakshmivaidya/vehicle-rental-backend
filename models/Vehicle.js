const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    make: String,
    model: String,
    year: Number,
    type: String,        // NEW (Car, Bike, SUV, etc.)
    location: String,    // NEW (City name)
    pricePerDay: Number,
    image: String,
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);