import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const roleHome = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : user.role === 'class' ? '/class' : user.role === 'leader' ? '/leader' : user.role === 'stage_admin' ? '/stage-admin' : user.role === 'judge' ? '/judge' : user.role === 'green_room' ? '/green-room' : user.role === 'announcer' ? '/announcer' : '/student';
    return <Navigate to={roleHome} replace />;
  }

  return <Outlet />;
}
