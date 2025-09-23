import { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import  autoTable from "jspdf-autotable";

const AdminViewStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [currentTime, setCurrentTime] = useState("");

  // Fetch students from the backend
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get("/api/students/get-std");
        setStudents(response.data);
        setFilteredStudents(response.data);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };

    fetchStudents();
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
      await axios.delete(`/api/students/delete-std/${studentToDelete}`);
      setStudents(students.filter((s) => s._id !== studentToDelete));
      setFilteredStudents(filteredStudents.filter((s) => s._id !== studentToDelete));
      setDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
  
    const filtered = students.filter((student) =>
      student.student_id.toLowerCase().includes(term.toLowerCase()) ||
      student.name.toLowerCase().includes(term.toLowerCase()) ||
      student.department.toLowerCase().includes(term.toLowerCase())
    );
  
    setFilteredStudents(filtered);
  };

  const handlePDFGeneration = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("AutoSched Student Report", 10, 10);

    // Create a table of students
    const headers = ["Student ID", "Name", "Email", "Department"];
    const rows = filteredStudents.map((student) => [
        student.student_id,
        student.name,
        student.email,
        student.department,
      ]);
      
    // Add table
    autoTable(doc,{
      head: [headers],
      body: rows,
      startY: 30,
      theme: 'grid',
    });

    doc.save("all_students_report.pdf");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="absolute right-6 text-xl font-semibold text-gray-800">
          <div>{currentTime}</div>
        </div>
        <h1 className="text-3xl font-bold mb-6 text-center">Student List</h1>

        {/* Search and Filter */}
        <div className="mb-4 flex flex-wrap justify-between items-center">
          <input
            type="text"
            className="p-2 border rounded mb-2 sm:mr-4 sm:mb-0 w-full sm:w-auto"
            placeholder="Search by Student ID, Name, or Department"
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
                <th className="px-3 py-3 text-left text-sm font-medium">Student ID</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium pl-14">Email</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Department</th>
                <th className="px-6 py-3 text-left text-sm font-medium pl-16">Phone</th>
                <th className="px-3 py-3 text-left text-sm font-medium pl-10">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student._id} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4 text-sm">{student.student_id}</td>
                  <td className="px-6 py-4 text-sm">{student.name}</td>
                  <td className="px-6 py-4 text-sm">{student.email}</td>
                  <td className="px-6 py-4 text-sm pl-14">{student.department}</td>
                  <td className="px-6 py-4 text-sm pl-14">{student.phone}</td>
                  <td className="px-3 py-4 text-sm flex space-x-2">
                    
                    <button
                      onClick={() => navigate(`/student-update/${student._id}`)}
                      className="bg-blue-500 text-white py-1 px-3 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setStudentToDelete(student._id);
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
              <p>Are you sure you want to delete this student?</p>
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

export default AdminViewStudents;
