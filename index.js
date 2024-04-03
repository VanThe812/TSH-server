import express from "express";
import cors from "cors";
import "./loadEnvironment.mjs";
import "express-async-errors";
// import "./awsTokenManager.js";
import devices from "./routes/devices.js";
import user from "./routes/user.js";
import room from "./routes/room.js"

const PORT = process.env.PORT || 5001;
const app = express();

app.use(cors());
app.use(express.json());

app.use("/devices", devices);
app.use("/user", user);
app.use("/room", room);

// Global error handling
app.use((err, _req, res, next) => {
  res.status(500).send("Uh oh! An unexpected error occured.");
});

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
