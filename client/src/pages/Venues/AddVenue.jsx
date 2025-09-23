import { useState } from "react";
import axios from "axios";
import { CheckCircleIcon } from "lucide-react";

const AddVenue = () => {
  const [formData, setFormData] = useState({
    location: "",
    capacity: "",
  });

  const [error, setError] = useState("");
  const [successPopup, setSuccessPopup] = useState(false);
  const [venueId, setVenueId] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "capacity") {
      if (!/^\d*$/.test(value)) return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.capacity) return setError("Capacity is required.");

    try {
      const res = await axios.post("/api/venues/add", formData, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      setVenueId(res.data.venue_id);
      setSuccessPopup(true);
      setFormData({ location: "", capacity: "" });
    } catch (error) {
      setError(error.response?.data?.message || "Error adding venue.");
    }
  };

  const closePopup = () => {
    setSuccessPopup(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Add Venue</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Venue Location</label>
            <input
              type="text"
              name="location"
              placeholder="Enter venue location"
              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400"
              onChange={handleChange}
              value={formData.location}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Capacity</label>
            <input
              type="text"
              name="capacity"
              placeholder="Enter capacity (Numbers only)"
              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-400"
              onChange={handleChange}
              value={formData.capacity}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 text-lg font-semibold"
          >
            Add Venue
          </button>
        </form>
      </div>

      {/* Success Popup */}
      {successPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-xl p-6 text-center shadow-lg w-96">
            <CheckCircleIcon size={50} className="text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-800">Venue Added Successfully</h3>
            <p className="text-gray-600 mt-2">
              Venue ID: <span className="font-bold text-gray-900">{venueId}</span>
            </p>
            <button
              onClick={closePopup}
              className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition duration-300"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddVenue;
