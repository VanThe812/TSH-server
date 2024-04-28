import mongoose from "mongoose";

const { Schema, model } = mongoose;

const permissionSchema = new Schema({
  namePermission: {
    type: String,
    required: true,
  },
});

const Permission = model("permission", permissionSchema);

export default Permission;
