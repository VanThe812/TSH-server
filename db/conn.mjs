import { MongoClient } from "mongodb";

console.log("a:", process.env.ATLAS_URI);
const connectionString = process.env.ATLAS_URI || "";

const client = new MongoClient(connectionString);

let conn;
try {
  conn = await client.connect();
} catch (e) {
  console.error(e);
}

let db = conn.db("TSH");

export default db;
