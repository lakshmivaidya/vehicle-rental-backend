const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Booking = require("../models/Booking");

// Add a review (only if booking exists and completed)
router.post("/", async (req, res) => {
  try {
    const { userId, vehicleId, rating, comment } = req.body;

    // Check if user had a completed booking
    const booking = await Booking.findOne({
      userId,
      vehicleId,
      endDate: { $lte: new Date() } // booking should have ended
    });

    if (!booking) {
      return res.status(400).json({ message: "You can only review a completed booking" });
    }

    const review = await Review.create({ userId, vehicleId, rating, comment });
    res.json({ message: "Review submitted for moderation", review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit review" });
  }
});

// Get all approved reviews for a vehicle
router.get("/:vehicleId", async (req, res) => {
  try {
    const reviews = await Review.find({ vehicleId: req.params.vehicleId, approved: true })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.json(
      reviews.map(r => ({
        _id: r._id,
        userName: r.userId?.name || "Anonymous",
        rating: r.rating,
        comment: r.comment
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

// Approve a review (admin only – here we just expose route for simplicity)
router.post("/approve/:id", async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({ message: "Review approved", review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve review" });
  }
});

module.exports = router;