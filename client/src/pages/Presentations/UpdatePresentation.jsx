import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { PlusCircleIcon, TrashIcon } from "@heroicons/react/24/solid";
import AvailabilityCheckerModal from "./AvailabilityCheckerModal";

const UpdatePresentation = () => {
  const { id } = useParams(); // Get presentation ID from URL
  const navigate = useNavigate();

  // Presentation fields
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [venue, setVenue] = useState("");       // Store venue's _id
  const [date, setDate] = useState("");
  const [timeRange, setTimeRange] = useState({ startTime: "", endTime: "" });
  const [duration, setDuration] = useState("");
  const [numOfExaminers, setNumOfExaminers] = useState("1");

  // Data from server
  const [students, setStudents] = useState([]); // All possible students in this dept
  const [selectedStudents, setSelectedStudents] = useState([]); // Currently chosen
  const [examiners, setExaminers] = useState([]); // All possible examiners in this dept
  const [selectedExaminers, setSelectedExaminers] = useState([]); // Currently chosen
  const [venues, setVenues] = useState([]);     // All possible venues

  // UI states
  const [loadingData, setLoadingData] = useState(true);     // For initial fetch
  const [loadingUpdate, setLoadingUpdate] = useState(false); // For update button
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errors, setErrors] = useState({});

  // Availability Modal
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);

  // Department Options
  const departmentOptions = ["IT", "IM", "ISC", "SE"];

  // For date min attribute
  const todayString = new Date().toISOString().split("T")[0];

  // 1️⃣ Fetch existing presentation details
  useEffect(() => {
    const fetchPresentationDetails = async () => {
      try {
        const response = await axios.get(`/api/presentations/get-pres/${id}`);
        const pres = response.data;

        // Basic fields
        setTitle(pres.title);
        setDepartment(pres.department);
        setVenue(pres.venue?._id || "");
        setDate(pres.date);
        setDuration(String(pres.duration));
        setNumOfExaminers(String(pres.numOfExaminers));
        setTimeRange({
          startTime: pres.timeRange.startTime,
          endTime: pres.timeRange.endTime,
        });

        // Students => convert to array of { _id, student_id, name }
        const mappedStudents = (pres.students || []).map((s) => ({
          _id: s._id,
          student_id: s.student_id,
          name: s.name,
        }));
        setSelectedStudents(mappedStudents);

        // Examiners => convert to array of { _id, examiner_id, name }
        const mappedExaminers = (pres.examiners || []).map((ex) => ({
          _id: ex._id,
          examiner_id: ex.examiner_id,
          name: ex.name,
        }));
        setSelectedExaminers(mappedExaminers);
      } catch (err) {
        setError("Failed to fetch presentation details.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchPresentationDetails();
  }, [id]);

  // 2️⃣ Fetch data (students, examiners, venues) based on department
  useEffect(() => {
    if (!department) return;

    // Students
    axios
      .get(`/api/students/get-dept/${department}`)
      .then((res) => setStudents(res.data || []))
      .catch(() => setStudents([]));

    // Examiners
    axios
      .get(`/api/examiners/get-dept/${department}`)
      .then((res) => setExaminers(res.data || []))
      .catch(() => setExaminers([]));

    // Venues
    axios
      .get("/api/venues/get-ven")
      .then((res) => setVenues(res.data || []))
      .catch(() => setVenues([]));
  }, [department]);

  // 3️⃣ Handle numeric input to block negative or 'e'
  const handleNumericKeyDown = (e) => {
    if (["-", "e", "+"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // 4️⃣ Validate form
  const validateForm = () => {
    const newErrors = {};

    // Title required
    if (!title.trim()) {
      newErrors.title = "Title is required.";
    }
    // Department required
    if (!department) {
      newErrors.department = "Department is required.";
    }
    // Venue required
    if (!venue) {
      newErrors.venue = "Venue is required.";
    }
    // Date not in the past
    if (!date) {
      newErrors.date = "Date is required.";
    } else if (date < todayString) {
      newErrors.date = "Cannot select a past date.";
    } else if (date === todayString) {
      // If same day, check if startTime is after current local time
      const now = new Date();
      const currentHHMM = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }); // e.g. "13:05"
      if (timeRange.startTime && timeRange.startTime <= currentHHMM) {
        newErrors.date = "Start time must be after the current time if date is today.";
      }
    }
    // timeRange between 08:00 and 18:00, endTime after startTime
    const { startTime, endTime } = timeRange;
    if (!startTime || !endTime) {
      newErrors.timeRange = "Start and End times are required.";
    } else {
      if (startTime < "08:00" || startTime > "18:00") {
        newErrors.timeRange = "Start time must be between 08:00 and 18:00.";
      } else if (endTime < "08:00" || endTime > "18:00") {
        newErrors.timeRange = "End time must be between 08:00 and 18:00.";
      } else if (endTime <= startTime) {
        newErrors.timeRange = "End time must be after Start time.";
      }
    }
    // Duration > 0
    if (!duration || Number(duration) < 1) {
      newErrors.duration = "Duration must be at least 1 minute.";
    }
    // numOfExaminers > 0
    if (!numOfExaminers || Number(numOfExaminers) < 1) {
      newErrors.numOfExaminers = "Number of Examiners must be at least 1.";
    }
    // selectedStudents => must have at least 1
    if (selectedStudents.length === 0) {
      newErrors.students = "At least one student is required.";
    }
    // unique students
    const studentIds = selectedStudents.map((s) => s._id);
    const uniqueStudentIds = new Set(studentIds);
    if (uniqueStudentIds.size !== studentIds.length) {
      newErrors.students = "Students must be unique.";
    }
    // selectedExaminers => must match numOfExaminers
    if (selectedExaminers.length !== Number(numOfExaminers)) {
      newErrors.examiners = `Number of examiners must match ${numOfExaminers}.`;
    }
    // unique examiners
    const examinerIds = selectedExaminers.map((ex) => ex._id);
    const uniqueExaminerIds = new Set(examinerIds);
    if (uniqueExaminerIds.size !== examinerIds.length) {
      newErrors.examiners = "Examiners must be unique.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 5️⃣ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    // Convert selectedStudents => array of _id
    const studentIds = selectedStudents.map((s) => s._id);
    // Convert selectedExaminers => array of _id
    const examinerIds = selectedExaminers.map((ex) => ex._id);

    try {
      setLoadingUpdate(true);
      await axios.put(`/api/presentations/update-pres/${id}`, {
        title,
        department,
        venue,
        date,
        duration: Number(duration),
        numOfExaminers: Number(numOfExaminers),
        timeRange,
        students: studentIds,
        examiners: examinerIds,
      });
      setSuccessMessage("Presentation updated successfully!");
      setTimeout(() => navigate("/admin-pres-view"), 2000);
    } catch (err) {
      console.error("Update Error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to update presentation.");
    } finally {
      setLoadingUpdate(false);
    }
  };

  // If still loading data
  if (loadingData) {
    return <div className="text-center text-lg font-semibold">Loading...</div>;
  }

  return (
    <div className="p-6 min-h-screen flex justify-center bg-gray-50">
      <div className="max-w-lg w-full bg-white p-8 shadow-lg rounded-lg">
        <h1 className="text-3xl font-bold text-center mb-6">Update Presentation</h1>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {successMessage && <p className="text-green-600 text-sm mb-4">{successMessage}</p>}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Presentation Title</label>
            <input
              type="text"
              className="w-full p-2 border rounded-md"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Department Dropdown */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Department</label>
            <select
              className="w-full p-2 border rounded-md"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">Select a department</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
          </div>

          {/* Venue Dropdown */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Venue</label>
            <select
              className="w-full p-2 border rounded-md"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            >
              <option value="">Select a venue</option>
              {venues.map((ven) => (
                <option key={ven._id} value={ven._id}>
                  {ven.venue_id}
                </option>
              ))}
            </select>
            {errors.venue && <p className="text-red-500 text-sm mt-1">{errors.venue}</p>}
          </div>

          {/* Date */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded-md"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={todayString}
            />
            {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Start Time</label>
              <input
                type="time"
                className="w-full p-2 border rounded-md"
                value={timeRange.startTime}
                onChange={(e) => setTimeRange({ ...timeRange, startTime: e.target.value })}
                min="08:00"
                max="18:00"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">End Time</label>
              <input
                type="time"
                className="w-full p-2 border rounded-md"
                value={timeRange.endTime}
                onChange={(e) => setTimeRange({ ...timeRange, endTime: e.target.value })}
                min="08:00"
                max="18:00"
              />
            </div>
          </div>
          {errors.timeRange && <p className="text-red-500 text-sm mb-4">{errors.timeRange}</p>}

          {/* Duration & Number of Examiners */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Duration (minutes)</label>
            <input
              type="number"
              className="w-full p-2 border rounded-md"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              onKeyDown={(e) => {
                if (["-", "e", "+"].includes(e.key)) e.preventDefault();
              }}
            />
            {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Number of Examiners</label>
            <input
              type="number"
              className="w-full p-2 border rounded-md"
              value={numOfExaminers}
              onChange={(e) => setNumOfExaminers(e.target.value)}
              min="1"
              onKeyDown={(e) => {
                if (["-", "e", "+"].includes(e.key)) e.preventDefault();
              }}
            />
            {errors.numOfExaminers && (
              <p className="text-red-500 text-sm mt-1">{errors.numOfExaminers}</p>
            )}
          </div>

          {/* Students Selection */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Students</label>
            {selectedStudents.map((student, index) => {
              // Exclude already-chosen except current
              const chosenIds = selectedStudents
                .filter((_, i) => i !== index)
                .map((s) => s._id);
              const available = students.filter((s) => !chosenIds.includes(s._id));

              return (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <select
                    className="w-full p-2 border rounded-md"
                    value={student?._id || ""}
                    onChange={(e) => {
                      const updated = [...selectedStudents];
                      updated[index] = available.find((st) => st._id === e.target.value) || {};
                      setSelectedStudents(updated);
                    }}
                  >
                    <option value="">Select a student</option>
                    {available.map((st) => (
                      <option key={st._id} value={st._id}>
                        {st.name} ({st.student_id})
                      </option>
                    ))}
                  </select>
                  {selectedStudents.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedStudents(selectedStudents.filter((_, i) => i !== index))
                      }
                    >
                      <TrashIcon className="w-5 h-5 text-red-600" />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedStudents([...selectedStudents, {}])}
              className="text-blue-600 flex items-center"
            >
              <PlusCircleIcon className="w-5 h-5 mr-1" /> Add Student
            </button>
            {errors.students && <p className="text-red-500 text-sm mt-1">{errors.students}</p>}
          </div>

          {/* Examiners Selection */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Examiners</label>
            {selectedExaminers.map((examiner, index) => {
              // Exclude already-chosen except current
              const chosenIds = selectedExaminers
                .filter((_, i) => i !== index)
                .map((ex) => ex._id);
              const available = examiners.filter((ex) => !chosenIds.includes(ex._id));

              return (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <select
                    className="w-full p-2 border rounded-md"
                    value={examiner?._id || ""}
                    onChange={(e) => {
                      const updated = [...selectedExaminers];
                      updated[index] = available.find((exa) => exa._id === e.target.value) || {};
                      setSelectedExaminers(updated);
                    }}
                  >
                    <option value="">Select an examiner</option>
                    {available.map((exa) => (
                      <option key={exa._id} value={exa._id}>
                        {exa.name} ({exa.examiner_id})
                      </option>
                    ))}
                  </select>
                  {selectedExaminers.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedExaminers(selectedExaminers.filter((_, i) => i !== index))
                      }
                    >
                      <TrashIcon className="w-5 h-5 text-red-600" />
                    </button>
                  )}
                </div>
              );
            })}
            {selectedExaminers.length < Number(numOfExaminers) && (
              <button
                type="button"
                onClick={() => setSelectedExaminers([...selectedExaminers, {}])}
                className="text-blue-600 flex items-center"
              >
                <PlusCircleIcon className="w-5 h-5 mr-1" /> Add Examiner
              </button>
            )}
            {errors.examiners && <p className="text-red-500 text-sm mt-1">{errors.examiners}</p>}
          </div>

          {/* Submit & Availability Buttons */}
          <div className="flex  justify-center mt-6">
            <button
              type="submit"
              className="bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700"
              disabled={loadingUpdate}
            >
              {loadingUpdate ? "Updating..." : "Update Presentation"}
            </button>
            
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdatePresentation;
