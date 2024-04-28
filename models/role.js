import mongoose from "mongoose";

const { Schema, model } = mongoose;

const roleSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  permissions: [
    {
      type: Schema.Types.ObjectId,
      ref: "permission",
    },
  ],
  timecreate: {
    type: Number,
    required: true,
  },
  timemodifile: Number,
});

const Role = model("role", roleSchema);

export default Role;
