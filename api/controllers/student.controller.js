import Student from "../models/student.model.js";
import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";

export const addStudent = async (req, res) => {
  try {
    const { name, email, password, phone, department } = req.body;

    // Ensure department is provided
    if (!department) return res.status(400).json({ message: "Department is required" });

    // Convert department to uppercase (for consistency)
    const departmentCode = department.toUpperCase();

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    // Get the latest student ID for the same department
    const lastStudent = await Student.findOne({ department }).sort({ student_id: -1 });
    let nextIdNumber = lastStudent ? parseInt(lastStudent.student_id.slice(-3)) + 1 : 1;

    // Generate new student ID with department
    const student_id = `ST${departmentCode}${new Date().getFullYear()}${String(nextIdNumber).padStart(3, "0")}`;

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create Student
    const newStudent = new Student({ student_id, name, email, password: hashedPassword, phone, department });
    await newStudent.save();

    // Create User Profile
    const newUser = new User({ user_id: student_id, username: name, email, password: hashedPassword, role: "student" });
    await newUser.save();

    res.status(201).json({ message: "Student added successfully", student_id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getAllStudents = async (req, res, next) => {
  try {
    const students = await Student.find();
    res.status(200).json(students);
  } catch (error) {
    next(error);
  }
};

// Get student by ID
export const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.status(200).json(student);
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, department } = req.body;

    // Prepare an object to store fields to be updated
    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (email) updatedFields.email = email;
    // Fix: also update phone & department
    if (phone) updatedFields.phone = phone;
    if (department) updatedFields.department = department;

    // Handle password by hashing if provided
    if (password) {
      const hashedPassword = await bcryptjs.hash(password, 10);
      updatedFields.password = hashedPassword;
    }

    // 1️⃣ Update student details
    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      updatedFields,
      { new: true }
    );
    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 2️⃣ Update the corresponding user profile
    //    (Assuming your User doc doesn't store phone or department, so we skip those)
    const updatedUserFields = {};
    if (name) updatedUserFields.username = name;
    if (email) updatedUserFields.email = email;
    if (password) updatedUserFields.password = updatedFields.password;

    await User.findOneAndUpdate(
      { user_id: updatedStudent.student_id },
      updatedUserFields,
      { new: true }
    );

    res.status(200).json({
      message: "Student and user profile updated successfully",
      updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the student
    const deletedStudent = await Student.findByIdAndDelete(id);
    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Delete the associated user profile
    await User.findOneAndDelete({ email: deletedStudent.email });

    res.status(200).json({ message: "Student and user profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getStudentsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const students = await Student.find({ department });

    if (!students.length) {
      return res.status(404).json({ message: "No students found for this department" });
    }

    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

