import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import Students from './pages/admin/Students';
import Teachers from './pages/admin/Teachers';
import Classes from './pages/admin/Classes';
import AcademicYears from './pages/admin/AcademicYears';
import MarkEntry from './pages/admin/MarkEntry';
import ProgressCard from './pages/admin/ProgressCard';
import ClassProgressCard from './pages/admin/ClassProgressCard';
import Attendance from './pages/admin/Attendance';
import MonthlyAttendance from './pages/admin/MonthlyAttendance';
import LeaveRequests from './pages/admin/LeaveRequests';
import Notices from './pages/admin/Notices';
import Users from './pages/admin/Users';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';

// Teacher pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';

// Class pages
import ClassDashboard from './pages/class/ClassDashboard';
import ClassStudents from './pages/class/ClassStudents';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';

function App() {
  const { user } = useAuth();

  const getRoleHome = (role?: string) => {
    switch (role) {
      case 'admin': return '/admin';
      case 'teacher': return '/teacher';
      case 'class': return '/class';
      default: return '/student';
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<Students />} />
          <Route path="/admin/teachers" element={<Teachers />} />
          <Route path="/admin/classes" element={<Classes />} />
          <Route path="/admin/academic-years" element={<AcademicYears />} />
          <Route path="/admin/marks" element={<MarkEntry />} />
          <Route path="/admin/attendance" element={<Attendance />} />
          <Route path="/admin/monthly-attendance" element={<MonthlyAttendance />} />
          <Route path="/admin/leave" element={<LeaveRequests />} />
          <Route path="/admin/notices" element={<Notices />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Progress Card - printable standalone page */}
      <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'class']} />}>
        <Route path="/admin/progress-card/:studentId/:monthId" element={<ProgressCard />} />
        <Route path="/admin/progress-card-class/:classId/:monthId" element={<ClassProgressCard />} />
        <Route path="/class/progress-card/:studentId/:monthId" element={<ProgressCard />} />
        <Route path="/class/progress-card-class/:classId/:monthId" element={<ClassProgressCard />} />
      </Route>

      {/* Teacher Routes */}
      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route element={<Layout />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/students" element={<Students />} />
          <Route path="/teacher/marks" element={<MarkEntry />} />
          <Route path="/teacher/leave" element={<LeaveRequests />} />
          <Route path="/teacher/notices" element={<Notices />} />
        </Route>
      </Route>

      {/* Class Routes */}
      <Route element={<ProtectedRoute allowedRoles={['class']} />}>
        <Route element={<Layout />}>
          <Route path="/class" element={<ClassDashboard />} />
          <Route path="/class/students" element={<ClassStudents />} />
          <Route path="/class/marks" element={<MarkEntry />} />
          <Route path="/class/attendance" element={<Attendance />} />
          <Route path="/class/monthly-attendance" element={<MonthlyAttendance />} />
          <Route path="/class/leave" element={<LeaveRequests />} />
          <Route path="/class/notices" element={<Notices />} />
        </Route>
      </Route>

      {/* Student Routes */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<Layout />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/progress" element={<StudentDashboard />} />
          <Route path="/student/attendance" element={<StudentDashboard />} />
          <Route path="/student/leave" element={<LeaveRequests />} />
          <Route path="/student/notices" element={<Notices />} />
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="/" element={
        user ? (
          <Navigate to={getRoleHome(user.role)} replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      {/* 404 */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900">404</h1>
            <p className="text-sm text-slate-500 mt-2">Page not found</p>
            <a href="/" className="text-sm text-[#14532D] hover:underline mt-4 inline-block">Go Home</a>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;
