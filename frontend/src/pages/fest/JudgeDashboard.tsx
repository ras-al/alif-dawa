import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api/client';
import { CheckCircle, Info, RefreshCw, Users } from 'lucide-react';

export default function JudgeDashboard() {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [participants, setParticipants] = useState([]);
  const [marks, setMarks] = useState<Record<number, Record<string, string>>>({});
  const [savedMarks, setSavedMarks] = useState<Record<number, Record<string, number>>>({});
  const [programJudges, setProgramJudges] = useState<{ id: number, judge_name: string }[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [eventType, setEventType] = useState<'MAIN' | 'HIFZ'>('MAIN');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPrograms = useCallback(async () => {
    try {
      const res = await api.get(`/fest/judge/programs?event_type=${eventType}`);
      setPrograms(res.data);
      setSelectedProgram((prev: any) => {
        if (!prev) return prev;
        const updated = res.data.find((p: any) => p.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error(err);
    }
  }, [eventType]);

  useEffect(() => {
    loadPrograms();
    const interval = setInterval(loadPrograms, 10000);
    return () => clearInterval(interval);
  }, [loadPrograms, eventType]);

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

  const lockMarks = async () => {
    if (!confirm('Are you sure you want to LOCK all marks for this program? You will not be able to edit them afterwards.')) return;
    try {
      await api.post(`/fest/judge/programs/${selectedProgram.id}/lock`);
      setSelectedProgram({ ...selectedProgram, judging_locked: true });
      alert('Marks successfully locked!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to lock marks');
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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Judge Evaluation Portal</h1>
        <div className="flex gap-2">
          <button onClick={() => setEventType('MAIN')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'MAIN' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>MAIN FEST</button>
          <button onClick={() => setEventType('HIFZ')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'HIFZ' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>HIFZ FEST</button>
        </div>
      </div>

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
            {['All', ...(eventType === 'MAIN' ? ['Premier', 'Junior', 'Senior', 'General'] : ['Stage', 'General Stage', 'Off-Stage', 'General Off-Stage'])].map(cat => (
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
                {p.status === 'judging' && (
                  <span className="inline-block mt-2 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold animate-pulse">● Judging Phase</span>
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
                  onClick={lockMarks}
                  disabled={selectedProgram.judging_locked}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all ${selectedProgram.judging_locked ? 'bg-slate-100 text-slate-400' : 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'}`}
                >
                  {selectedProgram.judging_locked ? 'Locked' : 'Lock Marks'}
                </button>
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
              {(selectedProgram.status === 'scheduled') && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm font-medium text-center">
                  This program has not started yet. You can only submit marks once the stage admin clicks Live.
                </div>
              )}
              {selectedProgram.judging_locked && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-2">
                  Marks for this program have been locked and successfully submitted.
                </div>
              )}
              {programJudges.length === 0 && participants.length > 0 && (
                <p className="text-sm text-amber-600 italic text-center py-4">No judges assigned to this program yet.</p>
              )}
              {participants.length > 0 && programJudges.length > 0 && (
                <div className="overflow-x-auto w-full pb-4">
                  <table className="w-full text-left border-separate border-spacing-y-4 border-spacing-x-2 min-w-[max-content]">
                    <thead>
                      <tr>
                        <th className="px-4 pb-2 text-sm font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-white z-10">Participant</th>
                        {programJudges.map(j => (
                          <th key={j.id} className="px-4 pb-2 text-sm font-bold text-center text-[#14532D] uppercase tracking-wider min-w-[140px]">
                            {j.judge_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p: any) => {
                        const allSaved = programJudges.length > 0 && programJudges.every(j => savedMarks[p.registration_id]?.[j.judge_name] !== undefined);
                        return (
                          <tr key={p.registration_id} className={`transition-colors ${allSaved ? 'bg-emerald-50/50' : 'bg-slate-50'} rounded-2xl shadow-sm border border-slate-100`}>
                            <td className={`px-4 py-3 sticky left-0 z-10 rounded-l-2xl ${allSaved ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#14532D]/10 text-[#14532D] font-bold text-lg rounded-full flex items-center justify-center shrink-0">
                                  {p.code_letter}
                                </div>
                                <span className="font-semibold text-slate-800 whitespace-nowrap">Code {p.code_letter}</span>
                              </div>
                            </td>
                            {programJudges.map(j => {
                              const isSaved = savedMarks[p.registration_id]?.[j.judge_name] !== undefined;
                              return (
                                <td key={j.id} className={`px-4 py-3 ${j.id === programJudges[programJudges.length - 1].id ? 'rounded-r-2xl' : ''}`}>
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="relative">
                                      <input
                                        type="number"
                                        placeholder="Mark"
                                        value={marks[p.registration_id]?.[j.judge_name] || ''}
                                        onChange={(e) => handleMarkChange(p.registration_id, j.judge_name, e.target.value)}
                                        disabled={selectedProgram.status === 'scheduled' || selectedProgram.judging_locked}
                                        className={`w-24 px-4 py-2 text-center border-2 rounded-full text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#14532D]/20 transition-all ${isSaved ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-800 focus:border-[#14532D]'} disabled:opacity-50`}
                                      />
                                    </div>
                                    <button
                                      onClick={() => submitMark(p.registration_id, j.judge_name)}
                                      disabled={!marks[p.registration_id]?.[j.judge_name] || selectedProgram.status === 'scheduled' || selectedProgram.judging_locked}
                                      className={`p-2.5 rounded-xl transition-all shadow-sm flex-shrink-0 ${isSaved ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-[#14532D] text-white hover:bg-[#14532D]/90'} disabled:opacity-40 disabled:shadow-none`}
                                      title={isSaved ? "Update Mark" : "Submit Mark"}
                                    >
                                      <CheckCircle size={20} />
                                    </button>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {participants.length === 0 && (
                <div className="text-center py-12">
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
