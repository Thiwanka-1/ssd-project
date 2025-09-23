import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function Sidebar() {
  const { currentUser } = useSelector((state) => state.user);

  // Don't show the sidebar if no user is logged in
  if (!currentUser) return null;

  return (
    <div className="mt-20 sidebar w-64 h-full bg-gray-800 text-white fixed top-0 left-0">
      <h2 className="text-2xl font-bold p-4">
        {currentUser.role === 'admin' ? 'Admin Menu' : currentUser.role === 'examiner' ? 'Examiner Menu' : 'Student Menu'}
      </h2>
      <ul className="p-4">

        {/* Admin Links */}
        {currentUser.role === 'admin' && (
          <>
            <li className="mb-4">
              <Link to="/manage-users" className="hover:text-gray-300">
                Manage Users
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/add-std" className="hover:text-gray-300">
                Add Students
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/add-ex" className="hover:text-gray-300">
                Add Examiners
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/add-ven" className="hover:text-gray-300">
                Add Venues
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/add-pres" className="hover:text-gray-300">
                Add Presentations
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/add-module" className="hover:text-gray-300">
                Add Modules
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/add-group" className="hover:text-gray-300">
                Add Groups
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/add-timetable" className="hover:text-gray-300">
                Add Timetables
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/admin-std-view" className="hover:text-gray-300">
                View Students
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/admin-ex-view" className="hover:text-gray-300">
                View Examiners
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/admin-ven-view" className="hover:text-gray-300">
                View Venus
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/admin-pres-view" className="hover:text-gray-300">
                View Presentations
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/view-modules" className="hover:text-gray-300">
                View Modules
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/view-groups" className="hover:text-gray-300">
                View Groups
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/view-timetables" className="hover:text-gray-300">
                View Timetabels
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/reschedule-req" className="hover:text-gray-300">
                View Rescedule Requests
              </Link>
            </li>
          </>
        )}

        {/* Examiner Links */}
        {currentUser.role === 'examiner' && (
          <>
            <li className="mb-4">
              <Link to="/ex-pres-view" className="hover:text-gray-300">
                Presentations
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/examiner-timetable" className="hover:text-gray-300">
                Lecture Timetable
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/rescheduled-lectures" className="hover:text-gray-300">
                Rescedules Lectures 
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/examiner-req" className="hover:text-gray-300">
                Rescedule Requests
              </Link>
            </li>
          </>
        )}

        {/* Student Links */}
        {currentUser.role === 'student' && (
          <>
            <li className="mb-4">
              <Link to="/std-pres-view" className="hover:text-gray-300">
                Presentations
              </Link>
            </li>
            <li className="mb-4">
              <Link to="/student-timetable" className="hover:text-gray-300">
                Lecture Timetable
              </Link>
            </li>

          </>
        )}
      </ul>
    </div>
  );
}
