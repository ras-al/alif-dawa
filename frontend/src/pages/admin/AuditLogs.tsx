import { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import type { AuditLog, PaginatedResponse } from '../../types';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const limit = 30;

  useEffect(() => {
    setLoading(true);
    api.get<PaginatedResponse<AuditLog>>('/settings/audit-logs', { params: { page, limit } })
      .then(r => { setLogs(r.data.data); setTotal(r.data.total); })
      .catch(() => addToast('Failed to load audit logs', 'error'))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Audit Logs</h1>
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        {loading ? <p className="p-4 text-sm text-slate-500">Loading...</p> : logs.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No audit logs</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Time</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">User</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Action</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Entity</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden md:table-cell">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-slate-900">{log.username || '—'}</td>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">{log.action}</span></td>
                  <td className="px-4 py-2.5 text-slate-600">{log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[200px] truncate hidden md:table-cell">{log.details ? JSON.stringify(log.details) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
