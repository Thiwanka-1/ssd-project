import { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const ManageRescheduleRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isApproveLoading, setIsApproveLoading] = useState(false);
  const [isRejectLoading, setIsRejectLoading] = useState(false);
  
  // For success messages
  const [successMessage, setSuccessMessage] = useState(null);

  // Current request & availability results
  const [currentRequest, setCurrentRequest] = useState(null);
  const [freeSlots, setFreeSlots] = useState([]); // All returned free slots
  const [isSlotAvailable, setIsSlotAvailable] = useState(false);

  // Popup (modal) states
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Loading for Approve/Reject

  useEffect(() => {
    fetchRequests();
  }, []);

  // 1) Fetch All Requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/presentations/get-requests");
      setRequests(res.data);
      setFilteredRequests(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  // 2) Search Filter
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = requests.filter((req) => {
      const title = req.presentation?.title?.toLowerCase() || "";
      const date = req.requestedSlot?.date?.toLowerCase() || "";
      const reason = req.reason?.toLowerCase() || "";
      const status = req.status?.toLowerCase() || "";
      const examinerId =
        req.requestedBy?.userId?.examiner_id?.toLowerCase() || "";

      return (
        title.includes(term) ||
        date.includes(term) ||
        reason.includes(term) ||
        status.includes(term) ||
        examinerId.includes(term)
      );
    });

    setFilteredRequests(filtered);
  };

  // 3) Generate PDF Report
  const handlePDFGeneration = () => {
    if (filteredRequests.length === 0) {
      alert("No data available to generate a report.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reschedule Requests Report", 10, 10);

    const headers = [
      "Presentation",
      "Requested By",
      "Date",
      "Time Range",
      "Venue",
      "Reason",
      "Status",
    ];
    const rows = [];

    filteredRequests.forEach((req) => {
      const presentationTitle = req.presentation?.title || "N/A";
      const examinerId = req.requestedBy?.userId?.examiner_id || "N/A";
      const date = req.requestedSlot.date;
      const timeRange = `${req.requestedSlot.timeRange.startTime} - ${req.requestedSlot.timeRange.endTime}`;
      const venueId = req.requestedSlot.venue?.venue_id || "N/A";
      const reason = req.reason;
      const status = req.status;

      rows.push([
        presentationTitle,
        examinerId,
        date,
        timeRange,
        venueId,
        reason,
        status,
      ]);
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 20,
      theme: "grid",
    });

    doc.save("reschedule_requests_report.pdf");
  };

  // 4) Delete Old Rejected
  const handleDeleteOldRejected = async () => {
    if (
      !window.confirm("Are you sure you want to delete old rejected requests?")
    )
      return;
    try {
      await axios.delete("/api/presentations/delete-old-req");
      alert("Old rejected requests deleted successfully.");
      fetchRequests(); // Refresh
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to delete old rejected requests."
      );
    }
  };

  // Helper: Convert HH:MM => minutes
  const convertToMinutes = (time) => {
    const [hh, mm] = time.split(":").map(Number);
    return hh * 60 + mm;
  };

  // 5) Check Availability
  const handleCheckAvailability = async (req) => {
    try {
      setError(null);
      setSuccessMessage(null);
      setFreeSlots([]);
      setCurrentRequest(req);
      setIsProcessing(false);

      const department = req.presentation?.department;
      const students = (req.presentation?.students || []).map((s) => s.student_id);
      const examiners = (req.presentation?.examiners || []).map(
        (ex) => ex.examiner_id
      );
      const date = req.requestedSlot?.date;
      const duration = req.presentation?.duration || 30;
      const venueId = req.requestedSlot?.venue?.venue_id || "";

      // Requested time range
      const requestedStart = req.requestedSlot.timeRange?.startTime || "00:00";
      const requestedEnd = req.requestedSlot.timeRange?.endTime || "00:00";

      const response = await axios.post("/api/presentations/check-availability", {
        date,
        department,
        students,
        examiners,
        venue: venueId,
        duration,
      });

      // response.data => array of free time slots, e.g. [{ timeSlot: "08:00 - 09:30", available: true }, ...]
      if (Array.isArray(response.data)) {
        // 1) Store them in freeSlots (for display)
        setFreeSlots(response.data);

        // 2) Check if the requested time is within ANY of these free slots
        const requestedStartMin = convertToMinutes(requestedStart);
        const requestedEndMin = convertToMinutes(requestedEnd);

        let foundSlot = false;
        for (const slot of response.data) {
          const [slotStart, slotEnd] = slot.timeSlot.split(" - ");
          const slotStartMin = convertToMinutes(slotStart);
          const slotEndMin = convertToMinutes(slotEnd);
          // If requested range is fully inside a free slot => foundSlot = true
          if (
            requestedStartMin >= slotStartMin &&
            requestedEndMin <= slotEndMin
          ) {
            foundSlot = true;
            break;
          }
        }
        setIsSlotAvailable(foundSlot);
      } else {
        // If data is not an array, we treat it as no free slots
        setFreeSlots([]);
        setIsSlotAvailable(false);
      }

      setSlotModalOpen(true);
    } catch (err) {
      // If error => no free slots
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Check availability failed.";
      setError(msg);
      setFreeSlots([]);
      setIsSlotAvailable(false);
      setSlotModalOpen(true);
      setIsProcessing(false);
    }
  };

  // 6) Approve/Reject Action
  const handleAction = async (requestId, action) => {
    try {
      if (action === "Approve") {
        setIsApproveLoading(true);
      } else {
        setIsRejectLoading(true);
      }
  
      const res = await axios.post("/api/presentations/req-approve", {
        requestId,
        action,
      });
      setSuccessMessage(res.data.message);
  
      // Cleanup
      setSlotModalOpen(false);
      setCurrentRequest(null);
      setFreeSlots([]);
      setError(null);
  
      // Refresh the requests
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    } finally {
      if (action === "Approve") {
        setIsApproveLoading(false);
      } else {
        setIsRejectLoading(false);
      }
    }
  };
  

  if (loading) {
    return <div className="text-center text-lg font-semibold">Loading...</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Reschedule Requests
        </h1>

        {/* Top Bar */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <input
            type="text"
            className="p-2 border rounded-md w-full sm:w-auto"
            placeholder="Search by title, date, reason, status, or examiner"
            value={searchTerm}
            onChange={handleSearch}
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePDFGeneration}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md"
            >
              Generate Report (PDF)
            </button>
            <button
              onClick={handleDeleteOldRejected}
              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md"
            >
              Delete Old Rejected
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="text-green-600 text-center mb-4">{successMessage}</div>
        )}

        {/* Requests Table */}
        <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">
                  Presentation
                </th>
                <th className="border border-gray-300 px-4 py-2">
                  Requested By
                </th>
                <th className="border border-gray-300 px-4 py-2">
                  Requested Date
                </th>
                <th className="border border-gray-300 px-4 py-2">
                  Requested Time
                </th>
                <th className="border border-gray-300 px-4 py-2">Venue</th>
                <th className="border border-gray-300 px-4 py-2">Reason</th>
                <th className="border border-gray-300 px-4 py-2">Status</th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => {
                  const presentationTitle = req.presentation?.title || "N/A";
                  const examinerId = req.requestedBy?.userId?.user_id || "N/A";
                  const date = req.requestedSlot.date;
                  const start = req.requestedSlot.timeRange?.startTime || "--:--";
                  const end = req.requestedSlot.timeRange?.endTime || "--:--";
                  const venueId =
                    req.requestedSlot.venue?.venue_id ||
                    req.requestedSlot.venue ||
                    "N/A";
                  const reason = req.reason;
                  const status = req.status;

                  return (
                    <tr
                      key={req._id}
                      className="text-center bg-white hover:bg-gray-50"
                    >
                      <td className="border border-gray-300 px-4 py-2">
                        {presentationTitle}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {examinerId}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {date}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {start} - {end}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {venueId}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {reason}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {status}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 space-x-2">
                        {status === "Pending" ? (
                          <button
                            onClick={() => handleCheckAvailability(req)}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md"
                          >
                            Check Availability
                          </button>
                        ) : (
                          <span className="text-gray-500">{status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center px-4 py-2 border-b">
                    No requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AVAILABILITY MODAL */}
      {slotModalOpen && currentRequest && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div className="bg-white w-full max-w-md rounded-md shadow-lg p-6 relative">
      {/* Close button */}
      <button
        onClick={() => {
          setSlotModalOpen(false);
          setError(null);
          setFreeSlots([]);
          setIsSlotAvailable(false);
          setCurrentRequest(null);
          setIsApproveLoading(false);
          setIsRejectLoading(false);
        }}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
      >
        &times;
      </button>

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-center">
          {isSlotAvailable ? "Time Slot Available" : "Time Slot NOT Available"}
        </h2>
      </div>

      {/* Body */}
      <div className="mb-4 max-h-64 overflow-auto">
        {isSlotAvailable ? (
          <>
            <p className="mb-2 text-gray-700 text-center">
              These free slots are available:
            </p>
            <ul className="mb-4 list-disc list-inside text-gray-700 ml-28">
              {freeSlots.map((slot, idx) => (
                <li key={idx}>{slot.timeSlot}</li>
              ))}
            </ul>
            <p className="text-center text-gray-700">
              Approve or Reject this request?
            </p>
          </>
        ) : (
          <>
            {error && (
              <p className="text-red-500 text-center mb-4">Error: {error}</p>
            )}
            <p className="mb-4 text-gray-700 text-center">
              The requested time slot is unavailable. You can only reject this
              request.
            </p>
          </>
        )}
      </div>

      {/* Footer / Buttons */}
      <div className="flex justify-center gap-4 mt-4">
        {isSlotAvailable ? (
          <>
            {/* Approve Button */}
            <button
              onClick={() => !isApproveLoading && handleAction(currentRequest._id, "Approve")}
              disabled={isApproveLoading}
              className={`${
                isApproveLoading
                  ? "bg-green-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              } text-white px-6 py-2 rounded-md font-semibold transition`}
            >
              {isApproveLoading ? "Processing..." : "Approve"}
            </button>

            {/* Reject Button */}
            <button
              onClick={() => !isRejectLoading && handleAction(currentRequest._id, "Reject")}
              disabled={isRejectLoading}
              className={`${
                isRejectLoading
                  ? "bg-red-400 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              } text-white px-6 py-2 rounded-md font-semibold transition`}
            >
              {isRejectLoading ? "Processing..." : "Reject"}
            </button>
          </>
        ) : (
          // Only Reject if not available
          <button
            onClick={() => !isRejectLoading && handleAction(currentRequest._id, "Reject")}
            disabled={isRejectLoading}
            className={`${
              isRejectLoading
                ? "bg-red-400 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600"
            } text-white px-6 py-2 rounded-md font-semibold transition`}
          >
            {isRejectLoading ? "Processing..." : "Reject"}
          </button>
        )}
      </div>
    </div>
  </div>
)}


    </div>
  );
};

export default ManageRescheduleRequests;
