import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api/client';
import { CheckCircle, Info, RefreshCw, Users } from 'lucide-react';

export default function JudgeDashboard() {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [participants, setParticipants] = useState([]);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [savedMarks, setSavedMarks] = useState<Record<number, number>>({});
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
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

  const fetchParticipants = useCallback(async (programId: number) => {
    try {
      const [partRes, marksRes] = await Promise.all([
        api.get(`/fest/judge/programs/${programId}/participants`),
        api.get(`/fest/judge/programs/${programId}/my-marks`).catch(() => ({ data: {} }))
      ]);
      setParticipants(partRes.data);
      setSavedMarks(marksRes.data || {});
      // Pre-fill marks from saved marks
      const prefilled: Record<number, string> = {};
      partRes.data.forEach((p: any) => {
        if (marksRes.data?.[p.registration_id] !== undefined) {
          prefilled[p.registration_id] = String(marksRes.data[p.registration_id]);
        }
      });
      setMarks(prev => ({ ...prefilled, ...prev }));
      setLastRefreshed(new Date());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleSelect = async (p: any) => {
    setSelectedProgram(p);
    setMarks({});
    await fetchParticipants(p.id);
  };

  // Auto-refresh polling every 10 seconds when a program is selected
  useEffect(() => {
    if (selectedProgram) {
      pollRef.current = setInterval(() => {
        fetchParticipants(selectedProgram.id);
      }, 10000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedProgram, fetchParticipants]);

  const handleMarkChange = (regId: number, val: string) => {
    setMarks({ ...marks, [regId]: val });
  };

  const submitMark = async (regId: number) => {
    try {
      await api.post('/fest/judge/mark', { registration_id: regId, mark: marks[regId] });
      setSavedMarks(prev => ({ ...prev, [regId]: parseFloat(marks[regId]) }));
      // Brief success flash instead of alert
    } catch (err) {
      console.error(err);
      alert('Failed to submit mark');
    }
  };

  const handleBack = () => {
    setSelectedProgram(null);
    setParticipants([]);
    setMarks({});
    setSavedMarks({});
    if (pollRef.current) clearInterval(pollRef.current);
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
          <li><strong>Auto-Refresh:</strong> New participants will appear automatically every 10 seconds as they report to the stage.</li>
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
              <p className="text-sm text-slate-500">
                {p.category} • {p.type}
                {p.is_group && <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase"><Users size={10} /> Group</span>}
              </p>
              {p.status === 'live' && (
                <span className="inline-block mt-2 px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-bold animate-pulse">● Live Now</span>
              )}
            </div>
          ))}
          {(programs as any[]).filter(p => categoryFilter === 'All' || p.category === categoryFilter).length === 0 && <p className="text-slate-500 col-span-2">No programs{categoryFilter !== 'All' ? ` in ${categoryFilter} category` : ''} assigned to you.</p>}
          </div>
        </div>
      ) : (
        <div>
          <button onClick={handleBack} className="text-sm text-slate-500 hover:text-slate-900 mb-4 flex items-center gap-1">
            ← Back to Programs
          </button>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-bold text-slate-900">{selectedProgram.title}</h2>
                <p className="text-sm text-slate-500">Only Code Letters are visible for fair evaluation.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                  {participants.length} Participant{participants.length !== 1 ? 's' : ''} Ready
                </span>
                <button 
                  onClick={() => fetchParticipants(selectedProgram.id)}
                  className="p-2 text-slate-400 hover:text-[#14532D] hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Refresh participants"
                >
                  <RefreshCw size={16} />
                </button>
                {lastRefreshed && (
                  <span className="text-[10px] text-slate-400">
                    Updated {lastRefreshed.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 space-y-4">
              {participants.map((p: any) => {
                const isSaved = savedMarks[p.registration_id] !== undefined;
                return (
                  <div key={p.registration_id} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${isSaved ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#14532D]/10 text-[#14532D] font-bold text-xl rounded-lg flex items-center justify-center">
                        {p.code_letter}
                      </div>
                      {isSaved && (
                        <span className="text-xs text-emerald-600 font-medium">✓ Saved ({savedMarks[p.registration_id]})</span>
                      )}
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
                        disabled={!marks[p.registration_id]}
                        className="p-2 bg-[#14532D] text-white rounded-md hover:bg-[#14532D]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                      >
                        <CheckCircle size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {participants.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500 font-medium">No participants have picked their codes yet.</p>
                  <p className="text-xs text-slate-400 mt-1">This list auto-refreshes every 10 seconds.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
