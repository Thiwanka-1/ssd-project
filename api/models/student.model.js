import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    student_id: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    phone: {
      type: String
    },
    department: {
      type: String
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  }
);

const Student = mongoose.model('Student', studentSchema);

export default Student;
