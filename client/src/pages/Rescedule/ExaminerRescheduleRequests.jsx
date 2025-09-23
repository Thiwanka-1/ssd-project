import { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const ExaminerRescheduleRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch requests on mount
  useEffect(() => {
    fetchRequests();
  }, []);

  // 1️⃣ Fetch the examiner’s reschedule requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      // Adjust your endpoint if needed.
      // Example: /api/reschedule/my-requests or /api/presentations/ex-req
      const res = await axios.get("/api/presentations/ex-req");
      setRequests(res.data);
      setFilteredRequests(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch your requests");
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ Search Filter
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = requests.filter((req) => {
      const date = req.requestedSlot?.date?.toLowerCase() || "";
      const status = req.status?.toLowerCase() || "";
      const reason = req.reason?.toLowerCase() || "";
      const presentationTitle = req.presentation?.title?.toLowerCase() || "";

      return (
        date.includes(term) ||
        status.includes(term) ||
        reason.includes(term) ||
        presentationTitle.includes(term)
      );
    });

    setFilteredRequests(filtered);
  };

  // 3️⃣ Generate PDF Report
  const handlePDFGeneration = () => {
    if (filteredRequests.length === 0) {
      alert("No data available to generate a report.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("My Reschedule Requests Report", 10, 10);

    const headers = ["Date", "Time Range", "Venue", "Reason", "Status"];
    const rows = [];

    filteredRequests.forEach((req) => {
      const date = req.requestedSlot.date;
      const timeRange = `${req.requestedSlot.timeRange.startTime} - ${req.requestedSlot.timeRange.endTime}`;
      const venueId = req.presentation?.venue?.venue_id || "N/A";
      const reason = req.reason;
      const status = req.status;

      rows.push([date, timeRange, venueId, reason, status]);
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 20,
      theme: "grid",
    });

    doc.save("my_reschedule_requests_report.pdf");
  };

  // 4️⃣ Delete All Approved
  const handleDeleteApproved = async () => {
    if (window.confirm("Are you sure you want to delete ALL Approved requests?")) {
      try {
        await axios.delete("/api/presentations/delete-accepted");
        // Refresh
        fetchRequests();
      } catch (err) {
        alert(err.response?.data?.message || "Failed to delete approved requests");
      }
    }
  };

  // 5️⃣ Delete All Rejected
  const handleDeleteRejected = async () => {
    if (window.confirm("Are you sure you want to delete ALL Rejected requests?")) {
      try {
        await axios.delete("/api/presentations/delete-rejected");
        // Refresh
        fetchRequests();
      } catch (err) {
        alert(err.response?.data?.message || "Failed to delete rejected requests");
      }
    }
  };

  // Loading
  if (loading) {
    return <div className="text-center text-lg font-semibold">Loading...</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">My Reschedule Requests</h1>

        {/* If there's an error, show a small message but continue */}
        {error && (
          <p className="text-red-500 text-center mb-4">
            {error}
          </p>
        )}

        {/* Search & PDF Buttons + Delete Buttons */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <input
            type="text"
            className="p-2 border rounded-md w-full sm:w-auto"
            placeholder="Search by date, status, reason, or title"
            value={searchTerm}
            onChange={handleSearch}
          />
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            <button
              onClick={handlePDFGeneration}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md"
            >
              Generate Report (PDF)
            </button>
            <button
              onClick={handleDeleteApproved}
              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-md"
            >
              Delete All Approved
            </button>
            <button
              onClick={handleDeleteRejected}
              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md"
            >
              Delete All Rejected
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">Presentation</th>
                <th className="border border-gray-300 px-4 py-2">Date</th>
                <th className="border border-gray-300 px-4 py-2">Time Range</th>
                <th className="border border-gray-300 px-4 py-2">Venue</th>
                <th className="border border-gray-300 px-4 py-2">Reason</th>
                <th className="border border-gray-300 px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => {
                  const date = req.requestedSlot.date;
                  const startTime = req.requestedSlot.timeRange.startTime;
                  const endTime = req.requestedSlot.timeRange.endTime;
                  const venueId = req.presentation?.venue?.venue_id || "N/A";
                  const reason = req.reason;
                  const status = req.status;
                  const presentationTitle = req.presentation?.title || "N/A";

                  return (
                    <tr key={req._id} className="text-center bg-white hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        {presentationTitle}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{date}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {startTime} - {endTime}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{venueId}</td>
                      <td className="border border-gray-300 px-4 py-2">{reason}</td>
                      <td className="border border-gray-300 px-4 py-2">{status}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center px-4 py-2 border-b">
                    No reschedule requests found.
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

export default ExaminerRescheduleRequests;
