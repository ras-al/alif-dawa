import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import api from '../../api/client';

export default function ClassProgressCard() {
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

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading class report...</div>;
  if (!data || !data.students || data.students.length === 0) return <div className="p-8 text-sm text-red-600">No students found or failed to load.</div>;

  const { institution, month, subjects, students } = data;
  const className = students[0]?.student.class_name || '';

  return (
    <div className="min-h-screen bg-slate-50 p-8 print:p-0 print:bg-white">
      <div className="flex justify-between items-center mb-6 print:hidden max-w-7xl mx-auto">
        <h1 className="text-xl font-bold text-slate-800">Consolidated Class Report</h1>
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534]">
          <Printer className="h-4 w-4" /> Print Report
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-7xl mx-auto print:border-none print:rounded-none print:p-0 print:max-w-none">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">
            {institution.institution_name || 'Alif Dawa College Peravoor'}
          </h1>
          {institution.institution_address && (
            <p className="text-sm text-slate-600 mt-1">{institution.institution_address}</p>
          )}
          <p className="text-lg font-semibold text-slate-800 mt-3">Consolidated Mark Report</p>
          
          <div className="flex justify-center gap-8 mt-4 text-sm font-medium text-slate-800">
            <span>Class: <span className="font-bold">{className}</span></span>
            <span>Month: <span className="font-bold">{month.name} ({month.year_name})</span></span>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-slate-800 text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-800 px-3 py-2 text-center font-semibold text-slate-900 w-12">Sl No</th>
              <th className="border border-slate-800 px-3 py-2 text-left font-semibold text-slate-900">Adm No</th>
              <th className="border border-slate-800 px-3 py-2 text-left font-semibold text-slate-900">Student Name</th>
              {subjects?.map((sub: any) => (
                <th key={sub.id} className="border border-slate-800 px-3 py-2 text-center font-semibold text-slate-900">
                  {sub.name}
                </th>
              ))}
              <th className="border border-slate-800 px-3 py-2 text-center font-semibold text-slate-900">Total</th>
              <th className="border border-slate-800 px-3 py-2 text-center font-semibold text-slate-900">Average</th>
              <th className="border border-slate-800 px-3 py-2 text-center font-semibold text-slate-900">Att %</th>
            </tr>
          </thead>
          <tbody>
            {students.map((studentData: any, idx: number) => {
              const totalMarks = studentData.marks.reduce((sum: number, m: any) => sum + (m.marks || 0), 0);
              const totalSubjects = subjects?.length || 0;
              const average = totalSubjects > 0 ? (totalMarks / totalSubjects).toFixed(1) : '0';
              
              const att = studentData.attendance;
              const totalDays = att ? att.present + att.absent + att.leave : 0;
              const attPercent = totalDays > 0 ? ((att.present / totalDays) * 100).toFixed(0) + '%' : '-';

              return (
                <tr key={studentData.student.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                  <td className="border border-slate-800 px-3 py-2 text-center text-slate-900">{idx + 1}</td>
                  <td className="border border-slate-800 px-3 py-2 text-slate-900">{studentData.student.admission_number}</td>
                  <td className="border border-slate-800 px-3 py-2 text-slate-900 font-medium">{studentData.student.name}</td>
                  
                  {subjects?.map((sub: any) => {
                    const markRec = studentData.marks.find((m: any) => m.subject_name === sub.name);
                    return (
                      <td key={sub.id} className="border border-slate-800 px-3 py-2 text-center text-slate-900">
                        {markRec?.marks !== null && markRec?.marks !== undefined ? markRec.marks : '-'}
                      </td>
                    );
                  })}
                  
                  <td className="border border-slate-800 px-3 py-2 text-center font-bold text-slate-900 bg-slate-50">{totalMarks}</td>
                  <td className="border border-slate-800 px-3 py-2 text-center font-bold text-slate-900 bg-slate-50">{average}</td>
                  <td className="border border-slate-800 px-3 py-2 text-center text-slate-900">{attPercent}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 mt-16 text-sm text-center font-medium">
          <div>
            <div className="border-t border-slate-800 pt-2 inline-block px-8">Class Teacher</div>
          </div>
          <div>
            <div className="border-t border-slate-800 pt-2 inline-block px-8">Date</div>
          </div>
          <div>
            <div className="border-t border-slate-800 pt-2 inline-block px-8">Principal</div>
          </div>
        </div>
      </div>
    </div>
  );
}
