const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    make: String,
    model: String,
    year: Number,
    type: String,
    location: String,
    pricePerDay: Number,
    image: String,
    available: { type: Boolean, default: true },

    // ✅ CRITICAL FIX: OWNER FIELD
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);