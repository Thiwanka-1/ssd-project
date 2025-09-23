import mongoose from 'mongoose';

const examinerSchema = new mongoose.Schema(
  {
    examiner_id: {
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

const Examiner = mongoose.model('Examiner', examinerSchema);

export default Examiner;
