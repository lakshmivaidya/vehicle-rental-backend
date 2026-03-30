const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const nodemailer = require("nodemailer");

// Email setup
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// =======================
// GET ALL BOOKINGS
// =======================
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("userId", "name email")
      .populate("vehicleId", "make model image pricePerDay");

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =======================
// CREATE BOOKING (FINAL FIX)
// =======================
router.post("/", async (req, res) => {
  const { userId, vehicleId, startDate, endDate } = req.body;

  if (!userId || !vehicleId || !startDate || !endDate) {
    return res.status(400).json({ message: "Invalid booking data" });
  }

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    const user = await User.findById(userId);

    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Normalize dates (fix timezone issue)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({ message: "Invalid booking dates" });
    }

    // ✅ FINAL FIX: Only block ACTIVE bookings
    const overlapping = await Booking.find({
      vehicleId,
      status: "booked", // ONLY this blocks booking
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (overlapping.length > 0) {
      return res.status(400).json({
        message: "Vehicle not available for selected dates",
      });
    }

    // PRICE CALCULATION
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days === 0) days = 1;

    const totalPrice = days * vehicle.pricePerDay;

    // CREATE BOOKING
    const booking = await Booking.create({
      userId,
      vehicleId,
      startDate: start,
      endDate: end,
      totalPrice,
      status: "booked",
    });

    // EMAIL
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Booking Confirmation",
        text: `Your booking for ${vehicle.make} ${vehicle.model} from ${start.toDateString()} to ${end.toDateString()} is confirmed.`,
      });
    } catch (emailErr) {
      console.error("Email error:", emailErr.message);
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Booking failed" });
  }
});

// =======================
// CANCEL BOOKING
// =======================
router.delete("/cancel/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled" });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

// =======================
// COMPLETE BOOKING
// =======================
router.post("/complete/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    booking.status = "completed";
    await booking.save();

    res.json({ message: "Booking marked as completed" });
  } catch (err) {
    res.status(500).json({ message: "Failed to complete booking" });
  }
});

// =======================
// PAYMENT
// =======================
router.post("/pay/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    booking.status = "paid"; // becomes available again
    await booking.save();

    res.json({ message: "Payment successful" });
  } catch (err) {
    res.status(500).json({ message: "Payment failed" });
  }
});

// =======================
// VEHICLE HISTORY
// =======================
router.get("/vehicle/:vehicleId/history", async (req, res) => {
  try {
    const bookings = await Booking.find({
      vehicleId: req.params.vehicleId,
    })
      .populate("userId", "name email")
      .sort({ startDate: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

// =======================
// USER HISTORY
// =======================
router.get("/user/:userId/history", async (req, res) => {
  try {
    const bookings = await Booking.find({
      userId: req.params.userId,
    })
      .populate("vehicleId", "make model")
      .sort({ startDate: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

// =======================
// ADD REVIEW
// =======================
router.post("/review/:id", async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.review = {
      rating,
      comment,
      date: new Date(),
    };

    await booking.save();

    res.json({ message: "Review submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit review" });
  }
});

module.exports = router;