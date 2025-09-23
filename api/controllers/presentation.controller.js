import Presentation from "../models/presentation.model.js";
import Examiner from "../models/examiner.model.js";
import Venue from "../models/venue.model.js";
import Student from "../models/student.model.js";
import RescheduleRequest from "../models/reschedule.model.js";
import mongoose from "mongoose";
import Timetable from "../models/timetable.model.js";
import { rescheduleLectures } from "./lecReschedule.controller.js";
import { sendEmail } from "../utils/emailSender.js";

// Function to check if time slot is available
const isTimeSlotAvailable = async (date, startTime, endTime, examiners, venue, students) => {
  // Check for overlapping time slots for examiners
  const overlappingExaminer = await Presentation.findOne({
    date,
    examiners: { $in: examiners },
    $or: [
      { "timeRange.startTime": { $lt: endTime }, "timeRange.endTime": { $gt: startTime } },
      { "timeRange.startTime": { $gte: startTime, $lt: endTime } },
      { "timeRange.endTime": { $gt: startTime, $lte: endTime } }
    ]
  });

  // Check for overlapping time slots for venue
  const overlappingVenue = await Presentation.findOne({
    date,
    venue,
    $or: [
      { "timeRange.startTime": { $lt: endTime }, "timeRange.endTime": { $gt: startTime } },
      { "timeRange.startTime": { $gte: startTime, $lt: endTime } },
      { "timeRange.endTime": { $gt: startTime, $lte: endTime } }
    ]
  });

    // Check for overlapping time slots for presenters
  const overlappingStudent = await Presentation.findOne({
    date,
    students: { $in: students },
    $or: [
      { "timeRange.startTime": { $lt: endTime }, "timeRange.endTime": { $gt: startTime } },
      { "timeRange.startTime": { $gte: startTime, $lt: endTime } },
      { "timeRange.endTime": { $gt: startTime, $lte: endTime } }
    ]
  });

  return !overlappingExaminer && !overlappingVenue && !overlappingStudent;
};


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
      timeRange 
    } = req.body;

    // Validate required fields
    if (
      !title || 
      !students || 
      !examiners || 
      !venue || 
      !department || 
      !numOfExaminers || 
      !date || 
      !duration || 
      !timeRange
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 1️⃣ Check if the time slot is available
    const available = await isTimeSlotAvailable(
      date, 
      timeRange.startTime, 
      timeRange.endTime, 
      examiners, 
      venue, 
      students
    );
    if (!available) {
      return res.status(400).json({ message: "Selected time slot is not available" });
    }

    // 2️⃣ Create new presentation
    const newPresentation = new Presentation({
      title,
      students,
      examiners,
      venue,
      department,
      numOfExaminers,
      date,
      duration,
      timeRange
    });

    await newPresentation.save();

    

    // 3️⃣ Send Email Notifications to All Examiners & Students
    try {
      // Fetch all examiners & students from DB to get their emails
      const examinerDocs = await Examiner.find({ _id: { $in: examiners } });
      const studentDocs = await Student.find({ _id: { $in: students } });

      const venueDoc = await Venue.findById(newPresentation.venue);
      if (!venueDoc) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      // 3) Now you have the friendly venue_id
      const actualVenueId = venueDoc.venue_id;
      console.log("actualVenueId:", actualVenueId);
      // Email examiners
      for (const exDoc of examinerDocs) {
        if (exDoc.email) {
          const subject = "New Presentation Scheduled";
          const text = `Dear Examiner,

A new presentation has been scheduled:
Title: ${title}
Department: ${department}
Date: ${date}
Time: ${timeRange.startTime} - ${timeRange.endTime}
Venue: ${actualVenueId}

Please be prepared accordingly.
`;
          await sendEmail(exDoc.email, subject, text);
        }
      }

      // Email students
      for (const stDoc of studentDocs) {
        if (stDoc.email) {
          const subject = "New Presentation Scheduled";
          const text = `Dear Student,

A new presentation has been scheduled:
Title: ${title}
Department: ${department}
Date: ${date}
Time: ${timeRange.startTime} - ${timeRange.endTime}
Venue: ${actualVenueId}

Please be prepared accordingly.
`;
          await sendEmail(stDoc.email, subject, text);
        }
      }
    } catch (emailError) {
      console.error("Error sending email notifications:", emailError);
    }

    // 4️⃣ Reschedule other lectures for each examiner on this new date
    for (let examinerObjectId of examiners) {
      try {
        // Fetch the examiner to get examiner_id (e.g. "EX2025001")
        const examiner = await Examiner.findById(examinerObjectId);
        if (!examiner) continue; // skip if not found

        const fakeReq = { 
          body: { 
            lecturerId: examiner.examiner_id, 
            date 
          } 
        };
        const fakeRes = {
          status: (code) => ({
            json: (response) => {
              console.log(`Reschedule response for Examiner ${examiner.examiner_id}:`, response);
            },
          }),
        };

        await rescheduleLectures(fakeReq, fakeRes);
      } catch (error) {
        console.error(`Error while rescheduling lectures for Examiner ${examinerObjectId}:`, error);
      }
    }

    // 5️⃣ Respond
    res.status(201).json({ 
      message: "Presentation scheduled successfully & lectures rescheduled", 
      newPresentation 
    });

  } catch (error) {
    console.error("Error in addPresentation:", error);
    next(error);
  }
};


export const checkAvailability = async (req, res, next) => {
  const { date, department, students, examiners, venue, duration } = req.body;

  try {
    // Fetch student, examiner, and venue object IDs from the database
    const studentIds = await Student.find({ student_id: { $in: students } }).select('_id');
    const examinerIds = await Examiner.find({ examiner_id: { $in: examiners } }).select('_id');
    const venueObj = await Venue.findOne({ venue_id: venue }).select('_id');

    // Check if all IDs are valid
    if (!studentIds || !examinerIds || !venueObj) {
      return res.status(400).json({ success: false, message: 'Invalid student/examiner/venue ID(s)' });
    }

    // Convert to ObjectId references
    const studentObjectIds = studentIds.map((student) => student._id);
    const examinerObjectIds = examinerIds.map((examiner) => examiner._id);
    const venueObjectId = venueObj._id;

    // Fetch presentations for the given date, department, and venue
    const presentations = await Presentation.find({
      date,
      department,
      venue: venueObjectId,
      $or: [
        { students: { $in: studentObjectIds } },
        { examiners: { $in: examinerObjectIds } }
      ]
    });

    // If no presentations exist for the selected day and department, the whole day is free
    if (presentations.length === 0) {
      return res.status(200).json([
        { timeSlot: "08:00 - 18:00", available: true },
      ]);
    }

    // Convert time range to minutes for easier comparison
    const convertToMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const convertToTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    // Create an array to store unavailable time slots
    const unavailableSlots = presentations.map((presentation) => ({
      start: convertToMinutes(presentation.timeRange.startTime),
      end: convertToMinutes(presentation.timeRange.endTime),
    }));

    // Sort the unavailable slots by start time
    unavailableSlots.sort((a, b) => a.start - b.start);

    // Initialize an array to hold the available time slots
    const availableSlots = [];

    // Start the check for free time slots from 08:00 AM
    let previousEndTime = convertToMinutes("08:00"); // Start of the day (08:00 AM)

    // Iterate over the unavailable slots to find gaps
    for (let slot of unavailableSlots) {
      // If there's a gap between the previous end time and the current start time
      if (slot.start > previousEndTime) {
        const availableStart = previousEndTime;
        const availableEnd = slot.start;

        // Check if the time slot is large enough to accommodate the required duration
        if (availableEnd - availableStart >= duration) {
          availableSlots.push({
            timeSlot: `${convertToTime(availableStart)} - ${convertToTime(availableEnd)}`,
            available: true,
          });
        }
      }
      // Update the previous end time
      previousEndTime = Math.max(previousEndTime, slot.end);
    }

    // Check the final gap at the end of the day (until 18:00)
    if (previousEndTime < convertToMinutes("18:00")) {
      const availableStart = previousEndTime;
      const availableEnd = convertToMinutes("18:00");

      // Check if the time slot is large enough to accommodate the required duration
      if (availableEnd - availableStart >= duration) {
        availableSlots.push({
          timeSlot: `${convertToTime(availableStart)} - ${convertToTime(availableEnd)}`,
          available: true,
        });
      }
    }

    // Return the available time slots
    res.status(200).json(availableSlots);

  } catch (error) {
    console.error("Error: ", error);
    next(error); // Pass error to the error handling middleware
  }
};

export const getAllPresentations = async (req, res, next) => {
  try {
    const presentations = await Presentation.find()
    .populate("students") 
    .populate("examiners")
    .populate("venue");


    res.status(200).json(presentations);
  } catch (error) {
    next(error);
  }
};

// Get presentation by ID
export const getPresentationById = async (req, res, next) => {
  try {
    const presentation = await Presentation.findById(req.params.id)
      .populate("students")
      .populate("examiners")
      .populate("venue");

    if (!presentation) return res.status(404).json({ message: "Presentation not found" });

    res.status(200).json(presentation);
  } catch (error) {
    next(error);
  }
};


export const updatePresentation = async (req, res) => {
  try {
    const { id } = req.params;
    const { students, examiners, venue, date, timeRange } = req.body;

    //  Fetch the existing presentation
    const existingPresentation = await Presentation.findById(id);
    if (!existingPresentation) {
      return res.status(404).json({ message: "Presentation not found" });
    }

   
    //  Check if the time slot, venue, and date are changed
    const isTimeChanged =
      existingPresentation.date !== date ||
      existingPresentation.timeRange.startTime !== timeRange.startTime ||
      existingPresentation.timeRange.endTime !== timeRange.endTime ||
      existingPresentation.venue.toString() !== venue;

    //  If time changed, validate time slot
    if (isTimeChanged) {
      const available = await isTimeSlotAvailable(
        date,
        timeRange.startTime,
        timeRange.endTime,
        examiners,
        venue,
        students
      );
      if (!available) {
        return res.status(400).json({ message: "Selected time slot is not available" });
      }
    }

    //  Update the presentation
    const updatedPresentation = await Presentation.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedPresentation) {
      return res.status(404).json({ message: "Presentation not found after update" });
    }

    //  Send Email Notifications to All Examiners & Students
    try {
      // Fetch all examiners & students from DB to get their emails
      const examinerDocs = await Examiner.find({ _id: { $in: examiners } });
      const studentDocs = await Student.find({ _id: { $in: students } });

      const { title, department} = updatedPresentation;
      const { startTime, endTime } = updatedPresentation.timeRange;
      const venueDoc = await Venue.findById(existingPresentation.venue);
      if (!venueDoc) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      // 3) Now you have the friendly venue_id
      const actualVenueId = venueDoc.venue_id;
      
            

      // Email examiners
      for (const exDoc of examinerDocs) {
        if (exDoc.email) {
          const subject = "Presentation Updated";
          const text = `Dear Examiner,

The presentation "${title}" has been updated.
Department: ${department}
New Date: ${date}
Time: ${startTime} - ${endTime}
Venue: ${actualVenueId}

Please take note of these changes.
`;
          await sendEmail(exDoc.email, subject, text);
        }
      }

      // Email students
      for (const stDoc of studentDocs) {
        if (stDoc.email) {
          const subject = "Presentation Updated";
          const text = `Dear Student,

Your presentation "${title}" has been updated.
Department: ${department}
New Date: ${date}
Time: ${startTime} - ${endTime}
Venue: ${actualVenueId}

Please take note of these changes.
`;
          await sendEmail(stDoc.email, subject, text);
        }
      }
    } catch (emailError) {
      console.error("Error sending email notifications:", emailError);
    }

    //  If the date changed, reschedule other lectures for each examiner
    if (isTimeChanged) {
      for (let examinerObjectId of examiners) {
        try {
          const examiner = await Examiner.findById(examinerObjectId);
          if (!examiner) continue;

          const fakeReq = { body: { lecturerId: examiner.examiner_id, date } };
          const fakeRes = {
            status: (code) => ({
              json: (response) => {
                console.log(`Reschedule response for Examiner ${examiner.examiner_id}:`, response);
              },
            }),
          };

          await rescheduleLectures(fakeReq, fakeRes);
        } catch (error) {
          console.error(`Error while rescheduling lectures for Examiner ${examinerObjectId}:`, error);
        }
      }
    }

    //  Respond
    res.status(200).json(updatedPresentation);
  } catch (error) {
    console.error("Error updating presentation:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deletePresentation = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPresentation = await Presentation.findByIdAndDelete(id);

    if (!deletedPresentation) {
      return res.status(404).json({ message: "Presentation not found" });
    }

    res.status(200).json({ message: "Presentation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};




export const smartSuggestSlot = async (req, res) => {
  try {
    const { studentIds, numExaminers, duration } = req.body;

    // 1) Fetch students => determine department
    const students = await Student.find({ _id: { $in: studentIds } });
    if (students.length === 0) {
      return res.status(400).json({ message: "No valid students found" });
    }
    const department = students[0].department;

    // 2) Get examiners from department
    let departmentExaminers = await Examiner.find({ department });
    if (departmentExaminers.length === 0) {
      return res.status(400).json({ message: "No examiners found in this department" });
    }

    // 3) Get all venues
    const allVenues = await Venue.find();
    if (allVenues.length === 0) {
      return res.status(400).json({ message: "No venues found" });
    }

    // 4) Next 14 days
    const possibleDates = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      possibleDates.push(date.toISOString().split("T")[0]); // e.g. "2025-04-10"
    }

    // 5) Find best date with fewest lectures
    let bestDate = null;
    let minLectures = Infinity;

    for (let date of possibleDates) {
      let totalLectures = 0;
      for (let examiner of departmentExaminers) {
        const lecturerSchedule = await Timetable.findOne({
          "weekdays.lecturer": examiner.examiner_id,
          "weekdays.date": date,
        });
        if (lecturerSchedule) {
          totalLectures += lecturerSchedule.weekdays.length;
        }
      }

      if (totalLectures < minLectures) {
        minLectures = totalLectures;
        bestDate = date;
      }
    }

    if (!bestDate) {
      return res.status(400).json({ message: "No suitable date found" });
    }

    // 6) Fetch existing presentations on bestDate
    const existingPresentations = await Presentation.find({ date: bestDate });

    // examinerVenueMap => which examiner is using which venue on bestDate
    const examinerVenueMap = new Map();
    const venueUsed = new Set();

    existingPresentations.forEach((presentation) => {
      presentation.examiners.forEach((examiner) => {
        examinerVenueMap.set(examiner.toString(), presentation.venue.toString());
        venueUsed.add(presentation.venue.toString());
      });
    });

    // 7) Define possible time slots
    const allTimeSlots = [
      "08:00", "08:30", "09:00", "09:30",
      "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30",
      "14:00", "14:30", "15:00", "15:30",
      "16:00", "16:30"
    ];

    // Helper: compute endTime from startTime + duration
    const calculateTimeRange = (startTime, duration) => {
      const [startH, startM] = startTime.split(":").map(Number);
      const startDate = new Date(0, 0, 0, startH, startM);
      const endDate = new Date(startDate.getTime() + duration * 60000); // add duration in ms

      const format = (num) => String(num).padStart(2, "0");
      return {
        startTime: `${format(startDate.getHours())}:${format(startDate.getMinutes())}`,
        endTime: `${format(endDate.getHours())}:${format(endDate.getMinutes())}`
      };
    };

    // 8) If bestDate is today => skip times that are <= current local time
    const todayString = new Date().toISOString().split("T")[0];
    let currentHHMM = null;
    if (bestDate === todayString) {
      // e.g. "13:05"
      currentHHMM = new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // 9) Try each time slot
    for (let slot of allTimeSlots) {
      // If bestDate is today => skip slot if slot <= currentHHMM
      if (bestDate === todayString && slot <= currentHHMM) {
        continue;
      }

      const adjustedSlot = calculateTimeRange(slot, duration);

      // Check if time slot is available for the day
      const isTimeAvailable = await isTimeSlotAvailable(
        bestDate,
        adjustedSlot.startTime,
        adjustedSlot.endTime,
        [],       // Not specifying examiners here => or pass deptExaminers if needed
        null,     // No specific venue => we do a more general check
        studentIds
      );

      if (!isTimeAvailable) continue; // skip if time is taken

      let selectedVenue = null;
      let selectedExaminers = [];

      // 1) First, check if examiners are already assigned a venue => keep same
      for (const examiner of departmentExaminers) {
        if (examinerVenueMap.has(examiner._id.toString())) {
          selectedVenue = examinerVenueMap.get(examiner._id.toString());
          selectedExaminers.push(examiner);
          if (selectedExaminers.length >= numExaminers) break;
        }
      }

      // 2) If not enough examiners assigned => pick new ones
      if (selectedExaminers.length < numExaminers) {
        const newExaminers = departmentExaminers.filter(
          (ex) => !examinerVenueMap.has(ex._id.toString())
        );
        if (newExaminers.length >= numExaminers) {
          selectedExaminers = newExaminers.slice(0, numExaminers);

          // pick a new venue not used
          for (let v of allVenues) {
            if (!venueUsed.has(v._id.toString())) {
              selectedVenue = v._id;
              venueUsed.add(v._id.toString());
              break;
            }
          }
        }
      }

      if (!selectedVenue || selectedExaminers.length < numExaminers) {
        return res.status(400).json({
          message: "No suitable venue and examiners available"
        });
      }

      // fetch full venue details
      const venueDetails = await Venue.findById(selectedVenue);

      return res.status(200).json({
        date: bestDate,
        examiners: selectedExaminers,
        venue: venueDetails,
        department,
        timeRange: adjustedSlot,
      });
    }

    return res.status(400).json({ message: "No suitable time slots available" });
  } catch (error) {
    console.error("Error in smartSuggestSlot:", error);
    res.status(500).json({ message: "Server error", error });
  }
};





export const smartSuggestSlotForReschedule = async (req, res) => {
  try {
    const { presentationId } = req.body;

    // 1) Fetch the existing presentation
    const presentation = await Presentation.findById(presentationId)
      .populate("students")
      .populate("examiners");

    if (!presentation) {
      return res.status(404).json({ message: "Presentation not found" });
    }

    // Gather data
    const department = presentation.department;
    const duration = presentation.duration;
    const studentIds = presentation.students.map((s) => s._id);

    // Convert "examiner_id" -> actual Examiner docs -> their _ids
    const examinerDocs = await Examiner.find({
      examiner_id: { $in: presentation.examiners.map((e) => e.examiner_id) },
    });
    const examinerIds = examinerDocs.map((exam) => exam._id);

    // 2) Find bestDate (lowest total lectures) over next 14 days
    const possibleDates = [];
    for (let i = 1; i <= 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      possibleDates.push(date.toISOString().split("T")[0]); // "YYYY-MM-DD"
    }

    let bestDate = null;
    let minLectures = Infinity;

    for (let date of possibleDates) {
      let totalLectures = 0;
      for (let examiner of examinerIds) {
        const lecturerSchedule = await Timetable.findOne({
          "weekdays.lecturer": examiner,
          "weekdays.date": date,
        });
        if (lecturerSchedule) {
          totalLectures += lecturerSchedule.weekdays.length;
        }
      }
      if (totalLectures < minLectures) {
        minLectures = totalLectures;
        bestDate = date;
      }
    }

    if (!bestDate) {
      return res.status(400).json({ message: "No suitable new date found" });
    }

    // 3) Fetch All Venues
    const allVenues = await Venue.find();
    if (!allVenues || allVenues.length === 0) {
      return res.status(400).json({ message: "No venues found" });
    }

    // 3.5) Fetch existing, non-rejected requests for bestDate => skip those times
    const existingRequests = await RescheduleRequest.find({
      "requestedSlot.date": bestDate,
      status: { $ne: "Rejected" },
    });
    // Build skipRanges
    const skipRanges = existingRequests.map((r) => ({
      start: r.requestedSlot.timeRange.startTime,
      end: r.requestedSlot.timeRange.endTime,
    }));

    // Helper to convert HH:MM -> total minutes
    const convertToMinutes = (time) => {
      const [hh, mm] = time.split(":").map(Number);
      return hh * 60 + mm;
    };

    // Overlap check
    const overlaps = (start1, end1, start2, end2) => {
      // Overlap if start1 < end2 && end1 > start2
      return start1 < end2 && end1 > start2;
    };

    // 4) Define time slots from 08:00 - 16:30
    const allTimeSlots = [
      "08:00", "08:30", "09:00", "09:30",
      "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30",
      "14:00", "14:30", "15:00", "15:30",
      "16:00", "16:30"
    ];

    // Helper to produce endTime from startTime + duration
    const calculateTimeRange = (startTime, duration) => {
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const startDate = new Date(0, 0, 0, startHours, startMinutes);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      const endHH = String(endDate.getHours()).padStart(2, "0");
      const endMM = String(endDate.getMinutes()).padStart(2, "0");
      return {
        startTime,
        endTime: `${endHH}:${endMM}`,
      };
    };

    // 5) If bestDate is today => skip timeslot <= current local time
    const todayString = new Date().toISOString().split("T")[0];
    let currentHHMM = null;
    if (bestDate === todayString) {
      currentHHMM = new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // 6) Try each slot
    for (let slot of allTimeSlots) {
      // If bestDate is today => skip slot if slot <= currentHHMM
      if (bestDate === todayString && currentHHMM && slot <= currentHHMM) {
        continue;
      }

      const { startTime, endTime } = calculateTimeRange(slot, duration);

      // Skip if overlaps with existingRequests
      const requestedStartMin = convertToMinutes(startTime);
      const requestedEndMin = convertToMinutes(endTime);

      let skipThisSlot = false;
      for (const sr of skipRanges) {
        const srStart = convertToMinutes(sr.start);
        const srEnd = convertToMinutes(sr.end);
        if (overlaps(requestedStartMin, requestedEndMin, srStart, srEnd)) {
          skipThisSlot = true;
          break;
        }
      }
      if (skipThisSlot) continue;

      // 6.1) Check isTimeSlotAvailable
      const isTimeAvailable = await isTimeSlotAvailable(
        bestDate,
        startTime,
        endTime,
        examinerIds, // the examiners
        null,        // no specific venue
        studentIds   // the students
      );
      if (!isTimeAvailable) continue;

      // 6.2) pick the first free venue
      let chosenVenue = null;
      for (let v of allVenues) {
        chosenVenue = v; // simply pick the first
        break;
      }
      if (!chosenVenue) continue;

      // 6.3) Return suggestion
      return res.status(200).json({
        date: bestDate,
        examiners: examinerIds, // array of examiner doc _ids
        venue: chosenVenue,     // full doc
        department,
        timeRange: { startTime, endTime },
      });
    }

    // If we exit => no suitable time slots
    return res.status(400).json({ message: "No suitable time slots available" });
  } catch (error) {
    console.error("smartSuggestSlotForReschedule error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};



export const requestReschedule = async (req, res) => {
  try {
    if (!req.user || !req.user.id || !req.user.role) {
      return res.status(401).json({ message: "Unauthorized request: User not found." });
    }

    const userId = req.user.id;        // from token
    const userType = req.user.role;    // e.g. 'examiner'

    const { presentationId, date, timeRange, venue, reason, requestorEmail } = req.body;

    // 1) Validate presentation
    const presentation = await Presentation.findById(presentationId);
    if (!presentation) {
      return res.status(404).json({ message: "Presentation not found" });
    }

    // 2) Validate fields
    if (!date || !timeRange || !venue) {
      return res.status(400).json({ message: "Date, time range, and venue are required." });
    }

    // 3) Create a reschedule request
    const newRequest = new RescheduleRequest({
      presentation: presentationId,
      requestedBy: { userId, userType },
      requestorEmail: requestorEmail || "", // store the email from the frontend
      requestedSlot: { date, timeRange, venue },
      reason,
      status: "Pending",
    });

    await newRequest.save();
    return res.status(201).json({
      message: "Reschedule request submitted successfully",
      newRequest
    });

  } catch (error) {
    console.error("Error in requestReschedule:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const approveOrRejectReschedule = async (req, res) => {
  try {
    const { requestId, action } = req.body;

    // 1) Fetch the reschedule request & populate the presentation + venue
    const request = await RescheduleRequest.findById(requestId).populate({
      path: "presentation",
      populate: { path: "venue", model: "Venue" },
    });
    if (!request) {
      return res.status(404).json({ message: "Reschedule request not found" });
    }

    // 2) Grab the presentation from the request
    const presentation = request.presentation;
    if (!presentation) {
      return res.status(404).json({ message: "Presentation not found in request." });
    }

    // 3) The requestor's email was stored in the doc at creation time
    const requestorEmail = request.requestorEmail || null;
    console.log("Requestor's email from doc:", requestorEmail);

    // 4) If "Reject"
    if (action === "Reject") {
      request.status = "Rejected";
      await request.save();

      // If we have a requestor email, send the "Rejected" message
      if (requestorEmail) {
        console.log("Sending reject email to:", requestorEmail);
        const subject = "Reschedule Request Rejected";
        const text = `Dear Examiner,

Your reschedule request for presentation "${presentation.title}" has been rejected.

Reason:
${request.reason}

If you have questions, please contact the admin.
`;
        await sendEmail(requestorEmail, subject, text);
      } else {
        console.log("No requestor email found, skipping reject email.");
      }

      return res.status(200).json({ message: "Reschedule request rejected successfully" });
    }

    // 5) Approve logic
    let actualVenueId = "UnknownVenue";
    if (presentation.venue?.venue_id) {
      actualVenueId = presentation.venue.venue_id;
    }

    const { date, timeRange, venue } = request.requestedSlot;
    const { examiners, students, title } = presentation;

    // 5.1) Check if the time slot is available
    const isAvailable = await isTimeSlotAvailable(
      date,
      timeRange.startTime,
      timeRange.endTime,
      examiners,
      venue,
      students
    );
    if (!isAvailable) {
      request.status = "Rejected";
      await request.save();

      if (requestorEmail) {
        console.log("Sending auto-reject (time slot unavailable) email to:", requestorEmail);
        const subject = "Reschedule Request Rejected - Time Slot Unavailable";
        const text = `Dear Examiner,

Your reschedule request for presentation "${title}" was automatically rejected because the requested time slot is not available.

Please contact the admin for further details.
`;
        await sendEmail(requestorEmail, subject, text);
      } else {
        console.log("No requestor email found, skipping auto-reject email.");
      }

      return res.status(400).json({
        message: "Time slot is not available. Request automatically rejected.",
      });
    }

    // 6) Update the presentation with new date/time/venue
    await Presentation.findByIdAndUpdate(presentation._id, {
      date,
      timeRange,
      venue,
    });

    // 7) Mark request as Approved
    request.status = "Approved";
    await request.save();

    // 8) Email the requestor about approval
    if (requestorEmail) {
      console.log("Sending approve email to:", requestorEmail);
      const subject = "Reschedule Request Approved";
      const text = `Dear Examiner,

Your reschedule request for presentation "${title}" has been approved!

New Date: ${date}
Time: ${timeRange.startTime} - ${timeRange.endTime}
Venue: ${actualVenueId}

Thank you.
`;
      await sendEmail(requestorEmail, subject, text);
    } else {
      console.log("No requestor email found, skipping approve email.");
    }

    // 9) Email all examiners in the presentation
    console.log("Sending update to all examiners in the presentation...");
    const examinerDocs = await Examiner.find({ _id: { $in: examiners } });
    for (const exDoc of examinerDocs) {
      if (exDoc.email) {
        const subject = "Presentation Rescheduled - Examiner Notification";
        const text = `Dear Examiner,

The presentation "${title}" has been rescheduled.

New Date: ${date}
Time: ${timeRange.startTime} - ${timeRange.endTime}
Venue: ${actualVenueId}

Please take note of these changes.
`;
        await sendEmail(exDoc.email, subject, text);
      }
    }

    // 🔟 Email all students
    console.log("Sending update to students...");
    const studentDocs = await Student.find({ _id: { $in: students } });
    for (const stDoc of studentDocs) {
      if (stDoc.email) {
        const subject = "Presentation Rescheduled - Student Notification";
        const text = `Dear Student,

Your presentation "${title}" has been rescheduled.

New Date: ${date}
Time: ${timeRange.startTime} - ${timeRange.endTime}
Venue: ${actualVenueId}

Please be prepared accordingly.
`;
        await sendEmail(stDoc.email, subject, text);
      }
    }

    //  Reschedule other lectures for each examiner
    console.log("Rescheduling other lectures for examiners...");
    for (const exDoc of examinerDocs) {
      const fakeReq = {
        body: {
          lecturerId: exDoc.examiner_id,
          date,
        },
      };
      const fakeRes = {
        status: (code) => ({
          json: (response) => {
            console.log(`Reschedule response for Examiner ${exDoc.examiner_id}:`, response);
          },
        }),
      };
      try {
        await rescheduleLectures(fakeReq, fakeRes);
      } catch (err) {
        console.error(`Error while rescheduling for Examiner ${exDoc.examiner_id}:`, err);
      }
    }

    return res.status(200).json({
      message: "Reschedule request approved, presentation updated",
    });
  } catch (error) {
    console.error("Error approving/rejecting reschedule:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};



// controllers/reschedule.controller.js (example)
export const getAllRequests = async (req, res, next) => {
  try {
    const requests = await RescheduleRequest.find()
      .populate({
        path: "presentation",
        populate: [
          { path: "examiners", model: "Examiner" },
          { path: "students", model: "Student" },
          { path: "venue", model: "Venue" },
        ],
      })
      .populate({
        path: "requestedSlot.venue",
        model: "Venue",
      })
      .populate({
        path: "requestedBy.userId",
        model: "User", // or "User" if that's where examiner_id is stored
      });

    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};


export const deleteRescheduleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Find the request
    const request = await RescheduleRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Reschedule request not found" });
    }

    // Delete the request
    await RescheduleRequest.findByIdAndDelete(requestId);

    res.status(200).json({ message: "Reschedule request deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


export const getPresentationsForExaminer = async (req, res) => {
  try {
    const examinerId = req.user.id; // Use the authenticated user's ID from the JWT token
    
    // Convert examinerId to ObjectId (if needed)
    const examinerObjectId = new mongoose.Types.ObjectId(examinerId);
    console.log("Fetching presentations for examiner with ObjectId:", examinerObjectId);

    // Fetch presentations for the examiner based on the examiner ObjectId
    const presentations = await Presentation.find({
      'examiners': examinerObjectId, // Querying by ObjectId reference
    });


    if (presentations.length === 0) {
      return res.status(404).json({ message: "No presentations found for this examiner" });
    }

    res.json(presentations);
  } catch (error) {
    console.error("Error fetching presentations for examiner:", error);
    res.status(500).json({ message: "Server error" });
  }
};




// Controller to get presentations for students
export const getPresentationsForStudent = async (req, res) => {
  try {
    const { studentId } = req.params; // Get the student's ID from params
    
    // Convert studentId to ObjectId (if needed)
    const studentObjectId = new mongoose.Types.ObjectId(studentId);


    // Fetch presentations for the student based on the student ObjectId
    const presentations = await Presentation.find({
      'students': studentObjectId, // Querying by ObjectId reference
    });


    if (presentations.length === 0) {
      return res.status(404).json({ message: "No presentations found for this student" });
    }

    res.json(presentations);
  } catch (error) {
    console.error("Error fetching presentations for student:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserPresentations = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Fetch presentations and populate student and examiner data
    const userPresentations = await Presentation.find()
      .populate("students", "student_id")
      .populate("examiners", "examiner_id")
      .populate("venue", "venue_id");

    // Filter presentations manually
    const filteredPresentations = userPresentations.filter(presentation =>
      presentation.students.some(student => student.student_id === userId) ||
      presentation.examiners.some(examiner => examiner.examiner_id === userId)
    );

    if (filteredPresentations.length === 0) {
      return res.status(404).json({ message: "No presentations found for this user" });
    }

    return res.status(200).json(filteredPresentations);
  } catch (error) {
    console.error("Error fetching user presentations:", error);
    return next(error);
  }
};

export const getRescheduleRequestsForExaminer = async (req, res) => {
  try {
    // 1) The authenticated examiner's ObjectId from JWT
    const examinerId = req.user.id; 

    // 2) Find all requests where `requestedBy.userId` = examinerId
    //    Populate presentation + ONLY the `venue_id` from venue (omitting `_id`)
    const requests = await RescheduleRequest.find({
      "requestedBy.userId": examinerId
    })
    .populate({
      path: "presentation",
      populate: {
        path: "venue",
        model: "Venue",
        select: "venue_id -_id", // Only return `venue_id`, exclude `_id`
      }
    })
    .sort({ created_at: -1 }); 

    // 3) If none found
    if (!requests || requests.length === 0) {
      return res.status(404).json({ message: "No reschedule requests found for this examiner" });
    }

    // 4) Return them
    return res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching reschedule requests for examiner:", error);
    return res.status(500).json({ message: "Server error" });
  }
};



export const deleteOldRejectedRequests = async (req, res) => {
  try {
    // 1) Calculate cutoff date (2 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 2);

    // 2) Delete all Rejected requests older than cutoff
    const result = await RescheduleRequest.deleteMany({
      status: "Rejected",
      created_at: { $lt: cutoffDate },
    });

    // 3) Return how many were deleted
    return res.status(200).json({
      message: `Deleted ${result.deletedCount} old rejected requests.`,
    });
  } catch (error) {
    console.error("Error deleting old rejected requests:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * Delete all 'Approved' (accepted) requests for the logged-in examiner.
 */
export const deleteAllApprovedRequestsForExaminer = async (req, res) => {
  try {
    // 1) Ensure user is examiner
    if (!req.user || !req.user.id || req.user.role !== "examiner") {
      return res.status(401).json({ message: "Unauthorized request: Not an examiner or not logged in." });
    }

    const examinerId = req.user.id;

    // 2) Delete all requests with "status" = "Approved" for this examiner
    const result = await RescheduleRequest.deleteMany({
      "requestedBy.userId": examinerId,
      status: "Approved",
    });

    return res.status(200).json({
      message: `All approved requests deleted successfully for examiner ${examinerId}.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting all approved requests for examiner:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * Delete all 'Rejected' requests for the logged-in examiner.
 */
export const deleteAllRejectedRequestsForExaminer = async (req, res) => {
  try {
    // 1) Ensure user is examiner
    if (!req.user || !req.user.id || req.user.role !== "examiner") {
      return res.status(401).json({ message: "Unauthorized request: Not an examiner or not logged in." });
    }

    const examinerId = req.user.id;

    // 2) Delete all requests with "status" = "Rejected" for this examiner
    const result = await RescheduleRequest.deleteMany({
      "requestedBy.userId": examinerId,
      status: "Rejected",
    });

    return res.status(200).json({
      message: `All rejected requests deleted successfully for examiner ${examinerId}.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting all rejected requests for examiner:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
