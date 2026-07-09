import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import type { Announcement } from '../../types';

export default function Notices() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const { addToast } = useToast();

  const fetchData = () => {
    setLoading(true);
    api.get('/announcements').then(r => setAnnouncements(r.data)).catch(() => addToast('Failed to load', 'error')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/announcements/${deleteTarget.id}`);
      addToast('Notice deleted', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch {
      addToast('Failed to delete', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Notices & Announcements</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534]">
          <Plus className="h-4 w-4" /> Add Notice
        </button>
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-sm text-slate-500">Loading...</p> : announcements.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements</p>
        ) : announcements.map(a => (
          <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                  {a.target_role && <span className="px-1.5 py-0.5 rounded bg-slate-100">For: {a.target_role}s</span>}
                </div>
              </div>
              <div className="flex gap-1 ml-3">
                <button onClick={() => { setEditing(a); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-slate-600"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => setDeleteTarget(a)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <NoticeFormModal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} notice={editing} onSuccess={() => { setShowForm(false); setEditing(null); fetchData(); }} />
      <ConfirmDialog isOpen={!!deleteTarget} title="Delete Notice" message="Delete this notice?" confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

function NoticeFormModal({ isOpen, onClose, notice, onSuccess }: { isOpen: boolean; onClose: () => void; notice: Announcement | null; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: '', content: '', target_role: '' });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (notice) setForm({ title: notice.title, content: notice.content, target_role: notice.target_role || '' });
    else setForm({ title: '', content: '', target_role: '' });
  }, [notice, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, target_role: form.target_role || null };
      if (notice) await api.put(`/announcements/${notice.id}`, payload);
      else await api.post('/announcements', payload);
      addToast(notice ? 'Notice updated' : 'Notice created', 'success');
      onSuccess();
    } catch { addToast('Failed', 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={notice ? 'Edit Notice' : 'New Notice'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
          <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
          <textarea required rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
          <select value={form.target_role} onChange={e => setForm({ ...form, target_role: e.target.value })}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
            <option value="">All</option>
            <option value="teacher">Teachers Only</option>
            <option value="student">Students Only</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">{saving ? 'Saving...' : notice ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
