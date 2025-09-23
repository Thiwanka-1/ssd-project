import Timetable from "../models/timetable.model.js";
import StudentGroup from "../models/groups.model.js";
import Module from "../models/modules.model.js";
import Examiner from "../models/examiner.model.js"; // Lecturer is from Examiner Management
import Venue from "../models/venue.model.js";
import mongoose from "mongoose";
import Student from "../models/student.model.js";
import Joi from "joi";

/** ------------ helpers ------------- */
const sanitizeString = (v) => {
  if (typeof v !== "string") return v;
  return v.replace(/[$.]/g, "").trim();
};

// allowed weekdays
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// HH:MM 24h
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Joi schemas
const lectureSchema = Joi.object({
  start_time: Joi.string().pattern(timeRegex).required(),
  end_time: Joi.string().pattern(timeRegex).required(),
  module_code: Joi.string().min(1).max(32).required(),
  lecturer_id: Joi.string().min(1).max(64).required(),
  venue_id: Joi.string().min(1).max(64).required(),
});

const daySchema = Joi.object({
  day: Joi.string().valid(...DAYS).required(),
  lectures: Joi.array().items(lectureSchema).min(1).required(),
});

const timetableBodySchema = Joi.object({
  group_id: Joi.string().min(1).max(64).required(),
  schedule: Joi.array().items(daySchema).min(1).required(),
});

const updateBodySchema = Joi.object({
  group_id: Joi.string().min(1).max(64).required(),
  schedule: Joi.array().items(daySchema).min(1).required(),
});

/** sanitize full schedule (defang $ and .) */
const sanitizeSchedule = (schedule) =>
  schedule.map((d) => ({
    day: sanitizeString(d.day),
    lectures: d.lectures.map((l) => ({
      start_time: sanitizeString(l.start_time),
      end_time: sanitizeString(l.end_time),
      module_code: sanitizeString(l.module_code),
      lecturer_id: sanitizeString(l.lecturer_id),
      venue_id: sanitizeString(l.venue_id),
    })),
  }));

/** ------------ controllers ------------- */

//  Add a new timetable (Full week schedule)
export const addTimetable = async (req, res) => {
  try {
    // validate body
    const { error, value } = timetableBodySchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ message: "Validation failed", details: error.details.map(d => d.message) });
    }

    const group_id = sanitizeString(value.group_id);
    const schedule = sanitizeSchedule(value.schedule);

    // Validate Group ID existence
    const groupExists = await StudentGroup.findOne({ group_id });
    if (!groupExists) {
      return res.status(400).json({ message: "Invalid Group ID. Group does not exist." });
    }

    // Fetch existing timetables to check for conflicts
    const allTimetables = await Timetable.find({});
    const existingLectures = [];
    for (const timetable of allTimetables) {
      for (const day of timetable.schedule) {
        for (const lecture of day.lectures) {
          existingLectures.push({
            day: day.day,
            start_time: lecture.start_time,
            end_time: lecture.end_time,
            lecturer_id: lecture.lecturer_id,
            venue_id: lecture.venue_id,
            group_id: timetable.group_id,
          });
        }
      }
    }

    const submissionConflicts = new Set();

    // Validate Weekly Schedule (Each day's lectures)
    for (const day of schedule) {
      const dayLectures = [...day.lectures].sort((a, b) => a.start_time.localeCompare(b.start_time));

      for (let i = 0; i < dayLectures.length; i++) {
        const lecture = dayLectures[i];

        const lectureKey = `${day.day}-${lecture.start_time}-${lecture.end_time}-${lecture.lecturer_id}-${lecture.venue_id}`;
        if (submissionConflicts.has(lectureKey)) {
          return res.status(400).json({
            message: `Duplicate lecture detected in the submission!`,
            duplicateLecture: lecture,
          });
        }
        submissionConflicts.add(lectureKey);

        // Reference validations
        const moduleExists = await Module.findOne({ module_code: lecture.module_code });
        if (!moduleExists) {
          return res.status(400).json({ message: `Invalid Module Code (${lecture.module_code}).` });
        }

        const lecturerExists = await Examiner.findOne({ examiner_id: lecture.lecturer_id });
        if (!lecturerExists) {
          return res.status(400).json({ message: `Invalid Lecturer ID (${lecture.lecturer_id}).` });
        }

        const venueExists = await Venue.findOne({ venue_id: lecture.venue_id });
        if (!venueExists) {
          return res.status(400).json({ message: `Invalid Venue ID (${lecture.venue_id}).` });
        }

        // Overlap within same group/day
        if (i > 0) {
          const prevLecture = dayLectures[i - 1];
          if (prevLecture.end_time > lecture.start_time) {
            return res.status(400).json({
              message: `Time conflict detected in group ${group_id}: ${lecture.start_time} overlaps with ${prevLecture.end_time}`,
            });
          }
        }

        // Venue & Lecturer conflicts across other groups
        const conflictingLecture = await Timetable.findOne({
          "schedule.day": day.day,
          "schedule.lectures": {
            $elemMatch: {
              $or: [{ venue_id: lecture.venue_id }, { lecturer_id: lecture.lecturer_id }],
              start_time: { $lt: lecture.end_time },
              end_time: { $gt: lecture.start_time },
            },
          },
          group_id: { $ne: group_id },
        });

        if (conflictingLecture) {
          return res.status(400).json({
            message: `Schedule conflict: venue ${lecture.venue_id} or lecturer ${lecture.lecturer_id} is already booked.`,
          });
        }
      }
    }

    const newTimetable = new Timetable({ group_id, schedule });
    await newTimetable.save();

    return res.status(201).json({ message: "Timetable created successfully!" });
  } catch (error) {
    console.error("Error while adding timetable:", error);
    return res.status(500).json({ message: "Server error", error: error.message || error });
  }
};

//  View all timetables
export const viewAllTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.find();
    return res.status(200).json(timetables);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

// View timetable by Group ID
export const viewTimetableByGroupId = async (req, res) => {
  try {
    const { group_id } = req.params;
    if (typeof group_id !== "string" || group_id.includes("$")) {
      return res.status(400).json({ message: "Invalid Group ID format" });
    }
    const timetable = await Timetable.findOne({ group_id: sanitizeString(group_id) });
    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found for this group" });
    }
    return res.status(200).json(timetable);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

//  Update a timetable (Full week update)
export const updateTimetable = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Timetable ID" });
    }

    // validate body
    const { error, value } = updateBodySchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ message: "Validation failed", details: error.details.map(d => d.message) });
    }

    const group_id = sanitizeString(value.group_id);
    const schedule = sanitizeSchedule(value.schedule);

    // Validate group exists
    const groupExists = await StudentGroup.findOne({ group_id });
    if (!groupExists) {
      return res.status(400).json({ message: "Invalid Group ID. Group does not exist." });
    }

    // Conflict checks (same as in addTimetable)
    for (const day of schedule) {
      const dayLectures = [...day.lectures].sort((a, b) => a.start_time.localeCompare(b.start_time));

      for (let i = 0; i < dayLectures.length; i++) {
        const lecture = dayLectures[i];

        const moduleExists = await Module.findOne({ module_code: lecture.module_code });
        if (!moduleExists) return res.status(400).json({ message: `Invalid Module Code (${lecture.module_code}).` });

        const lecturerExists = await Examiner.findOne({ examiner_id: lecture.lecturer_id });
        if (!lecturerExists) return res.status(400).json({ message: `Invalid Lecturer ID (${lecture.lecturer_id}).` });

        const venueExists = await Venue.findOne({ venue_id: lecture.venue_id });
        if (!venueExists) return res.status(400).json({ message: `Invalid Venue ID (${lecture.venue_id}).` });

        if (i > 0) {
          const prevLecture = dayLectures[i - 1];
          if (prevLecture.end_time > lecture.start_time) {
            return res.status(400).json({
              message: `Time conflict detected for Group ${group_id}: ${lecture.start_time} overlaps with ${prevLecture.end_time}.`,
            });
          }
        }

        const conflictingLecture = await Timetable.findOne({
          "schedule.day": day.day,
          "schedule.lectures": {
            $elemMatch: {
              $or: [{ venue_id: lecture.venue_id }, { lecturer_id: lecture.lecturer_id }],
              start_time: { $lt: lecture.end_time },
              end_time: { $gt: lecture.start_time },
            },
          },
          group_id: { $ne: group_id },
          _id: { $ne: new mongoose.Types.ObjectId(id) },
        });

        if (conflictingLecture) {
          return res.status(400).json({
            message: `Schedule conflict: venue ${lecture.venue_id} or lecturer ${lecture.lecturer_id} already booked.`,
          });
        }
      }
    }

    // Build explicit update doc (never pass req.body directly)
    const updateDoc = { group_id, schedule };

    const updatedTimetable = await Timetable.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      updateDoc,
      { new: true }
    );

    if (!updatedTimetable) {
      return res.status(404).json({ message: "Timetable not found!" });
    }

    return res.status(200).json({ message: "Timetable updated successfully!", updatedTimetable });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

//  Delete a timetable
export const deleteTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Timetable ID" });
    }
    const deletedTimetable = await Timetable.findByIdAndDelete(new mongoose.Types.ObjectId(id));
    if (!deletedTimetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }
    return res.status(200).json({ message: "Timetable deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getTimetableForStudent = async (req, res) => {
  try {
    const { studentId } = req.params; // e.g., "ST2025001"
    if (typeof studentId !== "string" || studentId.includes("$")) {
      return res.status(400).json({ message: "Invalid Student ID format" });
    }

    const safeStudentId = sanitizeString(studentId);
    const student = await Student.findOne({ student_id: safeStudentId });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const studentGroup = await StudentGroup.findOne({ students: student._id });
    if (!studentGroup) {
      return res.status(404).json({ message: "Student is not assigned to any group." });
    }

    const timetable = await Timetable.findOne({ group_id: studentGroup.group_id });
    if (!timetable) {
      return res.status(404).json({ message: "No timetable found for this student group." });
    }

    return res.status(200).json(timetable);
  } catch (error) {
    console.error("Error fetching timetable:", error);
    return res.status(500).json({ message: "Server error", error: error.message || error });
  }
};

export const getTimetableForExaminer = async (req, res) => {
  try {
    const { examinerId } = req.params;
    if (typeof examinerId !== "string" || examinerId.includes("$")) {
      return res.status(400).json({ message: "Invalid Examiner ID" });
    }
    const safeExaminerId = sanitizeString(examinerId);

    const timetables = await Timetable.find({
      "schedule.lectures.lecturer_id": safeExaminerId,
    });

    if (!timetables || timetables.length === 0) {
      return res.status(404).json({ message: "No scheduled lectures found for this examiner." });
    }

    const examinerSchedule = timetables.map((timetable) => ({
      group_id: timetable.group_id,
      schedule: timetable.schedule.map((day) => ({
        day: day.day,
        lectures: day.lectures.filter((lecture) => lecture.lecturer_id === safeExaminerId),
      })),
    }));

    return res.status(200).json(examinerSchedule);
  } catch (error) {
    console.error("Error fetching examiner timetable:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getTimetableForVenue = async (req, res) => {
  try {
    const { venueId } = req.params;
    if (typeof venueId !== "string" || venueId.includes("$")) {
      return res.status(400).json({ message: "Invalid Venue ID" });
    }
    const safeVenueId = sanitizeString(venueId);

    const timetables = await Timetable.find({
      "schedule.lectures.venue_id": safeVenueId,
    });

    const venueSchedule = timetables.map((timetable) => ({
      group_id: timetable.group_id,
      schedule: timetable.schedule.map((day) => ({
        day: day.day,
        lectures: day.lectures.filter((lecture) => lecture.venue_id === safeVenueId),
      })),
    }));

    return res.status(200).json(venueSchedule);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getFreeTimesForLecturer = async (req, res) => {
  try {
    const { lecturerId } = req.params;
    if (typeof lecturerId !== "string" || lecturerId.includes("$")) {
      return res.status(400).json({ message: "Invalid Lecturer ID" });
    }
    const safeLecturerId = sanitizeString(lecturerId);

    const timetables = await Timetable.find({
      "schedule.lectures.lecturer_id": safeLecturerId,
    });

    if (timetables.length === 0) {
      return res.status(404).json({ message: "No timetable found for this lecturer." });
    }

    const allTimeSlots = [
      { startTime: "08:00", endTime: "09:00" },
      { startTime: "09:00", endTime: "10:00" },
      { startTime: "10:00", endTime: "11:00" },
      { startTime: "11:00", endTime: "12:00" },
      { startTime: "12:00", endTime: "13:00" },
      { startTime: "13:00", endTime: "14:00" },
      { startTime: "14:00", endTime: "15:00" },
      { startTime: "15:00", endTime: "16:00" },
      { startTime: "16:00", endTime: "17:00" },
    ];

    const freeTimes = {
      Monday: [...allTimeSlots],
      Tuesday: [...allTimeSlots],
      Wednesday: [...allTimeSlots],
      Thursday: [...allTimeSlots],
      Friday: [...allTimeSlots],
    };

    timetables.forEach((timetable) => {
      timetable.schedule.forEach((day) => {
        if (freeTimes[day.day]) {
          const busySlots = day.lectures
            .filter((lecture) => lecture.lecturer_id === safeLecturerId)
            .map((lecture) => ({
              startTime: lecture.start_time,
              endTime: lecture.end_time,
            }));

          freeTimes[day.day] = freeTimes[day.day].filter(
            (slot) =>
              !busySlots.some(
                (busy) =>
                  (slot.startTime >= busy.startTime && slot.startTime < busy.endTime) ||
                  (slot.endTime > busy.startTime && slot.endTime <= busy.endTime)
              )
          );
        }
      });
    });

    return res.status(200).json({ lecturerId: safeLecturerId, freeTimes });
  } catch (error) {
    console.error("Error fetching free times:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getTimetableById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Timetable ID" });
    }
    const timetable = await Timetable.findById(new mongoose.Types.ObjectId(id));
    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found!" });
    }
    return res.status(200).json(timetable);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
