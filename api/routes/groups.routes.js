import express from "express";
import {
  addStudentGroup,
  getAllStudentGroups,
  getStudentGroupById,
  updateStudentGroup,
  deleteStudentGroup
} from "../controllers/groups.controller.js";

const router = express.Router();

router.post("/add", addStudentGroup); // Add a student group
router.get("/all", getAllStudentGroups); // Get all groups
router.get("/get/:id", getStudentGroupById); // Get one group by ID
router.put("/update/:id", updateStudentGroup); // Update a group
router.delete("/delete/:id", deleteStudentGroup); // Delete a group

export default router;
