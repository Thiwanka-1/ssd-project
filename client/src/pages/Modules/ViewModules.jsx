import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";

const ViewModules = () => {
  const [modules, setModules] = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data } = await axios.get("/api/modules/all");
      setModules(data);
      setFilteredModules(data);
    } catch (error) {
      console.error("Error fetching modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredModules(
      modules.filter(
        (m) =>
          m.module_code.toLowerCase().includes(term) ||
          m.module_name.toLowerCase().includes(term) ||
          m.department.toLowerCase().includes(term)
      )
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this module?")) return;
    try {
      await axios.delete(`/api/modules/delete/${id}`);
      setModules((prev) => prev.filter((m) => m._id !== id));
      setFilteredModules((prev) => prev.filter((m) => m._id !== id));
    } catch (error) {
      console.error("Error deleting module:", error);
    }
  };

  const handlePDFGeneration = () => {
    if (filteredModules.length === 0) {
      return alert("No data available to generate a report.");
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Modules Report", 10, 10);

    const headers = [["Module Code", "Module Name", "Department", "Lecturer"]];
    const rows = filteredModules.map((m) => [
      m.module_code,
      m.module_name,
      m.department,
      m.lecturer_in_charge?.name ?? "N/A",
    ]);

    // Use the plugin's doc.autoTable API
    autoTable(doc,{
      head: headers,
      body: rows,
      startY: 20,
      theme: "grid",
    });

    doc.save("modules_report.pdf");
  };

  if (loading) {
    return (
      <div className="text-center text-lg font-semibold">Loading...</div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Modules</h1>

        {/* Search & Generate PDF */}
        <div className="flex flex-wrap justify-between items-center mb-4">
          <input
            type="text"
            className="p-2 border rounded-md w-full sm:w-auto"
            placeholder="Search by code, name, or department"
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

        {/* Modules Table */}
        <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
          <table className="w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                {["Module Code", "Module Name", "Department", "Lecturer", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="border border-gray-300 px-4 py-2 text-center"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredModules.length > 0 ? (
                filteredModules.map((mod) => (
                  <tr
                    key={mod._id}
                    className="hover:bg-gray-50 text-center"
                  >
                    <td className="border border-gray-300 px-4 py-2">
                      {mod.module_code}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {mod.module_name}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {mod.department}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {mod.lecturer_in_charge?.name || "N/A"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <button
                        onClick={() => navigate(`/update-module/${mod._id}`)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md mr-2"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handleDelete(mod._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center px-4 py-2 border-gray-300"
                  >
                    No modules found.
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

export default ViewModules;
