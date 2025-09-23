// models/RescheduleRequest.js
import mongoose from "mongoose";

const rescheduleRequestSchema = new mongoose.Schema({
  presentation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Presentation",
    required: true,
  },
  requestedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userType: { type: String, enum: ["examiner"], required: true },
  },
  // NEW FIELD: store the requestor's email
  requestorEmail: {
    type: String,
    default: "",
  },
  requestedSlot: {
    date: { type: String, required: true },
    timeRange: {
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const RescheduleRequest = mongoose.model("RescheduleRequest", rescheduleRequestSchema);
export default RescheduleRequest;
