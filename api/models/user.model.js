import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    user_id: {
      type: String, // Corresponds to student_id or examiner_id
      unique: true
    },
    username: {
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
    profilePicture: {
      type: String,
      default: "https://static.vecteezy.com/system/resources/previews/013/215/160/non_2x/picture-profile-icon-male-icon-human-or-people-sign-and-symbol-vector.jpg"
    },
    role: {
      type: String,
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  }
);

const User = mongoose.model('User', userSchema);

export default User;
