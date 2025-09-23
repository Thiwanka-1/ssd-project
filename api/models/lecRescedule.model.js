import mongoose from "mongoose";

const rescheduledLectureSchema = new mongoose.Schema({
  lecturer_id: {
    type: String,
    required: true,
  },
  original_date: {
    type: String, // YYYY-MM-DD format
    required: true,
  },
  rescheduled_date: {
    type: String, // YYYY-MM-DD format
    required: true,
  },
  lectures: [
    {
      start_time: { type: String, required: true },
      end_time: { type: String, required: true },
      module_code: { type: String, required: true },
      venue_id: { type: String, required: true },
      group_id: { type: String, required: true }, 
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const RescheduledLecture = mongoose.model("RescheduledLecture", rescheduledLectureSchema);
export default RescheduledLecture;
