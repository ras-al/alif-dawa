import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Users, Trophy, Activity, Award, Zap, TrendingUp, Radio, ChevronRight, ClipboardEdit, Check, X, Download, Loader2, Lock } from 'lucide-react';
import api from '../../api/client';
import { usePosterGenerator } from '../../components/ResultPosterGenerator';

interface Notification {
  id: number;
  type: string;
  timestamp: string;
  data: {
    student_name?: string;
    chest_number?: string;
    program_title?: string;
    code_letter?: string;
    program_id?: number;
    category?: string;
  };
}

interface DashboardData {
  team: {
    id: number;
    name: string;
    is_first_leader: boolean;
    total_points: number;
  };
  participants: { id: number; chest_number: string; student_name: string; category?: string }[];
  results: { id: number; position: number; points: number; program_title: string; category: string; student_name: string; chest_number: string; team_name: string }[];
  live_programs: { id: number; title: string; category: string; status: string }[];
  leaderboard: { id: number; team_name: string; total_points: number }[];
  notifications?: { id: number; type: string; data: any; timestamp?: string }[];
  active_calls?: { id: number; title: string; category: string }[];
  leader_edit_locked?: boolean;
}

export default function LeaderDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'registration' | 'participants' | 'results' | 'leaderboard'>('overview');
  const [programs, setPrograms] = useState<any[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [manageProgram, setManageProgram] = useState<any | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const notifIdRef = useRef(0);


  const { generatePoster, loadingPosterId, hasTemplate } = usePosterGenerator();

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get('/fest/leader/dashboard');
      setData(res.data);
      if (res.data.notifications) {
        setNotifications(res.data.notifications.map((n: any) => ({
          id: n.id,
          type: n.type,
          data: typeof n.data === 'string' ? JSON.parse(n.data) : n.data,
          timestamp: n.timestamp,
        })));
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Play a notification beep using Web Audio API
  const playNotifBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.value = 0.15;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* ignore audio errors */ }
  }, []);

  // SSE connection using native EventSource with token as query param
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const url = `${apiBase}/fest/leader/notifications/stream?token=${encodeURIComponent(token)}`;

      es = new EventSource(url);

      es.onopen = () => {
        setConnected(true);
      };

      es.onmessage = (event) => {
        // Any message means we're connected
        setConnected(true);
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'CONNECTED') return;

          if (parsed.type === 'PROGRAM_CALL_REVOKED') {
            setNotifications(prev => prev.filter(n => n.data?.program_id !== parsed.data?.program_id));
          } else if (parsed.type === 'PROGRAM_LIVE') {
            const notif: Notification = { id: ++notifIdRef.current, ...parsed };
            setNotifications(prev => [notif, ...prev.filter(n => n.data?.program_id !== parsed.data?.program_id)].slice(0, 50));
            playNotifBeep();
          } else {
            const notif: Notification = { id: ++notifIdRef.current, ...parsed };
            setNotifications(prev => [notif, ...prev].slice(0, 50));
            if (parsed.type === 'PROGRAM_CALL') playNotifBeep();
          }

          // Refresh dashboard data on meaningful events
          if (['PARTICIPANT_REPORTED', 'PROGRAM_LIVE', 'PROGRAM_CALL', 'PROGRAM_CALL_REVOKED'].includes(parsed.type)) {
            loadDashboard();
          }
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        setConnected(false);
        if (es) es.close();
        
        // If it failed, the token might be expired. Trigger an API call 
        // to force the Axios interceptor to refresh the token if needed.
        loadDashboard();

        // Retry connection after a short delay so the token has time to refresh
        if (!closed) {
          retryTimeout = setTimeout(connect, 4000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (es) es.close();
      if (retryTimeout) clearTimeout(retryTimeout);
      setConnected(false);
    };
  }, [loadDashboard, playNotifBeep]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 15000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const [savingRegistration, setSavingRegistration] = useState(false);

  const loadPrograms = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoadingPrograms(true);
    try {
      const res = await api.get('/fest/leader/programs');
      setPrograms(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPrograms(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'registration') {
      loadPrograms(programs.length === 0);
    }
  }, [activeTab, loadPrograms, programs.length]);

  const handleSaveRegistration = async () => {
    if (!manageProgram) return;
    setSavingRegistration(true);
    try {
      await api.post(`/fest/leader/programs/${manageProgram.id}/register`, {
        participantIds: selectedParticipants
      });
      // Optimistically update local programs list
      setPrograms(prev => prev.map(p => {
        if (p.id === manageProgram.id) {
          const updatedRegs = data?.participants
            .filter(part => selectedParticipants.includes(part.id))
            .map(part => ({ id: part.id, name: part.student_name, chest_number: part.chest_number })) || [];
          return { ...p, registered_participants: updatedRegs };
        }
        return p;
      }));
      setManageProgram(null);
      loadPrograms(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register');
    } finally {
      setSavingRegistration(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14532D]"></div>
      </div>
    );
  }

  const teamRank = data.leaderboard.findIndex(t => t.id === data.team.id) + 1;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Team {data.team.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${data.team.is_first_leader ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>
              {data.team.is_first_leader ? 'Captain' : 'Vice Captain'}
            </span>
          </div>
          <p className="text-slate-500 text-sm">Team Dashboard - Real-time tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            {connected ? 'Live Connected' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Edit Lock Banner */}
      {data?.leader_edit_locked && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-rose-100 rounded-lg text-rose-600"><Lock size={20} /></div>
          <div>
            <p className="font-bold text-rose-900 text-sm">Registration Editing Locked</p>
            <p className="text-xs text-rose-700">The admin has disabled participant registration modifications. Contact the organizer if changes are needed.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className="p-2 sm:p-2.5 bg-amber-50 rounded-xl text-amber-600"><Trophy size={20} /></div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{data.team.total_points}</p>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Total Points</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className="p-2 sm:p-2.5 bg-blue-50 rounded-xl text-blue-600"><Users size={20} /></div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{data.participants.length}</p>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Participants</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className="p-2 sm:p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><Award size={20} /></div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{data.results.length}</p>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Results Won</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className="p-2 sm:p-2.5 bg-purple-50 rounded-xl text-purple-600"><TrendingUp size={20} /></div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">#{teamRank || '-'}</p>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Team Rank</p>
        </div>
      </div>

      {/* Notifications Panel */}
      <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600"><Bell size={18} /></div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Live Notifications</h3>
          <span className="ml-auto px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">{notifications.length}</span>
        </div>

        {/* Active Calls Banner */}
        {data?.active_calls && data.active_calls.length > 0 && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
              <Bell className="animate-bounce text-indigo-600" size={16} />
              Active Participant Reporting Calls
            </div>
            <div className="flex flex-wrap gap-2">
              {data.active_calls.map(call => (
                <span key={call.id} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  {call.title} ({call.category})
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
          {notifications.filter(n => n.type !== 'PROGRAM_CALL_REVOKED').length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-500">
              <p className="text-sm font-medium">No active stage calls or live programs.</p>
              <p className="text-xs mt-1">Real-time alerts will appear here when a program goes live or participants are called.</p>
            </div>
          ) : (
            notifications.filter(n => n.type !== 'PROGRAM_CALL_REVOKED').map(notif => (
              <div key={notif.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors animate-slide-in">
                <div className={`p-2 rounded-lg mt-0.5 flex-shrink-0 ${notif.type === 'PARTICIPANT_REPORTED' ? 'bg-blue-100 text-blue-600' :
                    notif.type === 'PROGRAM_CALL' ? 'bg-indigo-100 text-indigo-600' :
                      'bg-rose-100 text-rose-600'
                  }`}>
                  {notif.type === 'PARTICIPANT_REPORTED' ? <Zap size={16} /> :
                    notif.type === 'PROGRAM_CALL' ? <Bell size={16} /> : 
                    <Radio size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  {notif.type === 'PARTICIPANT_REPORTED' ? (
                    <p className="text-sm text-slate-800">
                      <span className="font-bold">{notif.data.student_name}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{notif.data.chest_number}</span>
                      <span className="text-slate-500"> is now reporting for </span>
                      <span className="font-semibold text-indigo-600">{notif.data.program_title}</span>
                      <span className="text-slate-400 mx-1.5">→</span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-sm">{notif.data.code_letter}</span>
                    </p>
                  ) : notif.type === 'PROGRAM_CALL' ? (
                    <p className="text-sm text-slate-800">
                      <span className="font-bold text-indigo-600">REPORTING CALL:</span>
                      <span className="font-semibold ml-1">{notif.data.program_title}</span>
                      <span className="text-slate-500"> ({notif.data.category}) participants, please report to the stage!</span>
                    </p>
                  ) : (
                    <p className="text-sm text-slate-800">
                      <span className="font-bold text-rose-600">LIVE:</span>
                      <span className="font-semibold ml-1">{notif.data.program_title}</span>
                      <span className="text-slate-500"> ({notif.data.category}) is now live!</span>
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Programs */}
      <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600"><Activity size={18} /></div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Active & Upcoming Programs</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {data.live_programs.length === 0 ? (
            <div className="px-6 py-6 text-center text-slate-500 text-sm font-medium">
              No programs are currently marked as live or upcoming.
            </div>
          ) : (
            data.live_programs.map(prog => (
              <div key={prog.id} className="px-6 py-4 flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${prog.status === 'live' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-amber-100 text-amber-700'
                  }`}>
                  {prog.status === 'live' ? '● Live' : 'Scheduled'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{prog.title}</p>
                  <p className="text-xs text-slate-500">{prog.category}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            ))
          )}
        </div>
      </div>


      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto no-scrollbar hide-scrollbar border-b border-slate-100">
          {([
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'registration', label: 'Registration', icon: ClipboardEdit },
            { id: 'participants', label: 'Members', icon: Users },
            { id: 'results', label: 'Results', icon: Award },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          ] as const).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${isActive ? 'text-[#14532D] bg-emerald-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <Icon size={16} className={isActive ? 'text-[#14532D]' : 'text-slate-400'} />
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#14532D] rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6 md:p-8">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900">Team Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Recent Results</h4>
                  {data.results.length > 0 ? (
                    <div className="space-y-3">
                      {data.results.slice(0, 5).map((r, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${r.position === 1 ? 'bg-amber-100 text-amber-700' :
                              r.position === 2 ? 'bg-slate-200 text-slate-700' :
                                'bg-orange-100 text-orange-700'
                            }`}>#{r.position}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{r.student_name}</p>
                            <p className="text-xs text-slate-500">{r.program_title}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-700">+{r.points}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No results yet</p>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Leaderboard Position</h4>
                  <div className="space-y-3">
                    {data.leaderboard.map((team, i) => (
                      <div key={team.id} className={`flex items-center gap-3 p-3 rounded-lg ${team.id === data.team.id ? 'bg-emerald-50 border border-emerald-200' : ''
                        }`}>
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${i === 0 ? 'bg-amber-100 text-amber-700' :
                            i === 1 ? 'bg-slate-200 text-slate-700' :
                              i === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-600'
                          }`}>#{i + 1}</span>
                        <p className={`text-sm font-medium flex-1 ${team.id === data.team.id ? 'text-emerald-800 font-bold' : 'text-slate-700'}`}>
                          {team.team_name}
                          {team.id === data.team.id && <span className="text-xs ml-2 text-emerald-600">(Your Team)</span>}
                        </p>
                        <span className="text-sm font-bold text-slate-900">{team.total_points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Registration Tab */}
          {activeTab === 'registration' && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Event Registration</h3>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['All', 'Premier', 'Junior', 'Senior', 'General'].map(cat => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              {loadingPrograms ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14532D]"></div></div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto w-full max-w-full">
                    <table className="w-full min-w-[500px] text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Program</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-center">Limit</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {programs.filter((p: any) => categoryFilter === 'All' || p.category === categoryFilter).map((p: any) => {
                        const registeredCount = p.registered_participants.length;
                        const limitText = p.team_limit === null ? 'No Limit' : p.team_limit;
                        const isFull = p.team_limit !== null && registeredCount >= p.team_limit;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900">{p.title}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                <span className="bg-slate-100 px-2 py-0.5 rounded uppercase font-semibold">{p.type}</span>
                                {p.is_group && <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">Group Event</span>}
                              </p>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700">{p.category}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-lg font-black ${isFull ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {registeredCount} <span className="text-slate-400 font-medium text-sm">/ {limitText}</span>
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => {
                                  setManageProgram(p);
                                  setSelectedParticipants(p.registered_participants.map((rp: any) => rp.id));
                                }}
                                disabled={!!data?.leader_edit_locked}
                                title={data?.leader_edit_locked ? 'Registration editing is locked by admin' : ''}
                                className={`px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-semibold transition-colors ${data?.leader_edit_locked ? 'text-slate-400 cursor-not-allowed opacity-60' : 'text-slate-700 hover:bg-slate-50 hover:text-[#14532D] hover:border-emerald-200'}`}
                              >
                                {data?.leader_edit_locked ? '🔒 Locked' : 'Manage'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {programs.filter((p: any) => categoryFilter === 'All' || p.category === categoryFilter).length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No programs found{categoryFilter !== 'All' ? ` in ${categoryFilter} category` : ''}.</td></tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Participants */}
          {activeTab === 'participants' && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Team Members ({data.participants.length})</h3>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['All', 'Premier', 'Junior', 'Senior'].map(cat => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[450px] text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Chest No.</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.participants.filter((p: any) => categoryFilter === 'All' || p.category === categoryFilter).map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">{p.chest_number}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{p.student_name}</td>
                          <td className="px-6 py-4"><span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-700">{p.category || 'N/A'}</span></td>
                        </tr>
                      ))}
                      {data.participants.filter((p: any) => categoryFilter === 'All' || p.category === categoryFilter).length === 0 && (
                        <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">No participants found{categoryFilter !== 'All' ? ` in ${categoryFilter}` : ''}.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {activeTab === 'results' && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Team Results ({data.results.length})</h3>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['All', 'Premier', 'Junior', 'Senior', 'General'].map(cat => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[600px] text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Position</th>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Student</th>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Program</th>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-right">Points</th>
                      {hasTemplate && <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-center">Poster</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.results.filter(r => categoryFilter === 'All' || r.category === categoryFilter).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${r.position === 1 ? 'bg-amber-100 text-amber-700' :
                              r.position === 2 ? 'bg-slate-200 text-slate-700' :
                                'bg-orange-100 text-orange-700'
                            }`}>#{r.position}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{r.student_name} <span className="text-xs text-slate-400 font-mono">({r.chest_number})</span></td>
                        <td className="px-6 py-4 text-slate-600">{r.program_title}</td>
                        <td className="px-6 py-4"><span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium">{r.category}</span></td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-700">+{r.points}</td>
                        {hasTemplate && (
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => generatePoster({ ...r, team_name: data.team.name })} 
                              disabled={loadingPosterId === r.id}
                              className="p-2 bg-[#14532D]/10 text-[#14532D] hover:bg-[#14532D] hover:text-white rounded-lg transition-colors inline-flex disabled:opacity-50"
                              title="Download Social Media Poster"
                            >
                              {loadingPosterId === r.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {data.results.filter(r => categoryFilter === 'All' || r.category === categoryFilter).length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No results{categoryFilter !== 'All' ? ` in ${categoryFilter} category` : ''} yet.</td></tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {activeTab === 'leaderboard' && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Overall Leaderboard</h3>
              <div className="space-y-3">
                {data.leaderboard.map((team, i) => (
                  <div key={team.id} className={`flex items-center gap-4 p-5 rounded-xl border transition-all ${team.id === data.team.id
                      ? 'bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-100'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}>
                    <span className={`w-12 h-12 flex items-center justify-center rounded-full font-black text-xl ${i === 0 ? 'bg-amber-100 text-amber-700 shadow-sm shadow-amber-200' :
                        i === 1 ? 'bg-slate-200 text-slate-700' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-600'
                      }`}>#{i + 1}</span>
                    <div className="flex-1">
                      <p className={`text-lg font-bold ${team.id === data.team.id ? 'text-emerald-800' : 'text-slate-900'}`}>
                        {team.team_name}
                        {team.id === data.team.id && <span className="text-xs ml-2 font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Your Team</span>}
                      </p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{team.total_points} <span className="text-sm font-medium text-slate-500">pts</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Registration Manage Modal */}
      {manageProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{manageProgram.title}</h3>
                <p className="text-sm text-slate-500 font-medium">{manageProgram.category} • {manageProgram.is_group ? 'Group Event' : 'Solo Event'}</p>
              </div>
              <button onClick={() => setManageProgram(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Select Participants</span>
                <span className={`text-sm font-bold px-2 py-1 rounded-md ${manageProgram.team_limit !== null && selectedParticipants.length > manageProgram.team_limit
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                  }`}>
                  {selectedParticipants.length} / {manageProgram.team_limit === null ? '∞' : manageProgram.team_limit} Selected
                </span>
              </div>

              <div className="space-y-2">
                {data.participants
                  .filter((p: any) => {
                    if (manageProgram.category === 'General') return true;
                    return p.category === manageProgram.category;
                  })
                  .map(p => {
                    const isSelected = selectedParticipants.includes(p.id);
                    const isLimitReached = manageProgram.team_limit !== null && selectedParticipants.length >= manageProgram.team_limit && !isSelected;
                    return (
                      <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                        } ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600"
                          checked={isSelected}
                          disabled={isLimitReached}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedParticipants([...selectedParticipants, p.id]);
                            else setSelectedParticipants(selectedParticipants.filter(id => id !== p.id));
                          }}
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <p className={`font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>{p.student_name}</p>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-600 mr-2">{p.category || 'N/A'}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">{p.chest_number}</span>
                      </label>
                    );
                  })}
                {data.participants.filter((p: any) => manageProgram.category === 'General' || p.category === manageProgram.category).length === 0 && (
                  <p className="text-center py-8 text-slate-500 text-sm">No {manageProgram.category} participants available in your team.</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setManageProgram(null)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={handleSaveRegistration}
                disabled={savingRegistration || !!data?.leader_edit_locked || (manageProgram.team_limit !== null && selectedParticipants.length > manageProgram.team_limit)}
                className="px-6 py-2 bg-[#14532D] text-white font-bold rounded-lg shadow-sm hover:bg-[#0f4022] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingRegistration ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Save Participants
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
