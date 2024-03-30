import mongoose from "mongoose";
import validator from "validator";

const { Schema, model } = mongoose;

const userSchema = new Schema({
  fullname: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Number,
    required: true,
  },
  address: String,
  email: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return validator.isEmail(v);
      },
      message: (props) => `${props.value} is not a valid email address`,
    },
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
  },
  account: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return !validator.contains(v, " ");
      },
      message: (props) => "Account must not contain spaces!",
    },
  },
  password: {
    type: String,
    required: true,
  },
  timeaccess: Number,
  timecreate: {
    type: Number,
    required: true,
  },
  timemodifile: Number,
  role_id: {
    type: Schema.Types.ObjectId,
    ref: "role",
  },
});

// Export model using default export
export default model("user", userSchema);
