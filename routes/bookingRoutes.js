const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User"); // add this to populate user info

// =====================
// Create a booking
// =====================
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
      paid: false,         // payment initially false
      status: "booked",    // booking status
    });

    res.json(booking);
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ message: "Booking failed" });
  }
});

// =====================
// Get all bookings
// =====================
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

// =====================
// Cancel a booking
// =====================
router.delete("/cancel/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status === "completed") {
      return res.status(400).json({ message: "Cannot cancel a completed booking" });
    }

    await booking.deleteOne();
    res.json({ message: "Booking canceled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

// =====================
// Pay for a booking
// =====================
router.post("/pay/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { paid: true },
      { new: true }
    )
      .populate("vehicleId")
      .populate("userId");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Payment failed" });
  }
});

// =====================
// Rental History for a Vehicle
// =====================
router.get("/history/:vehicleId", async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;

    const bookings = await Booking.find({ vehicleId })
      .populate("userId", "name email") // attach user's name and email
      .sort({ startDate: -1 });

    const history = bookings.map((b) => ({
      _id: b._id,
      userName: b.userId?.name || "Unknown",
      userEmail: b.userId?.email || "Unknown",
      startDate: b.startDate,
      endDate: b.endDate,
      durationDays: Math.ceil(
        (new Date(b.endDate) - new Date(b.startDate)) / (1000 * 60 * 60 * 24)
      ),
      totalPrice: b.totalPrice,
      status: b.status,
    }));

    res.json(history);
  } catch (err) {
    console.error("Error fetching rental history:", err);
    res.status(500).json({ message: "Failed to fetch rental history" });
  }
});

module.exports = router;