// api/controllers/groups.controller.js
import StudentGroup from "../models/groups.model.js";
import Student from "../models/student.model.js";
import mongoose from "mongoose";
import Joi from "joi";

/**
 * Helper: basic sanitize to remove $ and . which are used in Mongo operators/paths.
 * This defangs attempts like { "$ne": ... } or nested operator injection.
 */
const sanitizeString = (v) => {
  if (typeof v !== "string") return v;
  return v.replace(/[$.]/g, "");
};

const sanitizeArrayOfStrings = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => sanitizeString(String(x).trim()));
};

/**
 * Joi schemas for requests
 */
const addGroupSchema = Joi.object({
  department: Joi.string().trim().min(2).max(100).required(),
  students: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
});

const updateGroupSchema = Joi.object({
  department: Joi.string().trim().min(2).max(100).optional(),
  students: Joi.array().items(Joi.string().trim().min(1)).min(1).optional(),
});

/**
 * Generate Group ID like GR1001, GR1002 ...
 */
const generateGroupId = async () => {
  const lastGroup = await StudentGroup.findOne().sort({ group_id: -1 });
  let nextIdNumber = lastGroup ? parseInt(lastGroup.group_id.slice(2)) + 1 : 1001;
  return `GR${nextIdNumber}`;
};

/**
 * Add a new student group
 */
export const addStudentGroup = async (req, res) => {
  try {
    const { error, value } = addGroupSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    const department = sanitizeString(value.department);
    // 🔒 Sanitize each student id
    const studentsInput = sanitizeArrayOfStrings(value.students).map((s) => String(s));

    const studentDocs = await Student.find({
      student_id: { $in: studentsInput }
    }).select("_id student_id name");

    if (studentDocs.length !== studentsInput.length) {
      return res.status(400).json({ message: "One or more student IDs are invalid" });
    }

    const existingGroup = await StudentGroup.findOne({
      students: { $in: studentDocs.map((s) => new mongoose.Types.ObjectId(s._id)) },
    }).select("group_id");

    if (existingGroup) {
      return res.status(400).json({
        message: `One or more students are already assigned to another group (Group ID: ${existingGroup.group_id}).`,
      });
    }

    const group_id = await generateGroupId();

    const newGroup = new StudentGroup({
      group_id,
      department,
      students: studentDocs.map((s) => s._id),
    });

    await newGroup.save();

    return res.status(201).json({
      message: "Student group created successfully",
      group_id,
    });
  } catch (err) {
    console.error("addStudentGroup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * Get all groups
 */
export const getAllStudentGroups = async (req, res) => {
  try {
    const groups = await StudentGroup.find().populate("students", "student_id name");
    return res.status(200).json(groups);
  } catch (err) {
    console.error("getAllStudentGroups error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get a group by its ObjectId
 */
export const getStudentGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    const group = await StudentGroup.findById(new mongoose.Types.ObjectId(id)).populate("students", "student_id name");
    if (!group) {
      return res.status(404).json({ message: "Student group not found" });
    }

    return res.status(200).json(group);
  } catch (err) {
    console.error("getStudentGroupById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update a group by ObjectId
 */
export const updateStudentGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    // Validate request body
    const { error, value } = updateGroupSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    const group = await StudentGroup.findById(new mongoose.Types.ObjectId(id));
    if (!group) {
      return res.status(404).json({ message: "Student group not found" });
    }

    // If students present, verify them
    let studentDocs = [];
    if (value.students) {
      // 🔒 Strong sanitize & enforce string array
      const studentsInput = sanitizeArrayOfStrings(value.students).map((s) => String(s));

      studentDocs = await Student.find({
        student_id: { $in: studentsInput }
      }).select("_id student_id");

      if (studentDocs.length !== studentsInput.length) {
        return res.status(400).json({ message: "One or more student IDs are invalid" });
      }

      // Ensure they are not in another group
      const existingGroup = await StudentGroup.findOne({
        _id: { $ne: new mongoose.Types.ObjectId(id) },
        students: { $in: studentDocs.map((s) => new mongoose.Types.ObjectId(s._id)) },
      }).select("group_id");

      if (existingGroup) {
        return res.status(400).json({
          message: `One or more students are already assigned to another group (Group ID: ${existingGroup.group_id}).`,
        });
      }

      group.students = studentDocs.map((s) => s._id);
    }

    if (value.department) {
      group.department = sanitizeString(value.department);
    }

    await group.save();

    return res.status(200).json({
      message: "Student group updated successfully",
      updatedGroup: group,
    });
  } catch (err) {
    console.error("updateStudentGroup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



/**
 * Delete group by ObjectId
 */
export const deleteStudentGroup = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    const deletedGroup = await StudentGroup.findByIdAndDelete(new mongoose.Types.ObjectId(id));
    if (!deletedGroup) {
      return res.status(404).json({ message: "Student group not found" });
    }

    return res.status(200).json({ message: "Student group deleted successfully" });
  } catch (err) {
    console.error("deleteStudentGroup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
