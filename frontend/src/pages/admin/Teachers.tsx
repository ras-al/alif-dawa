import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import type { Teacher } from '../../types';

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const { addToast } = useToast();

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/teachers');
      setTeachers(res.data.data);
    } catch {
      addToast('Failed to load teachers', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/teachers/${deleteTarget.id}`);
      addToast('Teacher deleted', 'success');
      setDeleteTarget(null);
      fetchTeachers();
    } catch {
      addToast('Failed to delete teacher', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Teachers</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534]"
        >
          <Plus className="h-4 w-4" /> Add Teacher
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading...</p>
        ) : teachers.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No teachers found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-900 font-medium">{t.name}</td>
                  <td className="px-4 py-2.5 text-slate-600 hidden md:table-cell">{t.phone || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600 hidden md:table-cell">{t.email || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                      t.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(t); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(t)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete">
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

      <TeacherFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        teacher={editing}
        onSuccess={() => { setShowForm(false); setEditing(null); fetchTeachers(); }}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Teacher"
        message={`Are you sure you want to delete ${deleteTarget?.name}?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function TeacherFormModal({ isOpen, onClose, teacher, onSuccess }: {
  isOpen: boolean; onClose: () => void; teacher: Teacher | null; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (teacher) {
      setForm({
        name: teacher.name, phone: teacher.phone || '', email: teacher.email || '',
        is_active: teacher.is_active,
      });
    } else {
      setForm({ name: '', phone: '', email: '', is_active: true });
    }
  }, [teacher, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (teacher) {
        await api.put(`/teachers/${teacher.id}`, form);
        addToast('Teacher updated', 'success');
      } else {
        await api.post('/teachers', form);
        addToast('Teacher created', 'success');
      }
      onSuccess();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save teacher', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={teacher ? 'Edit Teacher' : 'Add Teacher'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
          </div>
        </div>
        {teacher && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Status:</label>
            <select value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm({ ...form, is_active: e.target.value === 'active' })}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">
            {saving ? 'Saving...' : teacher ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
