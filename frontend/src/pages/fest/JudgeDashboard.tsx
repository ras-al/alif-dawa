import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api/client';
import { CheckCircle, Info, RefreshCw, Users } from 'lucide-react';

export default function JudgeDashboard() {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [participants, setParticipants] = useState([]);
  const [marks, setMarks] = useState<Record<number, Record<string, string>>>({});
  const [savedMarks, setSavedMarks] = useState<Record<number, Record<string, number>>>({});
  const [programJudges, setProgramJudges] = useState<{id: number, judge_name: string}[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const loadPrograms = useCallback(async () => {
    try {
      const res = await api.get('/fest/judge/programs');
      setPrograms(res.data);
      setSelectedProgram((prev: any) => {
        if (!prev) return prev;
        const updated = res.data.find((p: any) => p.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
    const interval = setInterval(loadPrograms, 10000);
    return () => clearInterval(interval);
  }, [loadPrograms]);

  const fetchParticipants = useCallback(async (programId: number) => {
    try {
      const [partRes, marksRes, judgesRes] = await Promise.all([
        api.get(`/fest/judge/programs/${programId}/participants`),
        api.get(`/fest/judge/programs/${programId}/my-marks`).catch(() => ({ data: {} })),
        api.get(`/fest/judge/programs/${programId}/judges`).catch(() => ({ data: [] }))
      ]);
      setParticipants(partRes.data);
      setProgramJudges(judgesRes.data);
      setSavedMarks(marksRes.data || {});
      
      const prefilled: Record<number, Record<string, string>> = {};
      partRes.data.forEach((p: any) => {
        if (marksRes.data?.[p.registration_id]) {
          prefilled[p.registration_id] = {};
          for (const [judgeName, mark] of Object.entries(marksRes.data[p.registration_id])) {
            prefilled[p.registration_id][judgeName] = String(mark);
          }
        }
      });
      setMarks(prev => {
        const merged = { ...prev };
        for (const [regId, judgeMarks] of Object.entries(prefilled)) {
          merged[Number(regId)] = { ...(merged[Number(regId)] || {}), ...judgeMarks };
        }
        return merged;
      });
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

  const handleMarkChange = (regId: number, judgeName: string, val: string) => {
    setMarks(prev => ({
      ...prev,
      [regId]: {
        ...(prev[regId] || {}),
        [judgeName]: val
      }
    }));
  };

  const submitMark = async (regId: number, judgeName: string) => {
    try {
      await api.post('/fest/judge/mark', { registration_id: regId, judge_name: judgeName, mark: marks[regId][judgeName] });
      setSavedMarks(prev => ({
        ...prev,
        [regId]: {
          ...(prev[regId] || {}),
          [judgeName]: parseFloat(marks[regId][judgeName])
        }
      }));
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
              {selectedProgram.status !== 'live' && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm font-medium text-center">
                  This program is not currently live. You can only submit marks while the program is active.
                </div>
              )}
              {participants.map((p: any) => {
                const allSaved = programJudges.length > 0 && programJudges.every(j => savedMarks[p.registration_id]?.[j.judge_name] !== undefined);
                
                return (
                  <div key={p.registration_id} className={`p-4 rounded-lg border transition-all ${allSaved ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-[#14532D]/10 text-[#14532D] font-bold text-xl rounded-lg flex items-center justify-center">
                        {p.code_letter}
                      </div>
                      <div className="font-semibold text-slate-800">Code {p.code_letter}</div>
                      {allSaved && (
                        <span className="text-xs text-emerald-600 font-bold ml-auto px-2 py-1 bg-emerald-100 rounded">✓ All Marks Saved</span>
                      )}
                    </div>
                    
                    {programJudges.length === 0 ? (
                      <p className="text-sm text-amber-600 italic">No judges assigned to this program.</p>
                    ) : (
                      <div className="space-y-3 pl-2 sm:pl-16">
                        {programJudges.map(j => {
                          const isSaved = savedMarks[p.registration_id]?.[j.judge_name] !== undefined;
                          return (
                            <div key={j.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-slate-100">
                              <div className="text-sm font-medium text-slate-700 flex-1 truncate pr-2">
                                {j.judge_name}
                                {isSaved && <span className="ml-2 text-[10px] text-emerald-600 font-bold">✓ {savedMarks[p.registration_id][j.judge_name]}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  placeholder="Mark" 
                                  value={marks[p.registration_id]?.[j.judge_name] || ''}
                                  onChange={(e) => handleMarkChange(p.registration_id, j.judge_name, e.target.value)}
                                  disabled={selectedProgram.status !== 'live'}
                                  className="w-20 px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] disabled:opacity-50 disabled:bg-slate-100"
                                />
                                <button 
                                  onClick={() => submitMark(p.registration_id, j.judge_name)}
                                  disabled={!marks[p.registration_id]?.[j.judge_name] || selectedProgram.status !== 'live'}
                                  className="p-1.5 bg-[#14532D] text-white rounded hover:bg-[#14532D]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                                  title="Submit Mark"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
