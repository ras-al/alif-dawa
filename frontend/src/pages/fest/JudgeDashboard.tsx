import { useState, useEffect } from 'react';
import api from '../../api/client';
import { CheckCircle, Info } from 'lucide-react';

export default function JudgeDashboard() {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [participants, setParticipants] = useState([]);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  useEffect(() => {
    async function fetchPrograms() {
      try {
        const res = await api.get('/fest/judge/programs');
        setPrograms(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchPrograms();
  }, []);

  const handleSelect = async (p: any) => {
    setSelectedProgram(p);
    try {
      const res = await api.get(`/fest/judge/programs/${p.id}/participants`);
      setParticipants(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkChange = (regId: number, val: string) => {
    setMarks({ ...marks, [regId]: val });
  };

  const submitMark = async (regId: number) => {
    try {
      await api.post('/fest/judge/mark', { registration_id: regId, mark: marks[regId] });
      alert('Mark submitted successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to submit mark');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Judge Evaluation Portal</h1>

      <div className="mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Info size={20} className="text-blue-600" /> Judge Instructions
        </h3>
        <ul className="list-disc pl-5 text-sm space-y-1.5 opacity-90">
          <li><strong>Step 1:</strong> Select a program from the list below.</li>
          <li><strong>Step 2:</strong> Evaluate the participants based on their <strong>Code Letters</strong>. (Participant names and chests are hidden for fairness).</li>
          <li><strong>Step 3:</strong> Enter the marks for each code letter and click the checkmark to submit.</li>
        </ul>
      </div>

      {!selectedProgram ? (
        <div>
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['All', 'Premier', 'Junior', 'Senior', 'General'].map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
          {(programs as any[]).filter(p => categoryFilter === 'All' || p.category === categoryFilter).map((p: any) => (
            <div key={p.id} onClick={() => handleSelect(p)} className="bg-white p-6 rounded-xl border border-slate-200 cursor-pointer hover:border-[#14532D] hover:shadow-md transition-all">
              <h3 className="font-bold text-lg text-slate-900 mb-1">{p.title}</h3>
              <p className="text-sm text-slate-500">{p.category} • {p.type}</p>
            </div>
          ))}
          {(programs as any[]).filter(p => categoryFilter === 'All' || p.category === categoryFilter).length === 0 && <p className="text-slate-500 col-span-2">No programs{categoryFilter !== 'All' ? ` in ${categoryFilter} category` : ''} assigned to you.</p>}
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => setSelectedProgram(null)} className="text-sm text-slate-500 hover:text-slate-900 mb-4 flex items-center gap-1">
            ← Back to Programs
          </button>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="font-bold text-slate-900">{selectedProgram.title}</h2>
              <p className="text-sm text-slate-500">Only Code Letters are visible for fair evaluation.</p>
            </div>
            <div className="p-4 space-y-4">
              {participants.map((p: any) => (
                <div key={p.registration_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#14532D]/10 text-[#14532D] font-bold text-xl rounded-lg flex items-center justify-center">
                      {p.code_letter}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="Marks" 
                      value={marks[p.registration_id] || ''}
                      onChange={(e) => handleMarkChange(p.registration_id, e.target.value)}
                      className="w-20 sm:w-24 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D]"
                    />
                    <button 
                      onClick={() => submitMark(p.registration_id)}
                      className="p-2 bg-[#14532D] text-white rounded-md hover:bg-[#14532D]/90"
                    >
                      <CheckCircle size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {participants.length === 0 && <p className="text-center text-slate-500 py-4">No participants have picked their codes yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
