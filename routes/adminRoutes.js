// backend/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Booking = require("../models/Booking");
const Review = require("../models/Review");

// =====================
// Middleware: Admin Auth
// =====================
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "No token, authorization denied" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    const user = await User.findById(decoded.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid token" });
  }
};

// Apply admin auth middleware to all routes below
router.use(authenticateAdmin);

// =====================
// Admin Routes
// =====================

// Get all users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Get all vehicles
router.get("/vehicles", async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

// Add a vehicle
router.post("/vehicles", async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add vehicle" });
  }
});

// Update a vehicle
router.put("/vehicles/:id", async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update vehicle" });
  }
});

// Delete a vehicle
router.delete("/vehicles/:id", async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json({ message: "Vehicle deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete vehicle" });
  }
});

// Approve a vehicle
router.post("/vehicles/:id/approve", async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { available: true }, { new: true });
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json({ message: "Vehicle approved", vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve vehicle" });
  }
});

// Reject a vehicle
router.post("/vehicles/:id/reject", async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { available: false }, { new: true });
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json({ message: "Vehicle rejected", vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reject vehicle" });
  }
});

// Get all bookings
router.get("/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find().populate("userId").populate("vehicleId");
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// Update booking status
router.put("/bookings/:id/status", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update booking status" });
  }
});

// Get all reviews
router.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find().populate("userId").populate("vehicleId");
    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

// Approve a review
router.post("/reviews/:id/approve", async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({ message: "Review approved", review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve review" });
  }
});

// Get approved reviews for a vehicle (for frontend Vehicles page)
router.get("/reviews/vehicle/:vehicleId", async (req, res) => {
  try {
    const reviews = await Review.find({ vehicleId: req.params.vehicleId, approved: true })
      .populate("userId", "name");
    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

module.exports = router;