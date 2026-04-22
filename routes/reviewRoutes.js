const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// =======================
// GET REVIEWS FOR VEHICLE
// =======================
router.get("/:vehicleId", async (req, res) => {
  try {
    const bookings = await Booking.find({
      vehicleId: req.params.vehicleId,
      "review.rating": { $exists: true, $ne: null }
    }).populate("userId", "name email");

    const reviews = bookings
      .filter(b => b.review && typeof b.review.rating === "number")
      .map((b) => ({
        rating: b.review.rating,
        comment: b.review.comment || "",
        userName: b.userId?.name || "User",
        date: b.review.date || b.updatedAt,
      }));

    res.json(reviews);
  } catch (err) {
    console.error("GET REVIEWS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

module.exports = router;