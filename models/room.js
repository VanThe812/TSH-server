import mongoose from "mongoose";

const { Schema, model } = mongoose;

const roomSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "user",
  },
  name: {
    type: String,
    required: true,
  },
  defaultName: {
    type: String,
    required: true,
  },
  timecreate: {
    type: Number,
    required: true,
  },
  timemodifile: Number,
});

export default model("Room", roomSchema);
