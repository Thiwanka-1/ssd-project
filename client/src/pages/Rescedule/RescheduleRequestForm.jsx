import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const RescheduleRequestForm = () => {
  const { presentationId } = useParams();
  const navigate = useNavigate();

  // 1️⃣ Current user's email (example from localStorage or a placeholder)
  // In a real app, you might get this from Redux or context.
  const currentUserEmail = localStorage.getItem("userEmail") || "examiner1@gmail.com";

  // Current presentation details (for display)
  const [presentation, setPresentation] = useState(null);

  // Form Fields for new slot
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venue, setVenue] = useState("");
  const [reason, setReason] = useState("");

  // Venues for the dropdown
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);

  // UI feedback
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Block past dates
  const todayString = new Date().toISOString().split("T")[0];

  // 2️⃣ Fetch the existing presentation (for display)
  useEffect(() => {
    const fetchPresentationDetails = async () => {
      try {
        const res = await axios.get(`/api/presentations/get-pres/${presentationId}`);
        setPresentation(res.data);
      } catch (err) {
        setError("Failed to load current presentation details.");
      }
    };
    fetchPresentationDetails();
  }, [presentationId]);

  // 3️⃣ Fetch all venues for the dropdown
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const res = await axios.get("/api/venues/get-ven");
        setVenues(res.data || []);
      } catch (err) {
        setError("Failed to load venues.");
      } finally {
        setLoadingVenues(false);
      }
    };
    fetchVenues();
  }, []);

  // 4️⃣ Smart Suggest button
  const handleSmartSuggest = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const response = await axios.post("/api/presentations/smart-suggest-slot-req", {
        presentationId
      });
      // If success, auto-fill new date/time/venue
      const { date: suggestedDate, timeRange, venue: suggestedVenue } = response.data;

      setDate(suggestedDate);
      setStartTime(timeRange.startTime);
      setEndTime(timeRange.endTime);
      setVenue(suggestedVenue._id); // store the venue ObjectId
      setSuccessMessage("Smart suggestion applied. Please review and submit!");
    } catch (err) {
      setError(err.response?.data?.message || "Smart suggestion failed.");
    } finally {
      setLoading(false);
    }
  };

  // 5️⃣ Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Basic validations
    if (!date || !startTime || !endTime || !venue || !reason) {
      setError("Please fill all required fields.");
      return;
    }
    if (date < todayString) {
      setError("Cannot select a past date.");
      return;
    }
    if (startTime < "08:00" || endTime > "18:00") {
      setError("Time must be between 08:00 and 18:00.");
      return;
    }

    setLoading(true);

    try {
      // Submit request with the requestorEmail
      const response = await axios.post("/api/presentations/reschedule", {
        presentationId,
        date,
        timeRange: { startTime, endTime },
        venue,
        reason,
        requestorEmail: currentUserEmail // Pass the user’s email
      });

      setSuccessMessage(response.data.message);
      // Optionally navigate somewhere else after a delay
      setTimeout(() => {
        navigate("/ex-pres-view"); // or wherever your examiner presentations are listed
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit reschedule request.");
    } finally {
      setLoading(false);
    }
  };

  // 6️⃣ Render
  return (
    <div className="p-6 min-h-screen flex justify-center bg-gray-50">
      <div className="max-w-lg w-full bg-white p-8 shadow-lg rounded-lg h-1/2 mt-5">
        <h1 className="text-2xl font-bold text-center mb-6">Request Reschedule</h1>

        {/* Current presentation details */}
        {presentation && (
          <div className="bg-gray-100 p-4 rounded mb-4">
            <p className="text-gray-700 font-semibold">Current Presentation Details:</p>
            <p><strong>Title:</strong> {presentation.title}</p>
            <p><strong>Date:</strong> {presentation.date}</p>
            <p><strong>Time:</strong> {presentation.timeRange?.startTime} - {presentation.timeRange?.endTime}</p>
            <p><strong>Venue:</strong> {presentation.venue?.venue_id}</p>
          </div>
        )}

        {/* Error & Success Messages */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {successMessage && <p className="text-green-600 text-sm mb-4">{successMessage}</p>}

        <form onSubmit={handleSubmit}>
          {/* Date */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">New Date</label>
            <input
              type="date"
              min={todayString}
              className="w-full p-2 border rounded-md"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Start & End Times */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Start Time</label>
              <input
                type="time"
                min="08:00"
                max="18:00"
                className="w-full p-2 border rounded-md"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">End Time</label>
              <input
                type="time"
                min="08:00"
                max="18:00"
                className="w-full p-2 border rounded-md"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Venue */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Select Venue</label>
            {loadingVenues ? (
              <p>Loading venues...</p>
            ) : (
              <select
                className="w-full p-2 border rounded-md"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              >
                <option value="">Select a venue</option>
                {venues.map((ven) => (
                  <option key={ven._id} value={ven._id}>
                    {ven.venue_id} ({ven.location})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reason */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Reason</label>
            <textarea
              className="w-full p-2 border rounded-md"
              rows="3"
              placeholder="Explain why you need to reschedule..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center">
            {/* Smart Suggest Button */}
            <button
              type="button"
              onClick={handleSmartSuggest}
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition duration-300"
            >
              {loading ? "Please wait..." : "Smart Suggest"}
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition duration-300"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RescheduleRequestForm;
