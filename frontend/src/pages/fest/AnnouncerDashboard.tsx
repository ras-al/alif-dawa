import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Megaphone, Info, RefreshCw, Undo2 } from 'lucide-react';

export default function AnnouncerDashboard() {
  const [activeTab, setActiveTab] = useState<'pending' | 'published'>('pending');
  const [pending, setPending] = useState<any[]>([]);
  const [published, setPublished] = useState<any[]>([]);
  const [eventType, setEventType] = useState<'MAIN' | 'HIFZ'>('MAIN');

  useEffect(() => {
    async function load() {
      try {
        const [pendRes, pubRes] = await Promise.all([
          api.get(`/fest/announcer/pending?event_type=${eventType}`),
          api.get(`/fest/announcer/published?event_type=${eventType}`)
        ]);
        setPending(pendRes.data);
        setPublished(pubRes.data);
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
      
      // Move from pending to published locally for quick UI update
      const program = pending.find((p: any) => p.id === programId);
      if (program) {
        setPending(pending.filter((p: any) => p.id !== programId));
        setPublished([{ ...program, published_at: new Date().toISOString() }, ...published] as any);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to publish');
    }
  };

  const handleUndoPublish = async (programId: number) => {
    if (!confirm('Are you sure you want to undo this publication? It will be removed from the public page.')) return;
    try {
      await api.post('/fest/announcer/undo-publish', { program_id: programId });
      alert('Publication undone. The result is back to pending.');
      
      const program = published.find((p: any) => p.id === programId);
      if (program) {
        setPublished(published.filter((p: any) => p.id !== programId));
        setPending([program, ...pending] as any);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to undo publication');
    }
  };

  const handleRepublish = async (programId: number) => {
    if (!confirm('Are you sure you want to republish these results? This will regenerate posters.')) return;
    try {
      await api.post('/fest/announcer/publish', { program_id: programId });
      alert('Results Republished successfully! Posters are regenerating...');
    } catch (err) {
      console.error(err);
      alert('Failed to republish');
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

      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Info size={20} className="text-blue-600" /> Announcer Instructions
        </h3>
        <ul className="list-disc pl-5 text-sm space-y-1.5 opacity-90">
          <li><strong>Step 1:</strong> Programs that have been verified by the Green Room will appear here.</li>
          <li><strong>Step 2:</strong> When you are ready to make the public announcement on stage, click <strong className="text-rose-700">Publish Now</strong>.</li>
          <li><strong>Step 3:</strong> Publishing immediately updates the Public Fest Page, updates the team leaderboard, and sends out the results.</li>
        </ul>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'pending' ? 'border-[#14532D] text-[#14532D]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Pending Announcements ({pending.length})
        </button>
        <button 
          onClick={() => setActiveTab('published')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'published' ? 'border-[#14532D] text-[#14532D]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Published Results ({published.length})
        </button>
      </div>

      <div className="grid gap-4">
        {activeTab === 'pending' && pending.map((p: any) => (
          <div key={p.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Event #{p.id} - {p.title}</h3>
              <p className="text-slate-500 text-sm mb-3">{p.category}</p>
              {p.winners && p.winners.map((w: any, index: number) => (
                <div key={`${w.position}-${index}`} className="text-sm border-l-2 border-[#14532D] pl-2 mb-1">
                  {index === 0 && <strong>1st Place: </strong>}
                  {index === 1 && <strong>2nd Place: </strong>}
                  {index === 2 && <strong>3rd Place: </strong>}
                  {w.code_letter ? `[Code ${w.code_letter}] ` : ''}{w.student_name} <span className="text-slate-400">({w.team_name} - {w.points} pts{w.grade ? ` - Grade: ${w.grade}` : ''})</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => handlePublish(p.id)}
              className="w-full sm:w-auto px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Megaphone size={18} /> Publish Now
            </button>
          </div>
        ))}
        {activeTab === 'pending' && pending.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
            No pending results to announce.
          </div>
        )}

        {activeTab === 'published' && published.map((p: any) => (
          <div key={p.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Event #{p.id} - {p.title}</h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">Published</span>
              </div>
              <p className="text-slate-500 text-sm">{p.category}</p>
            </div>
            <div className="flex w-full sm:w-auto gap-2">
              <button 
                onClick={() => handleUndoPublish(p.id)}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Undo2 size={16} /> Undo
              </button>
              <button 
                onClick={() => handleRepublish(p.id)}
                className="flex-1 sm:flex-none px-4 py-2 bg-[#14532D]/10 hover:bg-[#14532D]/20 text-[#14532D] rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <RefreshCw size={16} /> Republish
              </button>
            </div>
          </div>
        ))}
        {activeTab === 'published' && published.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
            No published results found.
          </div>
        )}
      </div>
    </div>
  );
}
