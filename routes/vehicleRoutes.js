const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");

// GET vehicles with filtering
router.get("/", async (req, res) => {
  try {
    const { category, location, minPrice, maxPrice } = req.query;

    let filter = {};

    // Case-insensitive category filter
    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    // Case-insensitive location filter
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) filter.pricePerDay.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerDay.$lte = Number(maxPrice);
    }

    const vehicles = await Vehicle.find(filter);
    res.json(vehicles);

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

router.post("/", async (req, res) => {
  res.json(await Vehicle.create(req.body));
});

module.exports = router;