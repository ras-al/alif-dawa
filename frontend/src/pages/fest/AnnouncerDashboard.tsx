import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Megaphone, Info } from 'lucide-react';

export default function AnnouncerDashboard() {
  const [pending, setPending] = useState([]);
  const [eventType, setEventType] = useState<'MAIN' | 'HIFZ'>('MAIN');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/fest/announcer/pending?event_type=${eventType}`);
        setPending(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [eventType]);

  const handlePublish = async (programId: number) => {
    if (!confirm('Are you sure you want to publish these results to the public immediately?')) return;
    try {
      await api.post('/fest/announcer/publish', { program_id: programId });
      alert('Results Published successfully! Posters are generating...');
      setPending(pending.filter((p: any) => p.id !== programId));
    } catch (err) {
      console.error(err);
      alert('Failed to publish');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Announcer Console</h1>
        <div className="flex gap-2">
          <button onClick={() => setEventType('MAIN')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'MAIN' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>MAIN FEST</button>
          <button onClick={() => setEventType('HIFZ')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'HIFZ' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>HIFZ FEST</button>
        </div>
      </div>

      <div className="mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Info size={20} className="text-blue-600" /> Announcer Instructions
        </h3>
        <ul className="list-disc pl-5 text-sm space-y-1.5 opacity-90">
          <li><strong>Step 1:</strong> Programs that have been verified by the Green Room will appear here.</li>
          <li><strong>Step 2:</strong> When you are ready to make the public announcement on stage, click <strong className="text-rose-700">Publish Now</strong>.</li>
          <li><strong>Step 3:</strong> Publishing immediately updates the Public Fest Page, updates the team leaderboard, and sends out the results.</li>
        </ul>
      </div>

      <div className="grid gap-4">
        {pending.map((p: any) => (
          <div key={p.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{p.title}</h3>
              <p className="text-slate-500 text-sm">{p.category}</p>
            </div>
            <button 
              onClick={() => handlePublish(p.id)}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Megaphone size={18} /> Publish Now
            </button>
          </div>
        ))}
        {pending.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
            No pending results to announce.
          </div>
        )}
      </div>
    </div>
  );
}
