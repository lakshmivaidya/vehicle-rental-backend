const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");

// =====================
// Get all vehicles
// =====================
router.get("/", async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (err) {
    console.error("FETCH VEHICLES ERROR:", err);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

// =====================
// Get single vehicle
// =====================
router.get("/:id", async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle)
      return res.status(404).json({ message: "Vehicle not found" });

    res.json(vehicle);
  } catch (err) {
    console.error("FETCH SINGLE VEHICLE ERROR:", err);
    res.status(500).json({ message: "Error fetching vehicle" });
  }
});

module.exports = router;