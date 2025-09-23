import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AddTimetable() {
  const [groups, setGroups] = useState([]);
  const [modules, setModules] = useState([]);
  const [examiners, setExaminers] = useState([]);
  const [venues, setVenues] = useState([]);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [schedule, setSchedule] = useState([
    { day: "Monday", lectures: [] },
    { day: "Tuesday", lectures: [] },
    { day: "Wednesday", lectures: [] },
    { day: "Thursday", lectures: [] },
    { day: "Friday", lectures: [] },
  ]);

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const navigate = useNavigate();

  // 1) Fetch groups, modules, examiners, venues
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupRes, moduleRes, examinerRes, venueRes] = await Promise.all([
          axios.get("/api/groups/all"),
          axios.get("/api/modules/all"),
          axios.get("/api/examiners/get-ex"),
          axios.get("/api/venues/get-ven"),
        ]);

        setGroups(groupRes.data);
        setModules(moduleRes.data);
        setExaminers(examinerRes.data);
        setVenues(venueRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorMessage("Failed to load data. Please try again.");
      }
    };
    fetchData();
  }, []);

  // 2) Add a lecture
  const addLecture = (dayIndex) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[dayIndex].lectures.push({
      start_time: "",
      end_time: "",
      module_code: "",
      lecturer_id: "",
      venue_id: "",
    });
    setSchedule(updatedSchedule);
  };

  // 3) Remove a lecture
  const removeLecture = (dayIndex, lectureIndex) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[dayIndex].lectures.splice(lectureIndex, 1);
    setSchedule(updatedSchedule);
  };

  // 4) Generate time slots from 08:00 to 18:00 (1-hour intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      const formatted = `${hour.toString().padStart(2, "0")}:00`;
      slots.push(formatted);
    }
    return slots;
  };

  // 5) Handle lecture input changes with validations
  const handleLectureChange = (dayIndex, lectureIndex, field, value) => {
    const updatedSchedule = [...schedule];
    const lecture = updatedSchedule[dayIndex].lectures[lectureIndex];

    // Start time validation
    if (field === "start_time") {
      if (value < "08:00" || value > "18:00") {
        setErrors((prev) => ({
          ...prev,
          [`start_time_${dayIndex}_${lectureIndex}`]:
            "Start time must be between 08:00 and 18:00",
        }));
      } else {
        // Clear any previous error
        setErrors((prev) => ({
          ...prev,
          [`start_time_${dayIndex}_${lectureIndex}`]: null,
        }));
      }
      lecture.start_time = value;
    }

    // End time validation
    else if (field === "end_time") {
      const startTime = lecture.start_time;
      if (!startTime) {
        // We can't compare if there's no startTime yet
        lecture.end_time = value;
      } else {
        if (value <= startTime || value > "18:00") {
          setErrors((prev) => ({
            ...prev,
            [`end_time_${dayIndex}_${lectureIndex}`]:
              "End time must be after start time & before 18:00",
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            [`end_time_${dayIndex}_${lectureIndex}`]: null,
          }));
        }
      }
      lecture.end_time = value;
    }

    // For module_code, lecturer_id, venue_id => no special checks here
    else {
      lecture[field] = value;
    }

    setSchedule(updatedSchedule);
  };

  // 6) Validate the entire form
  const validateForm = () => {
    const newErrors = {};

    // Group required
    if (!selectedGroup) {
      newErrors.group_id = "Group is required.";
    }

    // For each lecture, ensure no field is empty
    schedule.forEach((day, dayIndex) => {
      day.lectures.forEach((lecture, lectureIndex) => {
        if (!lecture.start_time) {
          newErrors[`start_time_${dayIndex}_${lectureIndex}`] = "Start time required";
        }
        if (!lecture.end_time) {
          newErrors[`end_time_${dayIndex}_${lectureIndex}`] = "End time required";
        }
        if (!lecture.module_code) {
          newErrors[`module_code_${dayIndex}_${lectureIndex}`] = "Module required";
        }
        if (!lecture.lecturer_id) {
          newErrors[`lecturer_id_${dayIndex}_${lectureIndex}`] = "Lecturer required";
        }
        if (!lecture.venue_id) {
          newErrors[`venue_id_${dayIndex}_${lectureIndex}`] = "Venue required";
        }
      });
    });

    return newErrors;
  };

  // 7) Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const formData = {
      group_id: selectedGroup,
      schedule,
    };

    setLoadingSubmit(true);
    try {
      await axios.post("/api/timetables/add", formData, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      alert("Timetable added successfully!");
      navigate("/view-timetables");
    } catch (error) {
      console.error("Error adding timetable:", error);
      setErrorMessage(error.response?.data?.message || "Failed to add timetable.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-5 bg-white shadow-lg rounded-lg mt-10">
      <h2 className="text-2xl font-bold text-center mb-5">Add Timetable</h2>
      {errorMessage && <p className="text-red-600 text-center mb-3">{errorMessage}</p>}

      {/* Group Selection */}
      <div className="mb-4">
        <label className="block text-lg font-semibold mb-1">Select Group</label>
        <select
          className="w-full p-2 border rounded-lg"
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
        >
          <option value="">Select a Group</option>
          {groups.map((group) => (
            <option key={group.group_id} value={group.group_id}>
              {group.group_id} - {group.department}
            </option>
          ))}
        </select>
        {errors.group_id && <p className="text-red-500">{errors.group_id}</p>}
      </div>

      {/* Weekly Schedule Form */}
      <form onSubmit={handleSubmit}>
        {schedule.map((day, dayIndex) => (
          <div key={day.day} className="mb-6">
            <h3 className="text-xl font-semibold mb-2">{day.day}</h3>

            {day.lectures.map((lecture, lectureIndex) => (
              <div key={lectureIndex} className="mb-3">
                <div className="flex gap-2 items-center">
                  {/* Start Time */}
                  <div className="flex flex-col">
                    <select
                      className="p-2 border rounded-lg w-24"
                      value={lecture.start_time}
                      onChange={(e) =>
                        handleLectureChange(dayIndex, lectureIndex, "start_time", e.target.value)
                      }
                    >
                      <option value="">Start</option>
                      {generateTimeSlots().map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    {errors[`start_time_${dayIndex}_${lectureIndex}`] && (
                      <p className="text-red-500 text-sm">
                        {errors[`start_time_${dayIndex}_${lectureIndex}`]}
                      </p>
                    )}
                  </div>

                  {/* End Time */}
                  <div className="flex flex-col">
                    <select
                      className="p-2 border rounded-lg w-24"
                      value={lecture.end_time}
                      onChange={(e) =>
                        handleLectureChange(dayIndex, lectureIndex, "end_time", e.target.value)
                      }
                    >
                      <option value="">End</option>
                      {generateTimeSlots().map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    {errors[`end_time_${dayIndex}_${lectureIndex}`] && (
                      <p className="text-red-500 text-sm">
                        {errors[`end_time_${dayIndex}_${lectureIndex}`]}
                      </p>
                    )}
                  </div>

                  {/* Module */}
                  <div className="flex flex-col w-36">
                    <select
                      className="p-2 border rounded-lg"
                      value={lecture.module_code}
                      onChange={(e) =>
                        handleLectureChange(dayIndex, lectureIndex, "module_code", e.target.value)
                      }
                    >
                      <option value="">Module</option>
                      {modules.map((mod) => (
                        <option key={mod.module_code} value={mod.module_code}>
                          {mod.module_code}
                        </option>
                      ))}
                    </select>
                    {errors[`module_code_${dayIndex}_${lectureIndex}`] && (
                      <p className="text-red-500 text-sm">
                        {errors[`module_code_${dayIndex}_${lectureIndex}`]}
                      </p>
                    )}
                  </div>

                  {/* Lecturer */}
                  <div className="flex flex-col w-36">
                    <select
                      className="p-2 border rounded-lg"
                      value={lecture.lecturer_id}
                      onChange={(e) =>
                        handleLectureChange(dayIndex, lectureIndex, "lecturer_id", e.target.value)
                      }
                    >
                      <option value="">Lecturer</option>
                      {examiners.map((exam) => (
                        <option key={exam.examiner_id} value={exam.examiner_id}>
                          {exam.examiner_id} - {exam.name}
                        </option>
                      ))}
                    </select>
                    {errors[`lecturer_id_${dayIndex}_${lectureIndex}`] && (
                      <p className="text-red-500 text-sm">
                        {errors[`lecturer_id_${dayIndex}_${lectureIndex}`]}
                      </p>
                    )}
                  </div>

                  {/* Venue */}
                  <div className="flex flex-col w-36">
                    <select
                      className="p-2 border rounded-lg"
                      value={lecture.venue_id}
                      onChange={(e) =>
                        handleLectureChange(dayIndex, lectureIndex, "venue_id", e.target.value)
                      }
                    >
                      <option value="">Venue</option>
                      {venues.map((ven) => (
                        <option key={ven.venue_id} value={ven.venue_id}>
                          {ven.venue_id}
                        </option>
                      ))}
                    </select>
                    {errors[`venue_id_${dayIndex}_${lectureIndex}`] && (
                      <p className="text-red-500 text-sm">
                        {errors[`venue_id_${dayIndex}_${lectureIndex}`]}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="text-red-600 ml-2"
                    onClick={() => removeLecture(dayIndex, lectureIndex)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="text-blue-600 mt-2"
              onClick={() => addLecture(dayIndex)}
            >
              + Add Lecture
            </button>
          </div>
        ))}

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-blue-600 text-white p-3 rounded-lg w-full mt-5 hover:opacity-90"
          disabled={loadingSubmit}
        >
          {loadingSubmit ? "Adding..." : "Add Timetable"}
        </button>
      </form>
    </div>
  );
}
