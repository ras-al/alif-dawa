
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

export default function FestLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/fest/login');
  };

  const displayName = user?.profile?.name || user?.username;
  const displayRole = user?.role === 'leader' ? 'Team' : user?.role?.replace('_', ' ');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 sticky top-0 z-30 shadow-sm safe-top">
        <div className="flex items-center gap-3">
          <a href="/fest" className="text-lg sm:text-xl font-bold text-[#14532D] hover:text-[#166534] transition-colors">
            Alif Dawa Fest
          </a>
          <span className="hidden sm:inline-block px-3 py-1 bg-slate-100 rounded-md text-xs font-semibold capitalize text-slate-600">
            {displayRole} Portal
          </span>
        </div>
        
        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900 leading-tight">{displayName}</p>
            <p className="text-xs text-slate-500 capitalize leading-tight">{displayRole}</p>
          </div>
          <div className="h-8 w-px bg-slate-200 mx-1"></div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors px-3 py-2 rounded-lg hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 px-4 py-3 animate-slide-up shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">{displayName}</p>
              <p className="text-xs text-slate-500 capitalize">{displayRole}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-rose-600 px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-6 lg:p-8 safe-bottom">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
