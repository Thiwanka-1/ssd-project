import { useState, useEffect } from "react";
import axios from "axios";
import Modal from "react-modal";

const AvailabilityCheckerModal = ({ isOpen, onClose }) => {
  // Data from server
  const [students, setStudents] = useState([]);   // all students in dept
  const [examiners, setExaminers] = useState([]); // all examiners in dept
  const [venues, setVenues] = useState([]);       // all venues

  // Form fields
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [duration, setDuration] = useState(""); // must be > 0
  const [formData, setFormData] = useState({
    students: [],   // array of student objects
    examiners: [],  // array of examiner objects
  });

  const [availabilityResults, setAvailabilityResults] = useState([]);

  // For date min attribute
  const todayString = new Date().toISOString().split("T")[0];

  // 1) Fetch Venues on mount
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await axios.get("/api/venues/get-ven");
        setVenues(response.data);
      } catch (error) {
        console.error("Error fetching venues", error);
      }
    };
    fetchVenues();
  }, []);

  // 2) If department changes => fetch students & examiners
  useEffect(() => {
    const fetchData = async () => {
      if (selectedDepartment) {
        try {
          const [studentsResponse, examinersResponse] = await Promise.all([
            axios.get(`/api/students/get-dept/${selectedDepartment}`),
            axios.get(`/api/examiners/get-dept/${selectedDepartment}`)
          ]);
          setStudents(studentsResponse.data || []);
          setExaminers(examinersResponse.data || []);
          // Reset chosen
          setFormData({ students: [], examiners: [] });
        } catch (error) {
          console.error("Error fetching students or examiners:", error);
          setStudents([]);
          setExaminers([]);
        }
      }
    };
    fetchData();
  }, [selectedDepartment]);

  // 3) Helpers to get "available" students/examiners for each dropdown
  const getAvailableStudents = (index) => {
    // all chosen except the current row
    const chosenIds = formData.students
      .filter((_, i) => i !== index)
      .map((s) => s?._id);
    // filter out chosen
    return students.filter((st) => !chosenIds.includes(st._id));
  };

  const getAvailableExaminers = (index) => {
    const chosenIds = formData.examiners
      .filter((_, i) => i !== index)
      .map((ex) => ex?._id);
    return examiners.filter((ex) => !chosenIds.includes(ex._id));
  };

  // 4) Numeric input block negative/e
  const handleNumericKeyDown = (e) => {
    if (["-", "e", "+"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // 5) Check Availability => calls /api/presentations/check-availability
  const handleCheckAvailability = async () => {
    // Convert chosen students & examiners => array of .student_id / .examiner_id
    const studentIds = formData.students.map((st) => st.student_id);
    const examinerIds = formData.examiners.map((ex) => ex.examiner_id);

    try {
      const response = await axios.post("/api/presentations/check-availability", {
        department: selectedDepartment,
        date,
        students: studentIds,
        examiners: examinerIds,
        venue,
        duration: duration || 60,
      });
      setAvailabilityResults(response.data);
    } catch (error) {
      console.error("Error checking availability:", error);
      setAvailabilityResults([]);
    }
  };

  // 6) Close => reset state
  const handleClose = () => {
    setSelectedDepartment("");
    setDate("");
    setVenue("");
    setFormData({ students: [], examiners: [] });
    setAvailabilityResults([]);
    setDuration("");
    onClose();
  };

  // 7) Format date
  const formatDate = (dateString) => {
    const dateObj = new Date(dateString);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString("default", { month: "long" });
    const year = dateObj.getFullYear();

    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
        ? "rd"
        : "th";

    return `${day}${suffix} ${month}, ${year}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Check Availability"
      className="fixed inset-0 flex justify-center items-center p-4"
      overlayClassName="fixed inset-0 bg-gray-800 bg-opacity-50"
    >
      <div className="bg-white p-6 w-full max-w-lg max-h-[80vh] overflow-auto rounded-lg shadow-lg">
        <h3 className="text-xl font-bold mb-4">Check Availability</h3>

        {/* Department */}
        <div className="mb-4">
          <label
            htmlFor="department"
            className="block text-sm font-medium text-gray-700"
          >
            Department
          </label>
          <select
            id="department"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="block w-full mt-1 p-2 border border-gray-300 rounded-md"
          >
            <option value="">Select Department</option>
            <option value="IT">IT</option>
            <option value="IM">IM</option>
            <option value="SE">SE</option>
            <option value="ISC">ISC</option>
          </select>
        </div>

        {/* Venue */}
        <div className="mb-4">
          <label
            htmlFor="venue"
            className="block text-sm font-medium text-gray-700"
          >
            Venue
          </label>
          <select
            id="venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="block w-full mt-1 p-2 border border-gray-300 rounded-md"
          >
            <option value="">Select a venue</option>
            {venues.length > 0 ? (
              venues.map((v) => (
                <option key={v._id} value={v.venue_id}>
                  {v.venue_id}
                </option>
              ))
            ) : (
              <option value="">No venues available</option>
            )}
          </select>
        </div>

        {/* Date */}
        <div className="mb-4">
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700"
          >
            Date
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="block w-full mt-1 p-2 border border-gray-300 rounded-md"
            min={todayString} // disable past dates
          />
          {date && (
            <p className="mt-2 text-sm text-gray-600">{formatDate(date)}</p>
          )}
        </div>

        {/* Duration */}
        <div className="mb-4">
          <label
            htmlFor="duration"
            className="block text-sm font-medium text-gray-700"
          >
            Duration (minutes)
          </label>
          <input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="block w-full mt-1 p-2 border border-gray-300 rounded-md"
            min="1"
            onKeyDown={(e) => {
              if (["-", "e", "+"].includes(e.key)) e.preventDefault();
            }}
          />
        </div>

        {/* Students */}
        <div className="mb-4">
          <label
            htmlFor="students"
            className="block text-sm font-medium text-gray-700"
          >
            Students
          </label>
          {formData.students.map((studentObj, index) => {
            // Exclude chosen from other indexes
            const chosenIds = formData.students
              .filter((_, i) => i !== index)
              .map((st) => st?._id);
            const available = students.filter((st) => !chosenIds.includes(st._id));

            return (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <select
                  value={studentObj?._id || ""}
                  onChange={(e) => {
                    const updated = [...formData.students];
                    updated[index] = available.find((s) => s._id === e.target.value) || {};
                    setFormData({ ...formData, students: updated });
                  }}
                  className="block w-full mt-1 p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select a student</option>
                  {available.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.student_id}
                    </option>
                  ))}
                </select>
                {formData.students.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const filtered = formData.students.filter((_, i) => i !== index);
                      setFormData({ ...formData, students: filtered });
                    }}
                    className="text-red-600"
                  >
                    −
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() =>
              setFormData({ ...formData, students: [...formData.students, {}] })
            }
            className="text-blue-600 mt-1"
          >
            + Add Student
          </button>
        </div>

        {/* Examiners */}
        <div className="mb-4">
          <label
            htmlFor="examiners"
            className="block text-sm font-medium text-gray-700"
          >
            Examiners
          </label>
          {formData.examiners.map((examObj, index) => {
            const chosenIds = formData.examiners
              .filter((_, i) => i !== index)
              .map((ex) => ex?._id);
            const available = examiners.filter((ex) => !chosenIds.includes(ex._id));

            return (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <select
                  value={examObj?._id || ""}
                  onChange={(e) => {
                    const updated = [...formData.examiners];
                    updated[index] = available.find((x) => x._id === e.target.value) || {};
                    setFormData({ ...formData, examiners: updated });
                  }}
                  className="block w-full mt-1 p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select an examiner</option>
                  {available.map((exam) => (
                    <option key={exam._id} value={exam._id}>
                      {exam.examiner_id}
                    </option>
                  ))}
                </select>
                {formData.examiners.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const filtered = formData.examiners.filter((_, i) => i !== index);
                      setFormData({ ...formData, examiners: filtered });
                    }}
                    className="text-red-600"
                  >
                    −
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() =>
              setFormData({ ...formData, examiners: [...formData.examiners, {}] })
            }
            className="text-blue-600 mt-1"
          >
            + Add Examiner
          </button>
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleCheckAvailability}
            className="bg-blue-600 text-white p-3 rounded mb-4"
          >
            Check Availability
          </button>

          <button
            onClick={handleClose}
            className="bg-gray-600 text-white p-3 rounded mb-4 min-w-40"
          >
            Close
          </button>
        </div>

        {/* Results */}
        <div>
          {availabilityResults.length > 0 ? (
            availabilityResults.map((result, index) => (
              <div key={index} className="border p-3 mb-3 rounded-md">
                <p className="font-bold">Time Slot: {result.timeSlot}</p>
                <p>Available: {result.available ? "Yes" : "No"}</p>
              </div>
            ))
          ) : (
            <p>No available slots found.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AvailabilityCheckerModal;
