import express from "express";
import {
  IoTClient,
  ListThingsCommand,
  CreateThingCommand,
} from "@aws-sdk/client-iot";
import {
  IoTDataPlaneClient,
  GetThingShadowCommand,
  GetRetainedMessageCommand,
  ListRetainedMessagesCommand,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import Device from "../models/device.js";
import User from "../models/user.js";
import jwt from "jsonwebtoken";

function decodeUint8Array(uintArray) {
  const decoder = new TextDecoder("utf-8");
  const decodedString = decoder.decode(uintArray);
  return JSON.parse(decodedString);
}
function encodeUint8Array(data) {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  return encoder.encode(jsonString);
}
function checkTimeThreshold(lastModifiedTime, second) {
  // Lấy thời gian hiện tại
  const currentTime = new Date();
  // Ngưỡng thời gian cần kiểm tra
  const thresholdSeconds = second;
  // Tính toán khoảng cách thời gian trong giây
  const diffInSeconds = Math.abs((currentTime - lastModifiedTime) / 1000);

  const isWithinThreshold = diffInSeconds <= thresholdSeconds;
  return isWithinThreshold;
}

const router = express.Router();

// Home
// Get list device in home
router.post("/getListDevicesInHome", async (req, res) => {
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
    const client = new IoTClient({
      region: process.env.REGION,
    });

    const input = {
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

//Check device available and online
router.post("/checkDeviceAvailable", async (req, res) => {
  try {
    const { thingName, token } = req.body;

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    const device = await Device.findOne({ thingName: thingName });

    if (!device) {
      return res.status(404).json({
        error: 1,
        message: "Device not found",
      });
    }

    // Kiểm tra thiết bị đã thuộc nhà nào chưa
    if (device.userId && device.userId !== null) {
      return res.status(403).json({
        error: 1,
        message: "The device already belongs to another house",
      });
    }

    const credentials = fromIni();
    const client = new IoTDataPlaneClient({
      region: process.env.REGION,
      credentials: credentials,
    });
    const input = {
      // GetRetainedMessageRequest
      topic: thingName + "/pub", // required
    };
    const command = new GetRetainedMessageCommand(input);

    const response = await client.send(command);

    // Thời gian gần nhất thiết bị cập nhật
    const lastModifiedTime = response.lastModifiedTime;
    // Lấy thời gian hiện tại
    const currentTime = new Date();
    // Ngưỡng thời gian cần kiểm tra
    const thresholdSeconds = 30;
    // Tính toán khoảng cách thời gian trong giây
    const diffInSeconds = Math.abs((currentTime - lastModifiedTime) / 1000);

    const isWithinThreshold = diffInSeconds <= thresholdSeconds;
    if (isWithinThreshold) {
      const data = {
        status: "confirm",
        userId: user._id,
      };
      //Gửi yêu cầu confirm cho thiết bị
      // const jsonString = JSON.stringify(data);
      // const encoder = new TextEncoder();
      // const jsonUint8Array = encoder.encode(jsonString);
      const inputForPublish = {
        // PublishRequest
        topic: thingName + "/sub", // required
        payload: encodeUint8Array(data), // e.g. Buffer.from("") or new TextEncoder().encode("")
        contentType: "UTF-8",
        // responseTopic: "STRING_VALUE",
        // correlationData: "STRING_VALUE",
        // messageExpiry: Number("long"),
      };
      const commandF = new PublishCommand(inputForPublish);
      const responseF = await client.send(commandF);
      console.log(responseF);
      return res.status(200).json({
        message: true,
      });
    } else {
      return res.status(404).json({
        error: 1,
        message: "Device is not online",
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

router.post("/getStatusConfirm", async (req, res) => {
  try {
    const { thingName, token } = req.body;

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.id;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: 1, message: "Not permission" });
    }

    // const credentials = fromIni();
    const client = new IoTDataPlaneClient({
      region: process.env.REGION,
      // credentials: credentials,
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
      return res.status(404).json({
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
    const { token, deviceId, roomId, name } = req.body;

    if (!token || !deviceId || !roomId || !name) {
      return res
        .status(400)
        .json({ error: 1, message: "Missing a number of field request" });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.id;

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
    device.name = name;
    await device.save();

    res.status(200).json({ ...device.toJSON() });
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
    const userId = decodedToken.id;

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

    // const credentials = fromIni();
    const client = new IoTDataPlaneClient({
      region: process.env.REGION,
      // credentials: credentials,
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
    const { token, status, deviceId } = req.body;

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.id;

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
      status: status,
    };
    // const credentials = fromIni();
    const client = new IoTDataPlaneClient({
      region: process.env.REGION,
      // credentials: credentials,
    });

    const inputForPublish = {
      // PublishRequest
      topic: device.thingName + "/sub", // required
      payload: encodeUint8Array(data), // e.g. Buffer.from("") or new TextEncoder().encode("")
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
