import { useState, useEffect } from "react";
import axios from "axios";
import Modal from "react-modal";
import { CheckCircleIcon } from "lucide-react"; // Import the icon
import AvailabilityCheckerModal from "./AvailabilityCheckerModal";

const AddPresentation = () => {
  // Department options
  const departments = ["IT", "IM", "SE", "ISC"];

  // For the main form data
  const [formData, setFormData] = useState({
    title: "",
    students: [""],     // Array of selected student _ids
    examiners: [],      // Array of selected examiner _ids
    venue: "",
    department: "",
    numOfExaminers: "",
    date: "",
    duration: "",
    timeRange: { startTime: "", endTime: "" },
  });

  // For loading states & error messages
  const [loadingSmartSuggest, setLoadingSmartSuggest] = useState(false);
  const [loadingAddPresentation, setLoadingAddPresentation] = useState(false);
  const [errors, setErrors] = useState({});

  // Data from backend
  const [allStudents, setAllStudents] = useState([]);   // Full array of dept students
  const [allExaminers, setAllExaminers] = useState([]); // Full array of dept examiners
  const [venues, setVenues] = useState([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationPopup, setConfirmationPopup] = useState(false);

  // Today string for date min attribute
  const todayString = new Date().toISOString().split("T")[0];

  // Fetch Venues on mount
  useEffect(() => {
    fetchVenues();
  }, []);

  // GET /api/venues/get-ven
  const fetchVenues = async () => {
    try {
      const response = await axios.get("/api/venues/get-ven");
      setVenues(response.data);
    } catch (error) {
      console.error("Error fetching venues", error);
    }
  };

  // Department change => fetch students & examiners for that department
  const handleDepartmentChange = async (e) => {
    const department = e.target.value;
    setFormData({ 
      ...formData, 
      department,
      students: [""],   // reset chosen students
      examiners: [],    // reset chosen examiners
    });

    try {
      const [studentRes, examinerRes] = await Promise.all([
        axios.get(`/api/students/get-dept/${department}`),
        axios.get(`/api/examiners/get-dept/${department}`),
      ]);
      setAllStudents(studentRes.data || []);
      setAllExaminers(examinerRes.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setAllStudents([]);
      setAllExaminers([]);
    }
  };

  // Helper: get available students (exclude already chosen)
  const getAvailableStudents = (index) => {
    // Collect all chosen student IDs except the one in this row
    const chosen = formData.students.filter((_, i) => i !== index);
    // Return only those not chosen yet
    return allStudents.filter((s) => !chosen.includes(s._id));
  };

  // Helper: get available examiners (exclude already chosen)
  const getAvailableExaminers = (index) => {
    const chosen = formData.examiners.filter((_, i) => i !== index);
    return allExaminers.filter((ex) => !chosen.includes(ex._id));
  };

  // Generic input change
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Prevent negative or zero in numeric fields
  const handleNumericKeyDown = (e) => {
    // Disallow arrow down, minus sign, etc.
    if (["-", "e", "+"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Smart Suggest
  const handleSmartSuggest = async () => {
    const { students, numOfExaminers, duration } = formData;
    const studentIds = students.filter((s) => s);

    if (!studentIds.length || !numOfExaminers || !duration) {
      alert("Please fill out Title, Department, Students, #Examiners, and Duration before using Smart Suggest.");
      return;
    }

    setLoadingSmartSuggest(true);
    try {
      // Example route => /api/presentations/smart-suggest-slot
      const response = await axios.post("/api/presentations/smart-suggest-slot", {
        studentIds,
        numExaminers: numOfExaminers,
        duration,
      });

      const { examiners, venue, timeRange, date } = response.data;
      setFormData({
        ...formData,
        venue: venue._id,
        date,
        examiners: examiners.map((ex) => ex._id),
        timeRange,
      });
    } catch (error) {
      console.error("Error fetching smart suggestion", error);
      alert("Failed to get the smart suggestion. Please try again.");
    } finally {
      setLoadingSmartSuggest(false);
    }
  };

  // Validate final form
  const validateForm = () => {
    const newErrors = {};
  
    // Title required
    if (!formData.title.trim()) {
      newErrors.title = "Title is required.";
    }
  
    // Department required
    if (!formData.department) {
      newErrors.department = "Department is required.";
    }
  
    // At least one student
    const validStudents = formData.students.filter((s) => s);
    if (!validStudents.length) {
      newErrors.students = "At least one student is required.";
    }
  
    // Number of Examiners > 0
    if (!formData.numOfExaminers || Number(formData.numOfExaminers) < 1) {
      newErrors.numOfExaminers = "Number of Examiners must be at least 1.";
    }
  
    // Duration > 0
    if (!formData.duration || Number(formData.duration) < 1) {
      newErrors.duration = "Duration must be at least 1 minute.";
    }
  
    // Date not in past (and if today, time after now)
    if (!formData.date) {
      newErrors.date = "Date is required.";
    } else if (formData.date < todayString) {
      newErrors.date = "Cannot select a past date.";
    } else if (formData.date === todayString) {
      const now = new Date();
      const currentHHMM = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (
        formData.timeRange.startTime &&
        formData.timeRange.startTime <= currentHHMM
      ) {
        newErrors.date =
          "Start time must be after the current time if date is today.";
      }
    }
  
    // Time Range between 08:00 and 18:00 + End after Start
    const start = formData.timeRange.startTime;
    const end = formData.timeRange.endTime;
    if (!start || !end) {
      newErrors.timeRange = "Start and End times are required.";
    } else if (start < "08:00" || start > "18:00") {
      newErrors.timeRange = "Start time must be between 08:00 and 18:00.";
    } else if (end < "08:00" || end > "18:00") {
      newErrors.timeRange = "End time must be between 08:00 and 18:00.";
    } else if (end <= start) {
      newErrors.timeRange = "End time must be after Start time.";
    } else {
      // ── NEW: enforce exact duration ────────────────────────────
      const durationVal = Number(formData.duration);
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const diffMinutes = eh * 60 + em - (sh * 60 + sm);
  
      if (durationVal && diffMinutes !== durationVal) {
        newErrors.timeRange = `Time slot must be exactly ${durationVal} minutes (you have ${diffMinutes}).`;
      }
    }
  
    // Venue required
    if (!formData.venue) {
      newErrors.venue = "Venue is required.";
    }
  
    // Examiners count & uniqueness
    if (formData.examiners.length !== Number(formData.numOfExaminers)) {
      newErrors.examiners =
        "Please add the exact number of examiners specified.";
    }
    if (new Set(formData.examiners).size !== formData.examiners.length) {
      newErrors.examiners = "Examiners must be unique.";
    }
  
    // Students uniqueness
    if (new Set(validStudents).size !== validStudents.length) {
      newErrors.students = "Students must be unique.";
    }
  
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoadingAddPresentation(true);
    try {
      await axios.post("/api/presentations/add", formData);
      setConfirmationPopup(true);
    } catch (error) {
      console.error("Error adding presentation", error);
      alert("Failed to add presentation. Check console for details.");
    } finally {
      setLoadingAddPresentation(false);
    }
  };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Add Presentation</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block font-semibold mb-1">Presentation Title</label>
          <input
            type="text"
            name="title"
            placeholder="Enter title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
        </div>

        {/* Department */}
        <div>
          <label className="block font-semibold mb-1">Department</label>
          <select
            name="department"
            value={formData.department}
            onChange={handleDepartmentChange}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
        </div>

        {/* Students */}
        <div>
          <label className="block font-semibold mb-1">Students</label>
          {formData.students.map((studentId, index) => {
            // Available = allStudents - those chosen in formData.students (except current index)
            const chosenIds = formData.students.filter((_, i) => i !== index);
            const available = allStudents.filter((s) => !chosenIds.includes(s._id));

            return (
              <div key={index} className="flex space-x-2 mb-2">
                <select
                  value={studentId}
                  onChange={(e) => {
                    const newStudents = [...formData.students];
                    newStudents[index] = e.target.value;
                    setFormData({ ...formData, students: newStudents });
                  }}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Student</option>
                  {available.map((s) => (
                    <option key={s._id} value={s._id}>{s.student_id}</option>
                  ))}
                </select>

                {/* Remove Student Button */}
                {formData.students.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newStudents = formData.students.filter((_, i) => i !== index);
                      setFormData({ ...formData, students: newStudents });
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded"
                  >
                    −
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Student Button */}
          <button
            type="button"
            onClick={() => {
              setFormData({ ...formData, students: [...formData.students, ""] });
            }}
            className="px-3 py-1 bg-green-500 text-white rounded mt-2"
          >
            +
          </button>

          {errors.students && <p className="text-red-500 text-sm mt-1">{errors.students}</p>}
        </div>

        {/* Number of Examiners */}
        <div>
          <label className="block font-semibold mb-1">Number of Examiners</label>
          <input
            type="number"
            name="numOfExaminers"
            placeholder="Enter number of examiners"
            value={formData.numOfExaminers}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            min="1"
            onKeyDown={handleNumericKeyDown}
          />
          {errors.numOfExaminers && <p className="text-red-500 text-sm mt-1">{errors.numOfExaminers}</p>}
        </div>

        {/* Duration */}
        <div>
          <label className="block font-semibold mb-1">Duration (minutes)</label>
          <input
            type="number"
            name="duration"
            placeholder="Enter duration"
            value={formData.duration}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            min="1"
            onKeyDown={handleNumericKeyDown}
          />
          {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration}</p>}
        </div>

        {/* Smart Suggest Slot Button */}
        <button
          type="button"
          onClick={handleSmartSuggest}
          className="w-full p-3 bg-green-600 text-white rounded font-bold hover:bg-green-700 flex items-center justify-center"
          disabled={loadingSmartSuggest}
        >
          {loadingSmartSuggest ? "Suggesting..." : "Smart Suggest Slot"}
        </button>

        {/* Examiners */}
        <div>
          <label className="block font-semibold mb-1">Examiners</label>
          {formData.examiners.map((examinerId, index) => {
            // Available = allExaminers - those chosen in formData.examiners (except current index)
            const chosenIds = formData.examiners.filter((_, i) => i !== index);
            const available = allExaminers.filter((ex) => !chosenIds.includes(ex._id));

            return (
              <div key={index} className="flex space-x-2 mb-2">
                <select
                  value={examinerId}
                  onChange={(e) => {
                    const newExaminers = [...formData.examiners];
                    newExaminers[index] = e.target.value;
                    setFormData({ ...formData, examiners: newExaminers });
                  }}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Examiner</option>
                  {available.map((ex) => (
                    <option key={ex._id} value={ex._id}>{ex.examiner_id}</option>
                  ))}
                </select>

                {/* Remove Examiner Button */}
                {formData.examiners.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newExaminers = formData.examiners.filter((_, i) => i !== index);
                      setFormData({ ...formData, examiners: newExaminers });
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded"
                  >
                    −
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Examiner Button */}
          {formData.examiners.length < Number(formData.numOfExaminers) && (
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, examiners: [...formData.examiners, ""] });
              }}
              className="px-3 py-1 bg-green-500 text-white rounded mt-2"
            >
              +
            </button>
          )}
          {errors.examiners && <p className="text-red-500 text-sm mt-1">{errors.examiners}</p>}
        </div>

        {/* Date */}
        <div>
          <label className="block font-semibold mb-1">Suggested Date</label>
          <input
            name="date"
            type="date"
            value={formData.date}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            min={todayString} // no past dates
          />
          {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
        </div>

        {/* Venue */}
        <div>
          <label className="block font-semibold mb-1">Venue</label>
          <select
            name="venue"
            value={formData.venue}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Lecture Hall</option>
            {venues.map((venue) => (
              <option key={venue._id} value={venue._id}>{venue.venue_id}</option>
            ))}
          </select>
          {errors.venue && <p className="text-red-500 text-sm mt-1">{errors.venue}</p>}
        </div>

        {/* Time Slot */}
        <div>
          <label className="block font-semibold mb-1">Start Time</label>
          <input
            type="time"
            value={formData.timeRange.startTime}
            onChange={(e) =>
              setFormData({
                ...formData,
                timeRange: { ...formData.timeRange, startTime: e.target.value },
              })
            }
            className="w-full p-2 border rounded"
            min="08:00"
            max="18:00"
          />

          <label className="block font-semibold mb-1 mt-2">End Time</label>
          <input
            type="time"
            value={formData.timeRange.endTime}
            onChange={(e) =>
              setFormData({
                ...formData,
                timeRange: { ...formData.timeRange, endTime: e.target.value },
              })
            }
            className="w-full p-2 border rounded"
            min="08:00"
            max="18:00"
          />
          {errors.timeRange && <p className="text-red-500 text-sm mt-1">{errors.timeRange}</p>}
        </div>

        <div className="mt-4 flex justify-between items-center">
          {/* Check Availability Button */}
          <button
            type="button"
            className="p-3 bg-gray-500 text-white rounded font-bold hover:bg-gray-600 w-1/2 mr-2"
            onClick={() => setIsModalOpen(true)}
          >
            Check Availability
          </button>

          {/* Add Presentation Button */}
          <button
            type="submit"
            className="p-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 w-1/2 ml-2"
            disabled={loadingAddPresentation}
          >
            {loadingAddPresentation ? "Adding..." : "Add Presentation"}
          </button>
        </div>

        {/* Availability Checker Modal */}
        <AvailabilityCheckerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </form>

      {/* Confirmation Popup */}
      <Modal
        isOpen={confirmationPopup}
        onRequestClose={() => setConfirmationPopup(false)}
        contentLabel="Confirmation"
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div className="bg-white p-6 rounded shadow-lg text-center max-w-md w-full">
          {/* Success Icon */}
          <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />

          {/* Confirmation Message */}
          <h2 className="text-xl font-bold mb-4">Presentation Added Successfully</h2>

          {/* Display Presentation Details */}
          <div className="text-gray-700 text-sm text-left space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Date:</span>
              <span>{formData.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Venue:</span>
              <span>
                {venues.find((v) => v._id === formData.venue)?.venue_id || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Start Time:</span>
              <span>{formData.timeRange.startTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">End Time:</span>
              <span>{formData.timeRange.endTime}</span>
            </div>
            <div>
              <span className="font-semibold">Students:</span>
              <ul className="list-disc list-inside">
                {formData.students.map((id) => (
                  <li key={id}>
                    {allStudents.find((s) => s._id === id)?.student_id || "N/A"}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-semibold">Examiners:</span>
              <ul className="list-disc list-inside">
                {formData.examiners.map((id) => (
                  <li key={id}>
                    {allExaminers.find((ex) => ex._id === id)?.examiner_id || "N/A"}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Lecture Rescheduling Confirmation */}
          <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded">
            <h3 className="text-md font-semibold mb-2">Lecture Rescheduling</h3>
            <p>
              All lectures for the selected examiners on{" "}
              <strong>{formData.date}</strong> have been rescheduled.
            </p>
            <p>
              Students will receive notifications about the updated lecture
              schedule.
            </p>
          </div>

          {/* Confirm Button */}
          <button
            onClick={() => {
              setConfirmationPopup(false);
              window.location.reload();
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Confirm
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AddPresentation;
