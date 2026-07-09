import { useState, useEffect } from 'react';
import { Save, Printer } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import type { AcademicYear, AcademicMonth, ClassRecord, Subject } from '../../types';

interface StudentMarks {
  id: number;
  name: string;
  admission_number: string;
  class_name: string;
  class_id: number;
  marks: { subject_id: number; subject_name: string; marks: number | null; remarks: string | null }[];
}

export default function MarkEntry() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [months, setMonths] = useState<AcademicMonth[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<StudentMarks[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingMarks, setEditingMarks] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentMonthStatus, setCurrentMonthStatus] = useState<string>('open');
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([api.get('/academic-years'), api.get('/classes')])
      .then(([y, c]) => {
        setYears(y.data);
        setClasses(c.data);
        const activeYear = y.data.find((yr: AcademicYear) => yr.is_active);
        if (activeYear) setSelectedYear(activeYear.id.toString());
      })
      .catch(() => addToast('Failed to load data', 'error'));
  }, []);

  useEffect(() => {
    if (selectedYear) {
      api.get(`/academic-years/${selectedYear}/months`).then(r => setMonths(r.data)).catch(() => {});
    }
  }, [selectedYear]);

  useEffect(() => {
    if (!selectedMonth || !selectedClass) return;

    const month = months.find(m => m.id.toString() === selectedMonth);
    setCurrentMonthStatus(month?.status || 'open');

    setLoading(true);
    const cls = classes.find(c => c.id.toString() === selectedClass);
    setSubjects(cls?.subjects || []);

    api.get('/marks', { params: { month_id: selectedMonth, class_id: selectedClass } })
      .then(res => {
        setStudents(res.data);
        // Initialize editing marks
        const marks: Record<string, number | null> = {};
        res.data.forEach((s: StudentMarks) => {
          (cls?.subjects || []).forEach((sub: Subject) => {
            const existing = s.marks.find((m: any) => m.subject_id === sub.id);
            marks[`${s.id}-${sub.id}`] = existing?.marks ?? null;
          });
        });
        setEditingMarks(marks);
      })
      .catch(() => addToast('Failed to load marks', 'error'))
      .finally(() => setLoading(false));
  }, [selectedMonth, selectedClass]);

  const handleMarkChange = (studentId: number, subjectId: number, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setEditingMarks(prev => ({ ...prev, [`${studentId}-${subjectId}`]: numValue }));
  };

  const saveStudentMarks = async (studentId: number) => {
    const marksToSave = subjects.map(sub => ({
      subject_id: sub.id,
      marks: editingMarks[`${studentId}-${sub.id}`],
    }));

    setSaving(true);
    try {
      await api.post('/marks', { student_id: studentId, academic_month_id: parseInt(selectedMonth), marks: marksToSave });
      addToast('Marks saved', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openProgressCard = (studentId: number) => {
    window.open(`/admin/progress-card/${studentId}/${selectedMonth}`, '_blank');
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Monthly Mark Entry</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedMonth(''); }}
          className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
          <option value="">Select Year</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_active ? ' (Active)' : ''}</option>)}
        </select>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
          <option value="">Select Month</option>
          {months.map(m => <option key={m.id} value={m.id}>{m.name} {m.status === 'locked' ? '🔒' : ''}</option>)}
        </select>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
          <option value="">Select Class</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {currentMonthStatus === 'locked' && selectedMonth && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          This month is locked. Marks cannot be edited.
        </div>
      )}

      {/* Marks Table */}
      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : students.length === 0 && selectedMonth && selectedClass ? (
        <p className="text-sm text-slate-500">No students found for this class</p>
      ) : students.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-3 py-2.5 font-medium text-slate-600 sticky left-0 bg-slate-50">Student</th>
                {subjects.map(sub => (
                  <th key={sub.id} className="text-center px-3 py-2.5 font-medium text-slate-600 min-w-[80px]">{sub.name}</th>
                ))}
                <th className="text-center px-3 py-2.5 font-medium text-slate-600">Total</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const total = subjects.reduce((sum, sub) => {
                  const val = editingMarks[`${student.id}-${sub.id}`];
                  return sum + (val || 0);
                }, 0);

                return (
                  <tr key={student.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 sticky left-0 bg-white">
                      <div>
                        <p className="font-medium text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.admission_number}</p>
                      </div>
                    </td>
                    {subjects.map(sub => (
                      <td key={sub.id} className="px-1 py-1 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={editingMarks[`${student.id}-${sub.id}`] ?? ''}
                          onChange={e => handleMarkChange(student.id, sub.id, e.target.value)}
                          disabled={currentMonthStatus === 'locked'}
                          className="w-16 px-2 py-1 text-center text-sm border border-slate-300 rounded disabled:bg-slate-50 disabled:text-slate-500
                            focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-medium text-slate-900">{total}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {currentMonthStatus !== 'locked' && (
                          <button onClick={() => saveStudentMarks(student.id)} disabled={saving}
                            className="p-1.5 text-slate-400 hover:text-[#14532D] rounded" title="Save">
                            <Save className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => openProgressCard(student.id)}
                          className="p-1.5 text-slate-400 hover:text-[#14532D] rounded" title="Progress Card">
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
