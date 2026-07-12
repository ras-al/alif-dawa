import { useState, useEffect } from 'react';
import api from '../api/client';
import type { ClassRecord, Student } from '../types';

const PublicFeedback = () => {
  const [formData, setFormData] = useState({
    student_name: '',
    parent_name: '',
    relationship: '',
    phone_number: '',
    class_name: '',
    feedback: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      api.get('/students', { params: { class_id: selectedClassId, limit: 1000 } })
        .then((res) => setStudents(res.data.data || []))
        .catch(() => setStudents([]));
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await api.post(`/feedback`, formData);
      setStatus('success');
      setFormData({
        student_name: '',
        parent_name: '',
        relationship: '',
        phone_number: '',
        class_name: '',
        feedback: ''
      });
      setSelectedClassId('');
    } catch (err) {
      console.error('Submit feedback error', err);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Parent Feedback</h1>
          <p className="text-slate-500 text-sm">We value your feedback and suggestions</p>
        </div>

        {status === 'success' ? (
          <div className="bg-green-50 text-green-800 rounded-xl p-6 text-center border border-green-200">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
            <p className="text-sm">Your feedback has been successfully submitted.</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
            >
              Submit Another Response
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class *</label>
              <select
                required
                value={selectedClassId}
                onChange={(e) => {
                  const classId = e.target.value;
                  const selectedClass = classes.find((c) => c.id.toString() === classId);
                  setSelectedClassId(classId);
                  setFormData(prev => ({ 
                    ...prev, 
                    class_name: selectedClass ? selectedClass.name : '',
                    student_name: '' // Reset student when class changes
                  }));
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-[#14532D] focus:ring-1 focus:ring-[#14532D] outline-none transition-shadow bg-white"
              >
                <option value="" disabled>Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Student Name *</label>
              <select
                name="student_name"
                required
                disabled={!selectedClassId}
                value={formData.student_name}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-[#14532D] focus:ring-1 focus:ring-[#14532D] outline-none transition-shadow bg-white disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="" disabled>{selectedClassId ? 'Select Student' : 'Select a class first'}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.name}>{s.name} ({s.admission_number})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Parent/Guardian Name *</label>
              <input
                type="text"
                name="parent_name"
                required
                value={formData.parent_name}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-[#14532D] focus:ring-1 focus:ring-[#14532D] outline-none transition-shadow"
                placeholder="Enter your full name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Relationship *</label>
                <input
                  type="text"
                  name="relationship"
                  required
                  value={formData.relationship}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-[#14532D] focus:ring-1 focus:ring-[#14532D] outline-none transition-shadow"
                  placeholder="e.g. Father, Mother, Guardian"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="phone_number"
                  required
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-[#14532D] focus:ring-1 focus:ring-[#14532D] outline-none transition-shadow"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Feedback / Suggestions *</label>
              <textarea
                name="feedback"
                required
                rows={4}
                value={formData.feedback}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-[#14532D] focus:ring-1 focus:ring-[#14532D] outline-none transition-shadow resize-none"
                placeholder="Share your opinion or suggestions..."
              ></textarea>
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-sm text-center">Failed to submit feedback. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-[#14532D] hover:bg-[#0f4023] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'submitting' ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PublicFeedback;
