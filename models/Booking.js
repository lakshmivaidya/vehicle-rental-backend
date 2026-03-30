const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["booked", "paid", "completed", "cancelled"],
      default: "booked",
    },
    review: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      date: { type: Date },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Optional: virtual to convert createdAt to IST string
bookingSchema.virtual("createdAtIST").get(function () {
  if (!this.createdAt) return null;
  return new Date(this.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
});

module.exports = mongoose.model("Booking", bookingSchema);