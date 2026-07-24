
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function FestLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/fest/login');
  };

  const displayName = user?.profile?.name || user?.username;
  const displayRole = user?.role?.replace('_', ' ');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-[#14532D]">Alif Dawa Fest</span>
          <span className="hidden sm:inline-block px-3 py-1 bg-slate-100 rounded-md text-xs font-semibold capitalize text-slate-600">
            {displayRole} Portal
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-900 leading-tight">{displayName}</p>
            <p className="text-xs text-slate-500 capitalize leading-tight">{displayRole}</p>
          </div>
          <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
