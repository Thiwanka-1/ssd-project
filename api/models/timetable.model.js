import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema({
  group_id: {
    type: String,
    required: true,
    unique: true, // Each group has only one timetable
  },
  schedule: [
    {
      day: {
        type: String,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        required: true,
      },
      lectures: [
        {
          start_time: { type: String, required: true },
          end_time: { type: String, required: true },
          module_code: { type: String, required: true }, // Use module code, NOT ObjectId
          lecturer_id: { type: String, required: true }, // Use examiner_id, NOT ObjectId
          venue_id: { type: String, required: true }, // Use venue_id, NOT ObjectId
        },
      ],
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const Timetable = mongoose.model("Timetable", timetableSchema);
export default Timetable;
