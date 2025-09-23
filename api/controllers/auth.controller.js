import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from "google-auth-library";
import Student from "../models/student.model.js";


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleCallback = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "No token provided" });

    // ✅ Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // ✅ 1️⃣ Check if user already exists in Users collection
    let user = await User.findOne({ email: payload.email });

    if (!user) {
      // 🔹 Also check if student record already exists (rare case)
      let student = await Student.findOne({ email: payload.email });

      if (!student) {
        // 2️⃣ Generate new student_id
        const department = "GEN"; // default dept (update later if needed)
        const lastStudent = await Student.findOne({ department }).sort({ student_id: -1 });
        const nextIdNumber = lastStudent
          ? parseInt(lastStudent.student_id.slice(-3)) + 1
          : 1;
        const student_id = `ST${department}${new Date().getFullYear()}${String(
          nextIdNumber
        ).padStart(3, "0")}`;

        // 3️⃣ Create student record
        const generatedPassword =
          Math.random().toString(36).slice(-8) +
          Math.random().toString(36).slice(-8);
        const hashedPassword = await bcryptjs.hash(generatedPassword, 10);

        student = new Student({
          student_id,
          name: payload.name,
          email: payload.email,
          password: hashedPassword,
          phone: "",
          department,
        });
        await student.save();

        // 4️⃣ Create linked user record
        user = new User({
          user_id: student_id,
          username: payload.name,
          email: payload.email,
          password: hashedPassword,
          profilePicture: payload.picture,
          role: "student",
          isAdmin: false,
        });
        await user.save();
      } else {
        // ✅ student exists but user doesn’t — create only User entry
        user = new User({
          user_id: student.student_id,
          username: student.name,
          email: student.email,
          password: student.password,
          role: "student",
          isAdmin: false,
        });
        await user.save();
      }
    }

    // ✅ Issue JWT and refresh session safely
    const appToken = jwt.sign(
      { id: user._id, role: user.role || "student", isAdmin: user.isAdmin || false },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // ✅ Fix session fixation & cookie security
    res.clearCookie("access_token");
    res.cookie("access_token", appToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1 hour
      overwrite: true,
    });

    // ✅ Respond like normal login
    res.status(200).json({
      id: user._id,
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      role: user.role || "student",
      isAdmin: user.isAdmin || false,
      token: appToken,
    });
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.status(500).json({ message: "Google login failed" });
  }
};




export const signup = async (req, res, next) => {
  const { username, email, password } = req.body;
  const hashedPassword = bcryptjs.hashSync(password, 10);
  const newUser = new User({ username, email, password: hashedPassword, isAdmin: false });
  try {
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    next(error);
  }
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const validUser = await User.findOne({ email });
    if (!validUser) return next(errorHandler(404, 'User not found'));

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) return next(errorHandler(401, 'Wrong credentials'));

    // ✅ Ensure `role` is always included
    const userRole = validUser.isAdmin ? 'admin' : validUser.role || 'user';

    // ✅ Include role in JWT
    const token = jwt.sign(
      { id: validUser._id, isAdmin: validUser.isAdmin, role: userRole }, 
      process.env.JWT_SECRET
    );

    const { password: hashedPassword, ...rest } = validUser._doc;
    const expiryDate = new Date(Date.now() + 86400000); // 1 hour

    res
      .cookie('access_token', token, { httpOnly: true, expires: expiryDate })
      .status(200)
      .json({ 
        ...rest, 
        token, 
        role: userRole // ✅ Ensure role is included in response
      });
  } catch (error) {
    next(error);
  }
};



export const google = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      const { password: hashedPassword, ...rest } = user._doc;
      const expiryDate = new Date(Date.now() + 86400000); // 1 hour
      res
        .cookie('access_token', token, {
          httpOnly: true,
          expires: expiryDate,
        })
        .status(200)
        .json(rest);
    } else {
      const generatedPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);
      const newUser = new User({
        username:
          req.body.name.split(' ').join('').toLowerCase() +
          Math.random().toString(36).slice(-8),
        email: req.body.email,
        password: hashedPassword,
        profilePicture: req.body.photo,
      });
      await newUser.save();
      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
      const { password: hashedPassword2, ...rest } = newUser._doc;
      const expiryDate = new Date(Date.now() + 86400000); // 1 hour
      res
        .cookie('access_token', token, {
          httpOnly: true,
          expires: expiryDate,
        })
        .status(200)
        .json(rest);
    }
  } catch (error) {
    next(error);
  }
};

export const signout = (req, res) => {
  res.clearCookie('access_token').status(200).json('Signout success!');
};