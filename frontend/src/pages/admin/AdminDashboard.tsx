import { useEffect, useState } from 'react';
import { Users, UserCheck, BookOpen, FileText, Clock } from 'lucide-react';
import api from '../../api/client';
import type { DashboardStats, AuditLog } from '../../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/recent-activity'),
        ]);
        setStats(statsRes.data);
        setActivity(activityRes.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading dashboard...</div>;
  }

  const statCards = [
    { label: 'Total Students', value: stats?.totalStudents ?? 0, icon: Users },
    { label: 'Total Teachers', value: stats?.totalTeachers ?? 0, icon: UserCheck },
    { label: 'Total Classes', value: stats?.totalClasses ?? 0, icon: BookOpen },
    { label: 'Reports Generated', value: stats?.totalReports ?? 0, icon: FileText },
    { label: 'Pending Leaves', value: stats?.pendingLeaves ?? 0, icon: Clock },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-[#14532D]/10">
                <card.icon className="h-5 w-5 text-[#14532D]" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Recent Activity</h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {activity.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No recent activity</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">User</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Action</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Entity</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Time</th>
                </tr>
              </thead>
              <tbody>
                {activity.slice(0, 10).map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-900">{log.username || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{log.entity_type} #{log.entity_id || ''}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
