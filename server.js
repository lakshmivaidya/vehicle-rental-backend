const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://vehicle-rental-frontend-gold.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Health check route (so opening backend URL shows something)
app.get("/", (req, res) => {
  res.send("Vehicle Rental Backend is Running 🚀");
});

module.exports = app;