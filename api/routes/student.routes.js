import express from "express";
import { 
    addStudent,
    getAllStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    getStudentsByDepartment

} from "../controllers/student.controller.js";

const router = express.Router();

// Route to add a student
router.post("/add", addStudent);

router.get("/get-std", getAllStudents);

router.get("/get-dept/:department", getStudentsByDepartment);

router.get("/get-std/:id", getStudentById);

router.put("/update-std/:id", updateStudent);

router.delete("/delete-std/:id", deleteStudent);

export default router;
