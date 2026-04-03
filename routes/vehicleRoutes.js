const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");

// GET vehicles with filtering
router.get("/", async (req, res) => {
  try {
    const { category, location, minPrice, maxPrice } = req.query;

    let filter = {};

    // ✅ FIX: use "type" instead of "category"
    if (category && category.trim() !== "") {
      filter.type = { $regex: category.trim(), $options: "i" };
    }

    // ✅ Location filter (case-insensitive)
    if (location && location.trim() !== "") {
      filter.location = { $regex: location.trim(), $options: "i" };
    }

    // ✅ Price range filter
    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) filter.pricePerDay.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerDay.$lte = Number(maxPrice);
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