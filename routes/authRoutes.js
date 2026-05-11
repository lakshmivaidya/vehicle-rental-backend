const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(email)) return false;

  return email.toLowerCase().endsWith(".com");
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("REGISTER REQUEST:", { name, email });

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    if (!name.trim() || !email.trim() || !password.trim()) {
      return res.status(400).json({
        message: "Name, email, and password cannot be empty",
      });
    }

    const normalizedEmail = email.toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid .com email address",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    await user.save(); //

    console.log("USER CREATED:", user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err); // debug log

    res.status(500).json({
      error: err.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("LOGIN REQUEST:", { email });

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Incorrect password",
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err); // debug log

    res.status(500).json({
      error: err.message,
    });
  }
});

router.put("/update", async (req, res) => {
  try {
    const { userId, name, email, password } = req.body;

    console.log("UPDATE REQUEST:", { userId });

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        message: "Please enter a valid .com email address",
      });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase();

    if (password && password.trim() !== "") {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("UPDATE ERROR:", err); // debug log

    res.status(500).json({
      message: err.message,
    });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json(users);
  } catch (err) {
    console.error("GET USERS ERROR:", err); // debug log

    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
});

module.exports = router;