import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Video, Info } from 'lucide-react';

export default function MediaDashboard() {
  const [results, setResults] = useState<any[]>([]);
  const [eventType, setEventType] = useState<'MAIN' | 'HIFZ'>('MAIN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/fest/media/approved?event_type=${eventType}`);
        setResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [eventType]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Video className="text-[#14532D]" /> Media Console
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setEventType('MAIN')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'MAIN' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>MAIN FEST</button>
          <button onClick={() => setEventType('HIFZ')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'HIFZ' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>HIFZ FEST</button>
        </div>
      </div>

      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Info size={20} className="text-blue-600" /> Media Instructions
        </h3>
        <ul className="list-disc pl-5 text-sm space-y-1.5 opacity-90">
          <li><strong>Step 1:</strong> All results approved from the Green Room appear here instantly.</li>
          <li><strong>Step 2:</strong> Use the <strong>Sequence Number (Seq #)</strong> to organize your video cuts.</li>
          <li><strong>Note:</strong> This dashboard is read-only. Publishing is handled by the Announcer.</li>
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-6 py-4 font-semibold w-24">Seq #</th>
              <th className="px-6 py-4 font-semibold">Program</th>
              <th className="px-6 py-4 font-semibold">Winners</th>
              <th className="px-6 py-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && results.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
            ) : results.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No approved results found.</td></tr>
            ) : (
              results.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-lg text-[#14532D]">
                    {r.result_sequence_number ? String(r.result_sequence_number).padStart(3, '0') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 text-base">{r.title}</div>
                    <div className="text-slate-500 text-xs mt-1">{r.category} | Event #{r.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {r.winners && r.winners.map((w: any, index: number) => (
                        <div key={index} className="text-sm">
                          <span className="font-semibold text-slate-700 w-6 inline-block">{w.position}.</span>
                          <span className="font-medium text-slate-900">{w.student_name}</span>
                          <span className="text-slate-500 text-xs ml-2">({w.team_name} - {w.points} pts)</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {r.published_at ? (
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">Published</span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">Pending Announce</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
