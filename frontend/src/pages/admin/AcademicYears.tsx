import { useState, useEffect } from 'react';
import { Plus, Lock, Unlock, Edit2, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../api/client';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';
import type { AcademicYear, AcademicMonth } from '../../types';

export default function AcademicYears() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [months, setMonths] = useState<Record<number, AcademicMonth[]>>({});
  const [loading, setLoading] = useState(true);
  const [showYearForm, setShowYearForm] = useState(false);
  const [showMonthForm, setShowMonthForm] = useState<number | null>(null);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [deleteYearTarget, setDeleteYearTarget] = useState<AcademicYear | null>(null);
  const [editingMonth, setEditingMonth] = useState<AcademicMonth | null>(null);
  const [deleteMonthTarget, setDeleteMonthTarget] = useState<AcademicMonth | null>(null);
  const { addToast } = useToast();

  const fetchYears = async () => {
    setLoading(true);
    try {
      const res = await api.get('/academic-years');
      setYears(res.data);
      // Auto-expand active year
      const active = res.data.find((y: AcademicYear) => y.is_active);
      if (active) setExpandedYear(active.id);
    } catch {
      addToast('Failed to load academic years', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchYears(); }, []);

  const fetchMonths = async (yearId: number) => {
    try {
      const res = await api.get(`/academic-years/${yearId}/months`);
      setMonths(prev => ({ ...prev, [yearId]: res.data }));
    } catch {
      addToast('Failed to load months', 'error');
    }
  };

  useEffect(() => {
    if (expandedYear) fetchMonths(expandedYear);
  }, [expandedYear]);

  const handleDeleteYear = async () => {
    if (!deleteYearTarget) return;
    try {
      await api.delete(`/academic-years/${deleteYearTarget.id}`);
      addToast('Academic year deleted', 'success');
      setDeleteYearTarget(null);
      fetchYears();
    } catch {
      addToast('Failed to delete academic year', 'error');
    }
  };

  const handleDeleteMonth = async () => {
    if (!deleteMonthTarget) return;
    try {
      await api.delete(`/academic-years/months/${deleteMonthTarget.id}`);
      addToast('Academic month deleted', 'success');
      const yearId = deleteMonthTarget.academic_year_id;
      setDeleteMonthTarget(null);
      if (yearId) fetchMonths(yearId);
      else if (expandedYear) fetchMonths(expandedYear);
    } catch {
      addToast('Failed to delete academic month', 'error');
    }
  };

  const toggleLock = async (monthId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'open' ? 'locked' : 'open';
      await api.put(`/academic-years/months/${monthId}/lock`, { status: newStatus });
      addToast(`Month ${newStatus}`, 'success');
      if (expandedYear) fetchMonths(expandedYear);
    } catch {
      addToast('Failed to update month status', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Academic Years</h1>
        <button onClick={() => { setEditingYear(null); setShowYearForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534]">
          <Plus className="h-4 w-4" /> Add Year
        </button>
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-sm text-slate-500">Loading...</p> : years.length === 0 ? (
          <p className="text-sm text-slate-500">No academic years created yet</p>
        ) : years.map(year => (
          <div key={year.id} className="bg-white border border-slate-200 rounded-lg">
            <button
              onClick={() => setExpandedYear(expandedYear === year.id ? null : year.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-900">{year.name}</span>
                {year.is_active && (
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-green-50 text-green-700">Active</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 mr-2">{year.start_date?.split('T')[0]} - {year.end_date?.split('T')[0]}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingYear(year); setShowYearForm(true); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded" title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteYearTarget(year); }}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </button>

            {expandedYear === year.id && (
              <div className="border-t border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-700">Months</h3>
                  <button onClick={() => { setEditingMonth(null); setShowMonthForm(year.id); }} className="flex items-center gap-1 text-sm text-[#14532D] hover:underline">
                    <Plus className="h-3.5 w-3.5" /> Add Month
                  </button>
                </div>
                {(months[year.id] || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No months added</p>
                ) : (
                  <div className="space-y-1">
                    {(months[year.id] || []).map(m => (
                      <div key={m.id} className="flex items-center justify-between py-1.5 px-3 rounded bg-slate-50">
                        <span className="text-sm text-slate-900">{m.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleLock(m.id, m.status)}
                            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                              m.status === 'locked'
                                ? 'text-red-700 bg-red-50 hover:bg-red-100'
                                : 'text-green-700 bg-green-50 hover:bg-green-100'
                            }`}
                          >
                            {m.status === 'locked' ? <><Lock className="h-3 w-3" /> Locked</> : <><Unlock className="h-3 w-3" /> Open</>}
                          </button>
                          <button
                            onClick={() => { setEditingMonth(m); setShowMonthForm(year.id); }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded" title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteMonthTarget(m)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded" title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Year Modal */}
      <AddYearModal isOpen={showYearForm} onClose={() => { setShowYearForm(false); setEditingYear(null); }} onSuccess={() => { setShowYearForm(false); setEditingYear(null); fetchYears(); }} year={editingYear} />

      {/* Add Month Modal */}
      <AddMonthModal yearId={showMonthForm} onClose={() => { setShowMonthForm(null); setEditingMonth(null); }} onSuccess={() => { if (showMonthForm) fetchMonths(showMonthForm); setShowMonthForm(null); setEditingMonth(null); }} month={editingMonth} />

      <ConfirmDialog isOpen={!!deleteYearTarget} title="Delete Academic Year" message="Are you sure you want to delete this academic year?" confirmLabel="Delete" variant="danger" onConfirm={handleDeleteYear} onCancel={() => setDeleteYearTarget(null)} />
      <ConfirmDialog isOpen={!!deleteMonthTarget} title="Delete Academic Month" message="Are you sure you want to delete this academic month?" confirmLabel="Delete" variant="danger" onConfirm={handleDeleteMonth} onCancel={() => setDeleteMonthTarget(null)} />
    </div>
  );
}

function AddYearModal({ isOpen, onClose, onSuccess, year }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; year?: AcademicYear | null }) {
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_active: false });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (year) {
      setForm({
        name: year.name,
        start_date: year.start_date?.split('T')[0] || '',
        end_date: year.end_date?.split('T')[0] || '',
        is_active: year.is_active || false
      });
    } else {
      setForm({ name: '', start_date: '', end_date: '', is_active: false });
    }
  }, [year, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (year) {
        await api.put(`/academic-years/${year.id}`, form);
        addToast('Academic year updated', 'success');
      } else {
        await api.post('/academic-years', form);
        addToast('Academic year created', 'success');
      }
      onSuccess();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={year ? "Edit Academic Year" : "Add Academic Year"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2025-2026"
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
            <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
            <input type="date" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 border-slate-300 rounded text-[#14532D]" />
          <span className="text-slate-700">Set as active year</span>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">{saving ? 'Saving...' : year ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AddMonthModal({ yearId, onClose, onSuccess, month }: { yearId: number | null; onClose: () => void; onSuccess: () => void; month?: AcademicMonth | null }) {
  const [form, setForm] = useState({ name: '', month_number: '' });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (month) {
      setForm({ name: month.name, month_number: month.month_number.toString() });
    } else {
      setForm({ name: '', month_number: '' });
    }
  }, [month, yearId]);

  if (!yearId && !month) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (month) {
        await api.put(`/academic-years/months/${month.id}`, { ...form, month_number: parseInt(form.month_number) });
        addToast('Month updated', 'success');
      } else {
        await api.post(`/academic-years/${yearId}/months`, { ...form, month_number: parseInt(form.month_number) });
        addToast('Month created', 'success');
      }
      setForm({ name: '', month_number: '' });
      onSuccess();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={month ? "Edit Academic Month" : "Add Academic Month"} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Month Name *</label>
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. June"
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Month Number *</label>
          <input type="number" required min="1" max="12" value={form.month_number} onChange={e => setForm({ ...form, month_number: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">{saving ? 'Saving...' : month ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
