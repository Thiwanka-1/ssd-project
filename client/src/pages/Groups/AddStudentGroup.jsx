import { useState, useEffect } from "react";
import axios from "axios";
import { PlusCircleIcon, TrashIcon } from "@heroicons/react/24/solid";

const AddStudentGroup = () => {
  const [department, setDepartment] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([{ id: "", name: "" }]); // Array of selected student objects
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const departmentOptions = ["IT", "IM", "ISC", "SE"];

  // Fetch students when department is selected
  useEffect(() => {
    if (department) {
      axios
        .get(`/api/students/get-dept/${department}`)
        .then((res) => {
          setStudents(res.data || []);
          setSelectedStudents([{ id: "", name: "" }]); // Reset selections
          setError(null);
        })
        .catch(() => {
          setStudents([]);
          setError("No students found for this department");
        });
    } else {
      setStudents([]);
      setSelectedStudents([{ id: "", name: "" }]); // Reset selections
    }
  }, [department]);

  // Handle adding a new student selection
  const handleAddStudent = () => {
    setSelectedStudents([...selectedStudents, { id: "", name: "" }]);
  };

  // Handle removing a student selection
  const handleRemoveStudent = (index) => {
    const updatedStudents = selectedStudents.filter((_, i) => i !== index);
    setSelectedStudents(updatedStudents);
  };

  // Handle student selection change
  const handleStudentChange = (index, studentId) => {
    const student = students.find((s) => s.student_id === studentId);
    const updatedStudents = [...selectedStudents];
    updatedStudents[index] = { id: studentId, name: student?.name || "" };
    setSelectedStudents(updatedStudents);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const validStudents = selectedStudents
      .map((student) => student.id)
      .filter((id) => id !== ""); // Ensure only valid student IDs are sent

    if (!department || validStudents.length === 0) {
      setError("Please select a department and at least one student.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("/api/groups/add", {
        department,
        students: validStudents,
      });

      setSuccessMessage(response.data.message);
      setDepartment("");
      setStudents([]);
      setSelectedStudents([{ id: "", name: "" }]); // Reset selection
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add student group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen flex justify-center bg-gray-50">
      <div className="max-w-lg w-full bg-white p-8 shadow-lg rounded-lg h-1/2 mt-16">
        <h1 className="text-3xl font-bold text-center mb-6">Add Student Group</h1>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {successMessage && (
          <p className="text-green-600 text-sm mb-4">{successMessage}</p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Department Dropdown */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              Select Department
            </label>
            <select
              className="w-full p-2 border rounded-md"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">Select a department</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Student Selection */}
          {department && (
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Select Students
              </label>

              {selectedStudents.map((selectedStudent, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <select
                    className="w-full p-2 border rounded-md"
                    value={selectedStudent.id}
                    onChange={(e) => handleStudentChange(index, e.target.value)}
                  >
                    <option value="">Select a student</option>
                    {students.map((student) => (
                      <option key={student.student_id} value={student.student_id}>
                        {student.name} ({student.student_id})
                      </option>
                    ))}
                  </select>

                  {/* Remove Button (Disabled if only one student is present) */}
                  {selectedStudents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStudent(index)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add More Students Button */}
              <button
                type="button"
                onClick={handleAddStudent}
                className="flex items-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md mt-6"
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Add Another Student
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition duration-300 mb-16 mt-6"
          >
            {loading ? "Adding..." : "Add Group"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddStudentGroup;
