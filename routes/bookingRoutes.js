const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");
const Review = require("../models/Review");

// Create a booking
router.post("/", async (req, res) => {
  try {
    const { userId, vehicleId, days } = req.body;

    if (!userId || !vehicleId || !days || days < 1) {
      return res.status(400).json({ message: "Invalid booking data" });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    // Check for overlapping bookings
    const now = new Date();
    const existingBookings = await Booking.find({
      vehicleId,
      startDate: { $lte: new Date(now.getTime() + days * 24 * 60 * 60 * 1000) },
      endDate: { $gte: now },
      status: { $ne: "cancelled" },
    });

    if (existingBookings.length > 0) {
      return res.status(400).json({ message: "Vehicle is already booked" });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + Number(days));

    const totalPrice = vehicle.pricePerDay * Number(days);

    const booking = await Booking.create({
      userId,
      vehicleId,
      startDate,
      endDate,
      totalPrice,
      status: "booked",
    });

    res.json(booking);
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ message: "Booking failed" });
  }
});

// Get all bookings
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("vehicleId")
      .populate("userId");
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// Cancel a booking
router.delete("/cancel/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Only booked bookings can be cancelled
    if (booking.status !== "booked") {
      return res.status(400).json({ message: "Cannot cancel after payment" });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking canceled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

// Pay for a booking
router.post("/pay/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("vehicleId")
      .populate("userId");

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status !== "booked") {
      return res.status(400).json({ message: "Booking already paid or cancelled" });
    }

    booking.status = "paid";
    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Payment failed" });
  }
});

// Mark booking as completed
router.post("/complete/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("vehicleId")
      .populate("userId");

    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status !== "paid") {
      return res.status(400).json({ message: "Only paid bookings can be completed" });
    }

    booking.status = "completed";
    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to complete booking" });
  }
});

// Add review
router.post("/review/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("userId");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "Can only review completed bookings" });
    }

    const { rating, comment } = req.body;

    const review = await Review.create({
      vehicleId: booking.vehicleId,
      userName: booking.userId.name,
      rating,
      comment,
    });

    res.json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add review" });
  }
});

module.exports = router;