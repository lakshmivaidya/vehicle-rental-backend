const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");

// GET /api/vehicles?type=Car&minPrice=10&maxPrice=100&location=City
router.get("/", async (req, res) => {
  try {
    const { type, minPrice, maxPrice, location } = req.query;

    const filter = {};

    if (type) {
      filter.category = { $regex: type, $options: "i" }; // case-insensitive
    }

    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) filter.pricePerDay.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerDay.$lte = Number(maxPrice);
    }

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    const vehicles = await Vehicle.find(filter);
    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

router.post("/", async (req, res) => {
  res.json(await Vehicle.create(req.body));
});

module.exports = router;