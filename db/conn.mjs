import { MongoClient } from "mongodb";
import mongoose from "mongoose";

const connectionString = process.env.ATLAS_URI || "";

async function connectToMongo() {
  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    await mongoose.connect(connectionString, { dbName: "TSH" });
    console.log("Connected to MongoDB");
    return client.db("TSH");
  } catch (e) {
    console.error("Failed to connect to MongoDB:", e);
    process.exit(1); // Thoát chương trình với mã lỗi
  }
}

const db = await connectToMongo();

export default db;
