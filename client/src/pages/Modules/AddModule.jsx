import { useState, useEffect } from "react";
import axios from "axios";

const AddModule = () => {
  const [moduleName, setModuleName] = useState("");
  const [department, setDepartment] = useState("");
  const [lecturers, setLecturers] = useState([]);
  const [lecturerInCharge, setLecturerInCharge] = useState("");
  const [moduleCode, setModuleCode] = useState(""); // Auto-generated
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const departmentOptions = ["IT", "IM", "ISC", "SE"];

  // Fetch lecturers when department is selected
  useEffect(() => {
    if (department) {
      axios
        .get(`/api/examiners/get-dept/${department}`)
        .then((res) => {
          setLecturers(res.data || []);
          setLecturerInCharge(""); // Reset selection
          setError(null);
        })
        .catch(() => {
          setLecturers([]);
          setError("No lecturers found for this department");
        });
    } else {
      setLecturers([]);
    }
  }, [department]);

  // Validate module name (Only letters allowed)
  const handleModuleNameChange = (e) => {
    const value = e.target.value;
    if (/^[A-Za-z\s]*$/.test(value)) {
      setModuleName(value);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!moduleName || !department || !lecturerInCharge) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("/api/modules/add", {
        module_name: moduleName,
        department,
        lecturer_in_charge: lecturerInCharge,
      });

      setSuccessMessage(response.data.message);
      setModuleName("");
      setDepartment("");
      setLecturerInCharge("");
      setModuleCode("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add module.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen flex justify-center bg-gray-50">
      <div className="max-w-lg w-full bg-white p-8 shadow-lg rounded-lg h-5/6 mt-20">
        <h1 className="text-3xl font-bold text-center mb-6">Add Module</h1>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {successMessage && (
          <p className="text-green-600 text-sm mb-4">{successMessage}</p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Module Name */}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Module Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded-md"
              placeholder="Enter module name"
              value={moduleName}
              onChange={handleModuleNameChange}
            />
          </div>

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

          {/* Lecturer In Charge Dropdown */}
          {department && (
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Lecturer In Charge
              </label>
              <select
                className="w-full p-2 border rounded-md"
                value={lecturerInCharge}
                onChange={(e) => setLecturerInCharge(e.target.value)}
              >
                <option value="">Select a lecturer</option>
                {lecturers.length > 0 ? (
                  lecturers.map((lecturer) => (
                    <option key={lecturer.examiner_id} value={lecturer.examiner_id}>
                      {lecturer.name} ({lecturer.examiner_id})
                    </option>
                  ))
                ) : (
                  <option disabled>No lecturers available</option>
                )}
              </select>
            </div>
          )}

          {/* Auto-generated Module Code (Display Only) */}
          {moduleCode && (
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Module Code</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md bg-gray-100"
                value={moduleCode}
                readOnly
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition duration-300 mb-16 mt-5"
          >
            {loading ? "Adding..." : "Add Module"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddModule;
