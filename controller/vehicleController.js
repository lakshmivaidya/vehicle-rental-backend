const Vehicle = require("../models/Vehicle");

const getVehicles = async (req, res) => {
  try {
    const { category, location, minPrice, maxPrice } = req.query;

    let filter = {};

    if (category && category.trim() !== "") {
      filter.type = { $regex: category.trim(), $options: "i" };
    }

    if (location && location.trim() !== "") {
      filter.location = { $regex: location.trim(), $options: "i" };
    }

    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) filter.pricePerDay.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerDay.$lte = Number(maxPrice);
    }

    const vehicles = await Vehicle.find(filter)
      .populate("userId", "_id name email") 
      .lean(); 

    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
};


const addVehicle = async (req, res) => {
  try {
    const { make, model, year, type, location, pricePerDay, image, userId } = req.body;

    const vehicle = await Vehicle.create({
      make,
      model,
      year,
      type,
      location,
      pricePerDay,
      image,
      userId, 
      available: true,
    });

    res.status(201).json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add vehicle" });
  }
};

module.exports = {
  getVehicles,
  addVehicle,
};