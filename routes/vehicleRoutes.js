const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const multer = require("multer");
const auth = require("../middleware/auth");

// =======================
// CLOUDINARY CONFIG (NEW)
// =======================
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

// Cloudinary setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "vehicle_rental",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
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

    // category → type mapping
    if (category && category.trim() !== "") {
      filter.type = { $regex: category.trim(), $options: "i" };
    }

    // location filter
    if (location && location.trim() !== "") {
      filter.location = { $regex: location.trim(), $options: "i" };
    }

    // price range
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
// CREATE VEHICLE (CLOUDINARY UPLOAD)
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

      // ✅ CLOUDINARY URL
      image: req.file ? req.file.path : "",

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