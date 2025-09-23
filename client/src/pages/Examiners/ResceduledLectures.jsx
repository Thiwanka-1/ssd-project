import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const ResceduledLectures = () => {
  const { currentUser } = useSelector((state) => state.user);
  const lecturerId = currentUser?.user_id; // examiner's user_id (NOT ObjectId)

  const [rescheduledLectures, setRescheduledLectures] = useState([]);
  const [filteredLectures, setFilteredLectures] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (lecturerId) {
      fetchRescheduledLectures();
    } else {
      setLoading(false); // No lecturer ID => no fetch
    }
  }, [lecturerId]);

  const fetchRescheduledLectures = async () => {
    try {
      const res = await axios.get(`/api/reschedule/get/${lecturerId}`);
      setRescheduledLectures(res.data);
      setFilteredLectures(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch rescheduled lectures");
    } finally {
      setLoading(false);
    }
  };

  // Search Filter
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    // Filter across original_date, rescheduled_date, and each lecture's module_code, group_id, venue_id
    const filtered = rescheduledLectures.filter((record) => {
      const origDate = record.original_date.toLowerCase().includes(term);
      const rescDate = record.rescheduled_date.toLowerCase().includes(term);

      // Check each lecture
      const lectureMatch = record.lectures.some((lec) =>
        lec.module_code.toLowerCase().includes(term) ||
        lec.group_id.toLowerCase().includes(term) ||
        lec.venue_id.toLowerCase().includes(term)
      );

      return origDate || rescDate || lectureMatch;
    });

    setFilteredLectures(filtered);
  };

  // Generate PDF Report
  const handlePDFGeneration = () => {
    if (filteredLectures.length === 0) {
      alert("No data available to generate a report.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Rescheduled Lectures Report", 10, 10);

    const headers = ["Original Date", "Rescheduled Date", "Module Code", "Group", "Venue", "Time Range"];
    const rows = [];

    filteredLectures.forEach((record) => {
      const { original_date, rescheduled_date, lectures } = record;
      lectures.forEach((lec) => {
        rows.push([
          original_date,
          rescheduled_date,
          lec.module_code,
          lec.group_id,
          lec.venue_id,
          `${lec.start_time} - ${lec.end_time}`,
        ]);
      });
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 20,
      theme: "grid",
    });

    doc.save("rescheduled_lectures_report.pdf");
  };

  if (loading) {
    return <div className="text-center text-lg font-semibold">Loading...</div>;
  }

  // We won't "return" on error. We'll show a small error message but keep the page structure.
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">My Rescheduled Lectures</h1>

        {/* Show error if any */}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {/* Search & PDF Buttons */}
        <div className="flex flex-wrap justify-between items-center mb-4">
          <input
            type="text"
            className="p-2 border rounded-md w-full sm:w-auto"
            placeholder="Search by Module, Group, Venue, or Date"
            value={searchTerm}
            onChange={handleSearch}
          />
          <button
            onClick={handlePDFGeneration}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md sm:ml-4 mt-2 sm:mt-0"
          >
            Generate Report (PDF)
          </button>
        </div>

        {/* If no records at all, show a table with a single row. */}
        {filteredLectures.length === 0 ? (
          <div className="bg-white shadow-md rounded-lg p-4">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2">Module Code</th>
                  <th className="border border-gray-300 px-4 py-2">Group</th>
                  <th className="border border-gray-300 px-4 py-2">Venue</th>
                  <th className="border border-gray-300 px-4 py-2">Time Range</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="4" className="text-center text-gray-600 py-4">
                    No rescheduled lectures found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          // If we have records, display each record
          filteredLectures.map((record) => (
            <div key={record._id} className="bg-white shadow-md rounded-lg p-4 mb-4">
              <div className="text-lg font-semibold text-gray-700 mb-2">
                Original Date: <span className="font-normal">{record.original_date}</span>
              </div>
              <div className="text-lg font-semibold text-gray-700 mb-2">
                Rescheduled Date: <span className="font-normal">{record.rescheduled_date}</span>
              </div>

              {/* Lectures Table */}
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2">Module Code</th>
                    <th className="border border-gray-300 px-4 py-2">Group</th>
                    <th className="border border-gray-300 px-4 py-2">Venue</th>
                    <th className="border border-gray-300 px-4 py-2">Time Range</th>
                  </tr>
                </thead>
                <tbody>
                  {record.lectures.map((lec, idx) => (
                    <tr key={idx} className="text-center">
                      <td className="border border-gray-300 px-4 py-2">{lec.module_code}</td>
                      <td className="border border-gray-300 px-4 py-2">{lec.group_id}</td>
                      <td className="border border-gray-300 px-4 py-2">{lec.venue_id}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {lec.start_time} - {lec.end_time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ResceduledLectures;
