import { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { ClassRecord, AttendanceRecord } from '../../types';

export default function Attendance() {
  const { user } = useAuth();
  const isClassLogin = user?.role === 'class';
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isClassLogin && user?.classId) {
      // Auto-select class for class login
      setSelectedClass(user.classId.toString());
    } else {
      api.get('/classes').then(r => setClasses(r.data)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!selectedClass || !selectedDate) return;
    setLoading(true);
    api.get('/attendance', { params: { date: selectedDate, class_id: selectedClass } })
      .then(r => setRecords(r.data))
      .catch(() => addToast('Failed to load attendance', 'error'))
      .finally(() => setLoading(false));
  }, [selectedClass, selectedDate]);

  const updateStatus = (studentId: number, status: 'present' | 'absent' | 'leave') => {
    setRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, status } : r));
  };

  const markAll = (status: 'present' | 'absent') => {
    setRecords(prev => prev.map(r => ({ ...r, status })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/attendance/mark', {
        date: selectedDate,
        records: records.filter(r => r.status).map(r => ({ student_id: r.student_id, status: r.status })),
      });
      addToast('Attendance saved', 'success');
    } catch {
      addToast('Failed to save attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Attendance</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Hide class selector for class login */}
        {!isClassLogin && (
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white" />
        {records.length > 0 && (
          <div className="flex gap-2">
            <button onClick={() => markAll('present')} className="px-3 py-1.5 text-sm text-green-700 border border-green-300 rounded-md hover:bg-green-50">Mark All Present</button>
            <button onClick={() => markAll('absent')} className="px-3 py-1.5 text-sm text-red-700 border border-red-300 rounded-md hover:bg-red-50">Mark All Absent</button>
          </div>
        )}
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading...</p> : records.length === 0 && selectedClass ? (
        <p className="text-sm text-slate-500">No students found</p>
      ) : records.length > 0 && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Student</th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">Present</th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">Absent</th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">Leave</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.student_id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.admission_number}</p>
                    </td>
                    {(['present', 'absent', 'leave'] as const).map(status => (
                      <td key={status} className="px-4 py-2.5 text-center">
                        <input
                          type="radio"
                          name={`attendance-${r.student_id}`}
                          checked={r.status === status}
                          onChange={() => updateStatus(r.student_id, status)}
                          className="h-4 w-4 text-[#14532D] border-slate-300 focus:ring-[#14532D]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
