import express from "express";
import {
  IoTClient,
  ListThingsCommand,
  CreateThingCommand,
} from "@aws-sdk/client-iot";
import {
  IoTDataPlaneClient,
  GetRetainedMessageCommand,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import Device from "../models/device.js";
import User from "../models/user.js";
import Room from "../models/room.js";
import jwt from "jsonwebtoken";

import {
  decodeUint8Array,
  encodeUint8Array,
  checkTimeThreshold,
} from "../helpers/utils.js";
import device from "../models/device.js";

const router = express.Router();

// Get list device in home
router.post("/getListDevicesInHome", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res
        .status(400)
        .send({ error: 1, message: "Missing a field request" });

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken._id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    const devices = await Device.find({ userId: user._id }).toJSON();
    return res.status(200).json({ ...devices });
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

// Get list device in room
router.get("/getListDevicesInRoom", async (req, res) => {
  try {
    const { token, roomId } = req.query;
    if (!token || !roomId)
      return res
        .status(400)
        .send({ error: 1, message: "Missing a field request" });

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken._id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 1, message: "Can't find the room" });
    }

    const devices = await Device.find({
      userId: user._id,
      roomId: roomId,
    });
    const data = {
      _id: room._id,
      name: room.name,
      devices: devices,
    };
    return res.status(200).json(data);
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

//Check device available and online
router.post("/checkDeviceAvailable", async (req, res) => {
  try {
    // Get params
    const { deviceCode, token } = req.body;

    const thingName = deviceCode;
    // Check params validated
    // thingName: required
    // token: required
    if (!thingName || !token) {
      return res.status(400).json({
        error: 1,
        message: "'deviceCode' or 'token' is missing.",
      });
    }

    // Verify user
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken._id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    // Tìm thiết bị
    const device = await Device.findOne({ thingName: thingName });
    if (!device) {
      return res.status(404).json({
        error: 1,
        message: "Device not found",
      });
    }

    // Kiểm tra thiết bị đã thuộc nhà nào chưa
    // if (device.userId && device.userId !== null) {
    //   return res.status(403).json({
    //     error: 1,
    //     message: "The device already belongs to another house",
    //   });
    // }

    // Setup client
    const client = new IoTDataPlaneClient({
      region: process.env.REGION,
      credentials: AWS.config.credentials,
    });
    const input = {
      topic: thingName + "/pub", // required
    };
    const command = new GetRetainedMessageCommand(input);
    const response = await client.send(command);

    // Kiểm tra thiết bị có online trong 60s trở lại không
    if (!checkTimeThreshold(response.lastModifiedTime, 60)) {
      return res.status(404).json({
        error: 1,
        message: "Device is not online",
      });
    }

    const codeAccess = jwt.sign({ thingName }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    return res.status(200).json({ codeAccess });
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

router.post("/addDeiveToHome", async (req, res) => {
  try {
    // Get params
    const { deviceCode, token, codeAccess } = req.body;

    const thingName = deviceCode;

    // Check params validated
    // thingName: required
    // token: required
    if (!thingName || !token) {
      return res.status(400).json({
        error: 1,
        message: "'thingName' or 'token' is missing.",
      });
    }

    // Verify user
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken._id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    // Tìm thiết bị
    const device = await Device.findOne({ thingName: thingName });
    if (!device) {
      return res.status(404).json({
        error: 1,
        message: "Device not found",
      });
    }

    // Kiểm tra thiết bị đã thuộc nhà nào chưa
    // if (device.userId && device.userId !== null) {
    //   return res.status(403).json({
    //     error: 1,
    //     message: "The device already belongs to another house",
    //   });
    // }

    // Setup client
    const client = new IoTDataPlaneClient({
      region: process.env.REGION,
      credentials: AWS.config.credentials,
    });
    // Kiểm tra thiết bị có online trong 60s trở lại không
    const input = {
      topic: thingName + "/pub", // required
    };
    const command = new GetRetainedMessageCommand(input);
    const response = await client.send(command);

    if (!checkTimeThreshold(response.lastModifiedTime, 60)) {
      return res.status(404).json({
        error: 1,
        message: "Device is not online",
      });
    }

    const decodeAccessToken = jwt.verify(codeAccess, process.env.JWT_SECRET);
    console.log(decodeAccessToken);
    if (!decodeAccessToken.thingName === thingName) {
      return res.status(200).json({
        error: 1,
        message: "Not permission",
      });
    }

    // Data gửi tin nhắn cho thiết bị
    const data = {
      action: "confirm",
      userId: user._id,
    };
    //Gửi yêu cầu confirm cho thiết bị
    const inputForPublish = {
      topic: thingName + "/sub", // required
      payload: encodeUint8Array(data),
      contentType: "UTF-8",
    };
    const commandF = new PublishCommand(inputForPublish);
    const responseF = await client.send(commandF);
    console.log(responseF);
    return res.status(200).json({
      message: true,
    });
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

router.post("/getStatusConfirm", async (req, res) => {
  try {
    const { deviceCode, token } = req.body;

    const thingName = deviceCode;

    // Check params validated
    // thingName: required
    // token: required
    if (!thingName || !token) {
      return res.status(400).json({
        error: 1,
        message: "'thingName' or 'token' is missing.",
      });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken._id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    const client = new IoTDataPlaneClient({
      region: process.env.REGION,
      credentials: AWS.config.credentials,
    });
    const input = {
      topic: thingName + "/confirm", // required
    };
    const command = new GetRetainedMessageCommand(input);
    const response = await client.send(command);

    let data = decodeUint8Array(response.payload);
    if (
      checkTimeThreshold(response.lastModifiedTime, 60) &&
      data.statusConfirm &&
      data.userId === user._id.toString()
    ) {
      const device = await Device.findOne({ thingName: thingName });

      // Add device to my home
      device.userId = user._id;
      await device.save();

      return res.status(200).json({ ...device.toJSON() });
    } else {
      return res.status(200).json({
        error: 1,
        message: "Unverified device",
      });
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

router.post("/updateDevice", async (req, res) => {
  try {
    const { token, deviceId, roomId, subDevice } = req.body;

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken._id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 1, message: "Device not found" });
    }

    device.roomId = roomId;
    const newSubDevice = device.subDevice.map((item) => {
      const replacement = subDevice.find(
        (replacement) => replacement.nameSubDevice === item.nameSubDevice
      );
      if (replacement) {
        return {
          ...item,
          nameInHome: replacement.nameInHome,
        };
      } else {
        return item;
      }
    });

    device.subDevice = newSubDevice;
    await device.save();
    return res.status(200).json(device);
    // res.status(200).json({ ...device.toJSON() });
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

router.post("/getDataDevice", async (req, res) => {
  try {
    const { token, deviceId } = req.body;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken._id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    const device = await Device.findById(deviceId);

    if (!device) {
      return res.status(404).json({
        error: 1,
        message: "Device not found",
      });
    }

    const client = new IoTDataPlaneClient({
      region: process.env.REGION,
      credentials: AWS.config.credentials,
    });
    const input = {
      topic: device.thingName + "/pub", // required
    };
    const command = new GetRetainedMessageCommand(input);
    const response = await client.send(command);

    const data = decodeUint8Array(response.payload);

    return res.status(200).json({ ...data, ...response.lastModifiedTime });
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

router.post("/deviceControl", async (req, res) => {
  try {
    const { token, status, deviceId, nameSubDevice } = req.body;

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken._id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    const device = await Device.findById(deviceId);

    if (!device) {
      return res.status(404).json({
        error: 1,
        message: "Device not found",
      });
    }

    const data = {
      action: "updateStatus",
      nameSubDevice: nameSubDevice,
      // status: status == "on" ? 1 : 0,
      status: status,
    };
    console.log(data);
    const client = new IoTDataPlaneClient({
      region: process.env.REGION,
      credentials: AWS.config.credentials,
    });

    const inputForPublish = {
      topic: device.thingName + "/sub", // required
      payload: encodeUint8Array(data),
      contentType: "UTF-8",
    };
    const command = new PublishCommand(inputForPublish);
    const response = await client.send(command);
    return res.status(200).json({ ...response });
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

// Create thing
router.post("/admin/createDevice", async (req, res) => {
  try {
    const { token, description, typeDeviceId, numberOfSubDevice } = req.body;
    console.log(AWS.config.credentials);
    //Call API to AWS
    // const credentials = fromIni();
    const client = new IoTClient({
      region: process.env.REGION,
      // credentials: credentials,
    });
    const name2 = name !== "" ? name : uuidv4();

    const input = {
      thingName: "tsh_" + name2, // required max 128 Pattern: [a-zA-Z0-9:_-]+
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
