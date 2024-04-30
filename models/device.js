import mongoose from "mongoose";
import validator from "validator";

const { Schema, model } = mongoose;

const deviceSchema = new Schema({
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
  typeDeviceId: {
    type: Schema.Types.ObjectId,
    ref: "TypeDevice",
  },
  numberOfSubDevice: Number,
  subDevice: [
    {
      nameSubDevice: String,
      nameInHome: String,
      data: Number,
      defaultName: String,
    },
  ],
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
