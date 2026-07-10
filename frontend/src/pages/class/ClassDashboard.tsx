import { useEffect, useState } from 'react';
import { Users, BookOpen, ClipboardList, Clock, UserCheck } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import type { ClassDashboardStats } from '../../types';

export default function ClassDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ClassDashboardStats | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/class-stats'),
      api.get('/announcements'),
    ]).then(([s, a]) => {
      setStats(s.data);
      setAnnouncements(a.data.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  // Group teachers by subject
  const teachersBySubject: Record<string, string[]> = {};
  stats?.teacherSubjects?.forEach(ts => {
    if (!teachersBySubject[ts.subject_name]) teachersBySubject[ts.subject_name] = [];
    if (!teachersBySubject[ts.subject_name].includes(ts.teacher_name)) {
      teachersBySubject[ts.subject_name].push(ts.teacher_name);
    }
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">
        Class {stats?.className || user?.className || user?.profile?.name || user?.username}
      </h1>
      <p className="text-sm text-slate-500 mb-6">Class Dashboard</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-[#14532D]/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#14532D]" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{stats?.totalStudents ?? 0}</p>
            <p className="text-xs text-slate-500">Total Students</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-blue-50 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{stats?.subjects?.length ?? 0}</p>
            <p className="text-xs text-slate-500">Subjects</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-green-50 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">
              {stats?.todayAttendance ? `${stats.todayAttendance.present}/${stats.totalStudents}` : '—'}
            </p>
            <p className="text-xs text-slate-500">Today Present</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-amber-50 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{stats?.pendingLeaves ?? 0}</p>
            <p className="text-xs text-slate-500">Pending Leaves</p>
          </div>
        </div>
      </div>

      {/* Teachers & Subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#14532D]" />
            Teachers & Subjects
          </h2>
          {Object.keys(teachersBySubject).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-500">No teacher-subject assignments yet. Admin can configure this.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Subject</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(teachersBySubject).map(([subject, teachers]) => (
                    <tr key={subject} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{subject}</td>
                      <td className="px-4 py-2.5 text-slate-700">{teachers.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Today's Attendance Summary */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[#14532D]" />
            Today's Attendance
          </h2>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            {stats?.todayAttendance ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Present</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${stats.totalStudents ? (stats.todayAttendance.present / stats.totalStudents * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-8 text-right">{stats.todayAttendance.present}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Absent</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${stats.totalStudents ? (stats.todayAttendance.absent / stats.totalStudents * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-8 text-right">{stats.todayAttendance.absent}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">On Leave</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all"
                        style={{ width: `${stats.totalStudents ? (stats.todayAttendance.leave / stats.totalStudents * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-8 text-right">{stats.todayAttendance.leave}</span>
                  </div>
                </div>
                {stats.todayAttendance.present === 0 && stats.todayAttendance.absent === 0 && stats.todayAttendance.leave === 0 && (
                  <p className="text-xs text-slate-400 mt-1">Attendance not marked yet today</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No attendance data</p>
            )}
          </div>
        </div>
      </div>

      {/* Notices */}
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
