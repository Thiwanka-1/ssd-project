import { useSelector } from 'react-redux';
import { Outlet, Navigate, useLocation } from 'react-router-dom';

export default function PrivateRoute({ adminOnly = false, studentOnly = false, examinerOnly = false }) {
  const { currentUser } = useSelector(state => state.user);
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  if (adminOnly && !currentUser.isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (studentOnly && currentUser.role !== 'student') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (examinerOnly && currentUser.role !== 'examiner') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
