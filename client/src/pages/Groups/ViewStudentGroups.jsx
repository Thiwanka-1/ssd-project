import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // Ensure autoTable is correctly imported

const ViewStudentGroups = () => {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axios.get("/api/groups/all");
      setGroups(response.data);
      setFilteredGroups(response.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search function
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = groups.filter((group) =>
      group.group_id.toLowerCase().includes(term) ||
      group.department.toLowerCase().includes(term)
    );

    setFilteredGroups(filtered);
  };

  // Handle delete function with confirmation
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this group?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`/api/groups/delete/${id}`);
      setGroups(groups.filter((group) => group._id !== id));
      setFilteredGroups(filteredGroups.filter((group) => group._id !== id));
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  // Generate PDF Report
  const handlePDFGeneration = () => {
    if (filteredGroups.length === 0) {
      alert("No data available to generate a report.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Student Groups Report", 10, 10);

    const headers = [["Group ID", "Department", "Students"]];
    const rows = filteredGroups.map((group) => [
      group.group_id,
      group.department,
      group.students.map((student) => student.student_id).join(", "),
    ]);

    // Ensure `autoTable` is working correctly
    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 20,
      theme: "grid",
    });

    doc.save("student_groups_report.pdf");
  };

  if (loading) return <div className="text-center text-lg font-semibold">Loading...</div>;

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Student Groups</h1>

        {/* Search & Report Buttons */}
        <div className="flex flex-wrap justify-between items-center mb-4">
          <input
            type="text"
            className="p-2 border rounded-md w-full sm:w-auto"
            placeholder="Search by Group ID or Department"
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

        {/* Groups Table */}
        <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">Group ID</th>
                <th className="border border-gray-300 px-4 py-2">Department</th>
                <th className="border border-gray-300 px-4 py-2">Students</th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                  <tr key={group._id} className="text-center bg-white hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{group.group_id}</td>
                    <td className="border border-gray-300 px-4 py-2">{group.department}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {group.students.map((student) => student.student_id).join(", ")}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <button
                        onClick={() => navigate(`/update-group/${group._id}`)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md mr-2"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handleDelete(group._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center px-4 py-2 border-b">
                    No student groups found.
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

export default ViewStudentGroups;
