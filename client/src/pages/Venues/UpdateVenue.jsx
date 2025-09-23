import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const UpdateVenue = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [venueId, setVenueId] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // 1) onKeyDown helper to block negative or scientific notation
  const handleNumericKeyDown = (e) => {
    // Prevent e, E, +, -, .
    if (["e", "E", "+", "-", "."].includes(e.key)) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    fetchVenueDetails();
  }, [id]);

  // 2) Fetch the existing venue data
  const fetchVenueDetails = async () => {
    try {
      const response = await axios.get(`/api/venues/get-ven/${id}`);
      const ven = response.data;
      setVenueId(ven.venue_id);
      setLocation(ven.location);
      setCapacity(String(ven.capacity));
    } catch (error) {
      setError("Failed to fetch venue details.");
    } finally {
      setLoading(false);
    }
  };

  // 3) Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validate fields
    if (!venueId || !location || !capacity) {
      setError("All fields are required.");
      return;
    }

    // Optionally, you can do further checks (e.g. capacity > 0)
    if (Number(capacity) < 1) {
      setError("Capacity must be at least 1.");
      return;
    }

    try {
      // Send PUT request to update the venue
      await axios.put(`/api/venues/update-ven/${id}`, {
        venue_id: venueId,
        location,
        capacity: parseInt(capacity, 10),
      });

      setSuccessMessage("Venue updated successfully!");
      // Redirect after a short delay
      setTimeout(() => {
        navigate("/admin-ven-view"); // Change this path if needed
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update venue.");
    }
  };

  if (loading) {
    return <div className="text-center text-lg font-semibold">Loading...</div>;
  }

  return (
    <div className="p-6 min-h-screen flex justify-center bg-gray-50">
      <div className="max-w-lg w-full bg-white p-8 shadow-lg rounded-lg mt-16">
        <h1 className="text-3xl font-bold text-center mb-6">Update Venue</h1>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {successMessage && <p className="text-green-600 text-sm mb-4">{successMessage}</p>}

        <form onSubmit={handleSubmit}>
          {/* Venue ID (Read Only) */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              Venue ID
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded-md bg-slate-100"
              value={venueId}
              readOnly
            />
          </div>

          {/* Location */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              Location
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded-md"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Capacity */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              Capacity
            </label>
            <input
              type="number"
              className="w-full p-2 border rounded-md"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min="1"
              onKeyDown={handleNumericKeyDown}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition duration-300"
          >
            Update Venue
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdateVenue;
