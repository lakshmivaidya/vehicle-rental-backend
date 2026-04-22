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
// GET ALL BOOKINGS (ADMIN FIXED - FULL POPULATION)
// =======================
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("userId", "name email role")
      .populate("vehicleId", "make model image pricePerDay location type userId");

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =======================
// CREATE BOOKING
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

    if (!vehicle.userId) {
      return res.status(400).json({
        message: "Vehicle has no owner assigned",
      });
    }

    if (vehicle.userId.toString() === userId.toString()) {
      return res.status(400).json({
        message: "You cannot book your own vehicle",
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({ message: "Invalid booking dates" });
    }

    const overlapping = await Booking.find({
      vehicleId,
      status: "booked",
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (overlapping.length > 0) {
      return res.status(400).json({
        message: "Vehicle not available for selected dates",
      });
    }

    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days === 0) days = 1;

    const totalPrice = days * vehicle.pricePerDay;

    const booking = await Booking.create({
      userId,
      vehicleId,
      startDate: start,
      endDate: end,
      totalPrice,
      status: "booked",
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Booking Confirmation",
        text: `Your booking for ${vehicle.make} ${vehicle.model} is confirmed.`,
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
// CANCEL
// =======================
router.delete("/cancel/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled" });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

// =======================
// COMPLETE
// =======================
router.post("/complete/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = "completed";
    await booking.save();

    res.json({ message: "Booking marked as completed" });
  } catch (err) {
    res.status(500).json({ message: "Failed to complete booking" });
  }
});

// =======================
// PAYMENT (SIMULATED)
// =======================
router.post("/pay/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = "paid";
    await booking.save();

    res.json({ message: "Payment successful" });
  } catch (err) {
    res.status(500).json({ message: "Payment failed" });
  }
});

// =======================
// VEHICLE HISTORY (FIXED - NOW INCLUDES REVIEW)
// =======================
router.get("/vehicle/:vehicleId/history", async (req, res) => {
  try {
    const bookings = await Booking.find({
      vehicleId: req.params.vehicleId,
    })
      .populate("userId", "name email role")
      .populate("vehicleId", "make model pricePerDay")
      .sort({ startDate: -1 });

    const enriched = bookings.map((b) => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);

      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;

      return {
        _id: b._id,
        user: b.userId,
        vehicle: b.vehicleId,
        startDate: b.startDate,
        endDate: b.endDate,
        days,
        totalPrice: b.totalPrice,
        status: b.status,

        // ✅ FIX ADDED HERE
        review: b.review || null,
      };
    });

    res.json(enriched);
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
// REVIEW
// =======================
router.post("/review/:id", async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    booking.review = {
      rating,
      comment,
      date: new Date(),
    };

    await booking.save();

    res.json({ message: "Review submitted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit review" });
  }
});

module.exports = router;