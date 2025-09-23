import express from "express";
import {
  addTimetable,
  viewAllTimetables,
  viewTimetableByGroupId,
  updateTimetable,
  deleteTimetable,
  getTimetableForStudent, 
  getTimetableForExaminer, 
  getTimetableForVenue,
  getFreeTimesForLecturer,
  getTimetableById,
} from "../controllers/timetable.controller.js";

const router = express.Router();

router.post("/add", addTimetable);
router.get("/all", viewAllTimetables);
router.get("/free/:lecturerId", getFreeTimesForLecturer );
router.get("/get/:group_id", viewTimetableByGroupId);
router.put("/update/:id", updateTimetable);
router.delete("/delete/:id", deleteTimetable);
router.get("/student/:studentId", getTimetableForStudent);
router.get("/examiner/:examinerId", getTimetableForExaminer);
router.get("/venue/:venueId", getTimetableForVenue);
router.get("/getid/:id", getTimetableById);

export default router;
