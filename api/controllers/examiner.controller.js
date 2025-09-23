import Examiner from "../models/examiner.model.js";
import User from "../models/user.model.js";
import bcryptjs from 'bcryptjs';

export const addExaminer = async (req, res) => {
  try {
    const { name, email, password, phone, department } = req.body;

    // Ensure department is provided
    if (!department) return res.status(400).json({ message: "Department is required" });

    // Convert department to uppercase (for consistency)
    const departmentCode = department.toUpperCase();

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    // Get the latest examiner ID for the same department
    const lastExaminer = await Examiner.findOne({ department }).sort({ examiner_id: -1 });
    let nextIdNumber = lastExaminer ? parseInt(lastExaminer.examiner_id.slice(-3)) + 1 : 1;

    // Generate new examiner ID with department
    const examiner_id = `EX${departmentCode}${new Date().getFullYear()}${String(nextIdNumber).padStart(3, "0")}`;

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create Examiner
    const newExaminer = new Examiner({ examiner_id, name, email, password: hashedPassword, phone, department });
    await newExaminer.save();

    // Create User Profile
    const newUser = new User({ user_id: examiner_id, username: name, email, password: hashedPassword, role: "examiner" });
    await newUser.save();

    res.status(201).json({ message: "Examiner added successfully", examiner_id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getAllExaminers = async (req, res, next) => {
  try {
    const examiners = await Examiner.find();
    res.status(200).json(examiners);
  } catch (error) {
    next(error);
  }
};

// Get examiner by ID
export const getExaminerById = async (req, res, next) => {
  try {
    const examiner = await Examiner.findById(req.params.id);
    if (!examiner) return res.status(404).json({ message: "Examiner not found" });

    res.status(200).json(examiner);
  } catch (error) {
    next(error);
  }
};

export const updateExaminer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, department } = req.body;

    // 1) Find examiner by ID
    const examiner = await Examiner.findById(id);
    if (!examiner) {
      return res.status(404).json({ message: "Examiner not found" });
    }

    // 2) Update examiner fields if provided
    if (name) examiner.name = name;
    if (email) examiner.email = email;
    if (phone) examiner.phone = phone;
    if (department) examiner.department = department;

    // 3) If a new password is provided, hash it
    if (password) {
      const hashedPassword = await bcryptjs.hash(password, 10);
      examiner.password = hashedPassword;
    }

    await examiner.save();

    // 4) Update corresponding user details if the user doc is found
    const user = await User.findOne({ user_id: examiner.examiner_id });
    if (user) {
      if (name) user.username = name;
      if (email) user.email = email;
      if (password) {
        user.password = examiner.password; // already hashed
      }

      await user.save();
    }

    res.status(200).json({
      message: "Examiner and user profile updated successfully",
      examiner,
    });
  } catch (error) {
    console.error("Error updating examiner:", error);
    res.status(500).json({ message: "Server error", error });
  }
};


export const deleteExaminer = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the examiner
    const deletedExaminer = await Examiner.findByIdAndDelete(id);
    if (!deletedExaminer) {
      return res.status(404).json({ message: "Examiner not found" });
    }

    // Delete the associated user profile
    await User.findOneAndDelete({ email: deletedExaminer.email });

    res.status(200).json({ message: "Examiner and user profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getExaminersByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const examiners = await Examiner.find({ department });

    if (!examiners.length) {
      return res.status(404).json({ message: "No examiners found for this department" });
    }

    res.status(200).json(examiners);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
