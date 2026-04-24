const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const multer = require("multer");
const auth = require("../middleware/auth");

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

// =======================
// CLOUDINARY CONFIG (FIXED SAFETY CHECK)
// =======================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// ⚠️ FIX: prevent crash if env is missing
if (
  !process.env.CLOUDINARY_NAME ||
  !process.env.CLOUDINARY_KEY ||
  !process.env.CLOUDINARY_SECRET
) {
  console.error("Cloudinary env variables missing");
}

// =======================
// MULTER STORAGE
// =======================
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "vehicle_rental",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ storage });

// =======================
// GET VEHICLES (NO CHANGE IN LOGIC)
// =======================
router.get("/", async (req, res) => {
  try {
    const { category, location, minPrice, maxPrice } = req.query;

    let filter = { available: true };

    if (category && category.trim() !== "") {
      filter.type = { $regex: category.trim(), $options: "i" };
    }

    if (location && location.trim() !== "") {
      filter.location = { $regex: location.trim(), $options: "i" };
    }

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

    return res.json(vehicles);
  } catch (err) {
    console.error("GET VEHICLES ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

// =======================
// CREATE VEHICLE (FIXED ONLY AUTH NORMALIZATION)
// =======================
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    // FIX: use ONLY normalized auth field safely
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - invalid user" });
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
      pricePerDay: Number(pricePerDay),
      image: req.file ? req.file.path : "",
      userId: userId.toString(),
      available: true,
    });

    return res.json(vehicle);
  } catch (err) {
    console.error("CREATE VEHICLE ERROR:", err);
    return res.status(500).json({
      message: "Failed to create vehicle",
      error: err.message,
    });
  }
});

// =======================
// UPDATE VEHICLE (FIXED ONLY AUTH NORMALIZATION)
// =======================
router.put("/:id", auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    if (!vehicle.userId) {
      return res.status(403).json({ message: "Vehicle has no owner" });
    }

    if (vehicle.userId.toString() !== userId.toString()) {
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

    return res.json({
      message: "Vehicle updated successfully",
      vehicle,
    });
  } catch (err) {
    console.error("UPDATE VEHICLE ERROR:", err);
    return res.status(500).json({ message: "Update failed" });
  }
});

// =======================
// UNLIST VEHICLE (FIXED ONLY AUTH NORMALIZATION)
// =======================
router.patch("/:id/unlist", auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const userId = req.user?.userId || req.user?.id;

    if (vehicle.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    vehicle.available = false;
    await vehicle.save();

    return res.json({
      message: "Vehicle unlisted successfully",
      vehicle,
    });
  } catch (err) {
    console.error("UNLIST ERROR:", err);
    return res.status(500).json({ message: "Failed to unlist vehicle" });
  }
});

// =======================
// RELIST VEHICLE (FIXED ONLY AUTH NORMALIZATION)
// =======================
router.patch("/:id/relist", auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const userId = req.user?.userId || req.user?.id;

    if (vehicle.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    vehicle.available = true;
    await vehicle.save();

    return res.json({
      message: "Vehicle relisted successfully",
      vehicle,
    });
  } catch (err) {
    console.error("RELIST ERROR:", err);
    return res.status(500).json({ message: "Failed to relist vehicle" });
  }
});

module.exports = router;