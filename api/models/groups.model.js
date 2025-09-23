import mongoose from "mongoose";

const studentGroupSchema = new mongoose.Schema({
  group_id: {
    type: String,
    required: true,
    unique: true
  },
  department: {
    type: String,
    required: true
  },
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student"
    }
  ],
  created_at: {
    type: Date,
    default: Date.now
  }
});

const StudentGroup = mongoose.model("StudentGroup", studentGroupSchema);

export default StudentGroup;
