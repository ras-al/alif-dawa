import re

with open('/home/rasal/Documents/MyWorks/alif/frontend/src/pages/admin/AcademicYears.tsx', 'r') as f:
    content = f.read()

# Chunk 1
content = content.replace(
    "import { Plus, Lock, Unlock } from 'lucide-react';",
    "import { Plus, Lock, Unlock, Edit2, Trash2 } from 'lucide-react';\nimport ConfirmDialog from '../../components/ConfirmDialog';"
)

# Chunk 2
content = content.replace(
    "  const [showYearForm, setShowYearForm] = useState(false);\n  const [showMonthForm, setShowMonthForm] = useState<number | null>(null);\n  const [expandedYear, setExpandedYear] = useState<number | null>(null);",
    "  const [showYearForm, setShowYearForm] = useState(false);\n  const [showMonthForm, setShowMonthForm] = useState<number | null>(null);\n  const [expandedYear, setExpandedYear] = useState<number | null>(null);\n  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);\n  const [deleteYearTarget, setDeleteYearTarget] = useState<AcademicYear | null>(null);\n  const [editingMonth, setEditingMonth] = useState<AcademicMonth | null>(null);\n  const [deleteMonthTarget, setDeleteMonthTarget] = useState<AcademicMonth | null>(null);"
)

# Chunk 3
content = content.replace(
    "  const toggleLock = async (monthId: number, currentStatus: string) => {",
    """  const handleDeleteYear = async () => {
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

  const toggleLock = async (monthId: number, currentStatus: string) => {"""
)

# Chunk 4
content = content.replace(
    """<button onClick={() => setShowYearForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534]">""",
    """<button onClick={() => { setEditingYear(null); setShowYearForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534]">"""
)

# Chunk 5
content = content.replace(
    """<span className="text-xs text-slate-500">{year.start_date?.split('T')[0]} — {year.end_date?.split('T')[0]}</span>""",
    """<div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 mr-2">{year.start_date?.split('T')[0]} — {year.end_date?.split('T')[0]}</span>
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
              </div>"""
)

# Chunk 6
content = content.replace(
    """<button onClick={() => setShowMonthForm(year.id)} className="flex items-center gap-1 text-sm text-[#14532D] hover:underline">""",
    """<button onClick={() => { setEditingMonth(null); setShowMonthForm(year.id); }} className="flex items-center gap-1 text-sm text-[#14532D] hover:underline">"""
)

# Chunk 7
content = content.replace(
    """<button
                          onClick={() => toggleLock(m.id, m.status)}
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                            m.status === 'locked'
                              ? 'text-red-700 bg-red-50 hover:bg-red-100'
                              : 'text-green-700 bg-green-50 hover:bg-green-100'
                          }`}
                        >
                          {m.status === 'locked' ? <><Lock className="h-3 w-3" /> Locked</> : <><Unlock className="h-3 w-3" /> Open</>}
                        </button>""",
    """<div className="flex items-center gap-2">
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
                        </div>"""
)

# Chunk 8
content = content.replace(
    """{/* Add Year Modal */}
      <AddYearModal isOpen={showYearForm} onClose={() => setShowYearForm(false)} onSuccess={() => { setShowYearForm(false); fetchYears(); }} />

      {/* Add Month Modal */}
      <AddMonthModal yearId={showMonthForm} onClose={() => setShowMonthForm(null)} onSuccess={() => { if (showMonthForm) fetchMonths(showMonthForm); setShowMonthForm(null); }} />""",
    """{/* Add Year Modal */}
      <AddYearModal isOpen={showYearForm} onClose={() => { setShowYearForm(false); setEditingYear(null); }} onSuccess={() => { setShowYearForm(false); setEditingYear(null); fetchYears(); }} year={editingYear} />

      {/* Add Month Modal */}
      <AddMonthModal yearId={showMonthForm} onClose={() => { setShowMonthForm(null); setEditingMonth(null); }} onSuccess={() => { if (showMonthForm) fetchMonths(showMonthForm); setShowMonthForm(null); setEditingMonth(null); }} month={editingMonth} />

      <ConfirmDialog isOpen={!!deleteYearTarget} title="Delete Academic Year" message="Are you sure you want to delete this academic year?" confirmLabel="Delete" variant="danger" onConfirm={handleDeleteYear} onCancel={() => setDeleteYearTarget(null)} />
      <ConfirmDialog isOpen={!!deleteMonthTarget} title="Delete Academic Month" message="Are you sure you want to delete this academic month?" confirmLabel="Delete" variant="danger" onConfirm={handleDeleteMonth} onCancel={() => setDeleteMonthTarget(null)} />"""
)

# Chunk 9
content = content.replace(
    """function AddYearModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Add Academic Year">""",
    """function AddYearModal({ isOpen, onClose, onSuccess, year }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; year?: AcademicYear | null }) {
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
    <Modal isOpen={isOpen} onClose={onClose} title={year ? "Edit Academic Year" : "Add Academic Year"}>"""
)

# Chunk 10
content = content.replace(
    """<button type="submit" disabled={saving} className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
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
    <Modal isOpen={true} onClose={onClose} title="Add Academic Month" size="sm">""",
    """<button type="submit" disabled={saving} className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">{saving ? 'Saving...' : year ? 'Update' : 'Create'}</button>
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
    <Modal isOpen={true} onClose={onClose} title={month ? "Edit Academic Month" : "Add Academic Month"} size="sm">"""
)

# Chunk 11
content = content.replace(
    """<button type="submit" disabled={saving} className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}""",
    """<button type="submit" disabled={saving} className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">{saving ? 'Saving...' : month ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}"""
)

with open('/home/rasal/Documents/MyWorks/alif/frontend/src/pages/admin/AcademicYears.tsx', 'w') as f:
    f.write(content)

