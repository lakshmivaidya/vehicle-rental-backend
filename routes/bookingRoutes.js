const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// FIX TIMEZONE ISSUE FOR LOCALHOST + VERCEL
const normalizeDate = (dateString, isEndDate = false) => {
  const date = new Date(dateString);

  if (isEndDate) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
};

router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("userId", "name email role")
      .populate(
        "vehicleId",
        "make model image pricePerDay location type userId"
      );

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  const { userId, vehicleId, startDate, endDate } = req.body;

  if (!userId || !vehicleId || !startDate || !endDate) {
    return res.status(400).json({
      message: "Invalid booking data",
    });
  }

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    const user = await User.findById(userId);

    if (!vehicle) {
      return res.status(404).json({
        message: "Vehicle not found",
      });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!vehicle.userId) {
      return res.status(400).json({
        message: "Vehicle has no owner assigned",
      });
    }

    if (vehicle.userId.toString() === userId.toString()) {
      return res.status(400).json({
        message: "You cannot book your own vehicle",
      });
    }

    // FIXED DATE HANDLING
    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate, true);

    if (start > end) {
      return res.status(400).json({
        message: "Invalid booking dates",
      });
    }

    const userConflictBooking = await Booking.find({
      vehicleId,
      userId,
      status: "booked",
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (userConflictBooking.length > 0) {
      return res.status(400).json({
        message: "Vehicle not available for selected dates",
      });
    }

    const today = new Date();

    const activePaidRide = await Booking.findOne({
      vehicleId,
      userId,
      status: "paid",
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (activePaidRide) {
      const rideAlreadyStarted =
        new Date(activePaidRide.startDate) <= today;

      if (rideAlreadyStarted) {
        return res.status(400).json({
          message:
            "Ride is in progress. Please complete it to book the next one.",
        });
      }

      return res.status(400).json({
        message: "Vehicle not available for selected dates",
      });
    }

    // TOTAL DAYS CALCULATION
    const millisecondsPerDay =
      1000 * 60 * 60 * 24;

    let days = Math.ceil(
      (end - start) / millisecondsPerDay
    );

    if (days <= 0) {
      days = 1;
    }

    const totalPrice =
      days * vehicle.pricePerDay;

    const booking = await Booking.create({
      userId,
      vehicleId,
      startDate: start,
      endDate: end,
      totalPrice,
      status: "booked",
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Booking Confirmation",
        text: `Your booking for ${vehicle.make} ${vehicle.model} is confirmed.`,
      });
    } catch (emailErr) {
      console.error(
        "Email error:",
        emailErr.message
      );
    }

    res.json({
      message: "Booking successful",
      booking,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Booking failed",
    });
  }
});

router.post("/create-order/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    const options = {
      amount: booking.totalPrice * 100,
      currency: "INR",
      receipt: `receipt_${booking._id}`,
    };

    const order = await razorpay.orders.create(options);

    res.json(order);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to create order",
    });
  }
});

router.post("/verify-payment/:id", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Payment verification failed",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    booking.status = "paid";
    await booking.save();

    res.json({
      message: "Payment successful",
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Payment verification failed",
    });
  }
});

router.delete("/cancel/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({
      message: "Booking cancelled",
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to cancel booking",
    });
  }
});

router.post("/complete/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    booking.status = "completed";
    await booking.save();

    res.json({
      message: "Booking marked as completed",
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to complete booking",
    });
  }
});

router.get("/vehicle/:vehicleId/history", async (req, res) => {
  try {
    const bookings = await Booking.find({
      vehicleId: req.params.vehicleId,
    })
      .populate("userId", "name email role")
      .populate("vehicleId", "make model pricePerDay")
      .sort({ startDate: -1 });

    const enriched = bookings.map((b) => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);

      const days =
        Math.ceil(
          (end - start) /
          (1000 * 60 * 60 * 24)
        ) || 1;

      return {
        _id: b._id,
        user: b.userId,
        vehicle: b.vehicleId,
        startDate: b.startDate,
        endDate: b.endDate,
        days,
        totalPrice: b.totalPrice,
        status: b.status,
        review: b.review || null,
      };
    });

    res.json(enriched);

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch history",
    });
  }
});

router.get("/user/:userId/history", async (req, res) => {
  try {
    const bookings = await Booking.find({
      userId: req.params.userId,
    })
      .populate("vehicleId", "make model")
      .sort({ startDate: -1 });

    res.json(bookings);

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch history",
    });
  }
});

router.post("/review/:id", async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    booking.review = {
      rating,
      comment,
      date: new Date(),
    };

    await booking.save();

    res.json({
      message: "Review submitted successfully",
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to submit review",
    });
  }
});

module.exports = router;