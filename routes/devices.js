import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import {
  IoTClient,
  ListThingsCommand,
  CreateThingCommand,
} from "@aws-sdk/client-iot";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import Device from "../models/device.js";

const router = express.Router();

// Home
// Get list device in home
router.get("/getListDevicesInHome", async (req, res) => {
  // const {token} =  req.query;
  // if (!token) return res.status(401).send("Token is missing!");

  // //Xác thực
  // const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  // const userId = decodedToken.id;

  // // Tìm người dùng dựa trên userId
  // const user = await User.findById(userId);
  // if (!user) {
  //   return res.status(404).json({ error: 1, message: "User not found." });
  // }
  try {
    const credentials = fromIni();
    const client = new IoTClient({
      region: process.env.REGION,
      credentials: credentials,
    });

    const input = {
      // ListThingsRequest
      nextToken: null,
      maxResults: 100,
      attributeName: "",
      attributeValue: "",
      thingTypeName: "",
      usePrefixAttributeValue: false,
    };
    const command = new ListThingsCommand(input);
    const response = await client.send(command);
    console.log(response);
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
// Get status device by id
// Get data sensor by id
// Get device detail by id
// Update status of device
// Update device
// Add new device to home
// Check device available and online
// Delete device

// Room
// Create room
// Get list room devices
// Update info room
// Delete room

// Action
// Get list action of user
// Get one action by id
// Add new action

//Admin
// Create thing
router.post("/admin/create-thing", async (req, res) => {
  try {
    const { name, description, type, version } = req.body;
    console.log(AWS.config.credentials);
    //Call API to AWS
    // const credentials = fromIni();
    const client = new IoTClient({
      region: process.env.REGION,
      // credentials: credentials,
    });
    const name2 = name !== "" ? name : uuidv4();

    const input = {
      thingName: "iot_" + name2, // required max 128 Pattern: [a-zA-Z0-9:_-]+
    };
    const command = new CreateThingCommand(input);
    const response = await client.send(command);

    const device = new Device({
      type,
      description,
      timecreate: Math.floor(Date.now() / 1000),
      version,
      thingArn: response.thingArn,
      thingId: response.thingId,
      thingName: response.thingName,
    });
    await Device.create(device);

    return res.status(200).json({ ...device.toJSON() });
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
