import { useState, useEffect, useCallback } from 'react';
import { Search, Edit2 } from 'lucide-react';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';
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
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
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
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">Actions</th>
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
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => { setEditingStudent(s); setShowForm(true); }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded inline-flex items-center justify-center"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <StudentFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingStudent(null); }}
        student={editingStudent}
        onSuccess={() => { setShowForm(false); setEditingStudent(null); fetchStudents(); }}
      />

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


// Student form modal (simplified for class level)
function StudentFormModal({ isOpen, onClose, student, onSuccess }: {
  isOpen: boolean; onClose: () => void; student: Student | null; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    admission_number: '', name: '', father_name: '', phone: '', address: ''
  });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (student) {
      setForm({
        admission_number: student.admission_number || '',
        name: student.name,
        father_name: student.father_name || '',
        phone: student.phone || '',
        address: student.address || ''
      });
    }
  }, [student, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (student) {
        // We only send fields that are editable by the class
        await api.put(`/students/${student.id}`, form);
        addToast('Student updated', 'success');
        onSuccess();
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save student', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Student Details">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Admission Number *</label>
          <input
            required
            value={form.admission_number}
            onChange={(e) => setForm({ ...form, admission_number: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm
              focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm
              focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Father/Guardian Name</label>
          <input
            value={form.father_name}
            onChange={(e) => setForm({ ...form, father_name: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm
              focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm
              focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <textarea
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm
              focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
