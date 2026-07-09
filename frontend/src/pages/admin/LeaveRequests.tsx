import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import type { LeaveRequest } from '../../types';

export default function LeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchRequests = () => {
    setLoading(true);
    api.get('/leave')
      .then(r => setRequests(r.data))
      .catch(() => addToast('Failed to load leave requests', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleReview = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/leave/${id}/review`, { status });
      addToast(`Leave request ${status}`, 'success');
      fetchRequests();
    } catch {
      addToast('Failed to update leave request', 'error');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Leave Requests</h1>
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        {loading ? <p className="p-4 text-sm text-slate-500">Loading...</p> : requests.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No leave requests</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Student</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Class</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Period</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Reason</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 text-slate-900 font-medium">{r.student_name || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.class_name || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.start_date?.split('T')[0]} — {r.end_date?.split('T')[0]}</td>
                  <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                      r.status === 'approved' ? 'bg-green-50 text-green-700' :
                      r.status === 'rejected' ? 'bg-red-50 text-red-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {r.status === 'pending' && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleReview(r.id, 'approved')} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Approve">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleReview(r.id, 'rejected')} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Reject">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
