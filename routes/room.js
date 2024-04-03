import express from "express";
import User from "../models/user.js";
import Rool from "../models/room.js";
import jwt from "jsonwebtoken";
import Room from "../models/room.js";

const router = express.Router();

// Create room
router.post("/createRoom", async (req, res) => {
  try {
    const { token, name, roomBackground } = req.body;
    if (!token || !name)
      return res
        .status(400)
        .send({ error: 1, message: "Missing a number of field request" });

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    const room = new Room({
      userId: user._id,
      name: name,
      timecreate: Math.floor(Date.now() / 1000),
      roomBackground: roomBackground,
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

export default router;