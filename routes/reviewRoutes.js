const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// =======================
// GET REVIEWS FOR VEHICLE (FROM BOOKINGS)
// =======================
router.get("/:vehicleId", async (req, res) => {
  try {
    const bookings = await Booking.find({
      vehicleId: req.params.vehicleId,
      "review.rating": { $exists: true }
    }).populate("userId", "name");

    const reviews = bookings.map((b) => ({
      rating: b.review.rating,
      comment: b.review.comment,
      userName: b.userId?.name || "User",
      date: b.review.date,
    }));

    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

module.exports = router;