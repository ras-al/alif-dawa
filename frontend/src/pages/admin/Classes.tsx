import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';
import type { ClassRecord, Subject } from '../../types';

export default function Classes() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubjects, setEditingSubjects] = useState<ClassRecord | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classRes, subjectRes] = await Promise.all([
        api.get('/classes'),
        api.get('/classes/subjects/all'),
      ]);
      setClasses(classRes.data);
      setAllSubjects(subjectRes.data);
    } catch {
      addToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/classes', { name: newClassName });
      addToast('Class created', 'success');
      setNewClassName('');
      setShowClassForm(false);
      fetchData();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to create class', 'error');
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/classes/subjects', { name: newSubjectName });
      addToast('Subject created', 'success');
      setNewSubjectName('');
      setShowSubjectForm(false);
      fetchData();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to create subject', 'error');
    }
  };

  const handleDeleteClass = async (id: number) => {
    try {
      await api.delete(`/classes/${id}`);
      addToast('Class deleted', 'success');
      fetchData();
    } catch {
      addToast('Failed to delete class', 'error');
    }
  };

  const handleDeleteSubject = async (id: number) => {
    try {
      await api.delete(`/classes/subjects/${id}`);
      addToast('Subject deleted', 'success');
      fetchData();
    } catch {
      addToast('Failed to delete subject', 'error');
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Classes & Subjects</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">Classes</h2>
            <button onClick={() => setShowClassForm(true)} className="flex items-center gap-1 px-2.5 py-1 text-sm font-medium text-[#14532D] border border-[#14532D] rounded-md hover:bg-[#14532D]/5">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg">
            {loading ? <p className="p-4 text-sm text-slate-500">Loading...</p> : (
              <div className="divide-y divide-slate-200">
                {classes.map(c => (
                  <div key={c.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-slate-900">{c.name}</h3>
                      <div className="flex gap-1">
                        <button onClick={() => setEditingSubjects(c)} className="text-sm text-[#14532D] hover:underline">Edit Subjects</button>
                        <button onClick={() => handleDeleteClass(c.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(c.subjects || []).map(s => (
                        <span key={s.id} className="inline-flex px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600">{s.name}</span>
                      ))}
                      {(!c.subjects || c.subjects.length === 0) && <span className="text-xs text-slate-400">No subjects assigned</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All Subjects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">All Subjects</h2>
            <button onClick={() => setShowSubjectForm(true)} className="flex items-center gap-1 px-2.5 py-1 text-sm font-medium text-[#14532D] border border-[#14532D] rounded-md hover:bg-[#14532D]/5">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg">
            {allSubjects.length === 0 ? <p className="p-4 text-sm text-slate-500">No subjects</p> : (
              <div className="divide-y divide-slate-200">
                {allSubjects.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-900">{s.name}</span>
                    <button onClick={() => handleDeleteSubject(s.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Class Modal */}
      <Modal isOpen={showClassForm} onClose={() => setShowClassForm(false)} title="Add Class" size="sm">
        <form onSubmit={handleAddClass} className="space-y-4">
          <input required value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="Class name (e.g. H4)"
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowClassForm(false)} className="px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534]">Create</button>
          </div>
        </form>
      </Modal>

      {/* Add Subject Modal */}
      <Modal isOpen={showSubjectForm} onClose={() => setShowSubjectForm(false)} title="Add Subject" size="sm">
        <form onSubmit={handleAddSubject} className="space-y-4">
          <input required value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Subject name"
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowSubjectForm(false)} className="px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534]">Create</button>
          </div>
        </form>
      </Modal>

      {/* Edit Class Subjects Modal */}
      <EditSubjectsModal cls={editingSubjects} allSubjects={allSubjects} onClose={() => { setEditingSubjects(null); fetchData(); }} />
    </div>
  );
}

function EditSubjectsModal({ cls, allSubjects, onClose }: { cls: ClassRecord | null; allSubjects: Subject[]; onClose: () => void }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (cls) setSelected(cls.subjects?.map(s => s.id) || []);
  }, [cls]);

  if (!cls) return null;

  const toggle = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/classes/${cls.id}/subjects`, { subject_ids: selected });
      addToast('Subjects updated', 'success');
      onClose();
    } catch {
      addToast('Failed to update subjects', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Subjects for ${cls.name}`}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {allSubjects.map(s => (
            <button key={s.id} type="button" onClick={() => toggle(s.id)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selected.includes(s.id)
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}>
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
