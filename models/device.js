import mongoose from "mongoose";
import validator from "validator";

const { Schema, model } = mongoose;

const deviceSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ["outlet", "lightbuid", "temperature_humidity", "opendoor"],
  },
  description: String,
  timecreate: {
    type: Number,
    required: true,
  },
  timemodifile: Number,
  userId: {
    type: Schema.Types.ObjectId,
    ref: "user",
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: "room",
  },
  numberOfSubDevice: Number,
  subDevice: [
    {
      name: String,
      nameInHome: String,
      data: Number,
    },
  ],
  current_status: {
    type: String,
    enum: ["on", "off"],
    default: "off",
  },
  sensor_data: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  name: String,
  version: String,
  thingArn: {
    type: String,
    require: true,
  },
  thingId: {
    type: String,
    required: true,
  },
  thingName: {
    type: String,
    require: true,
  },
});

export default model("Device", deviceSchema);
