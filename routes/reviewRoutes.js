const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Booking = require("../models/Booking");

// Add review **only if booking is completed**
router.post("/", async (req, res) => {
  const { bookingId, rating, comment } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status !== "completed") {
    return res.status(400).json({ message: "Cannot review before completing the ride" });
  }

  const review = await Review.create({
    vehicleId: booking.vehicleId,
    userName: booking.userId.name,
    rating,
    comment
  });

  res.json(review);
});

// Get reviews by vehicle
router.get("/:vehicleId", async (req, res) => {
  const reviews = await Review.find({ vehicleId: req.params.vehicleId });
  res.json(reviews);
});

module.exports = router;