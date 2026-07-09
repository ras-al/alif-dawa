import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, UserCheck, Calendar, Bell, FileText,
  Settings, LogOut, Menu, X, ChevronRight, ClipboardList, Shield, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GlobalSearch from '../components/GlobalSearch';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Students', href: '/admin/students', icon: Users },
  { name: 'Teachers', href: '/admin/teachers', icon: UserCheck },
  { name: 'Classes & Subjects', href: '/admin/classes', icon: BookOpen },
  { name: 'Academic Years', href: '/admin/academic-years', icon: Calendar },
  { name: 'Monthly Reports', href: '/admin/marks', icon: FileText },
  { name: 'Attendance', href: '/admin/attendance', icon: ClipboardList },
  { name: 'Leave Requests', href: '/admin/leave', icon: Clock },
  { name: 'Notices', href: '/admin/notices', icon: Bell },
  { name: 'Users', href: '/admin/users', icon: Shield },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const teacherNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
  { name: 'My Students', href: '/teacher/students', icon: Users },
  { name: 'Enter Marks', href: '/teacher/marks', icon: FileText },
  { name: 'Attendance', href: '/teacher/attendance', icon: ClipboardList },
  { name: 'Leave Requests', href: '/teacher/leave', icon: Clock },
  { name: 'Notices', href: '/teacher/notices', icon: Bell },
];

const studentNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { name: 'My Progress', href: '/student/progress', icon: FileText },
  { name: 'Attendance', href: '/student/attendance', icon: ClipboardList },
  { name: 'Leave', href: '/student/leave', icon: Clock },
  { name: 'Notices', href: '/student/notices', icon: Bell },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const navigation = user?.role === 'admin'
    ? adminNavigation
    : user?.role === 'teacher'
      ? teacherNavigation
      : studentNavigation;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sidebarOpen]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Breadcrumbs
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, idx) => ({
    name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
    href: '/' + pathSegments.slice(0, idx + 1).join('/'),
  }));

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" aria-hidden="true" />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200">
            <span className="text-lg font-bold text-[#14532D]">Alif Dawa College</span>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/' + pathSegments[0] && location.pathname.startsWith(item.href + '/'));
              const isExactActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 mb-0.5 text-sm font-medium rounded-md transition-colors ${isExactActive || isActive
                    ? 'bg-[#14532D]/10 text-[#14532D]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${isExactActive || isActive ? 'text-[#14532D]' : 'text-slate-400'
                    }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-3">
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium text-slate-900">{user?.profile?.name || user?.username}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <LogOut className="h-[18px] w-[18px] text-slate-400" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-700"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs */}
            <nav className="hidden sm:flex items-center gap-1 text-sm text-slate-500">
              {breadcrumbs.map((crumb, idx) => (
                <span key={crumb.href} className="flex items-center gap-1">
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="text-slate-900 font-medium">{crumb.name}</span>
                  ) : (
                    <Link to={crumb.href} className="hover:text-slate-700">{crumb.name}</Link>
                  )}
                </span>
              ))}
            </nav>
          </div>

          <GlobalSearch />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
