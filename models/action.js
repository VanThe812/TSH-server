import { Schema, model } from "mongoose";

// Declare the Schema of the Mongo model
var actionSchema = new Schema({
  listenDeviceId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  actionTimeStart: {
    type: Number,
  },
  actionTimeEnd: {
    type: Number,
  },
  weekdays: {
    type: String,
  },
  triggerAction: {
    type: Number,
    enum: [0, 1],
  },
  dataAction: {
    type: Number,
  },
  devicePerforming: [
    {
      deviceId: {
        type: Schema.Types.ObjectId,
        require: true,
      },
      status: {
        type: Number,
        require: true,
        default: 0,
      },
    },
  ],
});

//Export the model
export default model("Action", actionSchema);
