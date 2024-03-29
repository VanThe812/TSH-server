import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();

// Get a list of 50 posts
router.get("/", async (req, res) => {
  let collection = await db.collection("devices");
  let results = await collection.find({}).limit(50).toArray();

  res.send(results).status(200);
});

export default router;
