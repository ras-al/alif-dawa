import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Gift, Info, CheckCircle2, Circle } from 'lucide-react';

export default function AwardPointDashboard() {
  const [results, setResults] = useState<any[]>([]);
  const [eventType, setEventType] = useState<'MAIN' | 'HIFZ'>('MAIN');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await api.get(`/fest/award-point/published?event_type=${eventType}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [eventType]);

  const handleToggleAward = async (resultId: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    if (!newStatus) {
      if (!confirm('Are you sure you want to mark this as NOT awarded?')) return;
    }
    
    try {
      // Optimistic update
      setResults(results.map(r => r.result_id === resultId ? { ...r, is_awarded: newStatus } : r));
      await api.post('/fest/award-point/mark-awarded', { result_id: resultId, is_awarded: newStatus });
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
      // Revert on error
      load();
    }
  };

  // Group by program
  const groupedResults = results.reduce((acc: any, curr: any) => {
    if (!acc[curr.program_id]) {
      acc[curr.program_id] = {
        program_id: curr.program_id,
        title: curr.title,
        category: curr.category,
        result_sequence_number: curr.result_sequence_number,
        winners: []
      };
    }
    acc[curr.program_id].winners.push(curr);
    return acc;
  }, {});

  const groupedArray = Object.values(groupedResults);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Gift className="text-[#14532D]" /> Award Point
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setEventType('MAIN')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'MAIN' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>MAIN FEST</button>
          <button onClick={() => setEventType('HIFZ')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'HIFZ' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>HIFZ FEST</button>
        </div>
      </div>

      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Info size={20} className="text-blue-600" /> Award Distribution Instructions
        </h3>
        <ul className="list-disc pl-5 text-sm space-y-1.5 opacity-90">
          <li><strong>Step 1:</strong> Identify the student and the program they won. Published results will appear here.</li>
          <li><strong>Step 2:</strong> Give the prize to the respective student.</li>
          <li><strong>Step 3:</strong> Click the <strong>Mark as Awarded</strong> button to prevent double distribution.</li>
        </ul>
      </div>

      <div className="space-y-4">
        {loading && groupedArray.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : groupedArray.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
            No published results found.
          </div>
        ) : (
          groupedArray.map((group: any) => (
            <div key={group.program_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    <span className="text-[#14532D] mr-2">
                      Seq #{group.result_sequence_number ? String(group.result_sequence_number).padStart(3, '0') : '-'}
                    </span>
                    | {group.title}
                  </h3>
                  <div className="text-sm text-slate-500 mt-1">{group.category}</div>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {group.winners.map((winner: any) => (
                  <div key={winner.result_id} className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${winner.is_awarded ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-slate-500">{winner.position}.</span>
                        {winner.student_name}
                      </div>
                      <div className="text-sm text-slate-500 ml-5 mt-1">
                        Team: {winner.team_name}
                      </div>
                    </div>
                    <div>
                      <button 
                        onClick={() => handleToggleAward(winner.result_id, winner.is_awarded)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          winner.is_awarded 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200' 
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 shadow-sm'
                        }`}
                      >
                        {winner.is_awarded ? (
                          <>
                            <CheckCircle2 size={18} className="text-emerald-600" />
                            Awarded
                          </>
                        ) : (
                          <>
                            <Circle size={18} className="text-slate-400" />
                            Mark as Awarded
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
