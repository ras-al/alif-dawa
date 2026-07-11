import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { AcademicYear, AcademicMonth, ClassRecord } from '../../types';

interface StudentMonthlyAttendance {
  student_id: number;
  name: string;
  admission_number: string;
  total_days: number | null;
  present_days: number | null;
}

export default function MonthlyAttendance() {
  const { user } = useAuth();
  const isClassLogin = user?.role === 'class';
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [months, setMonths] = useState<AcademicMonth[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<StudentMonthlyAttendance[]>([]);
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

        if (isClassLogin && user?.classId) {
          setSelectedClass(user.classId.toString());
        }
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
    api.get(`/attendance/monthly/${selectedClass}/${selectedMonth}`)
      .then(res => {
        setStudents(res.data);
      })
      .catch(() => addToast('Failed to load monthly attendance', 'error'))
      .finally(() => setLoading(false));
  }, [selectedMonth, selectedClass]);

  const handleAttendanceChange = (studentId: number, field: 'total_days' | 'present_days', value: string) => {
    const numValue = value === '' ? null : parseInt(value);
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, [field]: numValue } : s));
  };

  const handleApplyAllTotalDays = (studentId: number) => {
    const student = students.find(s => s.student_id === studentId);
    if (!student || student.total_days === null) return;
    
    setStudents(prev => prev.map(s => ({
      ...s,
      total_days: student.total_days
    })));
    addToast('Total days applied to all students', 'success');
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.student_id,
        total_days: s.total_days || 0,
        present_days: s.present_days || 0
      }));
      await api.post('/attendance/monthly', { 
        class_id: parseInt(selectedClass), 
        academic_month_id: parseInt(selectedMonth), 
        records 
      });
      addToast('Monthly attendance saved successfully', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Monthly Attendance</h1>
      <p className="text-sm text-slate-500 mb-6">Enter total and present days for each student per month</p>

      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 flex flex-wrap gap-4">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border-slate-300 rounded-md text-sm focus:border-[#14532D] focus:ring-[#14532D]"
        >
          <option value="">Select Year</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border-slate-300 rounded-md text-sm focus:border-[#14532D] focus:ring-[#14532D]"
        >
          <option value="">Select Month</option>
          {months.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border-slate-300 rounded-md text-sm focus:border-[#14532D] focus:ring-[#14532D]"
          disabled={isClassLogin}
        >
          <option value="">Select Class</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {currentMonthStatus === 'published' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">This month is locked (published). You cannot edit attendance.</p>
        </div>
      )}

      {selectedMonth && selectedClass && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-600">Admission No</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Student Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 w-32">Total Days</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 w-32">Present Days</th>
                <th className="px-4 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No students found</td>
                </tr>
              ) : (
                students.map(s => (
                  <tr key={s.student_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500">{s.admission_number}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={s.total_days === null ? '' : s.total_days}
                        onChange={(e) => handleAttendanceChange(s.student_id, 'total_days', e.target.value)}
                        disabled={currentMonthStatus === 'published'}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D] disabled:bg-slate-100"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={s.present_days === null ? '' : s.present_days}
                        onChange={(e) => handleAttendanceChange(s.student_id, 'present_days', e.target.value)}
                        disabled={currentMonthStatus === 'published'}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D] disabled:bg-slate-100"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {currentMonthStatus !== 'published' && s.total_days !== null && (
                        <button
                          onClick={() => handleApplyAllTotalDays(s.student_id)}
                          className="text-xs text-[#14532D] hover:underline"
                          title="Apply this total days value to all students in the list"
                        >
                          Apply to All
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {students.length > 0 && currentMonthStatus !== 'published' && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={saveAttendance}
                disabled={saving || loading}
                className="flex items-center gap-2 px-4 py-2 bg-[#14532D] text-white rounded-md text-sm font-medium hover:bg-[#14532D]/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
