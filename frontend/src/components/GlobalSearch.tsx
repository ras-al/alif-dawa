import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import api from '../api/client';

interface SearchResult {
  id: number;
  name: string;
  type: string;
  admission_number?: string;
  class_name?: string;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ students: SearchResult[]; teachers: SearchResult[]; classes: SearchResult[] }>({
    students: [], teachers: [], classes: [],
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ students: [], teachers: [], classes: [] });
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/settings/search', { params: { q: query } });
        setResults(res.data);
        setIsOpen(true);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (type: string, _id: number) => {
    setIsOpen(false);
    setQuery('');
    if (type === 'student') navigate(`/admin/students`);
    else if (type === 'teacher') navigate(`/admin/teachers`);
    else if (type === 'class') navigate(`/admin/classes`);
  };

  const hasResults = results.students.length > 0 || results.teachers.length > 0 || results.classes.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-slate-100 rounded-md px-3 py-1.5">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400 w-40 sm:w-56"
        />
        {query && (
          <button onClick={() => { setQuery(''); setIsOpen(false); }} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-md shadow-sm z-50 max-h-80 overflow-y-auto">
          {loading && <p className="p-3 text-sm text-slate-500">Searching...</p>}
          {!loading && !hasResults && query.length >= 2 && (
            <p className="p-3 text-sm text-slate-500">No results found</p>
          )}
          {results.students.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-slate-400 uppercase">Students</p>
              {results.students.map((s) => (
                <button
                  key={`s-${s.id}`}
                  onClick={() => handleSelect('student', s.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between"
                >
                  <span className="text-slate-900">{s.name}</span>
                  <span className="text-slate-400">{s.admission_number || ''}</span>
                </button>
              ))}
            </div>
          )}
          {results.teachers.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-slate-400 uppercase">Teachers</p>
              {results.teachers.map((t) => (
                <button
                  key={`t-${t.id}`}
                  onClick={() => handleSelect('teacher', t.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-900"
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
          {results.classes.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-slate-400 uppercase">Classes</p>
              {results.classes.map((c) => (
                <button
                  key={`c-${c.id}`}
                  onClick={() => handleSelect('class', c.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-900"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
