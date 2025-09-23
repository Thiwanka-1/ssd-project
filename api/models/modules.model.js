import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema({
  module_code: {
    type: String,
    required: true,
    unique: true
  },
  module_name: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  lecturer_in_charge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Examiner",
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Module = mongoose.model("Module", moduleSchema);

export default Module;
