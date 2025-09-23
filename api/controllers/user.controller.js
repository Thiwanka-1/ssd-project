import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import bcryptjs from 'bcryptjs';
import Examiner from "../models/examiner.model.js";
import Student from "../models/student.model.js";

export const test = (req, res) => {
  res.json({
    message: 'API is working!',
  });
};
export const verifyAdmin = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) return next(errorHandler(401, 'Unauthorized access!'));

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(errorHandler(403, 'Invalid token!'));
    if (!decoded.isAdmin) return next(errorHandler(403, 'Admin access required!'));
    req.user = decoded;
    next();
  });
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ success: false, message: 'User not found!' });
    }

    const { username, email, password, profilePicture } = req.body;
    const updateData = { username, email, profilePicture };

    if (password) {
      updateData.password = bcryptjs.hashSync(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (user.role === 'examiner') {
      const updatedExaminer = await Examiner.findOneAndUpdate(
        { examiner_id: user.user_id },
        {
          name: username,
          email,
          ...(password && { password: updateData.password }),
        },
        { new: true }
      );

    }

    if (user.role === 'student') {
      const updatedStudent = await Student.findOneAndUpdate(
        { student_id: user.user_id },
        {
          name: username,
          email,
          ...(password && { password: updateData.password }),
        },
        { new: true }
      );

    }

    const { password: pass, ...rest } = updatedUser._doc;
    res.status(200).json(rest);
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ message: error.message });
  }
};



export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, 'username email profilePicture isAdmin'); // Exclude password
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};



export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }

    if (user.isAdmin || req.user.id === req.params.id) {
      const deletedUser = await User.findByIdAndDelete(req.params.id);

      // Delete related Student or Examiner
      if (deletedUser.role === 'student') {
        await Student.findOneAndDelete({ email: deletedUser.email });
      } else if (deletedUser.role === 'examiner') {
        await Examiner.findOneAndDelete({ email: deletedUser.email });
      }

      return res.status(200).json({ message: 'User and related profile deleted successfully.' });
    } else {
      return next(errorHandler(403, 'You do not have permission to delete this account.'));
    }
  } catch (error) {
    next(error);
  }
};