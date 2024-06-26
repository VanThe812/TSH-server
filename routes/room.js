import express from "express";
import User from "../models/user.js";
import Rool from "../models/room.js";
import jwt from "jsonwebtoken";
import Room from "../models/room.js";
import Device from "../models/device.js";

const router = express.Router();

// Create room
router.post("/createRoom", async (req, res) => {
  try {
    const { token, name } = req.body;
    if (!token || !name)
      return res
        .status(400)
        .send({ error: 1, message: "Missing a number of field request" });

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken._id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    const checkRoom = await Room.findOne({ name });

    if (checkRoom) {
      return res
        .status(404)
        .json({ code: "ER05", message: "Room already exists" });
    }

    const room = new Room({
      userId: user._id,
      name: name,
      timecreate: Math.floor(Date.now() / 1000),
    });

    await Room.create(room);
    return res.status(200).json({ ...room.toJSON() });
  } catch (error) {
    console.log(error);
    let errorMessage = "An error occurred.";
    if (error.errors) {
      errorMessage = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
    }
    if (error.message) {
      errorMessage = error.name + ": " + error.message;
    }
    res.status(500).json({
      error: 1,
      message: errorMessage,
    });
  }
});

router.post("/deleteRoom", async (req, res) => {
  try {
    const { token, roomId } = req.body;

    if (!token || !roomId) {
      return res.status(400).json({ error: 1, message: "Missing data" });
    }
    // Check token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken._id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    const isDevice = await Device.findOne({ roomId: roomId });
    if (isDevice) {
      return res.status(403).json({
        error: 1,
        message: "Please move the devices to another room to continue",
      });
    }

    // const room = Room.findById(roomId);
    // await Device.deleteOne()
    const deletedItem = await Room.findByIdAndDelete(roomId);
    if (deletedItem) {
      return res.status(200).json({ message: "Successfully deleted" });
    } else {
      return res.status(500).json({ message: "An error occurred" });
    }
  } catch (error) {
    console.log(error);
    let errorMessage = "An error occurred.";
    if (error.errors) {
      errorMessage = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
    }
    if (error.message) {
      errorMessage = error.name + ": " + error.message;
    }
    res.status(500).json({
      error: 1,
      message: errorMessage,
    });
  }
});

router.post("/getAllMyRoom", async (req, res) => {
  try {
    const { token } = req.body;

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken._id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    const rooms = await Room.find({ userId: user._id });
    return res.status(200).json({ ...rooms });
  } catch (error) {
    console.log(error);
    let errorMessage = "An error occurred.";
    if (error.errors) {
      errorMessage = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
    }
    if (error.message) {
      errorMessage = error.name + ": " + error.message;
    }
    res.status(500).json({
      error: 1,
      message: errorMessage,
    });
  }
});

export default router;
