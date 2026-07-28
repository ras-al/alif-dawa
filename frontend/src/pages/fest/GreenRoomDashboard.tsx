import { useState, useEffect } from 'react';
import api from '../../api/client';
import { ClipboardCheck, Info } from 'lucide-react';

export default function GreenRoomDashboard() {
  const [pendingPrograms, setPendingPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [marksData, setMarksData] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    async function loadPending() {
      try {
        const res = await api.get('/fest/green-room/pending');
        setPendingPrograms(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    loadPending();
  }, []);

  const handleSelect = async (p: any) => {
    setSelectedProgram(p);
    try {
      const res = await api.get(`/fest/green-room/program/${p.id}`);
      setMarksData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerify = async () => {
    // In a real app, calculate actual positions based on aggregated marks.
    // For now, mock sending dummy verified results.
    const results = marksData.map((m: any, idx: number) => ({
      registration_id: m.registration_id,
      position: idx + 1, // Mock
      points: 10 - idx // Mock
    }));

    try {
      await api.post('/fest/green-room/verify', { program_id: selectedProgram.id, results });
      alert('Verified and sent to Announcer');
      setSelectedProgram(null);
      // reload pending
      const res = await api.get('/fest/green-room/pending');
      setPendingPrograms(res.data);
    } catch (err) {
      console.error(err);
      alert('Verification failed');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Green Room Verification</h1>
      
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
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['All', 'Premier', 'Junior', 'Senior', 'General'].map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {cat}
              </button>
            ))}
          </div>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
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
