import { useState, useEffect } from 'react';
import { Plus, Lock, Unlock } from 'lucide-react';
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
        <button onClick={() => setShowYearForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534]">
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
              <span className="text-xs text-slate-500">{year.start_date?.split('T')[0]} — {year.end_date?.split('T')[0]}</span>
            </button>

            {expandedYear === year.id && (
              <div className="border-t border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-700">Months</h3>
                  <button onClick={() => setShowMonthForm(year.id)} className="flex items-center gap-1 text-sm text-[#14532D] hover:underline">
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
      <AddYearModal isOpen={showYearForm} onClose={() => setShowYearForm(false)} onSuccess={() => { setShowYearForm(false); fetchYears(); }} />

      {/* Add Month Modal */}
      <AddMonthModal yearId={showMonthForm} onClose={() => setShowMonthForm(null)} onSuccess={() => { if (showMonthForm) fetchMonths(showMonthForm); setShowMonthForm(null); }} />
    </div>
  );
}

function AddYearModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_active: false });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/academic-years', form);
      addToast('Academic year created', 'success');
      onSuccess();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to create', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Academic Year">
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
          <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AddMonthModal({ yearId, onClose, onSuccess }: { yearId: number | null; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', month_number: '' });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  if (!yearId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/academic-years/${yearId}/months`, { ...form, month_number: parseInt(form.month_number) });
      addToast('Month created', 'success');
      setForm({ name: '', month_number: '' });
      onSuccess();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to create', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Academic Month" size="sm">
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
          <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
