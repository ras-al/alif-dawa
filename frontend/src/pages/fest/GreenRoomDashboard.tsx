import { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { ClipboardCheck, Info } from 'lucide-react';

export default function GreenRoomDashboard() {
  const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');
  const [verifiedPrograms, setVerifiedPrograms] = useState([]);
  const [pendingPrograms, setPendingPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [marksData, setMarksData] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [eventType, setEventType] = useState<'MAIN' | 'HIFZ'>('MAIN');

  useEffect(() => {
    async function loadPrograms() {
      try {
        const [pendRes, verRes] = await Promise.all([
          api.get(`/fest/green-room/pending?event_type=${eventType}`),
          api.get(`/fest/green-room/verified?event_type=${eventType}`)
        ]);
        setPendingPrograms(pendRes.data);
        setVerifiedPrograms(verRes.data);
      } catch (err) {
        console.error(err);
      }
    }
    loadPrograms();
    const interval = setInterval(loadPrograms, 15000);
    return () => clearInterval(interval);
  }, [eventType]);

  const loadMarks = async (programId: number) => {
    try {
      const res = await api.get(`/fest/green-room/program/${programId}`);
      setMarksData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedProgram) {
      const interval = setInterval(() => {
        loadMarks(selectedProgram.id);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedProgram]);

  const handleSelect = async (p: any) => {
    setSelectedProgram(p);
    await loadMarks(p.id);
  };

  const handleVerify = async () => {
    // Calculate actual positions based on aggregated (average) marks from all judges.
    const aggregated: Record<number, { registration_id: number; totalMark: number; count: number; avg: number }> = {};
    marksData.forEach((m: any) => {
      if (!m.mark) return;
      const regId = m.registration_id;
      if (!aggregated[regId]) {
        aggregated[regId] = { registration_id: regId, totalMark: 0, count: 0, avg: 0 };
      }
      aggregated[regId].totalMark += parseFloat(m.mark) || 0;
      aggregated[regId].count += 1;
    });

    const sortedRegistrations = Object.values(aggregated).map(a => ({
      ...a,
      avg: a.totalMark / a.count
    })).sort((a, b) => b.avg - a.avg);

    // Calculate Grade Points:
    // Individual Competitions: A+=5, A=3, B=2, C=1
    // Group Competitions: A+=15, A=13, B=11, C=9
    const getGradePoints = (avg: number, isGroup: boolean) => {
      if (avg >= 90) return isGroup ? 15 : 5; // A+
      if (avg >= 70) return isGroup ? 13 : 3; // A
      if (avg >= 60) return isGroup ? 11 : 2; // B
      if (avg >= 50) return isGroup ? 9 : 1;  // C
      return 0;
    };

    // Calculate Position Points: 1st: 3, 2nd: 2, 3rd: 1
    const getPositionPoints = (position: number) => {
      if (position === 1) return 3;
      if (position === 2) return 2;
      if (position === 3) return 1;
      return 0;
    };

    // Calculate Grade String
    const getGradeString = (avg: number) => {
      if (avg >= 90) return 'A+';
      if (avg >= 70) return 'A';
      if (avg >= 60) return 'B';
      if (avg >= 50) return 'C';
      return 'No Grade';
    };

    let currentRank = 1;
    const results = sortedRegistrations.map((s, idx) => {
      if (idx > 0 && s.avg < sortedRegistrations[idx - 1].avg) {
        currentRank = idx + 1;
      }
      const position = currentRank;
      const gradePoints = getGradePoints(s.avg, Boolean(selectedProgram?.is_group));
      const positionPoints = getPositionPoints(position);
      const totalPoints = gradePoints + positionPoints;
      const grade = getGradeString(s.avg);

      return {
        registration_id: s.registration_id,
        position: position,
        points: totalPoints,
        grade: grade
      };
    });

    try {
      await api.post('/fest/green-room/verify', { program_id: selectedProgram.id, results });
      alert('Verified and sent to Announcer');
      setSelectedProgram(null);
      // reload
      const [pendRes, verRes] = await Promise.all([
        api.get(`/fest/green-room/pending?event_type=${eventType}`),
        api.get(`/fest/green-room/verified?event_type=${eventType}`)
      ]);
      setPendingPrograms(pendRes.data);
      setVerifiedPrograms(verRes.data);
    } catch (err) {
      console.error(err);
      alert('Verification failed');
    }
  };

  const handleUndoVerify = async (programId: number) => {
    if (!confirm('Are you sure you want to undo the approval? This will delete the results and move it back to pending.')) return;
    try {
      await api.post(`/fest/green-room/programs/${programId}/undo-verify`);
      alert('Verification undone successfully!');
      // reload
      const [pendRes, verRes] = await Promise.all([
        api.get(`/fest/green-room/pending?event_type=${eventType}`),
        api.get(`/fest/green-room/verified?event_type=${eventType}`)
      ]);
      setPendingPrograms(pendRes.data);
      setVerifiedPrograms(verRes.data);
    } catch (err) {
      console.error(err);
      alert('Failed to undo verification');
    }
  };

  const previewResults = useMemo(() => {
    if (!selectedProgram || !marksData.length) return [];
    const aggregated: Record<number, { registration_id: number; code_letter: string; chest_number: string; team_name: string; totalMark: number; count: number; avg: number }> = {};
    marksData.forEach((m: any) => {
      if (!m.mark) return;
      const regId = m.registration_id;
      if (!aggregated[regId]) {
        aggregated[regId] = {
          registration_id: regId,
          code_letter: m.code_letter,
          chest_number: m.chest_number,
          team_name: m.team_name,
          totalMark: 0,
          count: 0,
          avg: 0
        };
      }
      aggregated[regId].totalMark += parseFloat(m.mark) || 0;
      aggregated[regId].count += 1;
    });

    const isGroup = Boolean(selectedProgram?.is_group);
    const sorted = Object.values(aggregated).map(a => ({
      ...a,
      avg: a.totalMark / a.count
    })).sort((a, b) => b.avg - a.avg);

    let currentRank = 1;
    return sorted.map((s, idx) => {
      if (idx > 0 && s.avg < sorted[idx - 1].avg) {
        currentRank = idx + 1;
      }
      const position = currentRank;
      let grade = 'No Grade';
      let gradePoints = 0;
      if (s.avg >= 90) { grade = 'A+'; gradePoints = isGroup ? 15 : 5; }
      else if (s.avg >= 70) { grade = 'A'; gradePoints = isGroup ? 13 : 3; }
      else if (s.avg >= 60) { grade = 'B'; gradePoints = isGroup ? 11 : 2; }
      else if (s.avg >= 50) { grade = 'C'; gradePoints = isGroup ? 9 : 1; }
      else { grade = 'No Grade'; gradePoints = 0; }

      const posPoints = position === 1 ? 3 : position === 2 ? 2 : position === 3 ? 1 : 0;
      return {
        ...s,
        position,
        grade,
        gradePoints,
        posPoints,
        totalPoints: gradePoints + posPoints
      };
    });
  }, [selectedProgram, marksData]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Green Room Verification</h1>
        <div className="flex gap-2">
          <button onClick={() => setEventType('MAIN')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'MAIN' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>MAIN FEST</button>
          <button onClick={() => setEventType('HIFZ')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'HIFZ' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>HIFZ FEST</button>
        </div>
      </div>
      
      <div className="mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Info size={20} className="text-blue-600" /> Green Room Instructions
        </h3>
        <ul className="list-disc pl-5 text-sm space-y-1.5 opacity-90">
          <li><strong>Step 1:</strong> Programs that have been evaluated by judges will appear here.</li>
          <li><strong>Step 2:</strong> Click <strong>Review Marks</strong> to see the raw marks mapped back to the real participant's chest numbers and names.</li>
          <li><strong>Step 3:</strong> Verify the calculations. Once approved, click <strong>Approve & Forward to Announcer</strong>. This calculates positions and points automatically.</li>
        </ul>
      </div>
      
      {!selectedProgram ? (
        <div>
          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'pending' ? 'border-[#14532D] text-[#14532D]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Pending Verification ({pendingPrograms.length})
            </button>
            <button 
              onClick={() => setActiveTab('verified')}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'verified' ? 'border-[#14532D] text-[#14532D]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Approved Results ({verifiedPrograms.length})
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['All', ...(eventType === 'MAIN' ? ['Premier', 'Junior', 'Senior', 'General'] : ['Stage', 'General Stage', 'Off-Stage', 'General Off-Stage'])].map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {cat}
              </button>
            ))}
          </div>
          
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
          {activeTab === 'pending' ? (
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Program</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {(pendingPrograms as any[]).filter(p => categoryFilter === 'All' || p.category === categoryFilter).map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3 text-slate-500">{p.category}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleSelect(p)} className="text-[#14532D] hover:underline font-medium">
                        Review Marks
                      </button>
                    </td>
                  </tr>
                ))}
                {(pendingPrograms as any[]).filter(p => categoryFilter === 'All' || p.category === categoryFilter).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">No programs{categoryFilter !== 'All' ? ` in ${categoryFilter}` : ''} pending verification.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Program</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {(verifiedPrograms as any[]).filter(p => categoryFilter === 'All' || p.category === categoryFilter).map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {p.sequence_number && <span className="text-xs font-bold text-white bg-[#14532D] px-1.5 py-0.5 rounded mr-2">#{String(p.sequence_number).padStart(3, '0')}</span>}
                      {p.title}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.category}</td>
                    <td className="px-4 py-3">
                      {p.published_at ? (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-semibold">Published</span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-semibold">Awaiting Announcer</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleUndoVerify(p.id)} className="text-rose-600 hover:underline font-medium text-xs">
                        Undo Approval
                      </button>
                    </td>
                  </tr>
                ))}
                {(verifiedPrograms as any[]).filter(p => categoryFilter === 'All' || p.category === categoryFilter).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">No verified programs{categoryFilter !== 'All' ? ` in ${categoryFilter}` : ''}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        </div>
      ) : (
        <div>
           <button onClick={() => setSelectedProgram(null)} className="text-sm text-slate-500 hover:text-slate-900 mb-4">← Back</button>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedProgram.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">{selectedProgram.category}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                      selectedProgram.is_group 
                        ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                        : 'bg-emerald-100 text-[#14532D] border border-emerald-300'
                    }`}>
                      {selectedProgram.is_group
                        ? '👥 Group Competition (A+=15, A=13, B=11, C=9)'
                        : '👤 Individual Competition (A+=5, A=3, B=2, C=1)'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">+ Pos Pts: 1st=3, 2nd=2, 3rd=1</span>
                  </div>
                </div>
                <button onClick={handleVerify} className="px-6 py-2.5 bg-[#14532D] text-white rounded-lg font-bold hover:bg-[#14532D]/90 flex items-center gap-2 shadow-sm cursor-pointer self-start sm:self-auto transition-all">
                  <ClipboardCheck size={18} /> Approve & Forward to Announcer
                </button>
              </div>

              {/* Calculated Results Preview Table */}
              {previewResults.length > 0 && (
                <div className="mb-6 border border-emerald-200 bg-emerald-50/50 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-[#14532D] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                    Calculated Results Preview (Positions & Points)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-emerald-200 text-slate-600">
                          <th className="pb-2 font-bold">Pos</th>
                          <th className="pb-2 font-bold">Code</th>
                          <th className="pb-2 font-bold">Chest / Team</th>
                          <th className="pb-2 font-bold text-center">Avg Mark</th>
                          <th className="pb-2 font-bold text-center">Grade</th>
                          <th className="pb-2 font-bold text-center">Grade Pts</th>
                          <th className="pb-2 font-bold text-center">Pos Pts</th>
                          <th className="pb-2 font-bold text-right">Total Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100">
                        {previewResults.map((r: any) => (
                          <tr key={r.registration_id} className={r.position <= 3 ? 'font-semibold' : 'text-slate-600'}>
                            <td className="py-2.5">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                r.position === 1 ? 'bg-[#7A0C1E] text-white' :
                                r.position === 2 ? 'bg-slate-300 text-slate-800' :
                                r.position === 3 ? 'bg-amber-600 text-white' : 'text-slate-400'
                              }`}>
                                #{r.position}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono font-bold text-slate-800">{r.code_letter}</td>
                            <td className="py-2.5">
                              <span className="text-slate-900 font-bold">{r.chest_number}</span>
                              <span className="text-slate-500 ml-1.5 font-normal">({r.team_name})</span>
                            </td>
                            <td className="py-2.5 text-center font-mono font-bold">{r.avg.toFixed(2)}</td>
                            <td className="py-2.5 text-center">
                              {r.grade && r.grade !== 'No Grade' ? (
                                <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                  r.grade === 'A+' ? 'bg-emerald-600 text-white' :
                                  r.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                  r.grade === 'B' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {r.grade}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold text-[11px] border border-slate-200">
                                  No Grade
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-center text-slate-600">{r.gradePoints} pts</td>
                            <td className="py-2.5 text-center text-slate-600">+{r.posPoints} pts</td>
                            <td className="py-2.5 text-right font-bold text-[#14532D] text-sm">
                              {r.totalPoints} PTS
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Raw Judge Marks</h3>
              <div className="space-y-2 mb-6">
                {marksData.map((m: any, i) => (
                  <div key={i} className="flex justify-between p-3 bg-slate-50 rounded border border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-900">Code {m.code_letter}</span>
                      <span className="text-slate-500 text-xs ml-2">Chest: {m.chest_number} | {m.team_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-slate-500 mr-4">Judge: {m.judge_name}</span>
                      <span className="font-bold text-[#14532D]">{m.mark}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleVerify} className="px-6 py-2.5 bg-[#14532D] text-white rounded-lg font-bold hover:bg-[#14532D]/90 flex items-center gap-2 shadow-sm cursor-pointer">
                <ClipboardCheck size={18} /> Approve & Forward to Announcer
              </button>
            </div>
        </div>
      )}
    </div>
  );
}
