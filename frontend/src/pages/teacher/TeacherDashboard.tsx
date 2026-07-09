import { useEffect, useState } from 'react';
import { Users, BookOpen } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ assignedClasses: number; totalStudents: number } | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/teacher-stats'),
      api.get('/announcements'),
    ]).then(([s, a]) => {
      setStats(s.data);
      setAnnouncements(a.data.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Welcome, {user?.profile?.name || user?.username}</h1>
      <p className="text-sm text-slate-500 mb-6">Teacher Dashboard</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-[#14532D]/10 flex items-center justify-center"><BookOpen className="h-5 w-5 text-[#14532D]" /></div>
          <div><p className="text-2xl font-semibold text-slate-900">{stats?.assignedClasses ?? 0}</p><p className="text-xs text-slate-500">Assigned Classes</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-[#14532D]/10 flex items-center justify-center"><Users className="h-5 w-5 text-[#14532D]" /></div>
          <div><p className="text-2xl font-semibold text-slate-900">{stats?.totalStudents ?? 0}</p><p className="text-xs text-slate-500">Total Students</p></div>
        </div>
      </div>

      <h2 className="text-base font-semibold text-slate-900 mb-3">Recent Notices</h2>
      <div className="space-y-2">
        {announcements.length === 0 ? <p className="text-sm text-slate-500">No announcements</p> : announcements.map((a: any) => (
          <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-3">
            <h3 className="text-sm font-medium text-slate-900">{a.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{a.content}</p>
            <p className="text-xs text-slate-400 mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
