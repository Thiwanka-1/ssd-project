import { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import  autoTable from "jspdf-autotable";

const AdminViewVenues = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [venuesToDelete, setVenuesToDelete] = useState(null);
  const [currentTime, setCurrentTime] = useState("");

  // Fetch venues from the backend
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await axios.get("/api/venues/get-ven");
        setVenues(response.data);
        setFilteredVenues(response.data);
      } catch (error) {
        console.error("Error fetching venues:", error);
      }
    };

    fetchVenues();
  }, []);

  // Update the current time every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/venues/delete-ven/${venuesToDelete}`);
      setVenues(venues.filter((s) => s._id !== venuesToDelete));
      setFilteredVenues(filteredVenues.filter((s) => s._id !== venuesToDelete));
      setDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting venue:", error);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
  
    const filtered = venues.filter((venues) =>
        venues.venue_id.toLowerCase().includes(term.toLowerCase()) ||
        venues.location.toLowerCase().includes(term.toLowerCase())
    );
  
    setFilteredVenues(filtered);
  };
  
  const handlePDFGeneration = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("AutoSched Venue Report", 10, 10);

    // Create a table of venues
    const headers = ["Venue ID", "Capacity", "Location"];
    const rows = filteredVenues.map((venue) => [
        venue.venue_id,
        venue.capacity,
        venue.location
      ]);
      
    // Add table
    autoTable(doc,{
      head: [headers],
      body: rows,
      startY: 30,
      theme: 'grid',
    });

    doc.save("all_venues_report.pdf");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="absolute right-6 text-xl font-semibold text-gray-800">
          <div>{currentTime}</div>
        </div>
        <h1 className="text-3xl font-bold mb-6 text-center">Venue List</h1>

        {/* Search and Filter */}
        <div className="mb-4 flex flex-wrap justify-between items-center">
          <input
            type="text"
            className="p-2 border rounded mb-2 sm:mr-4 sm:mb-0 w-full sm:w-auto"
            placeholder="Search by Venue ID, Location, or Capacity"
            value={searchTerm}
            onChange={handleSearch}
          />
          <button
            onClick={handlePDFGeneration}
            className="bg-blue-600 text-white p-2 rounded ml-4 mt-2 sm:mt-0"
          >
            Generate Report (PDF)
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto shadow-xl sm:rounded-lg mt-6">
          <table className="min-w-full table-auto bg-white rounded-lg shadow-lg">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium">Venue ID</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Capacity</th>
                <th className="px-6 py-3 text-left text-sm font-medium pl-14">Location</th>
                <th className="px-3 py-3 text-left text-sm font-medium pl-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVenues.map((venue) => (
                <tr key={venue._id} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4 text-sm">{venue.venue_id}</td>
                  <td className="px-6 py-4 text-sm">{venue.capacity}</td>
                  <td className="px-6 py-4 text-sm">{venue.location}</td>
                  <td className="px-3 py-4 text-sm flex space-x-2">
                   
                    <button
                      onClick={() => navigate(`/venue-update/${venue._id}`)}
                      className="bg-blue-500 text-white py-1 px-3 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setVenuesToDelete(venue._id);
                        setDeleteConfirmation(true);
                      }}
                      className="bg-red-500 text-white py-1 px-3 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation */}
        {deleteConfirmation && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-4">Confirm Deletion</h2>
              <p>Are you sure you want to delete this venue?</p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setDeleteConfirmation(false)}
                  className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-500 text-white py-2 px-4 rounded-lg ml-4 hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminViewVenues;
