const Vehicle = require("../models/Vehicle");

// ================================
// GET ALL VEHICLES WITH FILTERS
// ================================
const getVehicles = async (req, res) => {
  try {
    const { category, location, minPrice, maxPrice } = req.query;

    let filter = {};

    // Type filter (frontend sends category)
    if (category && category.trim() !== "") {
      filter.type = { $regex: category.trim(), $options: "i" };
    }

    // Location filter (case‑insensitive)
    if (location && location.trim() !== "") {
      filter.location = { $regex: location.trim(), $options: "i" };
    }

    // Price range
    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) filter.pricePerDay.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerDay.$lte = Number(maxPrice);
    }

    // Fetch vehicles and include owner info (userId)
    const vehicles = await Vehicle.find(filter)
      .populate("userId", "_id name email") // include owner details
      .lean(); // plain objects

    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
};

// ================================
// ADD NEW VEHICLE
// ================================
const addVehicle = async (req, res) => {
  try {
    // Expecting the frontend to send userId as the owner
    const { make, model, year, type, location, pricePerDay, image, userId } = req.body;

    const vehicle = await Vehicle.create({
      make,
      model,
      year,
      type,
      location,
      pricePerDay,
      image,
      userId, // save owner ID
      available: true,
    });

    res.status(201).json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add vehicle" });
  }
};

// ================================
// EXPORT CONTROLLER
// ================================
module.exports = {
  getVehicles,
  addVehicle,
};