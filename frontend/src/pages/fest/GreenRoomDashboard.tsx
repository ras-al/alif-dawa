import { useState, useEffect } from 'react';
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

    // Calculate Grade Points
    const getGradePoints = (avg: number, category: string) => {
      const isGeneral = category === 'General';
      if (avg >= 90) return isGeneral ? 15 : 5; // A+
      if (avg >= 70) return isGeneral ? 13 : 3; // A
      if (avg >= 60) return isGeneral ? 11 : 2; // B
      if (avg >= 50) return isGeneral ? 9 : 1;  // C
      return 0;
    };

    // Calculate Position Points
    const getPositionPoints = (position: number) => {
      if (position === 1) return 3;
      if (position === 2) return 2;
      if (position === 3) return 1;
      return 0;
    };

    const results = sortedRegistrations.map((s, idx) => {
      const position = idx + 1;
      const gradePoints = getGradePoints(s.avg, selectedProgram.category);
      const positionPoints = getPositionPoints(position);
      const totalPoints = gradePoints + positionPoints;

      return {
        registration_id: s.registration_id,
        position: position,
        points: totalPoints
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
                    <td className="px-4 py-3 font-medium">{p.title}</td>
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
             <h2 className="text-xl font-bold mb-4">{selectedProgram.title} - Raw Marks</h2>
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
             <button onClick={handleVerify} className="px-6 py-2 bg-[#14532D] text-white rounded-md font-medium hover:bg-[#14532D]/90 flex items-center gap-2">
               <ClipboardCheck size={18} /> Approve & Forward to Announcer
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
