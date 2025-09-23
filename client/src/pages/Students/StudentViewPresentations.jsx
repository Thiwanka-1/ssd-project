import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import  autoTable from "jspdf-autotable";

const StudentViewPresentations = () => {
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState([]);
  const [filteredPresentations, setFilteredPresentations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // Access current user data from Redux
  const { currentUser } = useSelector((state) => state.user);

  const currentUserId = currentUser?.user_id; // Use user_id instead of _id
  const userRole = currentUser?.role; // Assuming the user role is stored as 'role'

  useEffect(() => {
    const fetchPresentations = async () => {
      try {
        if (currentUserId) {
          const response = await axios.get(`/api/presentations/user/${currentUserId}`);
          setPresentations(response.data);
          setFilteredPresentations(response.data);
        }
      } catch (error) {
        console.error("Error fetching presentations:", error);
      }
    };
    fetchPresentations();
  }, [currentUserId]);

  // Update the current time every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase(); // Convert search input to lowercase
    setSearchTerm(e.target.value); // Keep original input in state
  
    const filtered = presentations.filter((presentation) => {
      // Check title
      const hasMatchingTitle =
        presentation.title?.toLowerCase().includes(term) || false;
  
      // Check students
      const hasMatchingStudent = presentation.students.some((student) =>
        student.student_id.toLowerCase().includes(term)
      );
  
      // Check department
      const hasMatchingDepartment =
        presentation.department?.toLowerCase().includes(term) || false;
  
      // Check venue
      const hasMatchingVenue =
        presentation.venue?.venue_id?.toLowerCase().includes(term) || false;
  
      return (
        hasMatchingTitle ||
        hasMatchingStudent ||
        hasMatchingDepartment ||
        hasMatchingVenue
      );
    });
  
    setFilteredPresentations(filtered);
  };
  
  
  
  const handleFilterDate = (e) => {
    const selectedDate = e.target.value;
    setFilterDate(selectedDate);

    if (!selectedDate) {
      setFilteredPresentations(presentations);
    } else {
      const filteredByDate = presentations.filter(
        (presentation) => presentation.date === selectedDate
      );
      setFilteredPresentations(filteredByDate);
    }
  };

  const handlePDFGeneration = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("AutoSched Presentation Report", 10, 10);

    const headers = [
      "Title",
      "Date",
      "Department",
      "Time Range",
      "Duration",
      "Examiners",
      "Students",
      "Venue",
    ];
    const rows = filteredPresentations.map((presentation) => [
      presentation.title,
      presentation.date,
      presentation.department,
      `${presentation.timeRange.startTime} - ${presentation.timeRange.endTime}`,
      `${presentation.duration} mins`,
      presentation.examiners.map((examiner) => examiner.examiner_id).join(", "),
      presentation.students.map((student) => student.student_id).join(", "),
      presentation.venue?.venue_id || "No Venue",
    ]);

    autoTable(doc,{
      head: [headers],
      body: rows,
      startY: 30,
      theme: "grid",
    });

    doc.save("examiner_presentations_report.pdf");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="absolute right-6 text-xl font-semibold text-gray-800">
          <div>{currentTime}</div>
        </div>
        <h1 className="text-3xl font-bold mb-6 text-center">Your Presentations</h1>

        {/* Search and Filter */}
        <div className="mb-4 flex flex-wrap justify-between items-center">
          <input
            type="text"
            className="p-2 border rounded mb-2 sm:mr-4 sm:mb-0 w-full sm:w-auto"
            placeholder="Search by Student ID, Department"
            value={searchTerm}
            onChange={handleSearch}
          />
          <input
            type="date"
            className="p-2 border rounded w-full sm:w-auto"
            value={filterDate}
            onChange={handleFilterDate}
          />
          <button
            onClick={handlePDFGeneration}
            className="bg-blue-600 text-white p-2 rounded ml-4 mt-2 sm:mt-0"
          >
            Generate Report (PDF)
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left border-b">Title</th>
                <th className="px-4 py-2 text-left border-b">Date</th>
                <th className="px-4 py-2 text-left border-b">Department</th>
                <th className="px-4 py-2 text-left border-b">Time Range</th>
                <th className="px-4 py-2 text-left border-b">Duration</th>
                <th className="px-4 py-2 text-left border-b">Examiners</th>
                <th className="px-4 py-2 text-left border-b">Students</th>
                <th className="px-4 py-2 text-left border-b">Venue</th>
              </tr>
            </thead>
            <tbody>
              {filteredPresentations.length > 0 ? (
                filteredPresentations.map((presentation) => (
                  <tr key={presentation._id} className="bg-white hover:bg-gray-100">
                    <td className="px-4 py-2 border-b">{presentation.title}</td>
                    <td className="px-4 py-2 border-b">{presentation.date}</td>
                    <td className="px-4 py-2 border-b">{presentation.department}</td>
                    <td className="px-4 py-2 border-b">
                      {presentation.timeRange.startTime} - {presentation.timeRange.endTime}
                    </td>
                    <td className="px-4 py-2 border-b">{presentation.duration} mins</td>
                    <td className="px-4 py-2 border-b">
                      {presentation.examiners
                        .map((examiner) => examiner.examiner_id)
                        .join(", ")}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {presentation.students
                        .map((student) => student.student_id)
                        .join(", ")}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {presentation.venue?.venue_id || "No Venue"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center px-4 py-2 border-b">
                    No presentations available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentViewPresentations;
