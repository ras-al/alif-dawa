import { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { Search, Download, Trash2, Calendar, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Feedback {
  id: number;
  student_name: string;
  parent_name: string;
  relationship: string;
  phone_number: string;
  class_name: string | null;
  feedback: string;
  created_at: string;
}

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/feedback`);
      setFeedbacks(response.data);
    } catch (err) {
      console.error('Error fetching feedbacks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await api.delete(`/feedback/${id}`);
      setFeedbacks(prev => prev.filter(f => f.id !== id));
      if (selectedFeedback?.id === id) {
        setSelectedFeedback(null);
      }
    } catch (err) {
      console.error('Error deleting feedback', err);
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredFeedbacks.map(f => ({
      'Date': new Date(f.created_at).toLocaleString(),
      'Student Name': f.student_name,
      'Class': f.class_name || 'N/A',
      'Parent Name': f.parent_name,
      'Relationship': f.relationship,
      'Phone': f.phone_number,
      'Feedback': f.feedback
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Feedbacks');
    XLSX.writeFile(workbook, 'Parent_Feedback_Export.xlsx');
  };

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
      const matchesSearch = 
        f.student_name.toLowerCase().includes(search.toLowerCase()) ||
        f.parent_name.toLowerCase().includes(search.toLowerCase()) ||
        f.phone_number.includes(search) ||
        (f.class_name && f.class_name.toLowerCase().includes(search.toLowerCase()));
      
      const matchesDate = dateFilter ? new Date(f.created_at).toISOString().split('T')[0] === dateFilter : true;
      
      return matchesSearch && matchesDate;
    });
  }, [feedbacks, search, dateFilter]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Parent Feedback</h1>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-[#14532D] text-white px-4 py-2 rounded-lg hover:bg-[#0f4023] transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export to Excel</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student, parent, phone, or class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none"
            />
          </div>
          {dateFilter && (
            <button 
              onClick={() => setDateFilter('')}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Clear Date
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading feedback...</div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No feedback found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student (Class)</th>
                  <th className="py-3 px-4">Parent / Guardian</th>
                  <th className="py-3 px-4">Feedback Summary</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredFeedbacks.map((feedback) => (
                  <tr key={feedback.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(feedback.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{feedback.student_name}</div>
                      {feedback.class_name && (
                        <div className="text-xs text-slate-500">{feedback.class_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{feedback.parent_name}</div>
                      <div className="text-xs text-slate-500">{feedback.relationship} - {feedback.phone_number}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate">
                      {feedback.feedback}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedFeedback(feedback)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(feedback.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Feedback"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for viewing complete feedback */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Feedback Details</h2>
              <button 
                onClick={() => setSelectedFeedback(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Student</div>
                  <div className="font-medium text-slate-900">{selectedFeedback.student_name}</div>
                  {selectedFeedback.class_name && (
                    <div className="text-sm text-slate-600">Class: {selectedFeedback.class_name}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Date Submitted</div>
                  <div className="text-slate-900">{new Date(selectedFeedback.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Parent / Guardian</div>
                  <div className="font-medium text-slate-900">{selectedFeedback.parent_name}</div>
                  <div className="text-sm text-slate-600">{selectedFeedback.relationship}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Contact</div>
                  <div className="text-slate-900">{selectedFeedback.phone_number}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-slate-500 mb-2">Feedback Message</div>
                <div className="bg-slate-50 rounded-lg p-4 text-slate-800 whitespace-pre-wrap border border-slate-100">
                  {selectedFeedback.feedback}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  handleDelete(selectedFeedback.id);
                }}
                className="px-4 py-2 text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 font-medium transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
