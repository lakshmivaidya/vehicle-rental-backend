/*const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");

// Add a new vehicle
router.post("/", async (req, res) => {
  try {
    const { make, model, year, type, location, pricePerDay, image } = req.body;

    if (!make || !model || !year || !pricePerDay) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    const vehicle = await Vehicle.create({
      make,
      model,
      year,
      type,
      location,
      pricePerDay,
      image,
      available: true,
    });

    res.json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add vehicle" });
  }
});

module.exports = router; */