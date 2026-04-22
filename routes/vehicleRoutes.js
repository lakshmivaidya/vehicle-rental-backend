const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");

// =======================
// MULTER CONFIG
// =======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// =======================
// GET VEHICLES (FIXED FILTER LOGIC)
// =======================
router.get("/", async (req, res) => {
  try {
    const { category, location, minPrice, maxPrice } = req.query;

    let filter = { available: true };

    // ✅ FIX 1: category → type mapping + safe trimming
    if (category && category.trim() !== "") {
      filter.type = { $regex: category.trim(), $options: "i" };
    }

    // ✅ FIX 2: location filter (case-insensitive)
    if (location && location.trim() !== "") {
      filter.location = { $regex: location.trim(), $options: "i" };
    }

    // ✅ FIX 3: price range (robust numeric handling)
    if (
      (minPrice !== undefined && minPrice !== "") ||
      (maxPrice !== undefined && maxPrice !== "")
    ) {
      filter.pricePerDay = {};

      if (minPrice !== undefined && minPrice !== "") {
        filter.pricePerDay.$gte = Number(minPrice);
      }

      if (maxPrice !== undefined && maxPrice !== "") {
        filter.pricePerDay.$lte = Number(maxPrice);
      }
    }

    const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });

    res.json(vehicles);
  } catch (err) {
    console.error("GET VEHICLES ERROR:", err);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

// =======================
// CREATE VEHICLE (ROBUST FIX)
// =======================
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { make, model, year, type, location, pricePerDay } = req.body;

    if (!make || !model || !year || !type || !location || !pricePerDay) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const vehicle = await Vehicle.create({
      make,
      model,
      year,
      type,
      location,
      pricePerDay,
      image: req.file ? `/uploads/${req.file.filename}` : "",
      userId: req.user.id,
      available: true,
    });

    res.json(vehicle);
  } catch (err) {
    console.error("CREATE VEHICLE ERROR:", err);
    res.status(500).json({ message: "Failed to create vehicle" });
  }
});

// =======================
// UPDATE VEHICLE (OWNER ONLY)
// =======================
router.put("/:id", auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (!vehicle.userId || vehicle.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const allowedFields = [
      "make",
      "model",
      "year",
      "type",
      "location",
      "pricePerDay",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vehicle[field] = req.body[field];
      }
    });

    await vehicle.save();

    res.json({
      message: "Vehicle updated successfully",
      vehicle,
    });
  } catch (err) {
    console.error("UPDATE VEHICLE ERROR:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

// =======================
// UNLIST VEHICLE
// =======================
router.patch("/:id/unlist", auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (!vehicle.userId || vehicle.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    vehicle.available = false;
    await vehicle.save();

    res.json({
      message: "Vehicle unlisted successfully",
      vehicle,
    });
  } catch (err) {
    console.error("UNLIST ERROR:", err);
    res.status(500).json({ message: "Failed to unlist vehicle" });
  }
});

// =======================
// RELIST VEHICLE
// =======================
router.patch("/:id/relist", auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (!vehicle.userId || vehicle.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    vehicle.available = true;
    await vehicle.save();

    res.json({
      message: "Vehicle relisted successfully",
      vehicle,
    });
  } catch (err) {
    console.error("RELIST ERROR:", err);
    res.status(500).json({ message: "Failed to relist vehicle" });
  }
});

module.exports = router;