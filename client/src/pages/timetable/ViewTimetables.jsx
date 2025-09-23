import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function TimetableManagement() {
  const [timetables, setTimetables] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTimetables();
  }, []);

  // 1) Fetch all timetables
  const fetchTimetables = async () => {
    try {
      const res = await axios.get("/api/timetables/all");
      setTimetables(res.data);
    } catch (error) {
      console.error("Error fetching timetables:", error);
    }
  };

  // 2) Delete timetable
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this timetable?")) {
      try {
        await axios.delete(`/api/timetables/delete/${id}`);
        fetchTimetables(); // Refresh list
      } catch (error) {
        console.error("Error deleting timetable:", error);
      }
    }
  };

  // 3) View timetable (popup)
  const handleViewTimetable = async (groupId) => {
    try {
      const res = await axios.get(`/api/timetables/get/${groupId}`);
      setSelectedTimetable(res.data);
      setShowPopup(true);
    } catch (error) {
      console.error("Error fetching timetable:", error);
    }
  };

  // 4) Generate PDF
  const generatePDF = (timetable) => {
    const doc = new jsPDF();
    doc.text(`Timetable Report for Group: ${timetable.group_id}`, 15, 10);

    const tableData = [];
    timetable.schedule.forEach((day) => {
      day.lectures.forEach((lecture, index) => {
        tableData.push([
          index === 0 ? day.day : "", // Show day name only in the first row
          lecture.start_time,
          lecture.end_time,
          lecture.module_code,
          lecture.lecturer_id,
          lecture.venue_id,
        ]);
      });
    });

    autoTable(doc, {
      head: [["Day", "Start Time", "End Time", "Module", "Lecturer", "Venue"]],
      body: tableData,
      startY: 20,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }, // Blue header
      alternateRowStyles: { fillColor: [240, 240, 240] }, // Light gray rows
    });

    doc.save(`Timetable_${timetable.group_id}.pdf`);
  };

  // 5) Filter timetables by group_id (case-insensitive)
  const filteredTimetables = timetables.filter((t) =>
    t.group_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto mt-10 p-5 bg-white rounded shadow">
      <h1 className="text-3xl font-bold text-center mb-5">Timetables</h1>

      {/* Search Input */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search by Group ID..."
          className="p-2 border rounded w-1/3"
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Timetable Table */}
      <table className="w-full border-collapse border text-center">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Group ID</th>
            <th className="border p-2">Number of Days</th>
            <th className="border p-2">Created Date</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTimetables.map((timetable) => (
            <tr key={timetable._id} className="border">
              <td className="p-2">{timetable.group_id}</td>
              <td className="p-2">
  {
    // Count only days with at least one lecture
    timetable.schedule.filter(day => Array.isArray(day.lectures) && day.lectures.length > 0).length
  }
</td>
              <td className="p-2">
                {new Date(timetable.created_at).toLocaleDateString()}
              </td>
              <td className="p-2 flex gap-2 justify-center">
                <button
                  className="bg-green-500 text-white px-3 py-1 rounded"
                  onClick={() => handleViewTimetable(timetable.group_id)}
                >
                  View
                </button>
                <button
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                  onClick={() => navigate(`/update-timetable/${timetable._id}`)}
                >
                  Update
                </button>
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded"
                  onClick={() => handleDelete(timetable._id)}
                >
                  Delete
                </button>
                <button
                  className="bg-indigo-500 text-white px-3 py-1 rounded"
                  onClick={() => generatePDF(timetable)}
                >
                  Download PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* View Timetable Popup */}
      {showPopup && selectedTimetable && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white p-12 rounded-lg shadow-lg lg:w-1/2 sm:w-auto">
            <h2 className="text-xl font-bold mb-4">
              Timetable: {selectedTimetable.group_id}
            </h2>
            <table className="w-full border-collapse border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Day</th>
                  <th className="border p-2">Start Time</th>
                  <th className="border p-2">End Time</th>
                  <th className="border p-2">Module</th>
                  <th className="border p-2">Lecturer</th>
                  <th className="border p-2">Venue</th>
                </tr>
              </thead>
              <tbody>
                {selectedTimetable.schedule.map((day) => {
                  return day.lectures.map((lecture, index) => (
                    <tr key={index} className="border">
                      {/* Show day name only for the first lecture of the day */}
                      {index === 0 ? (
                        <td
                          className="p-2 font-bold"
                          rowSpan={day.lectures.length}
                        >
                          {day.day}
                        </td>
                      ) : null}
                      <td className="p-2">{lecture.start_time}</td>
                      <td className="p-2">{lecture.end_time}</td>
                      <td className="p-2">{lecture.module_code}</td>
                      <td className="p-2">{lecture.lecturer_id}</td>
                      <td className="p-2">{lecture.venue_id}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded mt-4"
              onClick={() => setShowPopup(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
