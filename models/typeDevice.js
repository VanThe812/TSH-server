import { Schema, model } from "mongoose";

// Declare the Schema of the Mongo model
var typeDeviceSchema = new Schema({
  name: {
    type: String,
    required: true,
    index: true,
  },
  thingTypeArn: {
    type: String,
    required: true,
  },
  thingTypeId: {
    type: String,
    required: true,
  },
});

//Export the model
export default model("TypeDevice", typeDeviceSchema);
