import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import type { Student, PaginatedResponse } from '../../types';

export default function ClassStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit, status: 'active' };
      if (search) params.search = search;
      const res = await api.get<PaginatedResponse<Student>>('/students', { params });
      setStudents(res.data.data);
      setTotal(res.data.total);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500">Class {user?.className || user?.profile?.name}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1.5 flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or admission number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent border-none outline-none text-sm flex-1 placeholder-slate-400"
          />
        </div>
        <div className="text-sm text-slate-500 flex items-center">
          {total} student{total !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading...</p>
        ) : students.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No students found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Sl.</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Adm. No</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden sm:table-cell">Father/Guardian</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden md:table-cell">Phone</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-500">{(page - 1) * limit + idx + 1}</td>
                  <td className="px-4 py-2.5 text-slate-900 font-medium">{s.admission_number}</td>
                  <td className="px-4 py-2.5 text-slate-900">{s.name}</td>
                  <td className="px-4 py-2.5 text-slate-600 hidden sm:table-cell">{s.father_name || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600 hidden md:table-cell">{s.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
