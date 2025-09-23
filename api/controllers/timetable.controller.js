import Timetable from "../models/timetable.model.js";
import StudentGroup from "../models/groups.model.js";
import Module from "../models/modules.model.js";
import Examiner from "../models/examiner.model.js"; // Lecturer is from Examiner Management
import Venue from "../models/venue.model.js";
import mongoose from "mongoose";
import Student from "../models/student.model.js";
//  Add a new timetable (Full week schedule)
export const addTimetable = async (req, res) => {
  try {
    const { group_id, schedule } = req.body;

    console.log("Received Request Body:", req.body); // Debugging: Log request data

    // Validate Group ID
    const groupExists = await StudentGroup.findOne({ group_id });
    if (!groupExists) {
      console.log("Invalid Group ID:", group_id);
      return res.status(400).json({ message: "Invalid Group ID. Group does not exist." });
    }

    // Fetch existing timetables to check for conflicts
    const allTimetables = await Timetable.find({});
    const existingLectures = [];

    // **Extract all existing lectures for conflict checking**
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

    // **Check for conflicts within the same submission**
    const submissionConflicts = new Set();

    // **Validate Weekly Schedule (Each day's lectures)**
    for (const day of schedule) {
      let dayLectures = day.lectures;

      // **Sort lectures by start time for easier conflict detection**
      dayLectures.sort((a, b) => a.start_time.localeCompare(b.start_time));

      for (let i = 0; i < dayLectures.length; i++) {
        const lecture = dayLectures[i];

        const lectureKey = `${day.day}-${lecture.start_time}-${lecture.end_time}-${lecture.lecturer_id}-${lecture.venue_id}`;

        // Prevent duplicate entries within the same request
        if (submissionConflicts.has(lectureKey)) {
          return res.status(400).json({
            message: `Duplicate lecture detected in the submission! The same lecturer and venue cannot have overlapping lectures.`,
            duplicateLecture: lecture
          });
        }
        submissionConflicts.add(lectureKey);

        // Validate Module Code
        const moduleExists = await Module.findOne({ module_code: lecture.module_code });
        if (!moduleExists) {
          console.log("Invalid Module Code:", lecture.module_code);
          return res.status(400).json({ message: `Invalid Module Code (${lecture.module_code}).` });
        }

        // Validate Lecturer ID
        const lecturerExists = await Examiner.findOne({ examiner_id: lecture.lecturer_id });
        if (!lecturerExists) {
          console.log("Invalid Lecturer ID:", lecture.lecturer_id);
          return res.status(400).json({ message: `Invalid Lecturer ID (${lecture.lecturer_id}).` });
        }

        // Validate Venue ID
        const venueExists = await Venue.findOne({ venue_id: lecture.venue_id });
        if (!venueExists) {
          console.log("Invalid Venue ID:", lecture.venue_id);
          return res.status(400).json({ message: `Invalid Venue ID (${lecture.venue_id}).` });
        }

        // **Check for Overlapping Lectures Within the Same Day for the Same Group**
        if (i > 0) {
          const prevLecture = dayLectures[i - 1];
          if (prevLecture.end_time > lecture.start_time) {
            return res.status(400).json({
              message: `Time conflict detected in the same group for ${group_id}! Lecture starting at ${lecture.start_time} overlaps with another lecture ending at ${prevLecture.end_time}.`,
            });
          }
        }

        // **Check for Venue & Lecturer Conflicts Across Other Groups**
        const conflictingLecture = await Timetable.findOne({
          "schedule.day": day.day,
          "schedule.lectures": {
            $elemMatch: {
              $or: [
                { venue_id: lecture.venue_id },
                { lecturer_id: lecture.lecturer_id }
              ],
              start_time: { $lt: lecture.end_time },
              end_time: { $gt: lecture.start_time }
            }
          },
          group_id: { $ne: group_id } // Ensure it's not the same group
        });

        if (conflictingLecture) {
          return res.status(400).json({
            message: `Schedule conflict detected! Venue ${lecture.venue_id} or Lecturer ${lecture.lecturer_id} is already booked at this time for another group.`,
          });
        }
      }
    }

    // **Create a new Timetable if no conflicts exist**
    const newTimetable = new Timetable({
      group_id,
      schedule,
    });

    await newTimetable.save();
    console.log("Timetable Created Successfully");

    res.status(201).json({ message: "Timetable created successfully!" });

  } catch (error) {
    console.error("Error while adding timetable:", error);
    res.status(500).json({ message: "Server error", error: error.message || error });
  }
};

//  View all timetables
export const viewAllTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.find();
    res.status(200).json(timetables);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// View timetable by Group ID
export const viewTimetableByGroupId = async (req, res) => {
  try {
    const { group_id } = req.params;
    const timetable = await Timetable.findOne({ group_id });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found for this group" });
    }

    res.status(200).json(timetable);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

//  Update a timetable (Full week update)
export const updateTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const { group_id, schedule } = req.body;

    // Validate Group ID
    const groupExists = await StudentGroup.findOne({ group_id });
    if (!groupExists) {
      return res.status(400).json({ message: "Invalid Group ID. Group does not exist." });
    }

    // Validate Weekly Schedule & Check Conflicts
    for (const day of schedule) {
      let dayLectures = day.lectures;

      // Sort lectures by start time for easier conflict checking
      dayLectures.sort((a, b) => a.start_time.localeCompare(b.start_time));

      for (let i = 0; i < dayLectures.length; i++) {
        const lecture = dayLectures[i];

        // Validate Module Code
        const moduleExists = await Module.findOne({ module_code: lecture.module_code });
        if (!moduleExists) {
          return res.status(400).json({ message: `Invalid Module Code (${lecture.module_code}).` });
        }

        // Validate Lecturer ID
        const lecturerExists = await Examiner.findOne({ examiner_id: lecture.lecturer_id });
        if (!lecturerExists) {
          return res.status(400).json({ message: `Invalid Lecturer ID (${lecture.lecturer_id}).` });
        }

        // Validate Venue ID
        const venueExists = await Venue.findOne({ venue_id: lecture.venue_id });
        if (!venueExists) {
          return res.status(400).json({ message: `Invalid Venue ID (${lecture.venue_id}).` });
        }

        // **Check for Overlapping Lectures Within the Same Day for the Same Group**
        if (i > 0) {
          const prevLecture = dayLectures[i - 1];
          if (prevLecture.end_time > lecture.start_time) {
            return res.status(400).json({
              message: `Time conflict detected in the same day for Group ${group_id}! Lecture starting at ${lecture.start_time} overlaps with another lecture ending at ${prevLecture.end_time}.`,
            });
          }
        }

        // **Check for Venue & Lecturer Conflicts Across Other Groups**
        const conflictingLecture = await Timetable.findOne({
          "schedule.day": day.day,
          "schedule.lectures": {
            $elemMatch: {
              $or: [
                { venue_id: lecture.venue_id },
                { lecturer_id: lecture.lecturer_id }
              ],
              start_time: { $lt: lecture.end_time },
              end_time: { $gt: lecture.start_time }
            }
          },
          group_id: { $ne: group_id }, // Ensure it's not the same group
          _id: { $ne: id } // Ensure it's not the same timetable being updated
        });

        if (conflictingLecture) {
          return res.status(400).json({
            message: `Schedule conflict detected! Venue ${lecture.venue_id} or Lecturer ${lecture.lecturer_id} is already booked at this time for another group.`,
          });
        }
      }
    }

    const updatedTimetable = await Timetable.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedTimetable) {
      return res.status(404).json({ message: "Timetable not found!" });
    }

    res.status(200).json({ message: "Timetable updated successfully!", updatedTimetable });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

//  Delete a timetable
export const deleteTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTimetable = await Timetable.findByIdAndDelete(id);

    if (!deletedTimetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    res.status(200).json({ message: "Timetable deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getTimetableForStudent = async (req, res) => {
  try {
      const { studentId } = req.params; // studentId is a string like "ST2025001"

      // Convert studentId to ObjectId if students are stored as ObjectId in StudentGroup
      const student = await Student.findOne({ student_id: studentId });
      if (!student) {
          return res.status(404).json({ message: "Student not found." });
      }

      // Find the student's group using ObjectId
      const studentGroup = await StudentGroup.findOne({ students: student._id });

      if (!studentGroup) {
          return res.status(404).json({ message: "Student is not assigned to any group." });
      }

      // Get the timetable for the group
      const timetable = await Timetable.findOne({ group_id: studentGroup.group_id });

      if (!timetable) {
          return res.status(404).json({ message: "No timetable found for this student group." });
      }

      res.status(200).json(timetable);
  } catch (error) {
      console.error("Error fetching timetable:", error);
      res.status(500).json({ message: "Server error", error: error.message || error });
  }
};



  
export const getTimetableForExaminer = async (req, res) => {
    try {
        const { examinerId } = req.params;

        if (!examinerId) {
            return res.status(400).json({ message: "Examiner ID is required in the request parameters." });
        }

        // Find all timetables where the examiner has lectures
        const timetables = await Timetable.find({
            "schedule.lectures.lecturer_id": examinerId,
        });

        if (!timetables || timetables.length === 0) {
            return res.status(404).json({ message: "No scheduled lectures found for this examiner." });
        }

        // Extract only the lectures relevant to this examiner
        const examinerSchedule = timetables.map((timetable) => ({
            group_id: timetable.group_id,
            schedule: timetable.schedule.map((day) => ({
                day: day.day,
                lectures: day.lectures.filter((lecture) => lecture.lecturer_id === examinerId),
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
    
        // Find all timetables that include this venue in any day's lectures
        const timetables = await Timetable.find({
          "schedule.lectures.venue_id": venueId,
        });
    
        if (timetables.length === 0) {
          return res.status(404).json({ message: "No scheduled lectures found for this venue." });
        }
    
        // Extract only the lectures relevant to this venue
        const venueSchedule = timetables.map((timetable) => {
          return {
            group_id: timetable.group_id,
            schedule: timetable.schedule.map((day) => ({
              day: day.day,
              lectures: day.lectures.filter((lecture) => lecture.venue_id === venueId),
            })),
          };
        });
    
        res.status(200).json(venueSchedule);
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
};

export const getFreeTimesForLecturer = async (req, res) => {
      try {
        const { lecturerId } = req.params;
    
        if (!lecturerId) {
          return res.status(400).json({ message: "Lecturer ID is required" });
        }
    
        // Fetch all timetables where the lecturer has lectures
        const timetables = await Timetable.find({
          "schedule.lectures.lecturer_id": lecturerId,
        });
    
        if (timetables.length === 0) {
          return res.status(404).json({ message: "No timetable found for this lecturer." });
        }
    
        // Define possible time slots for a day
        const allTimeSlots = [
          { startTime: "08:00", endTime: "09:00" },
          { startTime: "09:00", endTime: "10:00" },
          { startTime: "10:00", endTime: "11:00" },
          { startTime: "11:00", endTime: "12:00" },
          { startTime: "12:00", endTime: "13:00" },
          { startTime: "13:00", endTime: "14:00" },
          { startTime: "14:00", endTime: "15:00" },
          { startTime: "15:00", endTime: "16:00" },
          { startTime: "16:00", endTime: "17:00" }
        ];
    
        // Initialize free time storage for each weekday
        const freeTimes = {
          Monday: [...allTimeSlots],
          Tuesday: [...allTimeSlots],
          Wednesday: [...allTimeSlots],
          Thursday: [...allTimeSlots],
          Friday: [...allTimeSlots],
        };
    
        // Iterate over each schedule and remove occupied slots
        timetables.forEach((timetable) => {
          timetable.schedule.forEach((day) => {
            if (freeTimes[day.day]) {
              // Get busy slots for this lecturer
              const busySlots = day.lectures
                .filter((lecture) => lecture.lecturer_id === lecturerId)
                .map((lecture) => ({
                  startTime: lecture.start_time,
                  endTime: lecture.end_time,
                }));
    
              // Remove busy slots from the free time list
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
    
        return res.status(200).json({ lecturerId, freeTimes });
      } catch (error) {
        console.error("Error fetching free times:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
      }
};

export const getTimetableById = async (req, res) => {
      try {
        const { id } = req.params;
        
        const timetable = await Timetable.findById(id);
        
        if (!timetable) {
          return res.status(404).json({ message: "Timetable not found!" });
        }
    
        res.status(200).json(timetable);
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
};
    
    
    