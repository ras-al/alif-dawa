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
import Attendance from './pages/admin/Attendance';
import LeaveRequests from './pages/admin/LeaveRequests';
import Notices from './pages/admin/Notices';
import Users from './pages/admin/Users';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';

// Teacher pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';

function App() {
  const { user } = useAuth();

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
          <Route path="/admin/leave" element={<LeaveRequests />} />
          <Route path="/admin/notices" element={<Notices />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Progress Card - printable standalone page */}
      <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher']} />}>
        <Route path="/admin/progress-card/:studentId/:monthId" element={<ProgressCard />} />
      </Route>

      {/* Teacher Routes */}
      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route element={<Layout />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/students" element={<Students />} />
          <Route path="/teacher/marks" element={<MarkEntry />} />
          <Route path="/teacher/attendance" element={<Attendance />} />
          <Route path="/teacher/leave" element={<LeaveRequests />} />
          <Route path="/teacher/notices" element={<Notices />} />
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
          <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student'} replace />
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
