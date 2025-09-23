import { BrowserRouter, Routes, Route} from 'react-router-dom';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ExaminerProfile from './pages/ExaminerProfile';
import StudentProfile from './pages/StudentProfile';

import Header from './components/Header';
import PrivateRoute from './components/PrivateRoute';

import AdminProfile from './pages/AdminProfile';
import ManageUsers from './pages/ManageUsers';
import AddStudent from './pages/Students/AddStudents';
import AddExaminer from './pages/Examiners/AddExaminer';
import AddVenue from './pages/Venues/AddVenue';
import AddPresentation from './pages/Presentations/AddPresentation';
import AdminViewPresentations from './pages/Presentations/AdminViewPresentations';
import AdminViewStudents from './pages/Students/AdminViewStudents';
import ExaminerViewPresentations from './pages/Examiners/ExaminerViewPresentations';
import StudentViewPresentations from './pages/Students/StudentViewPresentations';
import AdminViewExaminers from './pages/Examiners/AdminViewExaminers';
import AdminViewVenues from './pages/Venues/AdminViewVenues';
import Modal from "react-modal";
import AddTimetable from './pages/timetable/AddTimetable';
import ViewTimetables from './pages/timetable/ViewTimetables';
import UpdateTimetable from './pages/timetable/UpdateTimetable';
import StudentTimetable from './pages/Students/StudentTimetable';
import ExaminerTimetable from './pages/Examiners/ExaminerTimetable';
import AddStudentGroup from './pages/Groups/AddStudentGroup';
import ViewStudentGroups from './pages/Groups/ViewStudentGroups';
import UpdateStudentGroup from './pages/Groups/UpdateStudentGroup';
import AddModule from './pages/Modules/AddModule';
import ViewModules from './pages/Modules/ViewModules';
import UpdateModule from './pages/Modules/UpdateModule';
import UpdatePresentation from './pages/Presentations/UpdatePresentation';
import UpdateVenue from './pages/Venues/UpdateVenue';
import ResceduledLectures from './pages/Examiners/ResceduledLectures';
import RescheduleRequestForm from './pages/Rescedule/RescheduleRequestForm';
import ManageRescheduleRequests from './pages/Rescedule/ManageRescheduleRequests';
import ExaminerRescheduleRequests from './pages/Rescedule/ExaminerRescheduleRequests';

import UpdateExaminer from './pages/Examiners/UpdateExaminer';
import UpdateStudent from './pages/Students/UpdateStudent';
Modal.setAppElement("#root");  // Fixes the warning





export default function App() {
  return <BrowserRouter>
  <Header />
    <Routes>
      <Route path = "/" element = {<Home />} /> {/* done */}
      <Route path = "/sign-in" element = {<SignIn />} /> {/* done */}
      <Route path = "/sign-up" element = {<SignUp />} /> {/* done */}

      <Route element={<PrivateRoute />}>

      </Route>

      <Route element={<PrivateRoute adminOnly={true} />}>
        <Route path="/manage-users" element={<ManageUsers />} /> {/* done */}
        <Route path='/admin-profile' element={<AdminProfile />} /> {/* done */}
        <Route path = "/add-std" element = {<AddStudent />} /> {/* done */}
        <Route path = "/add-ex" element = {<AddExaminer />} /> {/* done */}
        <Route path = "/add-ven" element = {<AddVenue />} /> {/* done */}
        <Route path = "/add-pres" element = {<AddPresentation />} /> {/* done */}
        
        <Route path = "/admin-pres-view" element = {<AdminViewPresentations />} /> {/* done */}
        <Route path = "/admin-std-view" element = {<AdminViewStudents />} /> {/* done */}
        <Route path = "/admin-ex-view" element = {<AdminViewExaminers />} /> {/* done */}
        <Route path = "/admin-ven-view" element = {<AdminViewVenues />} /> {/* done */}

        <Route path = "/venue-update/:id" element = {<UpdateVenue />} /> {/* done */}

        <Route path = "/presentation-update/:id" element = {<UpdatePresentation />} /> {/* done */}
        <Route path = "/add-timetable" element = {<AddTimetable />} /> {/* done */}
        <Route path = "/view-timetables" element = {<ViewTimetables />} /> {/* done */}
        <Route path = "/update-timetable/:id" element = {<UpdateTimetable />} /> {/* done */}

        <Route path = "/add-group" element = {<AddStudentGroup />} /> {/* done */}
        <Route path = "/update-group/:id" element = {<UpdateStudentGroup />} /> {/* done */}
        <Route path = "/view-groups" element = {<ViewStudentGroups />} /> {/* done */}

        <Route path = "/add-module" element = {<AddModule />} /> {/* done */}
        <Route path = "/view-modules" element = {<ViewModules />} /> {/* done */}
        <Route path = "/update-module/:id" element = {<UpdateModule />} /> {/* done */}
       
        <Route path="/examiner-update/:id" element={<UpdateExaminer />} />
        <Route path="/student-update/:id" element={<UpdateStudent />} />
        <Route path = "/reschedule-req" element = {<ManageRescheduleRequests />} /> {/* done */}

      </Route>

      <Route element={<PrivateRoute studentOnly={true} />}>
        <Route path = "/student-profile" element = {<StudentProfile />} /> {/* done */}
        <Route path = "/std-pres-view" element = {<StudentViewPresentations />} />       {/* done */}
        <Route path = "/student-timetable" element = {<StudentTimetable />} /> {/* done */}

      </Route>

      <Route element={<PrivateRoute examinerOnly={true} />}>
        
        <Route path = "/profile" element = {<ExaminerProfile />} /> {/* done */}
        <Route path = "/ex-pres-view" element = {<ExaminerViewPresentations />} />  {/* done */}
        <Route path = "/examiner-timetable" element = {<ExaminerTimetable />} /> {/* done */}
        <Route path = "/examiner-req" element = {<ExaminerRescheduleRequests />} /> {/* done */}
        <Route path = "/rescheduled-lectures" element = {<ResceduledLectures />} /> {/* done */}
        <Route path = "/reschedule-request/:presentationId" element = {<RescheduleRequestForm />} /> {/* done */}


      </Route>
    </Routes>
  
  </BrowserRouter>
    
}
