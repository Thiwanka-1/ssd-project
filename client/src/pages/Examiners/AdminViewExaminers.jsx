import { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import  autoTable from "jspdf-autotable";


const AdminViewExaminers = () => {
  const navigate = useNavigate();
  const [examiners, setExaminers] = useState([]);
  const [filteredExaminers, setFilteredExaminers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [examinerToDelete, setExaminerToDelete] = useState(null);
  const [currentTime, setCurrentTime] = useState("");

  // Fetch examiners from the backend
  useEffect(() => {
    const fetchExaminers = async () => {
      try {
        const response = await axios.get("/api/examiners/get-ex");
        setExaminers(response.data);
        setFilteredExaminers(response.data);
      } catch (error) {
        console.error("Error fetching examiners:", error);
      }
    };

    fetchExaminers();
  }, []);

  // Update current time every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Search examiners (case-insensitive)
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(e.target.value);
    const filtered = examiners.filter((examiner) => {
      const idMatch = examiner.examiner_id?.toLowerCase().includes(term);
      const nameMatch = examiner.name?.toLowerCase().includes(term);
      const deptMatch = examiner.department?.toLowerCase().includes(term);
      return idMatch || nameMatch || deptMatch;
    });
    setFilteredExaminers(filtered);
  };

  // Generate PDF report of filtered examiners
  const handlePDFGeneration = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("AutoSched Examiner Report", 10, 10);
    const headers = ["Examiner ID", "Name", "Email", "Department", "Created At"];
    const rows = filteredExaminers.map((examiner) => [
      examiner.examiner_id,
      examiner.name,
      examiner.email,
      examiner.department,
      new Date(examiner.created_at).toLocaleDateString(),
    ]);
    autoTable(doc,{
      head: [headers],
      body: rows,
      startY: 30,
      theme: "grid",
    });
    doc.save("all_examiners_report.pdf");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto relative">
        {/* Header with current time */}
        <div className="absolute right-6 top-4 text-xl font-semibold text-gray-800">
          <div>{currentTime}</div>
        </div>
        <h1 className="text-3xl font-bold mb-6 text-center">Examiner List</h1>

        {/* Search and Filter */}
        <div className="mb-4 flex flex-wrap justify-between items-center">
          <input
            type="text"
            className="p-2 border rounded mb-2 sm:mr-4 sm:mb-0 w-full sm:w-auto"
            placeholder="Search by Examiner ID, Name, or Department"
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
          <table className="min-w-full table-auto border-collapse bg-white rounded-lg shadow-lg">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium">Examiner ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium pl-14">Email</th>
                <th className="px-4 py-3 text-left text-sm font-mdeium">Department</th>
                <th className="px-4 py-3 text-left text-sm font-mdeium pl-14">Phone</th>
                <th className="px-3 py-3 text-left text-sm font-medium pl-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExaminers.length > 0 ? (
                filteredExaminers.map((examiner) => (
                  <tr key={examiner._id} className="border-b hover:bg-gray-100 transition-colors">
                    <td className="px-3 py-2 border-b">{examiner.examiner_id}</td>
                    <td className="px-4 py-2 border-b">{examiner.name}</td>
                    <td className="px-4 py-2 border-b">{examiner.email}</td>
                    <td className="px-4 py-2 border-b pl-10">{examiner.department}</td>
                    <td className="px-4 py-2 border-b pl-10">{examiner.phone}</td>
                    <td className="px-3 py-2 border-b flex space-x-2">
                      
                      <button
                        onClick={() => navigate(`/examiner-update/${examiner._id}`)}
                        className="bg-blue-500 text-white py-1 px-3 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => {
                          setExaminerToDelete(examiner._id);
                          setDeleteConfirmation(true);
                        }}
                        className="bg-red-500 text-white py-1 px-3 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center px-4 py-2 border-b">
                    No examiners available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmation && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-4">Confirm Deletion</h2>
              <p>Are you sure you want to delete this examiner?</p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setDeleteConfirmation(false)}
                  className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await axios.delete(`/api/examiners/delete-ex/${examinerToDelete}`);
                      // Update local state after deletion
                      setExaminers(examiners.filter((e) => e._id !== examinerToDelete));
                      setFilteredExaminers(filteredExaminers.filter((e) => e._id !== examinerToDelete));
                      setDeleteConfirmation(false);
                    } catch (error) {
                      console.error("Error deleting examiner:", error);
                    }
                  }}
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

export default AdminViewExaminers;
