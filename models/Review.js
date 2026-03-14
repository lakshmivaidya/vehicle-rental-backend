const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
  userName: String,
  rating: Number,
  comment: String,
}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);