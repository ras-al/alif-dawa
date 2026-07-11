import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../api/client';

export default function ProgressCardAll() {
  const { classId, monthId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/marks/progress-card/class/${classId}/${monthId}`)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId, monthId]);

  const handlePrint = () => window.print();

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading progress cards...</div>;
  if (!data || !data.students || data.students.length === 0) return <div className="p-8 text-sm text-red-600">No students found or failed to load.</div>;

  const { institution, month } = data;

  return (
    <div>
      {/* Action buttons - hidden in print */}
      <div className="flex gap-2 mb-4 print:hidden p-4">
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534]">
          <Printer className="h-4 w-4" /> Print All Reports
        </button>
      </div>

      <div className="print:bg-white bg-slate-50 min-h-screen pb-12">
        {data.students.map((studentData: any) => {
          const totalMarks = studentData.marks.reduce((sum: number, m: any) => {
            if (m.remarks === 'AB' || m.marks === null) return sum;
            const val = typeof m.marks === 'string' ? parseFloat(m.marks) : m.marks;
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
          const totalSubjects = studentData.marks.length;
          const average = totalSubjects > 0 ? (totalMarks / totalSubjects).toFixed(1) : '0';
          
          const att = studentData.attendance;
          const totalAttendanceDays = att?.class_total_days || (att ? att.present + att.absent + att.leave : 0);

          return (
            <div key={studentData.student.id} className="bg-white border border-slate-200 rounded-lg p-8 max-w-[210mm] mx-auto mb-8 print:border-none print:rounded-none print:p-[20mm] print:max-w-none print:mb-0 print:break-after-page shadow-sm print:shadow-none">
              {/* Header */}
              <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
                <h1 className="text-2xl font-bold text-slate-900">
                  {institution.institution_name || 'Alif Dawa College Peravoor'}
                </h1>
                {institution.institution_address && (
                  <p className="text-sm text-slate-600 mt-1">{institution.institution_address}</p>
                )}
                <p className="text-lg font-semibold text-slate-800 mt-3">Monthly Progress Report</p>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-2 gap-y-2 mb-6 text-sm">
                <div>
                  <span className="text-slate-500">Student Name:</span>
                  <span className="ml-2 font-medium text-slate-900">{studentData.student.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Admission No:</span>
                  <span className="ml-2 font-medium text-slate-900">{studentData.student.admission_number}</span>
                </div>
                <div>
                  <span className="text-slate-500">Class:</span>
                  <span className="ml-2 font-medium text-slate-900">{studentData.student.class_name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Month:</span>
                  <span className="ml-2 font-medium text-slate-900">{month.name} ({month.year_name})</span>
                </div>
                {studentData.student.father_name && (
                  <div>
                    <span className="text-slate-500">Father/Guardian:</span>
                    <span className="ml-2 font-medium text-slate-900">{studentData.student.father_name}</span>
                  </div>
                )}
              </div>

              {/* Marks Table */}
              <table className="w-full border border-slate-800 text-sm mb-6">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-800 px-4 py-2 text-left font-semibold text-slate-900">Sl No.</th>
                    <th className="border border-slate-800 px-4 py-2 text-left font-semibold text-slate-900">Subject</th>
                    <th className="border border-slate-800 px-4 py-2 text-center font-semibold text-slate-900">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {studentData.marks.map((mark: any, mIdx: number) => (
                    <tr key={mIdx}>
                      <td className="border border-slate-800 px-4 py-2 text-slate-900">{mIdx + 1}</td>
                      <td className="border border-slate-800 px-4 py-2 text-slate-900">{mark.subject_name}</td>
                      <td className="border border-slate-800 px-4 py-2 text-center text-slate-900 font-medium">
                        {mark.remarks === 'AB' ? 'AB' : (mark.marks !== null ? mark.marks : '—')}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="border border-slate-800 px-4 py-2" colSpan={2}>Total</td>
                    <td className="border border-slate-800 px-4 py-2 text-center">{totalMarks}</td>
                  </tr>
                  <tr className="bg-slate-50 font-semibold">
                    <td className="border border-slate-800 px-4 py-2" colSpan={2}>Average</td>
                    <td className="border border-slate-800 px-4 py-2 text-center">{average}</td>
                  </tr>
                </tbody>
              </table>

              {/* Attendance Summary */}
              {att && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Attendance Summary</h3>
                  <table className="w-full border border-slate-800 text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-800 px-4 py-2 text-center font-semibold text-slate-900">Total Days</th>
                        <th className="border border-slate-800 px-4 py-2 text-center font-semibold text-slate-900">Present</th>
                        <th className="border border-slate-800 px-4 py-2 text-center font-semibold text-slate-900">Absent</th>
                        <th className="border border-slate-800 px-4 py-2 text-center font-semibold text-slate-900">Leave</th>
                        <th className="border border-slate-800 px-4 py-2 text-center font-semibold text-slate-900">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-800 px-4 py-2 text-center font-medium">{totalAttendanceDays}</td>
                        <td className="border border-slate-800 px-4 py-2 text-center font-medium text-green-700">{att.present}</td>
                        <td className="border border-slate-800 px-4 py-2 text-center font-medium text-red-700">{att.absent}</td>
                        <td className="border border-slate-800 px-4 py-2 text-center font-medium text-amber-700">{att.leave}</td>
                        <td className="border border-slate-800 px-4 py-2 text-center font-medium">
                          {totalAttendanceDays > 0 ? ((att.present / totalAttendanceDays) * 100).toFixed(1) : '0'}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Remarks */}
              <div className="mb-8">
                <p className="text-sm text-slate-500">Remarks:</p>
                <div className="mt-1 border-b border-slate-300 min-h-[24px]"></div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-8 mt-12 text-sm text-center">
                <div>
                  <div className="border-t border-slate-800 pt-1">Teacher Signature</div>
                </div>
                <div>
                  <div className="border-t border-slate-800 pt-1">Date</div>
                </div>
                <div>
                  <div className="border-t border-slate-800 pt-1">Principal Signature</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
