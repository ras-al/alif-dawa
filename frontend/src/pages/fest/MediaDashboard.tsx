import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Film, Info, Search, X } from 'lucide-react';

interface Winner {
  position: number;
  points: number;
  student_name: string;
  team_name: string;
  grade: string;
  chest_number: string;
}

interface MediaResult {
  id: number;
  title: string;
  category: string;
  sequence_number: number | null;
  is_published: boolean;
  winners: Winner[] | null;
}

export default function MediaDashboard() {
  const [results, setResults] = useState<MediaResult[]>([]);
  const [eventType, setEventType] = useState<'MAIN' | 'HIFZ'>('MAIN');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/fest/media/results?event_type=${eventType}`);
        setResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [eventType]);

  const categories = eventType === 'MAIN'
    ? ['All', 'Premier', 'Junior', 'Senior', 'General']
    : ['All', 'Stage', 'General Stage', 'Off-Stage', 'General Off-Stage'];

  const filtered = results.filter(r => {
    const catMatch = categoryFilter === 'All' || r.category === categoryFilter;
    const searchMatch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.winners?.some(w => w.student_name?.toLowerCase().includes(search.toLowerCase()) || w.team_name?.toLowerCase().includes(search.toLowerCase()));
    return catMatch && searchMatch;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Film className="text-[#14532D]" size={28} /> Media Console
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setEventType('MAIN')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'MAIN' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>MAIN FEST</button>
          <button onClick={() => setEventType('HIFZ')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${eventType === 'HIFZ' ? 'bg-[#14532D] text-white border-[#14532D]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'}`}>HIFZ FEST</button>
        </div>
      </div>

      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 text-blue-900 shadow-sm">
        <h3 className="font-bold text-base mb-2 flex items-center gap-2">
          <Info size={18} className="text-blue-600" /> Media Instructions
        </h3>
        <ul className="list-disc pl-5 text-sm space-y-1 opacity-90">
          <li>Results approved by the Green Room appear here automatically.</li>
          <li>Use this data for <strong>video-cut creation</strong> and media preparation.</li>
          <li>Results are sorted by sequence number (approval order).</li>
          <li>This is a <strong>read-only</strong> view — publishing is done by the Announcer.</li>
        </ul>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search programs or winners..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-xs text-slate-500 mb-3">
        Showing {filtered.length} of {results.length} results
      </p>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading results...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
          No results found.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(r => (
            <div key={r.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  {r.sequence_number && (
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[#14532D] text-white flex flex-col items-center justify-center">
                      <span className="text-[10px] font-semibold uppercase leading-none opacity-80">Result</span>
                      <span className="text-lg font-bold leading-tight">{String(r.sequence_number).padStart(3, '0')}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{r.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-slate-500">{r.category}</span>
                      {r.is_published ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">Published</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">Awaiting Publish</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Winners */}
              {r.winners && r.winners.length > 0 && (
                <div className="space-y-2">
                  {r.winners.filter(w => w.position <= 3).map((w, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${w.position === 1 ? 'bg-yellow-100 text-yellow-700' : w.position === 2 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-700'}`}>
                        {w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : '🥉'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{w.student_name}</p>
                        <p className="text-xs text-slate-500">
                          {w.team_name}
                          {w.chest_number && ` · Chest: ${w.chest_number}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-[#14532D]">{w.points} pts</p>
                        {w.grade && <p className="text-xs text-slate-500">Grade: {w.grade}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
