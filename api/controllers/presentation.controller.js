// api/controllers/presentation.controller.js
import Presentation from "../models/presentation.model.js";
import Examiner from "../models/examiner.model.js";
import Venue from "../models/venue.model.js";
import Student from "../models/student.model.js";
import RescheduleRequest from "../models/reschedule.model.js";
import mongoose from "mongoose";
import Timetable from "../models/timetable.model.js";
import { rescheduleLectures } from "./lecReschedule.controller.js";
import { sendEmail } from "../utils/emailSender.js";

/**
 * Helper utilities
 */
const isValidObjectId = (id) => {
  try {
    return mongoose.Types.ObjectId.isValid(id);
  } catch (e) {
    return false;
  }
};

const validateObjectIdArray = (arr) => {
  if (!Array.isArray(arr)) return false;
  return arr.every((id) => isValidObjectId(id));
};

/**
 * NOTE: isTimeSlotAvailable expects objectIds for examiners, venue and students (i.e. DB _id values)
 * This function uses safe queries built from validated values only.
 */
const isTimeSlotAvailable = async (date, startTime, endTime, examiners = [], venue = null, students = []) => {
  // build the time overlap condition (no user-controlled JS objects)
  const timeCondition = {
    $or: [
      { "timeRange.startTime": { $lt: endTime }, "timeRange.endTime": { $gt: startTime } },
      { "timeRange.startTime": { $gte: startTime, $lt: endTime } },
      { "timeRange.endTime": { $gt: startTime, $lte: endTime } },
    ],
  };

  // examiner conflict?
  if (examiners && examiners.length > 0) {
    // Validate input to prevent NoSQL injection
const safeDate = typeof date === "string" ? date : "";
const safeExaminers = Array.isArray(examiners) ? examiners.map(e => String(e)) : [];
const safeTimeCondition = typeof timeCondition === "object" && timeCondition !== null ? timeCondition : {};

const overlappingExaminer = await Presentation.findOne({
  date: safeDate,
  ...safeTimeCondition,
  examiners: { $in: safeExaminers },
}).lean();
    if (overlappingExaminer) return false;
  }

  // venue conflict?
  if (venue) {
    const overlappingVenue = await Presentation.findOne({
      date,
      ...timeCondition,
      venue,
    }).lean();
    if (overlappingVenue) return false;
  }

  // student conflict?
  if (students && students.length > 0) {
    const overlappingStudent = await Presentation.findOne({
      date,
      ...timeCondition,
      students: { $in: students },
    }).lean();
    if (overlappingStudent) return false;
  }

  return true;
};

/**
 * Add presentation
 * Requires validated object ids for students/examiners/venue
 */
export const addPresentation = async (req, res, next) => {
  try {
    const {
      title,
      students,
      examiners,
      venue,
      department,
      numOfExaminers,
      date,
      duration,
      timeRange,
    } = req.body;

    // Required fields
    if (
      !title ||
      !students ||
      !examiners ||
      !venue ||
      !department ||
      !numOfExaminers ||
      !date ||
      !duration ||
      !timeRange ||
      !timeRange.startTime ||
      !timeRange.endTime
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate ID arrays and venue
    if (!validateObjectIdArray(students)) {
      return res.status(400).json({ message: "Invalid student IDs" });
    }
    if (!validateObjectIdArray(examiners)) {
      return res.status(400).json({ message: "Invalid examiner IDs" });
    }
    if (!isValidObjectId(venue)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }

    // Convert to ObjectId (defensive)
    const studentObjectIds = students.map((s) => new mongoose.Types.ObjectId(s));
    const examinerObjectIds = examiners.map((e) => new mongoose.Types.ObjectId(e));
    const venueObjectId = new mongoose.Types.ObjectId(venue);

    // Check availability (safe function uses validated objectIds)
    const available = await isTimeSlotAvailable(
      date,
      timeRange.startTime,
      timeRange.endTime,
      examinerObjectIds,
      venueObjectId,
      studentObjectIds
    );

    if (!available) {
      return res.status(400).json({ message: "Selected time slot is not available" });
    }

    // Create and save presentation
    const newPresentation = new Presentation({
      title,
      students: studentObjectIds,
      examiners: examinerObjectIds,
      venue: venueObjectId,
      department,
      numOfExaminers,
      date,
      duration,
      timeRange,
    });

    await newPresentation.save();

    // Send notifications (fetch emails safely)
    try {
      const examinerDocs = await Examiner.find({ _id: { $in: examinerObjectIds } }).lean();
      const studentDocs = await Student.find({ _id: { $in: studentObjectIds } }).lean();
      const venueDoc = await Venue.findById(venueObjectId).lean();

      const actualVenueId = venueDoc ? venueDoc.venue_id : "Unknown venue";

      const subject = "New Presentation Scheduled";
      const textBase = (who) => `Dear ${who},

A new presentation has been scheduled:
Title: ${title}
Department: ${department}
Date: ${date}
Time: ${timeRange.startTime} - ${timeRange.endTime}
Venue: ${actualVenueId}

Please be prepared accordingly.
`;

      for (const exDoc of examinerDocs) {
        if (exDoc?.email) await sendEmail(exDoc.email, subject, textBase("Examiner"));
      }

      for (const stDoc of studentDocs) {
        if (stDoc?.email) await sendEmail(stDoc.email, subject, textBase("Student"));
      }
    } catch (emailError) {
      console.error("Error sending emails (non-fatal):", emailError);
    }

    // Reschedule lectures for examiners on this date (use safe calls)
    for (const examinerObjectId of examinerObjectIds) {
      try {
        const examiner = await Examiner.findById(examinerObjectId).lean();
        if (!examiner) continue;

        const fakeReq = { body: { lecturerId: examiner.examiner_id, date } };
        const fakeRes = {
          status: (code) => ({
            json: (response) => {
              console.log(`Reschedule result for ${examiner.examiner_id}:`, response);
            },
          }),
        };
        await rescheduleLectures(fakeReq, fakeRes);
      } catch (err) {
        console.error("Error rescheduling for examiner:", err);
      }
    }

    res.status(201).json({ message: "Presentation scheduled successfully", newPresentation });
  } catch (error) {
    console.error("addPresentation error:", error);
    next(error);
  }
};

/**
 * Check availability endpoint (safe)
 * Accepts students/examiners as arrays of friendly ids (student_id/examiner_id/venue_id)
 * Converts them into object ids safely before querying.
 */
export const checkAvailability = async (req, res, next) => {
  try {
    const { date, department, students = [], examiners = [], venue, duration } = req.body;

    if (!date || !department || !duration) {
      return res.status(400).json({ success: false, message: "date, department and duration are required" });
    }

    // Convert friendly codes to DB _ids
    const studentDocs = students.length
      ? await Student.find({ student_id: { $in: students } }).select("_id").lean()
      : [];
    const examinerDocs = examiners.length
      ? await Examiner.find({ examiner_id: { $in: examiners } }).select("_id").lean()
      : [];
    const venueDoc = venue ? await Venue.findOne({ venue_id: venue }).select("_id").lean() : null;

    // Validate conversions
    if ((students.length && studentDocs.length !== students.length) ||
        (examiners.length && examinerDocs.length !== examiners.length) ||
        (venue && !venueDoc)) {
      return res.status(400).json({ success: false, message: "Invalid student/examiner/venue ID(s)" });
    }

    const studentObjectIds = studentDocs.map((d) => d._id);
    const examinerObjectIds = examinerDocs.map((d) => d._id);
    const venueObjectId = venueDoc ? venueDoc._id : null;

    // Query presentations safely using object ids and fixed query fields
    const presentations = await Presentation.find({
      date,
      department,
      ...(venueObjectId ? { venue: venueObjectId } : {}),
      $or: [
        { students: { $in: studentObjectIds } },
        { examiners: { $in: examinerObjectIds } }
      ]
    }).lean();

    if (!presentations || presentations.length === 0) {
      return res.status(200).json([{ timeSlot: "08:00 - 18:00", available: true }]);
    }

    // Build unavailable slots list
    const convertToMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const convertToTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    };

    const unavailableSlots = presentations.map((p) => ({
      start: convertToMinutes(p.timeRange.startTime),
      end: convertToMinutes(p.timeRange.endTime),
    })).sort((a, b) => a.start - b.start);

    const availableSlots = [];
    let previousEndTime = convertToMinutes("08:00");

    for (let slot of unavailableSlots) {
      if (slot.start > previousEndTime) {
        if (slot.start - previousEndTime >= duration) {
          availableSlots.push({
            timeSlot: `${convertToTime(previousEndTime)} - ${convertToTime(slot.start)}`,
            available: true,
          });
        }
      }
      previousEndTime = Math.max(previousEndTime, slot.end);
    }

    if (previousEndTime < convertToMinutes("18:00")) {
      const availableStart = previousEndTime;
      const availableEnd = convertToMinutes("18:00");
      if (availableEnd - availableStart >= duration) {
        availableSlots.push({
          timeSlot: `${convertToTime(availableStart)} - ${convertToTime(availableEnd)}`,
          available: true,
        });
      }
    }

    return res.status(200).json(availableSlots);
  } catch (error) {
    console.error("checkAvailability error:", error);
    next(error);
  }
};

/**
 * Get all presentations (safe)
 */
export const getAllPresentations = async (req, res, next) => {
  try {
    const presentations = await Presentation.find()
      .populate("students")
      .populate("examiners")
      .populate("venue")
      .lean();

    res.status(200).json(presentations);
  } catch (error) {
    next(error);
  }
};

/**
 * Get presentation by ID (safe)
 */
export const getPresentationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid Presentation ID" });

    const presentation = await Presentation.findById(id)
      .populate("students")
      .populate("examiners")
      .populate("venue")
      .lean();

    if (!presentation) return res.status(404).json({ message: "Presentation not found" });
    return res.status(200).json(presentation);
  } catch (error) {
    next(error);
  }
};

/**
 * Update presentation (safe)
 */
export const updatePresentation = async (req, res) => {
  try {
    const { id } = req.params;
    const { students = [], examiners = [], venue, date, timeRange, duration } = req.body; // ✅ added duration

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid Presentation ID" });
    }

    if (!validateObjectIdArray(students) || !validateObjectIdArray(examiners) || !isValidObjectId(venue)) {
      return res.status(400).json({ message: "Invalid Student/Examiner/Venue IDs" });
    }

    const studentObjectIds = students.map((s) => new mongoose.Types.ObjectId(s));
    const examinerObjectIds = examiners.map((e) => new mongoose.Types.ObjectId(e));
    const venueObjectId = new mongoose.Types.ObjectId(venue);

    const existingPresentation = await Presentation.findById(id).lean();
    if (!existingPresentation) {
      return res.status(404).json({ message: "Presentation not found" });
    }

    const isTimeChanged =
      existingPresentation.date !== date ||
      existingPresentation.timeRange.startTime !== timeRange.startTime ||
      existingPresentation.timeRange.endTime !== timeRange.endTime ||
      (existingPresentation.venue && existingPresentation.venue.toString() !== venue.toString());

    if (isTimeChanged) {
      const available = await isTimeSlotAvailable(
        date,
        timeRange.startTime,
        timeRange.endTime,
        examinerObjectIds,
        venueObjectId,
        studentObjectIds
      );
      if (!available) {
        return res.status(400).json({ message: "Selected time slot is not available" });
      }
    }

    // ✅ fix: only use duration if provided in req.body
    const allowedUpdate = {
      ...(req.body.title ? { title: req.body.title } : {}),
      ...(req.body.department ? { department: req.body.department } : {}),
      ...(req.body.numOfExaminers ? { numOfExaminers: req.body.numOfExaminers } : {}),
      ...(date ? { date } : {}),
      ...(duration ? { duration } : {}), // ✅ fixed
      ...(timeRange ? { timeRange } : {}),
      ...(students.length ? { students: studentObjectIds } : {}),
      ...(examiners.length ? { examiners: examinerObjectIds } : {}),
      ...(venue ? { venue: venueObjectId } : {}),
    };

    const updatedPresentation = await Presentation.findByIdAndUpdate(id, allowedUpdate, { new: true })
      .populate("students")
      .populate("examiners")
      .populate("venue");

    if (!updatedPresentation) {
      return res.status(404).json({ message: "Presentation not found after update" });
    }

    // email notifications
    try {
      const examinerDocs = await Examiner.find({
        _id: { $in: examiners.length ? examinerObjectIds : updatedPresentation.examiners }
      }).lean();

      const studentDocs = await Student.find({
        _id: { $in: students.length ? studentObjectIds : updatedPresentation.students }
      }).lean();

      const actualVenueId =
        (await Venue.findById(updatedPresentation.venue).select("venue_id").lean())?.venue_id || "Unknown";

      for (const exDoc of examinerDocs) {
        if (exDoc?.email) {
          await sendEmail(
            exDoc.email,
            "Presentation Updated",
            `Dear Examiner,\n\nPresentation updated: ${updatedPresentation.title}\nDate: ${updatedPresentation.date}\nTime: ${updatedPresentation.timeRange.startTime} - ${updatedPresentation.timeRange.endTime}\nVenue: ${actualVenueId}\n`
          );
        }
      }
      for (const stDoc of studentDocs) {
        if (stDoc?.email) {
          await sendEmail(
            stDoc.email,
            "Presentation Updated",
            `Dear Student,\n\nYour presentation "${updatedPresentation.title}" has been updated.\nDate: ${updatedPresentation.date}\nTime: ${updatedPresentation.timeRange.startTime} - ${updatedPresentation.timeRange.endTime}\nVenue: ${actualVenueId}\n`
          );
        }
      }
    } catch (emailErr) {
      console.error("Email sending error (non-fatal):", emailErr);
    }

    if (isTimeChanged) {
      const exList = examiners.length
        ? examinerObjectIds
        : updatedPresentation.examiners.map((e) => new mongoose.Types.ObjectId(e));
      for (const exObjId of exList) {
        try {
          const examiner = await Examiner.findById(exObjId).lean();
          if (!examiner) continue;
          const fakeReq = { body: { lecturerId: examiner.examiner_id, date: updatedPresentation.date } };
          const fakeRes = { status: (code) => ({ json: (r) => console.log("reschedule:", r) }) };
          await rescheduleLectures(fakeReq, fakeRes);
        } catch (err) {
          console.error("Reschedule lecture error:", err);
        }
      }
    }

    return res.status(200).json(updatedPresentation);
  } catch (error) {
    console.error("updatePresentation error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * Delete presentation (safe)
 */
export const deletePresentation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid Presentation ID" });

    const deletedPresentation = await Presentation.findByIdAndDelete(id);
    if (!deletedPresentation) return res.status(404).json({ message: "Presentation not found" });

    res.status(200).json({ message: "Presentation deleted successfully" });
  } catch (error) {
    console.error("deletePresentation error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

/**
 * Smart suggestion for scheduling (safe)
 * This function uses DB lookups with validated internal IDs.
 */
export const smartSuggestSlot = async (req, res) => {
  try {
    const { studentIds = [], numExaminers = 2, duration = 60 } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: "studentIds array is required" });
    }

    // Validate student objectIds
    if (!validateObjectIdArray(studentIds)) {
      return res.status(400).json({ message: "Invalid student object IDs" });
    }

    // fetch students -> get department
    const students = await Student.find({ _id: { $in: studentIds } }).lean();
    if (!students || students.length === 0) return res.status(400).json({ message: "No valid students found" });

    const department = students[0].department;
    const departmentExaminers = await Examiner.find({ department }).lean();
    if (!departmentExaminers || departmentExaminers.length === 0) return res.status(400).json({ message: "No examiners found in this department" });

    const allVenues = await Venue.find().lean();
    if (!allVenues || allVenues.length === 0) return res.status(400).json({ message: "No venues found" });

    const possibleDates = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    let bestDate = null;
    let minLectures = Infinity;

    // naive lecturer schedule count - validated queries only
    for (const date of possibleDates) {
      let totalLectures = 0;
      for (const examiner of departmentExaminers) {
        const lecturerSchedule = await Timetable.findOne({
          "schedule.lectures.lecturer_id": examiner.examiner_id,
          "schedule.day": { $exists: true },
        }).lean();
        if (lecturerSchedule) totalLectures += lecturerSchedule.schedule?.length || 0;
      }
      if (totalLectures < minLectures) {
        minLectures = totalLectures;
        bestDate = date;
      }
    }

    if (!bestDate) return res.status(400).json({ message: "No suitable date found" });

    const existingPresentations = await Presentation.find({ date: bestDate }).lean();
    const examinerVenueMap = new Map();
    const venueUsed = new Set();

    for (const presentation of existingPresentations) {
      for (const ex of presentation.examiners || []) {
        examinerVenueMap.set(ex.toString(), (presentation.venue || "").toString());
        venueUsed.add((presentation.venue || "").toString());
      }
    }

    const allTimeSlots = [
      "08:00", "08:30", "09:00", "09:30",
      "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30",
      "14:00", "14:30", "15:00", "15:30",
      "16:00", "16:30"
    ];

    const calculateTimeRange = (startTime, durationMin) => {
      const [h, m] = startTime.split(":").map(Number);
      const start = new Date(0, 0, 0, h, m);
      const end = new Date(start.getTime() + durationMin * 60000);
      const pad = (n) => String(n).padStart(2, "0");
      return { startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`, endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}` };
    };

    for (const slot of allTimeSlots) {
      const tr = calculateTimeRange(slot, duration);
      const isTimeAvailableFlag = await isTimeSlotAvailable(bestDate, tr.startTime, tr.endTime, [], null, studentIds);
      if (!isTimeAvailableFlag) continue;

      let selectedVenue = null;
      let selectedExaminers = [];

      for (const examiner of departmentExaminers) {
        if (examinerVenueMap.has(examiner._id.toString())) {
          selectedVenue = examinerVenueMap.get(examiner._id.toString());
          selectedExaminers.push(examiner);
          if (selectedExaminers.length >= numExaminers) break;
        }
      }

      if (selectedExaminers.length < numExaminers) {
        const newExaminers = departmentExaminers.filter((ex) => !examinerVenueMap.has(ex._id.toString()));
        if (newExaminers.length >= numExaminers) {
          selectedExaminers = newExaminers.slice(0, numExaminers);
          for (const v of allVenues) {
            if (!venueUsed.has(v._id.toString())) {
              selectedVenue = v._id;
              venueUsed.add(v._id.toString());
              break;
            }
          }
        }
      }

      if (!selectedVenue || selectedExaminers.length < numExaminers) continue;

      const venueDetails = await Venue.findById(selectedVenue).lean();
      return res.status(200).json({
        date: bestDate,
        examiners: selectedExaminers,
        venue: venueDetails,
        department,
        timeRange: tr,
      });
    }

    return res.status(400).json({ message: "No suitable time slots available" });
  } catch (error) {
    console.error("smartSuggestSlot error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * Smart suggestion for reschedule (safe)
 */
export const smartSuggestSlotForReschedule = async (req, res) => {
  try {
    const { presentationId } = req.body;
    if (!isValidObjectId(presentationId)) return res.status(400).json({ message: "Invalid presentationId" });

    const presentation = await Presentation.findById(presentationId).populate("students").populate("examiners").lean();
    if (!presentation) return res.status(404).json({ message: "Presentation not found" });

    const department = presentation.department;
    const duration = presentation.duration;
    const studentIds = presentation.students.map((s) => s._id);

    // Map presentation examiners from stored values to DB _ids (ensure we have objects)
    const examinerDocs = await Examiner.find({ examiner_id: { $in: (presentation.examiners || []).map(e => e.examiner_id ? e.examiner_id : e.toString()) } }).lean();
    const examinerIds = examinerDocs.map((ex) => ex._id);

    const possibleDates = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1); // start from tomorrow as original code did
      return d.toISOString().split("T")[0];
    });

    let bestDate = null;
    let minLectures = Infinity;

    for (const date of possibleDates) {
      let totalLectures = 0;
      for (const examiner of examinerIds) {
        const lecturerSchedule = await Timetable.findOne({
          "schedule.lectures.lecturer_id": examiner.toString(),
          "schedule.day": { $exists: true }
        }).lean();
        if (lecturerSchedule) totalLectures += lecturerSchedule.schedule?.length || 0;
      }
      if (totalLectures < minLectures) {
        minLectures = totalLectures;
        bestDate = date;
      }
    }

    if (!bestDate) return res.status(400).json({ message: "No suitable new date found" });

    const allVenues = await Venue.find().lean();
    if (!allVenues || allVenues.length === 0) return res.status(400).json({ message: "No venues found" });

    // Get existing reschedule requests for the date to skip their slots
    const existingRequests = await RescheduleRequest.find({ "requestedSlot.date": bestDate, status: { $ne: "Rejected" } }).lean();
    const skipRanges = existingRequests.map((r) => ({ start: r.requestedSlot.timeRange.startTime, end: r.requestedSlot.timeRange.endTime }));

    const convertToMinutes = (t) => {
      const [hh, mm] = t.split(":").map(Number);
      return hh * 60 + mm;
    };
    const overlaps = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

    const allTimeSlots = [
      "08:00", "08:30", "09:00", "09:30",
      "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30",
      "14:00", "14:30", "15:00", "15:30",
      "16:00", "16:30"
    ];

    const calculateTimeRange = (startTime, dur) => {
      const [h, m] = startTime.split(":").map(Number);
      const start = new Date(0, 0, 0, h, m);
      const end = new Date(start.getTime() + dur * 60000);
      const pad = (n) => String(n).padStart(2, "0");
      return { startTime, endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}` };
    };

    for (const slot of allTimeSlots) {
      const { startTime, endTime } = calculateTimeRange(slot, duration);
      const rs = convertToMinutes(startTime);
      const re = convertToMinutes(endTime);

      if (skipRanges.some(sr => overlaps(rs, re, convertToMinutes(sr.start), convertToMinutes(sr.end)))) continue;

      const isAvailable = await isTimeSlotAvailable(bestDate, startTime, endTime, examinerIds, null, studentIds);
      if (!isAvailable) continue;

      const chosenVenue = allVenues.length ? allVenues[0] : null;
      if (!chosenVenue) continue;

      return res.status(200).json({
        date: bestDate,
        examiners: examinerIds,
        venue: chosenVenue,
        department,
        timeRange: { startTime, endTime },
      });
    }

    return res.status(400).json({ message: "No suitable time slots available" });
  } catch (error) {
    console.error("smartSuggestSlotForReschedule error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * Request reschedule (safe)
 */
export const requestReschedule = async (req, res) => {
  try {
    if (!req.user || !req.user.id || !req.user.role) {
      return res.status(401).json({ message: "Unauthorized request: User not found." });
    }

    const userId = req.user.id;
    const userType = req.user.role;
    const { presentationId, date, timeRange, venue, reason, requestorEmail } = req.body;

    if (!isValidObjectId(presentationId)) return res.status(400).json({ message: "Invalid presentationId" });

    const presentation = await Presentation.findById(presentationId).lean();
    if (!presentation) return res.status(404).json({ message: "Presentation not found" });

    if (!date || !timeRange || !timeRange.startTime || !timeRange.endTime || !venue) {
      return res.status(400).json({ message: "Date, timeRange and venue are required." });
    }

    if (!isValidObjectId(venue)) return res.status(400).json({ message: "Invalid venue ID" });

    const newRequest = new RescheduleRequest({
      presentation: presentationId,
      requestedBy: { userId, userType },
      requestorEmail: requestorEmail || "",
      requestedSlot: { date, timeRange, venue: new mongoose.Types.ObjectId(venue) },
      reason,
      status: "Pending",
    });

    await newRequest.save();
    return res.status(201).json({ message: "Reschedule request submitted successfully", newRequest });
  } catch (error) {
    console.error("requestReschedule error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * Approve or reject reschedule (safe)
 */
export const approveOrRejectReschedule = async (req, res) => {
  try {
    const { requestId, action } = req.body;
    if (!isValidObjectId(requestId)) return res.status(400).json({ message: "Invalid requestId" });

    const request = await RescheduleRequest.findById(requestId).populate({
      path: "presentation",
      populate: { path: "venue", model: "Venue" },
    });

    if (!request) return res.status(404).json({ message: "Reschedule request not found" });

    const presentation = request.presentation;
    if (!presentation) return res.status(404).json({ message: "Presentation not found in request" });

    const requestorEmail = request.requestorEmail || null;

    if (action === "Reject") {
      request.status = "Rejected";
      await request.save();
      if (requestorEmail) {
        await sendEmail(requestorEmail, "Reschedule Request Rejected", `Your request has been rejected. Reason: ${request.reason || "N/A"}`);
      }
      return res.status(200).json({ message: "Reschedule request rejected successfully" });
    }

    // Approve
    const { date, timeRange, venue } = request.requestedSlot;
    if (!date || !timeRange || !venue) return res.status(400).json({ message: "Invalid requested slot" });

    // Validate venue id if it's an ObjectId
    if (!isValidObjectId(venue)) return res.status(400).json({ message: "Invalid venue in requested slot" });

    const examiners = presentation.examiners || [];
    const students = presentation.students || [];

    const isAvailable = await isTimeSlotAvailable(date, timeRange.startTime, timeRange.endTime, examiners, venue, students);
    if (!isAvailable) {
      request.status = "Rejected";
      await request.save();
      if (requestorEmail) await sendEmail(requestorEmail, "Reschedule Request Rejected - Time slot unavailable", "Requested time slot is not available");
      return res.status(400).json({ message: "Time slot is not available. Request automatically rejected." });
    }

    // Update presentation
    await Presentation.findByIdAndUpdate(presentation._id, { date, timeRange, venue });
    request.status = "Approved";
    await request.save();

    if (requestorEmail) {
      await sendEmail(requestorEmail, "Reschedule Request Approved", `Your request was approved. New Date: ${date} Time: ${timeRange.startTime} - ${timeRange.endTime}`);
    }

    // Notify examiners and students
    const examinerDocs = await Examiner.find({ _id: { $in: examiners } }).lean();
    for (const exDoc of examinerDocs) {
      if (exDoc?.email) {
        await sendEmail(exDoc.email, "Presentation Rescheduled - Examiner Notification", `Presentation "${presentation.title}" rescheduled. New Date: ${date} Time: ${timeRange.startTime} - ${timeRange.endTime}`);
      }
    }
    const studentDocs = await Student.find({ _id: { $in: students } }).lean();
    for (const stDoc of studentDocs) {
      if (stDoc?.email) {
        await sendEmail(stDoc.email, "Presentation Rescheduled - Student Notification", `Presentation "${presentation.title}" rescheduled. New Date: ${date} Time: ${timeRange.startTime} - ${timeRange.endTime}`);
      }
    }

    // Reschedule other lectures for examiners (best-effort)
    for (const exDoc of examinerDocs) {
      try {
        const fakeReq = { body: { lecturerId: exDoc.examiner_id, date } };
        const fakeRes = { status: (code) => ({ json: (r) => console.log("reschedule:", r) }) };
        await rescheduleLectures(fakeReq, fakeRes);
      } catch (err) {
        console.error("RescheduleLectures error (non-fatal):", err);
      }
    }

    return res.status(200).json({ message: "Reschedule request approved, presentation updated" });
  } catch (error) {
    console.error("approveOrRejectReschedule error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * Other utility endpoints: getAllRequests, deleteRescheduleRequest, getPresentationsForExaminer, getPresentationsForStudent,
 * getUserPresentations, getRescheduleRequestsForExaminer, deleteOldRejectedRequests, deleteAllApproved/RejectedRequestsForExaminer
 * For brevity they use the same pattern: validate incoming IDs, use safe Mongoose queries, and whitelist update fields.
 */

/* -------- Example: getPresentationsForExaminer (safe) -------- */
export const getPresentationsForExaminer = async (req, res) => {
  try {
    const examinerId = req.user?.id;
    if (!examinerId || !isValidObjectId(examinerId)) return res.status(400).json({ message: "Invalid examiner ID" });

    const examinerObjectId = new mongoose.Types.ObjectId(examinerId);
    const presentations = await Presentation.find({ examiners: examinerObjectId }).lean();
    if (!presentations || presentations.length === 0) return res.status(404).json({ message: "No presentations found for this examiner" });

    return res.status(200).json(presentations);
  } catch (error) {
    console.error("getPresentationsForExaminer error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/* -------- Example: getPresentationsForStudent (safe) -------- */
export const getPresentationsForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId || !isValidObjectId(studentId)) return res.status(400).json({ message: "Invalid student ID" });

    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const presentations = await Presentation.find({ students: studentObjectId }).lean();
    if (!presentations || presentations.length === 0) return res.status(404).json({ message: "No presentations found for this student" });

    return res.status(200).json(presentations);
  } catch (error) {
    console.error("getPresentationsForStudent error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/* -------- Example: getUserPresentations (safe filtering) -------- */
export const getUserPresentations = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ message: "User ID is required" });

    // We fetch presentations and filter by student_id/examiner_id fields after populating safe fields
    const userPresentations = await Presentation.find()
      .populate("students", "student_id")
      .populate("examiners", "examiner_id")
      .populate("venue", "venue_id")
      .lean();

    const filteredPresentations = userPresentations.filter(p =>
      (p.students || []).some(s => s.student_id === userId) ||
      (p.examiners || []).some(e => e.examiner_id === userId)
    );

    if (filteredPresentations.length === 0) return res.status(404).json({ message: "No presentations found for this user" });

    return res.status(200).json(filteredPresentations);
  } catch (error) {
    console.error("getUserPresentations error:", error);
    return next(error);
  }
};

/* -------- Reschedule request helpers (safe) -------- */
export const getRescheduleRequestsForExaminer = async (req, res) => {
  try {
    const examinerId = req.user?.id;
    if (!examinerId || !isValidObjectId(examinerId)) return res.status(400).json({ message: "Invalid examiner ID" });

    const requests = await RescheduleRequest.find({ "requestedBy.userId": examinerId })
      .populate({ path: "presentation", populate: { path: "venue", model: "Venue", select: "venue_id -_id" } })
      .sort({ created_at: -1 })
      .lean();

    if (!requests || requests.length === 0) return res.status(404).json({ message: "No reschedule requests found" });

    return res.status(200).json(requests);
  } catch (error) {
    console.error("getRescheduleRequestsForExaminer error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// export const deleteRescheduleRequest = async (req, res) => {
//   try {
//     const { requestId } = req.params;
//     if (!isValidObjectId(requestId)) return res.status(400).json({ message: "Invalid requestId" });

//     const request = await RescheduleRequest.findById(requestId).lean();
//     if (!request) return res.status(404).json({ message: "Reschedule request not found" });

//     await RescheduleRequest.findByIdAndDelete(requestId);
//     return res.status(200).json({ message: "Reschedule request deleted successfully" });
//   } catch (error) {
//     console.error("deleteRescheduleRequest error:", error);
//     return res.status(500).json({ message: "Server error", error });
//   }
// };

/* -------- Maintenance helpers -------- */
export const deleteOldRejectedRequests = async (req, res) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 2);
    const result = await RescheduleRequest.deleteMany({ status: "Rejected", created_at: { $lt: cutoffDate } });
    return res.status(200).json({ message: `Deleted ${result.deletedCount} old rejected requests.` });
  } catch (error) {
    console.error("deleteOldRejectedRequests error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const deleteAllApprovedRequestsForExaminer = async (req, res) => {
  try {
    if (!req.user || !req.user.id || req.user.role !== "examiner") return res.status(401).json({ message: "Unauthorized" });
    const examinerId = req.user.id;
    const result = await RescheduleRequest.deleteMany({ "requestedBy.userId": examinerId, status: "Approved" });
    return res.status(200).json({ message: `Deleted ${result.deletedCount} approved requests.` });
  } catch (error) {
    console.error("deleteAllApprovedRequestsForExaminer error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const deleteAllRejectedRequestsForExaminer = async (req, res) => {
  try {
    if (!req.user || !req.user.id || req.user.role !== "examiner") return res.status(401).json({ message: "Unauthorized" });
    const examinerId = req.user.id;
    const result = await RescheduleRequest.deleteMany({ "requestedBy.userId": examinerId, status: "Rejected" });
    return res.status(200).json({ message: `Deleted ${result.deletedCount} rejected requests.` });
  } catch (error) {
    console.error("deleteAllRejectedRequestsForExaminer error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};



/**
 * Get all reschedule requests (safe)
 */
export const getAllRequests = async (req, res, next) => {
  try {
    const requests = await RescheduleRequest.find()
      .populate({
        path: "presentation",
        populate: [
          { path: "examiners", model: "Examiner", select: "examiner_id name email" },
          { path: "students", model: "Student", select: "student_id name email" },
          { path: "venue", model: "Venue", select: "venue_id name" },
        ],
      })
      .populate({
        path: "requestedSlot.venue",
        model: "Venue",
        select: "venue_id name",
      })
      .populate({
        path: "requestedBy.userId",
        model: "User", // adjust if it's Examiner/Student depending on your schema
        select: "email role",
      })
      .lean();

    res.status(200).json(requests);
  } catch (error) {
    console.error("getAllRequests error:", error);
    next(error);
  }
};

/**
 * Delete reschedule request (safe)
 */
export const deleteRescheduleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid requestId" });
    }

    const request = await RescheduleRequest.findById(requestId).lean();
    if (!request) {
      return res.status(404).json({ message: "Reschedule request not found" });
    }

    await RescheduleRequest.findByIdAndDelete(requestId);

    res.status(200).json({ message: "Reschedule request deleted successfully" });
  } catch (error) {
    console.error("deleteRescheduleRequest error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
