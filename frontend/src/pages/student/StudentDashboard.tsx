import { useEffect, useState } from 'react';

import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/announcements')
      .then(r => setAnnouncements(r.data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  const profile = user?.profile as any;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Welcome, {profile?.name || user?.username}</h1>
      <p className="text-sm text-slate-500 mb-6">Student Portal</p>

      {profile && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-500">Admission No:</span><span className="ml-2 font-medium text-slate-900">{profile.admission_number}</span></div>
            <div><span className="text-slate-500">Class:</span><span className="ml-2 font-medium text-slate-900">{profile.class_name}</span></div>
            <div><span className="text-slate-500">Name:</span><span className="ml-2 font-medium text-slate-900">{profile.name}</span></div>
          </div>
        </div>
      )}

      <h2 className="text-base font-semibold text-slate-900 mb-3">Announcements</h2>
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
