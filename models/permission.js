import mongoose from "mongoose";

const { Schema, model } = mongoose;

const permissionSchema = new Schema({
  name_permission: {
    type: String,
    required: true,
  },
  timecreate: {
    type: Number,
    required: true,
  },
  timemodifile: Number,
});

const Permission = model("permission", permissionSchema);

export default Permission;
