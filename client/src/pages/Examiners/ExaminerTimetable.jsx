import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import  autoTable from "jspdf-autotable";


const ExaminerTimetable = () => {
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get logged-in user from Redux
  const { currentUser } = useSelector((state) => state.user);
  const currentExaminerId = currentUser?.user_id; // Assuming user_id corresponds to examiner_id

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        if (!currentExaminerId) {
          setTimetables([]);
          setLoading(false);
          return;
        }

        const response = await axios.get(`/api/timetables/examiner/${currentExaminerId}`);
        if (response.data && response.data.length > 0) {
          setTimetables(response.data);
        } else {
          setTimetables([]);
        }
      } catch (err) {
        setTimetables([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, [currentExaminerId]);

  // Function to generate PDF for a specific group
  const handlePDFGeneration = (groupTimetable) => {
    if (!groupTimetable.schedule || groupTimetable.schedule.length === 0) {
      alert("No timetable available to generate PDF.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Examiner's Timetable - Group: ${groupTimetable.group_id}`, 10, 10);

    const headers = ["Day", "Start Time", "End Time", "Module", "Venue"];
    const rows = [];

    groupTimetable.schedule.forEach((day) => {
      day.lectures.forEach((lecture) => {
        rows.push([
          day.day,
          lecture.start_time,
          lecture.end_time,
          lecture.module_code,
          lecture.venue_id,
        ]);
      });
    });

    autoTable(doc,{
      head: [headers],
      body: rows,
      startY: 30,
      theme: "grid",
    });

    doc.save(`examiner_timetable_group_${groupTimetable.group_id}.pdf`);
  };

  if (loading) return <div className="text-center text-lg font-semibold">Loading...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">My Weekly Timetables</h1>

        {/* Timetable Display */}
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-center">
            {currentUser?.username}'s Teaching Schedule
          </h2>

          {timetables.length > 0 ? (
            timetables.map((groupTimetable, index) => (
              <div key={index} className="mb-8 p-4 border rounded-lg shadow-sm bg-gray-100">
                <h3 className="text-lg font-bold text-blue-600 mb-2">
                  Group: {groupTimetable.group_id}
                </h3>

                {groupTimetable.schedule.length > 0 ? (
                  groupTimetable.schedule.map((day, dayIndex) => (
                    <div key={dayIndex} className="mb-4">
                      <h4 className="text-md font-semibold text-gray-700">{day.day}</h4>
                      <table className="w-full border-collapse border border-gray-300 mt-2">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="border border-gray-300 px-4 py-2">Start Time</th>
                            <th className="border border-gray-300 px-4 py-2">End Time</th>
                            <th className="border border-gray-300 px-4 py-2">Module</th>
                            <th className="border border-gray-300 px-4 py-2">Venue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.lectures.map((lecture, lectureIndex) => (
                            <tr key={lectureIndex} className="text-center bg-white">
                              <td className="border border-gray-300 px-4 py-2">{lecture.start_time}</td>
                              <td className="border border-gray-300 px-4 py-2">{lecture.end_time}</td>
                              <td className="border border-gray-300 px-4 py-2">{lecture.module_code}</td>
                              <td className="border border-gray-300 px-4 py-2">{lecture.venue_id}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500">No scheduled lectures for this group.</div>
                )}

                {/* Generate PDF Button for each group */}
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => handlePDFGeneration(groupTimetable)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    Download PDF for Group {groupTimetable.group_id}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 text-lg mt-4">
              No scheduled lectures available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExaminerTimetable;
