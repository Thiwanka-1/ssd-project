import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import  autoTable from "jspdf-autotable";

const StudentTimetable = () => {
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const componentRef = useRef(null); // ✅ Correct

  // Get logged-in user from Redux
  const { currentUser } = useSelector((state) => state.user);
  const currentUserId = currentUser?.user_id; // Assuming user_id corresponds to student_id

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        if (!currentUserId) {
          setTimetable(null);
          setLoading(false);
          return;
        }

        const response = await axios.get(`/api/timetables/student/${currentUserId}`);
        if (response.data && response.data.schedule.length > 0) {
          setTimetable(response.data);
        } else {
          setTimetable(null);
        }
      } catch (err) {
        setTimetable(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, [currentUserId]);

  // Function to generate PDF
  const handlePDFGeneration = () => {
    if (!timetable) {
      alert("No timetable available to generate PDF.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`${currentUser?.username}'s Weekly Timetable`, 10, 10);

    const headers = ["Day", "Start Time", "End Time", "Module", "Lecturer", "Venue"];
    const rows = timetable.schedule.flatMap((day) =>
      day.lectures.map((lecture) => [
        day.day,
        lecture.start_time,
        lecture.end_time,
        lecture.module_code,
        lecture.lecturer_id,
        lecture.venue_id,
      ])
    );

    autoTable(doc,{
      head: [headers],
      body: rows,
      startY: 30,
      theme: "grid",
    });

    doc.save("student_timetable.pdf");
  };

  if (loading) return <div className="text-center text-lg font-semibold">Loading...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">My Weekly Timetable</h1>

        {/* Timetable Display */}
        <div ref={componentRef} className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-center">
            {currentUser?.username}'s Schedule
          </h2>

          {timetable ? (
            timetable.schedule.map((day, index) => (
              <div key={index} className="mb-6">
                <h3 className="text-lg font-bold text-blue-600">{day.day}</h3>
                <table className="w-full border-collapse border border-gray-300 mt-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2">Start Time</th>
                      <th className="border border-gray-300 px-4 py-2">End Time</th>
                      <th className="border border-gray-300 px-4 py-2">Module</th>
                      <th className="border border-gray-300 px-4 py-2">Lecturer</th>
                      <th className="border border-gray-300 px-4 py-2">Venue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.lectures.map((lecture, idx) => (
                      <tr key={idx} className="text-center">
                        <td className="border border-gray-300 px-4 py-2">{lecture.start_time}</td>
                        <td className="border border-gray-300 px-4 py-2">{lecture.end_time}</td>
                        <td className="border border-gray-300 px-4 py-2">{lecture.module_code}</td>
                        <td className="border border-gray-300 px-4 py-2">{lecture.lecturer_id}</td>
                        <td className="border border-gray-300 px-4 py-2">{lecture.venue_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 text-lg mt-4">
              No timetable available. Please check with your department.
            </div>
          )}
        </div>

        {/* Buttons Section */}
        {timetable && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handlePDFGeneration}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Download PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTimetable;
