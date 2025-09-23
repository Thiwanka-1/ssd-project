import StudentGroup from "../models/groups.model.js";
import Student from "../models/student.model.js";
import mongoose from "mongoose";

// Generate unique group ID (GR1001, GR1002...)
const generateGroupId = async () => {
  const lastGroup = await StudentGroup.findOne().sort({ group_id: -1 });
  let nextIdNumber = lastGroup ? parseInt(lastGroup.group_id.slice(2)) + 1 : 1001;
  return `GR${nextIdNumber}`;
};

// Add a new student group
export const addStudentGroup = async (req, res) => {
  try {
    const { department, students } = req.body;

    if (!department || !students || students.length === 0) {
      return res.status(400).json({ message: "Department and students are required" });
    }

    // Convert student_id to ObjectId
    const studentDocs = await Student.find({ student_id: { $in: students } });

    if (studentDocs.length !== students.length) {
      return res.status(400).json({ message: "One or more student IDs are invalid" });
    }

    // Check if any of the students are already assigned to a group
    const existingGroup = await StudentGroup.findOne({
      students: { $in: studentDocs.map(student => student._id) }
    });

    if (existingGroup) {
      return res.status(400).json({
        message: `One or more students are already assigned to another group (Group ID: ${existingGroup.group_id}).`
      });
    }

    // Generate new group ID
    const group_id = await generateGroupId();

    // Create new group
    const newGroup = new StudentGroup({
      group_id,
      department,
      students: studentDocs.map(student => student._id), // Store ObjectIds
    });

    await newGroup.save();

    res.status(201).json({ message: "Student group created successfully", group_id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

  
  //  Get All Student Groups
  export const getAllStudentGroups = async (req, res) => {
    try {
      const groups = await StudentGroup.find().populate("students", "student_id name");
      res.status(200).json(groups);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  };
  
  //  Get a Single Student Group by ID
  export const getStudentGroupById = async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Group ID" });
      }
  
      const group = await StudentGroup.findById(id).populate("students", "student_id name");
  
      if (!group) {
        console.log("No group found with ID:", id);
        return res.status(404).json({ message: "Student group not found" });
      }
  
      res.status(200).json(group);
    } catch (error) {
      console.error("Error fetching student group:", error);
      res.status(500).json({ message: "Server error", error });
    }
  };
  
  //  Update Student Group by ObjectId
  export const updateStudentGroup = async (req, res) => {
    try {
      const { id } = req.params;
      const { department, students } = req.body;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Group ID" });
      }
  
      // Find the group
      const group = await StudentGroup.findById(id);
      if (!group) {
        console.log("No group found with ID:", id);
        return res.status(404).json({ message: "Student group not found" });
      }
  
      // Convert student_id to ObjectId
      const studentDocs = await Student.find({ student_id: { $in: students } });
  
      if (studentDocs.length !== students.length) {
        return res.status(400).json({ message: "One or more student IDs are invalid" });
      }
  
      // Check if any student is already assigned to another group (excluding the current group)
      const existingGroup = await StudentGroup.findOne({
        _id: { $ne: id }, // Exclude the current group
        students: { $in: studentDocs.map(student => student._id) }
      });
  
      if (existingGroup) {
        return res.status(400).json({
          message: `One or more students are already assigned to another group (Group ID: ${existingGroup.group_id}).`
        });
      }
  
      // Update the group
      group.department = department || group.department;
      group.students = studentDocs.map(student => student._id);
  
      await group.save();
  
      res.status(200).json({ message: "Student group updated successfully", updatedGroup: group });
    } catch (error) {
      console.error("Error updating student group:", error);
      res.status(500).json({ message: "Server error", error });
    }
  };
  
  //  Delete a Student Group by ObjectId
  export const deleteStudentGroup = async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Group ID" });
      }
  
  
      const deletedGroup = await StudentGroup.findByIdAndDelete(id);
      if (!deletedGroup) {
        console.log("No group found with ID:", id);
        return res.status(404).json({ message: "Student group not found" });
      }
  
      res.status(200).json({ message: "Student group deleted successfully" });
    } catch (error) {
      console.error("Error deleting student group:", error);
      res.status(500).json({ message: "Server error", error });
    }
  };