import mongoose from "mongoose";

const presentationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
  ],
  examiners: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Examiner",
      required: true,
    },
  ],
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Venue",
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  numOfExaminers: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  duration:{
    type: Number,
    required: true
  },
  timeRange: {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const Presentation = mongoose.model("Presentation", presentationSchema);

export default Presentation;
