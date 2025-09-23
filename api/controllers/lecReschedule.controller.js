import RescheduledLecture from "../models/lecRescedule.model.js";
import Timetable from "../models/timetable.model.js";
import StudentGroup from "../models/groups.model.js";
import Student from "../models/student.model.js";
import { sendEmail } from "../utils/emailSender.js";
import moment from "moment";

export const rescheduleLectures = async (req, res) => {
    try {
      const { lecturerId, date } = req.body;
  
      if (!lecturerId || !date) {
        return res.status(400).json({ message: "Lecturer ID and Date are required" });
      }
    
      // **Convert date to weekday (e.g., Friday)**
      const givenDay = moment(date).format("dddd");
  
      // **Fetch all timetables to check for actual availability**
      const allTimetables = await Timetable.find({});
      if (!allTimetables || allTimetables.length === 0) {
        return res.status(400).json({ message: "No timetables found." });
      }
  
      let lecturesToReschedule = [];
  
      // **Extract lectures for the given lecturer on that day**
      for (const timetable of allTimetables) {
        for (const day of timetable.schedule) {
          if (day.day === givenDay) {
            lecturesToReschedule.push(
              ...day.lectures
                .filter((lecture) => lecture.lecturer_id === lecturerId)
                .map((lecture) => ({
                  start_time: lecture.start_time,
                  end_time: lecture.end_time,
                  duration: moment(lecture.end_time, "HH:mm").diff(moment(lecture.start_time, "HH:mm"), "minutes"),
                  module_code: lecture.module_code,
                  venue_id: lecture.venue_id,
                  group_id: timetable.group_id,
                }))
            );
          }
        }
      }
  
      if (lecturesToReschedule.length === 0) {
        return res.status(404).json({ message: "No lectures found for this lecturer on this date." });
      }
    
      // **Check if lectures were already rescheduled**
      const alreadyRescheduled = await RescheduledLecture.findOne({
        lecturer_id: lecturerId,
        original_date: date,
      });
  
      if (alreadyRescheduled) {
        return res.status(400).json({ message: "Lectures for this day have already been rescheduled." });
      }
  
      // **Find Free Slots - Checking ALL timetables**
      const freeTimes = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
      };
  
      // **Collect Free Slots**
      allTimetables.forEach((timetable) => {
        timetable.schedule.forEach((day) => {
          let busySlots = day.lectures.map((lecture) => ({
            startTime: lecture.start_time,
            endTime: lecture.end_time,
          }));
  
          let availableSlots = generateFreeTimeSlots(busySlots); // Generate dynamic free slots
          freeTimes[day.day] = availableSlots;
        });
      });
  
  
      // **Find the Next Available Reschedule Day After the Given Date**
      let rescheduledDate = null;
      let newLectureTimes = [];
  
      const today = moment(date);
  
      for (let i = 1; i <= 7; i++) { // Search for the next 7 days
        let futureDate = moment(today).add(i, "days").format("YYYY-MM-DD");
        let futureDay = moment(futureDate).format("dddd");
  
        if (freeTimes[futureDay]) {
          let matchedSlots = assignTimeSlots(freeTimes[futureDay], lecturesToReschedule);
          if (matchedSlots) {
            rescheduledDate = futureDate;
            newLectureTimes = matchedSlots;
            break;
          }
        }
      }
  
      if (!rescheduledDate) {
        return res.status(400).json({ message: "No suitable time slot found for rescheduling." });
      }
    
      // **Store Rescheduled Lectures**
      const rescheduled = new RescheduledLecture({
        lecturer_id: lecturerId,
        original_date: date,
        rescheduled_date: rescheduledDate,
        lectures: newLectureTimes,
      });
  
      await rescheduled.save();
  
      // **Send Notifications to Students**
      // **Send Notifications to Students**
const studentEmails = new Set();

for (const lecture of lecturesToReschedule) {
    try {

        const studentGroup = await StudentGroup.findOne({ group_id: lecture.group_id });

        if (!studentGroup) {
            console.log(` No student group found for group_id: ${lecture.group_id}`);
            continue;
        }

        if (!studentGroup.students || studentGroup.students.length === 0) {
            console.log(` No students listed under group: ${lecture.group_id}`);
            continue;
        }


        //  **FIXED:** Fetch students using `_id`, not `student_id`
        const students = await Student.find({ _id: { $in: studentGroup.students } });

        if (!students || students.length === 0) {
            console.log(` No students found in group: ${lecture.group_id}`);
            continue;
        }


        students.forEach((student) => {
            if (student.email) {
                studentEmails.add(student.email);
            }
        });

    } catch (error) {
        console.error(`Error fetching students for group ${lecture.group_id}:`, error);
    }
}



// **Ensure at least one student email is found before sending**
if (studentEmails.size === 0) {
    console.log(" No student emails found, skipping email notification.");
} else {

    const emailSubject = "Lecture Rescheduled Notification";

    for (const email of studentEmails) {
        // Fetching the rescheduled lectures details
        const lectureDetails = newLectureTimes.map(lecture => {
            return `Module: ${lecture.module_code}
    Date:     ${rescheduledDate}
    Time:     ${lecture.start_time} - ${lecture.end_time}
    Venue:    ${lecture.venue_id}
    Group ID: ${lecture.group_id}
    -----------------------------------------`;
        }).join("\n\n");
    
        const emailText = `Dear Student,
    
    Your lecture has been rescheduled. Below are the new details:
    
    ${lectureDetails}
    
    Please make sure to attend the lecture at the specified time.
    
    Thank you.`;
    
        try {
            await sendEmail(email, emailSubject, emailText);
        } catch (error) {
            console.error(` Failed to send email to ${email}:`, error);
        }
    }
    
}

  
      return res.status(200).json({ message: "Lectures rescheduled & notifications sent.", rescheduled });
    } catch (error) {
      console.error("Error in rescheduling lectures:", error);
      return res.status(500).json({ message: "Server error", error });
    }
  };
  
  const generateFreeTimeSlots = (busySlots) => {
    let allTimeSlots = [];
    let startTime = moment("08:00", "HH:mm");
    let endTime = moment("17:00", "HH:mm");
  
    while (startTime < endTime) {
      let nextTime = moment(startTime).add(15, "minutes"); // ✅ Uses 15-minute increments
      let isBusy = busySlots.some(
        (b) =>
          moment(b.startTime, "HH:mm").isBefore(nextTime) &&
          moment(b.endTime, "HH:mm").isAfter(startTime)
      );
  
      if (!isBusy) {
        allTimeSlots.push({
          startTime: startTime.format("HH:mm"),
          endTime: nextTime.format("HH:mm"),
        });
      }
  
      startTime = nextTime;
    }
  
    return allTimeSlots;
  };
  
  
  const assignTimeSlots = (availableSlots, lectures) => {
    let assignedSlots = [];
  
    for (let lecture of lectures) {
      let requiredDuration = lecture.duration; // 🔥 Get exact duration
      let matchedSlot = findContinuousSlots(availableSlots, requiredDuration);
      if (!matchedSlot) {
        return null;
      }
  
      assignedSlots.push({
        start_time: matchedSlot.start,
        end_time: matchedSlot.end,
        module_code: lecture.module_code,
        venue_id: lecture.venue_id,
        group_id: lecture.group_id,
      });
  
      // Remove assigned slots from available slots
      availableSlots = availableSlots.filter(
        (slot) => slot.startTime !== matchedSlot.start
      );
    }
  
    return assignedSlots;
  };
  
  
  const findContinuousSlots = (slots, requiredDuration) => {
    for (let i = 0; i < slots.length; i++) {
        let start = slots[i].startTime;
        let totalDuration = 0;
        let end = null;

        let slotSequence = []; // ✅ Track consecutive slots

        for (let j = i; j < slots.length; j++) {
            let slotStart = moment(slots[j].startTime, "HH:mm");
            let slotEnd = moment(slots[j].endTime, "HH:mm");
            let slotDuration = slotEnd.diff(slotStart, "minutes");

            if (slotSequence.length === 0 || 
                moment(slotSequence[slotSequence.length - 1].endTime, "HH:mm").isSame(slotStart)) {
                
                // ✅ If it's a valid consecutive slot, add to sequence
                slotSequence.push(slots[j]);
                totalDuration += slotDuration;

                if (totalDuration === requiredDuration) {
                    end = slotEnd.format("HH:mm");

                    return {
                        start: start,
                        end: end,
                    };
                }
            } else {
                // ❌ If slots are not consecutive, reset tracking
                break;
            }
        }
    }

    return null; // No valid continuous slots found
};

  
  
  

export const getRescheduledLecturesForLecturer = async (req, res) => {
    try {
      const { lecturerId } = req.params;
  
      const rescheduledLectures = await RescheduledLecture.find({ lecturer_id: lecturerId });
  
      if (rescheduledLectures.length === 0) {
        return res.status(404).json({ message: "No rescheduled lectures found." });
      }
  
      res.status(200).json(rescheduledLectures);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  };
  