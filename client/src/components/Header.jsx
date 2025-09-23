import { Link } from "react-router-dom";
import { useSelector } from 'react-redux';
import logo from "./logo2.png";
import { useEffect, useRef, useState } from 'react';

export default function Header() {
  const { currentUser } = useSelector((state) => state.user);
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getProfileLink = () => {
    if (!currentUser) return '/sign-in';
    if (currentUser.role === 'admin') return '/admin-profile';
    if (currentUser.role === 'examiner') return '/profile';
    if (currentUser.role === 'student') return '/student-profile';
    return '/profile';
  };

  return (
    <div className="bg-slate-200">
      <div className="flex justify-between items-center max-w-full mx-auto py-2 px-9">
        {/* Logo Section */}
        <div className="flex items-center space-x-1">
          <Link to='/'>
            <img src={logo} alt="Appointment Logo" className="h-14 mt-2" />
          </Link>
        </div>

        {/* Navigation Section */}
        <ul className='flex gap-3 items-center'>
          {currentUser ? (
            <>
              <li><Link to="/">Home</Link></li>

              {currentUser.role === 'admin' && (
                <>
                  <li><Link to="/admin-pres-view">View Presentations</Link></li>
                  <li><Link to="/reschedule-req">View Requests</Link></li>
                  <li><Link to="/view-timetables">View Timetables</Link></li>
                </>
              )}

              {currentUser.role === 'examiner' && (
                <>
                  <li><Link to="/ex-pres-view">My Presentations</Link></li>
                  <li><Link to="/examiner-req">My Requests</Link></li>
                  <li><Link to="/examiner-timetable">Timetables</Link></li>
                </>
              )}

              {currentUser.role === 'student' && (
                <>
                  <li><Link to="/std-pres-view">My Presentations</Link></li>
                  <li><Link to="/student-timetable">Timetables</Link></li>
                </>
              )}

              {/* Profile Image */}
              <li>
                <Link to={getProfileLink()}>
                  <img
                    src={currentUser.profilePicture}
                    alt='profile'
                    className='h-8 w-8 rounded-full object-cover'
                  />
                </Link>
              </li>
            </>
          ) : (
            <li><Link to='/sign-in'>Sign In</Link></li>
          )}
        </ul>
      </div>
    </div>
  );
}
