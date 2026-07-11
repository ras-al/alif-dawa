import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Search, Edit2, Trash2 } from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import type { Student, ClassRecord, PaginatedResponse } from '../../types';

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const { addToast } = useToast();
  const limit = 20;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (classFilter) params.class_id = classFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get<PaginatedResponse<Student>>('/students', { params });
      setStudents(res.data.data);
      setTotal(res.data.total);
    } catch {
      addToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, classFilter, statusFilter, addToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data)).catch(() => {});
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/students/${deleteTarget.id}`);
      addToast('Student deleted', 'success');
      setDeleteTarget(null);
      fetchStudents();
    } catch {
      addToast('Failed to delete student', 'error');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Students</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" /> Import
          </button>
          <button
            onClick={() => { setEditingStudent(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534]"
          >
            <Plus className="h-4 w-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Filters */}
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
        <select
          value={classFilter}
          onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white text-slate-700"
        >
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white text-slate-700"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
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
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Adm. No</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden sm:table-cell">Father/Guardian</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Class</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-900 font-medium">{s.admission_number}</td>
                  <td className="px-4 py-2.5 text-slate-900">{s.name}</td>
                  <td className="px-4 py-2.5 text-slate-600 hidden sm:table-cell">{s.father_name || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">
                      {s.class_name || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 hidden md:table-cell">{s.phone || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                      s.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditingStudent(s); setShowForm(true); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
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

      {/* Add/Edit Form Modal */}
      <StudentFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingStudent(null); }}
        student={editingStudent}
        classes={classes}
        onSuccess={() => { setShowForm(false); setEditingStudent(null); fetchStudents(); }}
      />

      {/* Import Modal */}
      <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); fetchStudents(); }} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Student"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// Student form modal
function StudentFormModal({ isOpen, onClose, student, classes, onSuccess }: {
  isOpen: boolean; onClose: () => void; student: Student | null; classes: ClassRecord[]; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    admission_number: '', name: '', father_name: '', class_id: '',
    phone: '', address: '', date_of_admission: '', create_account: false, password: '', is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (student) {
      setForm({
        admission_number: student.admission_number,
        name: student.name,
        father_name: student.father_name || '',
        class_id: student.class_id?.toString() || '',
        phone: student.phone || '',
        address: student.address || '',
        date_of_admission: student.date_of_admission?.split('T')[0] || '',
        create_account: false, password: '', is_active: student.is_active,
      });
    } else {
      setForm({
        admission_number: '', name: '', father_name: '', class_id: '',
        phone: '', address: '', date_of_admission: '', create_account: false, password: '', is_active: true,
      });
    }
  }, [student, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        class_id: form.class_id ? parseInt(form.class_id) : null,
        date_of_admission: form.date_of_admission || null,
      };
      if (student) {
        await api.put(`/students/${student.id}`, payload);
        addToast('Student updated', 'success');
      } else {
        await api.post('/students', payload);
        addToast('Student created', 'success');
      }
      onSuccess();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save student', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={student ? 'Edit Student' : 'Add Student'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admission Number *</label>
            <input
              required
              value={form.admission_number}
              onChange={(e) => setForm({ ...form, admission_number: e.target.value })}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-50 disabled:text-slate-500
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select
              value={form.class_id}
              onChange={(e) => setForm({ ...form, class_id: e.target.value })}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white
                focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
            >
              <option value="">Select Class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Admission</label>
            <input
              type="date"
              value={form.date_of_admission}
              onChange={(e) => setForm({ ...form, date_of_admission: e.target.value })}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm
                focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
            />
          </div>
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

        {!student && (
          <div className="border-t border-slate-200 pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.create_account}
                onChange={(e) => setForm({ ...form, create_account: e.target.checked })}
                className="h-4 w-4 border-slate-300 rounded text-[#14532D]"
              />
              <span className="text-slate-700">Create login account for this student</span>
            </label>
            {form.create_account && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required={form.create_account}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="block w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md text-sm
                    focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
                  placeholder="Minimum 6 characters"
                />
              </div>
            )}
          </div>
        )}

        {student && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Status:</label>
            <select
              value={form.is_active ? 'active' : 'inactive'}
              onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">
            {saving ? 'Saving...' : student ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Import modal
function ImportModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const { addToast } = useToast();

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      if (res.data.imported > 0) {
        addToast(`${res.data.imported} students imported`, 'success');
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Import failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setFile(null); setResult(null); }} title="Import Students from Excel">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Upload an Excel file (.xlsx) with columns: <strong>Admission Number</strong>, <strong>Name</strong>, Father Name, Class, Phone, Address.
        </p>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md
            file:border file:border-slate-300 file:text-sm file:font-medium file:bg-white file:text-slate-700
            hover:file:bg-slate-50"
        />
        {result && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-sm">
            <p className="text-slate-900">Imported: <strong>{result.imported}</strong></p>
            <p className="text-slate-600">Skipped: {result.skipped}</p>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-red-600 list-disc pl-4">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={() => { onClose(); setFile(null); setResult(null); }} className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button onClick={handleUpload} disabled={!file || uploading} className="px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          )}
          {result && result.imported > 0 && (
            <button onClick={() => { onSuccess(); setFile(null); setResult(null); }} className="px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534]">
              Close & Refresh
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
