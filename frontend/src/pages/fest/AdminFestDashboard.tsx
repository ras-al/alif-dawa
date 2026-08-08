import React, { useState, useEffect } from 'react';
import { Users, Target, Activity, Trash2, Plus, UserPlus, Trophy, ChevronRight, UserCircle, Info, Award, Image as ImageIcon, Save, Download, Lock, Unlock, Star, Edit2, Eye, X, CreditCard, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { useParticipantCardGenerator } from '../../components/ParticipantCardGenerator';

export default function AdminFestDashboard() {
  const [stats, setStats] = useState({ programs: 0, teams: 0, live: 0 });
  const [programs, setPrograms] = useState([]);
  const [teams, setTeams] = useState([]);

  const [festUsers, setFestUsers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [individualPoints, setIndividualPoints] = useState([]);
  const [posterTemplate, setPosterTemplate] = useState<any>(null);
  const [judgeAssignments, setJudgeAssignments] = useState([]);
  const [festSettings, setFestSettings] = useState<Record<string, string>>({});
  const [lockToggling, setLockToggling] = useState(false);

  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState<'MAIN' | 'HIFZ'>('MAIN');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'programs', label: 'Programs', icon: Trophy },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'judges', label: 'Assign Judges', icon: Target },
    { id: 'users', label: 'Fest Users', icon: UserPlus },
    { id: 'participants', label: 'Participants', icon: UserCircle },
    { id: 'results', label: 'All Results', icon: Award },
    { id: 'individual', label: 'Individual Points', icon: Star },
    { id: 'poster', label: 'Poster Template', icon: ImageIcon },
    { id: 'participant_card', label: 'Participant Card', icon: CreditCard },
  ] as const;

  type TabType = typeof tabs[number]['id'];
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [programSearch, setProgramSearch] = useState('');
  // Forms state
  const [newProgram, setNewProgram] = useState({ title: '', category: 'Premier', type: 'stage', max_judges: 3, team_limit: 3, is_group: false });
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [viewingParticipants, setViewingParticipants] = useState<{ program: any, participants: any[], is_group: boolean } | null>(null);

  const [newTeam, setNewTeam] = useState({ name: '', chest_number_start: 100 });
  const [assignJudge, setAssignJudge] = useState<{ program_id: string, judge_names: string[] }>({ program_id: '', judge_names: [] });
  const [newJudgeInput, setNewJudgeInput] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'judge' });
  const [newParticipant, setNewParticipant] = useState({ student_id: '', fest_team_id: '' });
  const [newRegistration, setNewRegistration] = useState({ fest_participant_id: '', fest_program_id: '' });
  const [leaderAssign, setLeaderAssign] = useState({ user_id: '', fest_team_id: '', is_first_leader: false });

  // Poster State
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterConfig, setPosterConfig] = useState({
    student_name: { x: 50, y: 50, fontSize: 48, color: '#000000', visible: true },
    program_title: { x: 50, y: 120, fontSize: 36, color: '#333333', visible: true },
    category: { x: 50, y: 170, fontSize: 24, color: '#666666', visible: true },
    position: { x: 50, y: 220, fontSize: 64, color: '#FFD700', visible: true },
    team_name: { x: 50, y: 300, fontSize: 32, color: '#14532D', visible: true }
  });
  const [posterImgSize, setPosterImgSize] = useState({ width: 1080, height: 1080 });

  // Participant Card State
  const [cardTemplate, setCardTemplate] = useState<any>(null);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardConfig, setCardConfig] = useState({
    student_name: { x: 50, y: 100, fontSize: 48, color: '#000000', visible: true },
    chest_number: { x: 50, y: 180, fontSize: 72, color: '#14532D', visible: true },
    team_name: { x: 50, y: 270, fontSize: 32, color: '#333333', visible: true },
    category: { x: 50, y: 330, fontSize: 28, color: '#666666', visible: true }
  });
  const [cardImgSize, setCardImgSize] = useState({ width: 1080, height: 1920 });
  const [bulkCardProgress, setBulkCardProgress] = useState<{ current: number; total: number } | null>(null);
  const { generateCard, generateBulkCards, loadingCardId, hasCardTemplate } = useParticipantCardGenerator();

  const loadData = async () => {
    try {
      const [progRes, teamRes, userRes, partRes, regRes, studRes, resultRes, individualPointsRes, posterRes, assignRes, settingsRes, cardRes] = await Promise.allSettled([
        api.get(`/fest/public/programs?event_type=${eventType}`),
        api.get(`/fest/admin/teams?event_type=${eventType}`),
        api.get('/fest/admin/users'),
        api.get(`/fest/admin/participants?event_type=${eventType}`),
        api.get(`/fest/admin/registrations?event_type=${eventType}`),
        api.get('/students'),
        api.get(`/fest/admin/results?event_type=${eventType}`),
        api.get(`/fest/admin/individual-points?event_type=${eventType}`),
        api.get('/fest/public/poster-template'),
        api.get('/fest/admin/judge-assignments'),
        api.get('/fest/admin/fest-settings'),
        api.get('/fest/public/participant-card-template')
      ]);

      if (progRes.status === 'fulfilled') setPrograms(progRes.value.data);
      if (teamRes.status === 'fulfilled') setTeams(teamRes.value.data);

      if (userRes.status === 'fulfilled') setFestUsers(userRes.value.data);
      if (partRes.status === 'fulfilled') setParticipants(partRes.value.data);
      if (regRes.status === 'fulfilled') setRegistrations(regRes.value.data);
      if (studRes.status === 'fulfilled') setStudents(studRes.value.data.data || studRes.value.data);
      if (resultRes.status === 'fulfilled') setResults(resultRes.value.data);
      if (individualPointsRes.status === 'fulfilled') setIndividualPoints(individualPointsRes.value.data);
      if (posterRes.status === 'fulfilled' && posterRes.value.data && posterRes.value.data.image_url) {
        setPosterTemplate(posterRes.value.data);
        if (posterRes.value.data.config) {
          setPosterConfig(posterRes.value.data.config);
        }
      }
      if (assignRes.status === 'fulfilled') setJudgeAssignments(assignRes.value.data);
      if (settingsRes.status === 'fulfilled') setFestSettings(settingsRes.value.data);
      if (cardRes.status === 'fulfilled' && cardRes.value.data && cardRes.value.data.image_url) {
        setCardTemplate(cardRes.value.data);
        if (cardRes.value.data.config) {
          setCardConfig(cardRes.value.data.config);
        }
      }

      setStats({
        programs: progRes.status === 'fulfilled' ? progRes.value.data.length : 0,
        teams: teamRes.status === 'fulfilled' ? teamRes.value.data.length : 0,
        live: progRes.status === 'fulfilled' ? progRes.value.data.filter((p: any) => p.status === 'live').length : 0
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventType]);

  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/fest/admin/programs', { ...newProgram, team_limit: newProgram.team_limit === 0 ? null : newProgram.team_limit, event_type: eventType });
      setNewProgram({ title: '', category: eventType === 'MAIN' ? 'Premier' : 'Stage', type: 'stage', max_judges: 3, team_limit: 3, is_group: false });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to add program');
    }
  };

  const handleEditProgramSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;
    try {
      await api.put(`/fest/admin/programs/${editingProgram.id}`, {
        ...editingProgram,
        team_limit: editingProgram.team_limit === 0 || editingProgram.team_limit === '' ? null : Number(editingProgram.team_limit)
      });
      setEditingProgram(null);
      loadData();
    } catch (err) {
      alert('Failed to update program');
    }
  };

  const handleViewParticipants = async (program: any) => {
    try {
      const res = await api.get(`/fest/stage-admin/programs/${program.id}/participants`);
      setViewingParticipants({ program, participants: res.data.participants, is_group: res.data.is_group });
    } catch (err) {
      alert('Failed to load participants');
    }
  };

  const handleDeleteProgram = async (id: number) => {
    if (!confirm('Delete this program?')) return;
    try {
      await api.delete(`/fest/admin/programs/${id}`);
      loadData();
    } catch (err) {
      alert('Failed to delete program');
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/fest/admin/teams', { ...newTeam, event_type: eventType });
      setNewTeam({ name: '', chest_number_start: 100 });
      loadData();
    } catch (err) {
      alert('Failed to add team');
    }
  };

  const handleDeleteTeam = async (id: number) => {
    if (!confirm('Delete this team?')) return;
    try {
      await api.delete(`/fest/admin/teams/${id}`);
      loadData();
    } catch (err) {
      alert('Failed to delete team');
    }
  };

  const handleAssignJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignJudge.judge_names.length === 0) {
      alert('Please add at least one judge name.');
      return;
    }
    try {
      await api.post('/fest/admin/assign-judge', {
        fest_program_id: assignJudge.program_id,
        judge_names: assignJudge.judge_names
      });
      alert('Judges assigned successfully!');
      setAssignJudge({ program_id: '', judge_names: [] });
      setNewJudgeInput('');
      // Reload judge assignments
      const res = await api.get('/fest/admin/judge-assignments');
      setJudgeAssignments(res.data);
    } catch (err) {
      alert('Failed to assign judges');
    }
  };

  const handleProgramSelectForAssign = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const programId = e.target.value;
    // Find already assigned judges for this program
    const assignedForProgram = judgeAssignments.filter((a: any) => a.fest_program_id.toString() === programId).map((a: any) => a.judge_name);
    setAssignJudge({ program_id: programId, judge_names: assignedForProgram });
  };

  const handleDeleteJudgeAssignment = async (id: number) => {
    if (!confirm('Remove this judge assignment?')) return;
    try {
      await api.delete(`/fest/admin/judge-assignments/${id}`);
      const res = await api.get('/fest/admin/judge-assignments');
      setJudgeAssignments(res.data);
    } catch (err) {
      alert('Failed to remove assignment');
    }
  };

  const handleToggleEditLock = async () => {
    const currentlyLocked = festSettings.fest_leader_edit_locked === 'true';
    setLockToggling(true);
    try {
      await api.put('/fest/admin/fest-settings', {
        fest_leader_edit_locked: currentlyLocked ? 'false' : 'true'
      });
      setFestSettings(prev => ({ ...prev, fest_leader_edit_locked: currentlyLocked ? 'false' : 'true' }));
    } catch (err) {
      alert('Failed to update lock setting');
    } finally {
      setLockToggling(false);
    }
  };



  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', newUser);
      setNewUser({ username: '', password: '', role: 'judge' });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add user');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/fest/admin/users/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/fest/admin/participants', newParticipant);
      setNewParticipant({ student_id: '', fest_team_id: '' });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add participant');
    }
  };

  const handleDeleteParticipant = async (id: number) => {
    if (!confirm('Delete this participant?')) return;
    try {
      await api.delete(`/fest/admin/participants/${id}`);
      loadData();
    } catch (err) {
      alert('Failed to delete participant');
    }
  };

  const handleAddRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/fest/admin/registrations', newRegistration);
      setNewRegistration({ fest_participant_id: '', fest_program_id: '' });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register participant');
    }
  };

  const handleDeleteRegistration = async (id: number) => {
    if (!confirm('Remove this registration?')) return;
    try {
      await api.delete(`/fest/admin/registrations/${id}`);
      loadData();
    } catch (err) {
      alert('Failed to remove registration');
    }
  };

  const handleSavePosterTemplate = async () => {
    const formData = new FormData();
    if (posterFile) formData.append('template', posterFile);
    formData.append('config', JSON.stringify(posterConfig));

    try {
      const res = await api.post('/fest/admin/poster-template', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Poster template saved successfully!');
      setPosterTemplate(res.data);
      setPosterFile(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save poster template');
    }
  };

  const updatePosterField = (field: string, key: string, value: any) => {
    setPosterConfig(prev => ({
      ...prev,
      [field]: { ...prev[field as keyof typeof posterConfig], [key]: value }
    }));
  };

  const handleSaveCardTemplate = async () => {
    const formData = new FormData();
    if (cardFile) formData.append('card_template', cardFile);
    formData.append('config', JSON.stringify(cardConfig));

    try {
      const res = await api.post('/fest/admin/participant-card-template', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Participant card template saved successfully!');
      setCardTemplate(res.data);
      setCardFile(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save card template');
    }
  };

  const updateCardField = (field: string, key: string, value: any) => {
    setCardConfig(prev => ({
      ...prev,
      [field]: { ...prev[field as keyof typeof cardConfig], [key]: value }
    }));
  };

  const handleBulkDownloadParticipantCards = async () => {
    if (participants.length === 0) { alert('No participants to download.'); return; }
    setBulkCardProgress({ current: 0, total: participants.length });
    await generateBulkCards(
      (participants as any[]).map((p: any) => ({
        id: p.id,
        student_name: p.student_name,
        chest_number: p.chest_number,
        team_name: p.team_name,
        category: eventType === 'HIFZ' ? 'Hifz' : p.category
      })),
      (current, total) => setBulkCardProgress({ current, total })
    );
    setBulkCardProgress(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14532D]"></div>
    </div>
  );


  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Fest Management <span className="ml-2 text-sm px-2.5 py-1 bg-[#14532D]/10 text-[#14532D] rounded-full uppercase tracking-wider">{eventType} EVENT</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure and manage all aspects of the Alif Dawa Fest.</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setEventType('MAIN')}
              className={`px-4 py-1.5 text-xs font-bold uppercase rounded-lg border transition-all ${eventType === 'MAIN'
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
            >
              Main Fest
            </button>
            <button
              onClick={() => setEventType('HIFZ')}
              className={`px-4 py-1.5 text-xs font-bold uppercase rounded-lg border transition-all ${eventType === 'HIFZ'
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
            >
              Hifz Fest
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/fest" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-5 py-2.5 bg-[#14532D] text-white rounded-lg text-sm font-semibold hover:bg-[#14532D]/90 transition-all shadow-sm shadow-[#14532D]/20 gap-2">
            View Public Page <ChevronRight size={16} />
          </a>
        </div>
      </div>

      <div className="mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Info size={20} className="text-blue-600" /> System Instructions & Quick Links
        </h3>
        <p className="text-sm mb-4">Welcome to the Fest Administration panel. Follow these steps to conduct the fest:</p>
        <ul className="list-disc pl-5 text-sm space-y-1.5 mb-5 opacity-90">
          <li><strong>Step 1:</strong> Create Programs and Teams (e.g. Group 1, Group 2).</li>
          <li><strong>Step 2:</strong> Add Students to Teams via the Participants tab. This auto-generates their unique chest numbers.</li>
          <li><strong>Step 3:</strong> Register those Participants to specific Programs.</li>
          <li><strong>Step 4:</strong> Create Staff (Judges, Stage Admins) in the Fest Users tab, and Assign Judges to their programs.</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <a href="/fest/login" target="_blank" className="text-sm font-semibold bg-white text-blue-700 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm flex items-center gap-2">
            Fest Staff Portal (Login)
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="flex overflow-x-auto hide-scrollbar border-b border-slate-100">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative whitespace-nowrap ${isActive ? 'text-[#14532D] bg-emerald-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <Icon size={18} className={isActive ? 'text-[#14532D]' : 'text-slate-400'} />
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#14532D] rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6 md:p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div onClick={() => setActiveTab('programs')} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#14532D]/50 hover:shadow-md transition-all group">
                  <div className="p-4 bg-emerald-50 rounded-full text-emerald-600 group-hover:scale-110 transition-transform"><Trophy size={28} /></div>
                  <div className="text-center"><p className="text-3xl font-bold text-slate-900">{stats.programs}</p><p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Programs</p></div>
                </div>
                <div onClick={() => setActiveTab('teams')} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all group">
                  <div className="p-4 bg-blue-50 rounded-full text-blue-600 group-hover:scale-110 transition-transform"><Users size={28} /></div>
                  <div className="text-center"><p className="text-3xl font-bold text-slate-900">{stats.teams}</p><p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Teams / Groups</p></div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-12 -mt-12 opacity-50" />
                  <div className="p-4 bg-rose-50 rounded-full text-rose-600 relative z-10"><Activity size={28} /></div>
                  <div className="text-center relative z-10"><p className="text-3xl font-bold text-slate-900">{stats.live}</p><p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Live Programs</p></div>
                </div>
              </div>

              {/* Leader Edit Lock Toggle */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${festSettings.fest_leader_edit_locked === 'true' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {festSettings.fest_leader_edit_locked === 'true' ? <Lock size={24} /> : <Unlock size={24} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Leader Registration Lock</h3>
                      <p className="text-sm text-slate-500">
                        {festSettings.fest_leader_edit_locked === 'true'
                          ? 'Leaders are currently LOCKED from editing participant registrations.'
                          : 'Leaders can currently edit participant registrations freely.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleEditLock}
                    disabled={lockToggling}
                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-sm disabled:opacity-60 ${festSettings.fest_leader_edit_locked === 'true'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                  >
                    {festSettings.fest_leader_edit_locked === 'true' ? <><Unlock size={16} /> Unlock Editing</> : <><Lock size={16} /> Lock Editing</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'programs' && (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Create New Program</h3>
                <form onSubmit={handleAddProgram} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Program Title</label>
                    <input required value={newProgram.title} onChange={e => setNewProgram({ ...newProgram, title: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" placeholder="e.g. Essay Writing" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                    <select value={newProgram.category} onChange={e => setNewProgram({ ...newProgram, category: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="Premier">Premier</option>
                      <option value="Junior">Junior</option>
                      <option value="Senior">Senior</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Event Type</label>
                    <select value={newProgram.type} onChange={e => setNewProgram({ ...newProgram, type: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="stage">Stage</option>
                      <option value="off-stage">Off-Stage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Team Limit (0=No limit)</label>
                    <input type="number" value={newProgram.team_limit} onChange={e => setNewProgram({ ...newProgram, team_limit: Number(e.target.value) })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" />
                  </div>
                  <div className="flex items-center gap-2 mb-2 ml-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={newProgram.is_group} onChange={e => setNewProgram({ ...newProgram, is_group: e.target.checked })} className="rounded border-slate-300 text-[#14532D] focus:ring-[#14532D] w-4 h-4" />
                      Is Group Event
                    </label>
                  </div>
                  <div className="col-span-1 sm:col-span-2 md:col-span-4 flex justify-end">
                    <button type="submit" className="bg-[#14532D] text-white px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                      <Plus size={18} /> Add Program
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-100">
                  <div className="flex flex-wrap gap-2">
                    {['All', ...(eventType === 'MAIN' ? ['Premier', 'Junior', 'Senior', 'General'] : ['Stage', 'General Stage', 'Off-Stage', 'General Off-Stage'])].map(cat => (
                      <button key={cat} onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search programs..."
                      value={programSearch}
                      onChange={e => setProgramSearch(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[550px] text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Title</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-center">Limit</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-center">Reg. Count</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(programs as any[])
                        .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
                        .filter(p => !programSearch || p.title.toLowerCase().includes(programSearch.toLowerCase()))
                        .map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-medium text-slate-900">{p.title}</p>
                              {p.is_group && <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wide">Group Event</span>}
                            </td>
                            <td className="px-6 py-4 text-slate-600"><span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium">{p.category}</span></td>
                            <td className="px-6 py-4 text-slate-600 capitalize">{p.type}</td>
                            <td className="px-6 py-4 text-center font-semibold text-slate-700">{p.team_limit || '∞'}</td>
                            <td className="px-6 py-4 text-center font-bold text-emerald-700">{p.registered_count || 0}</td>
                            <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                              <button onClick={() => handleViewParticipants(p)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors inline-flex items-center justify-center" title="View Participants">
                                <Eye size={18} />
                              </button>
                              <button onClick={() => setEditingProgram({ ...p, team_limit: p.team_limit || 0 })} className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 p-2 rounded-lg transition-colors inline-flex items-center justify-center" title="Edit Program">
                                <Edit2 size={18} />
                              </button>
                              <button onClick={() => handleDeleteProgram(p.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors inline-flex items-center justify-center" title="Delete Program">
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      {(programs as any[])
                        .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
                        .filter(p => !programSearch || p.title.toLowerCase().includes(programSearch.toLowerCase()))
                        .length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No programs{categoryFilter !== 'All' ? ` in ${categoryFilter}` : ''} found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Register New Team</h3>
                <form onSubmit={handleAddTeam} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Team Name</label>
                    <input required value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" placeholder="e.g. Premier" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Chest Number Range Start</label>
                    <input required type="number" value={newTeam.chest_number_start} onChange={e => setNewTeam({ ...newTeam, chest_number_start: Number(e.target.value) })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" placeholder="e.g. 100" />
                  </div>
                  <button type="submit" className="bg-[#14532D] text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                    <Plus size={18} /> Add Team
                  </button>
                </form>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[500px] text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Team Name</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Chest Number Prefix</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teams.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">{t.name}</td>
                          <td className="px-6 py-4 text-slate-600 font-mono bg-slate-50/50">{t.chest_number_start}+</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDeleteTeam(t.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors inline-flex items-center justify-center">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {teams.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">No teams registered.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'judges' && (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Assign Judges to Program</h3>
                <form onSubmit={handleAssignJudge} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Program</label>
                      <select required value={assignJudge.program_id} onChange={handleProgramSelectForAssign} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                        <option value="">Select a Program</option>
                        {programs.map((p: any) => <option key={p.id} value={p.id}>{p.title} ({p.category})</option>)}
                      </select>
                    </div>

                    <button type="submit" disabled={!assignJudge.program_id} className="w-full bg-[#14532D] text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm disabled:opacity-50">
                      <Target size={18} /> Save Assignments
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Add Judge Names</label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newJudgeInput}
                        onChange={e => setNewJudgeInput(e.target.value)}
                        placeholder="e.g. Mr. John"
                        className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newJudgeInput.trim()) {
                              setAssignJudge(prev => ({ ...prev, judge_names: [...prev.judge_names, newJudgeInput.trim()] }));
                              setNewJudgeInput('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newJudgeInput.trim()) {
                            setAssignJudge(prev => ({ ...prev, judge_names: [...prev.judge_names, newJudgeInput.trim()] }));
                            setNewJudgeInput('');
                          }
                        }}
                        className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-200"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto p-3 border border-slate-300 rounded-lg bg-white">
                      {assignJudge.judge_names.map((name, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded p-2 text-sm">
                          <span className="font-medium text-slate-800">{name}</span>
                          <button
                            type="button"
                            onClick={() => setAssignJudge(prev => ({ ...prev, judge_names: prev.judge_names.filter((_, idx) => idx !== i) }))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {assignJudge.judge_names.length === 0 && <p className="text-slate-500 text-xs italic text-center p-2">No judges added yet.</p>}
                    </div>
                  </div>
                </form>
              </div>

              {/* Existing Judge Assignments Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Current Assignments ({judgeAssignments.length})</h3>
                </div>
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[500px] text-sm text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-slate-700 font-semibold text-xs uppercase tracking-wider">Program</th>
                        <th className="px-6 py-3 text-slate-700 font-semibold text-xs uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-slate-700 font-semibold text-xs uppercase tracking-wider">Judge Name</th>
                        <th className="px-6 py-3 text-slate-700 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(judgeAssignments as any[]).map((a: any) => (
                        <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-900">{a.program_title}</td>
                          <td className="px-6 py-3"><span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium">{a.program_category}</span></td>
                          <td className="px-6 py-3">
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-semibold">{a.judge_name}</span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button onClick={() => handleDeleteJudgeAssignment(a.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors inline-flex items-center justify-center">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {judgeAssignments.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No judge assignments yet. Use the form above to assign judges to programs.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Create Fest Staff Account</h3>
                <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Username</label>
                    <input required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" placeholder="e.g. stageadmin1" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                    <input required type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" placeholder="Enter secure password" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role Assignment</label>
                    <select required value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="judge">Judge</option>
                      <option value="stage_admin">Stage Admin</option>
                      <option value="green_room">Green Room</option>
                      <option value="announcer">Announcer</option>
                      <option value="leader">Team Login</option>
                    </select>
                  </div>
                  <button type="submit" className="bg-[#14532D] text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                    <UserPlus size={18} /> Create Account
                  </button>
                </form>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[500px] text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Username</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {festUsers.map((u: any) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{u.username}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${u.role === 'judge' ? 'bg-amber-100 text-amber-700' :
                                u.role === 'stage_admin' ? 'bg-blue-100 text-blue-700' :
                                  u.role === 'green_room' ? 'bg-emerald-100 text-emerald-700' :
                                    u.role === 'leader' ? 'bg-indigo-100 text-indigo-700' :
                                      'bg-purple-100 text-purple-700'
                              }`}>
                              {u.role.replace('_', ' ')}
                            </span>
                            {u.role === 'leader' && u.team_name && (
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-600 ml-2">
                                Team: {u.team_name} {u.is_first_leader ? '(1st)' : '(2nd)'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDeleteUser(u.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors inline-flex items-center justify-center">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {festUsers.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">No fest specific users found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Leader Team Assignment */}
              {festUsers.some((u: any) => u.role === 'leader') && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-8">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Assign Team Account to Team</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await api.post('/fest/admin/assign-leader', leaderAssign);
                      setLeaderAssign({ user_id: '', fest_team_id: '', is_first_leader: false });
                      loadData();
                      alert('Leader assigned to team successfully!');
                    } catch (err: any) {
                      alert(err.response?.data?.error || 'Failed to assign leader');
                    }
                  }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Team Account</label>
                      <select required value={leaderAssign.user_id} onChange={e => setLeaderAssign({ ...leaderAssign, user_id: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                        <option value="">Select Account</option>
                        {festUsers.filter((u: any) => u.role === 'leader').map((u: any) => <option key={u.id} value={u.id}>{u.username}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Team</label>
                      <select required value={leaderAssign.fest_team_id} onChange={e => setLeaderAssign({ ...leaderAssign, fest_team_id: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                        <option value="">Select a Team</option>
                        {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={leaderAssign.is_first_leader} onChange={e => setLeaderAssign({ ...leaderAssign, is_first_leader: e.target.checked })} className="rounded border-slate-300" />
                        First Leader
                      </label>
                    </div>
                    <button type="submit" className="bg-[#14532D] text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                      <UserPlus size={18} /> Assign to Team
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Register Student as Participant</h3>
                </div>
                <form onSubmit={handleAddParticipant} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Student</label>
                    <select required value={newParticipant.student_id} onChange={e => setNewParticipant({ ...newParticipant, student_id: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="">Select a Student</option>
                      {students.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.admission_number})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Team</label>
                    <select required value={newParticipant.fest_team_id} onChange={e => setNewParticipant({ ...newParticipant, fest_team_id: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="">Select a Team</option>
                      {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="bg-[#14532D] text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                    <UserCircle size={18} /> Register Participant
                  </button>
                </form>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 p-4 border-b border-slate-100">
                  {['All', ...(eventType === 'MAIN' ? ['Premier', 'Junior', 'Senior'] : ['Stage', 'General Stage', 'Off-Stage', 'General Off-Stage'])].map(cat => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[550px] text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Chest No.</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Student Name</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Team</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {participants.filter((p: any) => categoryFilter === 'All' || p.category === categoryFilter).map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold font-mono text-slate-900 bg-slate-50/50">{p.chest_number}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{p.student_name} <span className="text-slate-400 font-normal text-xs ml-2">({p.admission_number})</span></td>
                          <td className="px-6 py-4"><span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-700">{p.category || 'N/A'}</span></td>
                          <td className="px-6 py-4 text-slate-600">{p.team_name}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDeleteParticipant(p.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors inline-flex items-center justify-center">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {participants.filter((p: any) => categoryFilter === 'All' || p.category === categoryFilter).length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No participants found{categoryFilter !== 'All' ? ` in ${categoryFilter}` : ''}.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Event Registrations Form */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-12">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Register Participant for Event</h3>
                <form onSubmit={handleAddRegistration} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Participant</label>
                    <select required value={newRegistration.fest_participant_id} onChange={e => setNewRegistration({ ...newRegistration, fest_participant_id: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="">Select a Participant</option>
                      {participants.map((p: any) => <option key={p.id} value={p.id}>[{p.chest_number}] {p.student_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Program / Event</label>
                    <select required value={newRegistration.fest_program_id} onChange={e => setNewRegistration({ ...newRegistration, fest_program_id: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="">Select a Program</option>
                      {programs.map((pr: any) => <option key={pr.id} value={pr.id}>{pr.title} ({pr.category})</option>)}
                    </select>
                  </div>
                  <button type="submit" className="bg-[#14532D] text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                    <Trophy size={18} /> Enroll in Event
                  </button>
                </form>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[600px] text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Chest No.</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Participant Name</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Program</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Code Letter</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registrations.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold font-mono text-slate-900 bg-slate-50/50">{r.chest_number}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{r.student_name}</td>
                          <td className="px-6 py-4 text-slate-600">{r.program_title}</td>
                          <td className="px-6 py-4">
                            {r.code_letter ? (
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold font-mono uppercase">{r.code_letter}</span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Pending</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDeleteRegistration(r.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors inline-flex items-center justify-center">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {registrations.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No event registrations found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[550px] text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Position</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Program</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Student Name</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Team</th>
                        <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${r.position === 1 ? 'bg-amber-100 text-amber-700' :
                                r.position === 2 ? 'bg-slate-200 text-slate-700' :
                                  'bg-orange-100 text-orange-700'
                              }`}>
                              {r.position}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{r.program_title}</p>
                            <p className="text-xs text-slate-500">{r.category}</p>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">{r.student_name}</td>
                          <td className="px-6 py-4 text-slate-600">{r.team_name}</td>
                          <td className="px-6 py-4 text-right">
                            {r.published_at ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase">Published</span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase">Draft</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {results.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No results have been recorded yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'individual' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Individual Points Leaderboard</h3>
                </div>
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[700px] text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-slate-700 font-bold text-xs uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-4 text-slate-700 font-bold text-xs uppercase tracking-wider">Chest No.</th>
                        <th className="px-6 py-4 text-slate-700 font-bold text-xs uppercase tracking-wider">Student Name</th>
                        <th className="px-6 py-4 text-slate-700 font-bold text-xs uppercase tracking-wider text-center">Stage Points</th>
                        <th className="px-6 py-4 text-slate-700 font-bold text-xs uppercase tracking-wider text-center">Off-Stage Points</th>
                        <th className="px-6 py-4 text-slate-700 font-bold text-xs uppercase tracking-wider text-center">Group Points</th>
                        <th className="px-6 py-4 text-[#14532D] font-black text-xs uppercase tracking-wider text-right">Total Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {individualPoints.map((p: any, i: number) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {i < 3 ? (
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-amber-600'}`}>{i + 1}</span>
                            ) : (
                              <span className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600">{i + 1}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">{p.chest_number}</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{p.student_name}</div>
                            <div className="text-xs text-slate-500">{p.team_name}</div>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-slate-600">{p.stage_points}</td>
                          <td className="px-6 py-4 text-center font-medium text-slate-600">{p.off_stage_points}</td>
                          <td className="px-6 py-4 text-center font-medium text-slate-600">{p.group_points}</td>
                          <td className="px-6 py-4 text-right font-black text-lg text-[#14532D]">{p.total_points}</td>
                        </tr>
                      ))}
                      {individualPoints.length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No points awarded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'poster' && (
            <div className="space-y-8">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-blue-900 shadow-sm">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Info size={20} className="text-blue-600" /> Poster Configuration
                </h3>
                <p className="text-sm opacity-90 mb-2">Upload a background image for the result poster and set the X/Y coordinates for where the text should appear. These coordinates (in pixels) are relative to the top-left corner of the image.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Settings */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Background Image</label>
                    <input type="file" accept="image/*" onChange={e => setPosterFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#14532D]/10 file:text-[#14532D] hover:file:bg-[#14532D]/20 cursor-pointer" />
                    {posterTemplate && !posterFile && <p className="text-xs text-emerald-600 mt-2 font-medium">✓ Active template is loaded</p>}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="font-bold text-slate-900">Text Positions (X, Y)</h4>
                    {Object.entries(posterConfig).map(([key, config]) => (
                      <div key={key} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="w-32 font-medium text-sm text-slate-700 capitalize">{key.replace('_', ' ')}</div>
                        <input type="number" value={config.x} onChange={e => updatePosterField(key, 'x', Number(e.target.value))} className="w-20 px-3 py-1.5 border border-slate-300 rounded text-sm text-center" placeholder="X" />
                        <input type="number" value={config.y} onChange={e => updatePosterField(key, 'y', Number(e.target.value))} className="w-20 px-3 py-1.5 border border-slate-300 rounded text-sm text-center" placeholder="Y" />
                        <input type="color" value={config.color} onChange={e => updatePosterField(key, 'color', e.target.value)} className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5" />
                        <input type="number" value={config.fontSize} onChange={e => updatePosterField(key, 'fontSize', Number(e.target.value))} className="w-16 px-3 py-1.5 border border-slate-300 rounded text-sm text-center" placeholder="Size" />
                      </div>
                    ))}
                  </div>

                  <button onClick={handleSavePosterTemplate} className="w-full bg-[#14532D] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                    <Save size={18} /> Save Poster Configuration
                  </button>
                </div>

                {/* Live Preview (Exact Scale) */}
                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-center justify-center min-h-[500px] overflow-hidden w-full relative">
                  {(posterFile || posterTemplate?.image_url) ? (
                    <div className="w-full flex justify-center">
                      <div 
                        className="relative origin-top flex-shrink-0" 
                        style={{ 
                          width: posterImgSize.width, 
                          height: posterImgSize.height,
                          minWidth: posterImgSize.width,
                          minHeight: posterImgSize.height,
                          transform: `scale(${Math.min(1, 400 / posterImgSize.width)})`,
                          marginBottom: `-${posterImgSize.height * (1 - Math.min(1, 400 / posterImgSize.width))}px`
                        }}
                      >
                        <img 
                          src={posterFile ? URL.createObjectURL(posterFile) : `http://localhost:5000${posterTemplate.image_url}`}
                          alt="Poster Template"
                          className="w-full h-full absolute inset-0 shadow-lg border border-slate-300"
                          onLoad={(e) => setPosterImgSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                        />
                        {Object.entries(posterConfig).map(([key, config]) => (
                          <div key={key} style={{ position: 'absolute', left: config.x, top: config.y, color: config.color, fontSize: config.fontSize, fontWeight: 'bold', whiteSpace: 'nowrap', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                            [{key.toUpperCase()}]
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon size={48} className="mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No Template Uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'participant_card' && (
            <div className="space-y-8">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-blue-900 shadow-sm">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Info size={20} className="text-blue-600" /> Participant Card Configuration
                </h3>
                <p className="text-sm opacity-90 mb-2">Upload a background image for the participant ID card and set the X/Y coordinates for each field. The fields (name, chest number, team, category) will be rendered onto the template when downloading.</p>
                <p className="text-xs opacity-75">After configuring, you can download individual cards or bulk download all participant cards as a ZIP file.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Settings */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Card Background Image</label>
                    <input type="file" accept="image/*" onChange={e => setCardFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#14532D]/10 file:text-[#14532D] hover:file:bg-[#14532D]/20 cursor-pointer" />
                    {cardTemplate && !cardFile && <p className="text-xs text-emerald-600 mt-2 font-medium">✓ Active card template is loaded</p>}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="font-bold text-slate-900">Field Positions (X, Y)</h4>
                    {Object.entries(cardConfig).map(([key, config]) => (
                      <div key={key} className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm text-slate-800 capitalize">{key.replace(/_/g, ' ')}</div>
                          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                            <input type="checkbox" checked={config.visible} onChange={e => updateCardField(key, 'visible', e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                            Visible
                          </label>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">X</span>
                            <input type="number" value={config.x} onChange={e => updateCardField(key, 'x', Number(e.target.value))} className="w-20 px-3 py-1.5 border border-slate-300 rounded text-sm text-center" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Y</span>
                            <input type="number" value={config.y} onChange={e => updateCardField(key, 'y', Number(e.target.value))} className="w-20 px-3 py-1.5 border border-slate-300 rounded text-sm text-center" />
                          </div>
                          <input type="color" value={config.color} onChange={e => updateCardField(key, 'color', e.target.value)} className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Size</span>
                            <input type="number" value={config.fontSize} onChange={e => updateCardField(key, 'fontSize', Number(e.target.value))} className="w-16 px-3 py-1.5 border border-slate-300 rounded text-sm text-center" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleSaveCardTemplate} className="w-full bg-[#14532D] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                    <Save size={18} /> Save Card Configuration
                  </button>
                </div>

                {/* Live Preview */}
                <div className="space-y-4">
                  <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-start min-h-[400px] overflow-hidden w-full relative">
                    {(cardFile || cardTemplate?.image_url) ? (
                      <div className="w-full flex justify-center">
                        <div 
                          className="relative origin-top flex-shrink-0" 
                          style={{ 
                            width: cardImgSize.width, 
                            height: cardImgSize.height,
                            minWidth: cardImgSize.width,
                            minHeight: cardImgSize.height,
                            transform: `scale(${Math.min(1, 400 / cardImgSize.width)})`,
                            marginBottom: `-${cardImgSize.height * (1 - Math.min(1, 400 / cardImgSize.width))}px`
                          }}
                        >
                          <img 
                            src={cardFile ? URL.createObjectURL(cardFile) : `http://localhost:5000${cardTemplate.image_url}`}
                            alt="Card Template"
                            className="w-full h-full absolute inset-0 shadow-lg border border-slate-300"
                            onLoad={(e) => setCardImgSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                          />
                          {Object.entries(cardConfig).map(([key, config]) => (
                            config.visible && (
                              <div key={key} style={{ position: 'absolute', left: config.x, top: config.y, color: config.color, fontSize: config.fontSize, fontWeight: 'bold', whiteSpace: 'nowrap', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                {key === 'student_name' ? 'Ahmed Raza' : key === 'chest_number' ? '501' : key === 'team_name' ? 'Furqan' : (eventType === 'HIFZ' ? 'Hifz' : 'Premier')}
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400">
                        <CreditCard size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No Card Template Uploaded</p>
                        <p className="text-xs mt-1">Upload a background image to get started</p>
                      </div>
                    )}
                  </div>

                  {/* Bulk Download Button */}
                  {hasCardTemplate && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                      <h4 className="font-bold text-slate-900 text-sm">Download Cards</h4>
                      <button
                        onClick={handleBulkDownloadParticipantCards}
                        disabled={!!bulkCardProgress || participants.length === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                      >
                        {bulkCardProgress ? (
                          <><Loader2 size={18} className="animate-spin" /> Generating {bulkCardProgress.current}/{bulkCardProgress.total}...</>
                        ) : (
                          <><Download size={18} /> Download All Cards (ZIP) - {participants.length} participants</>
                        )}
                      </button>
                      <p className="text-xs text-slate-500 text-center">Each card will be rendered as an individual PNG image and bundled into a ZIP file.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Individual Cards Table */}
              {hasCardTemplate && participants.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Individual Card Downloads</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-slate-600 font-semibold text-xs uppercase">Chest</th>
                          <th className="px-6 py-3 text-slate-600 font-semibold text-xs uppercase">Name</th>
                          <th className="px-6 py-3 text-slate-600 font-semibold text-xs uppercase">Team</th>
                          <th className="px-6 py-3 text-slate-600 font-semibold text-xs uppercase text-right">Download</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(participants as any[]).map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3 font-mono font-bold text-slate-900">{p.chest_number}</td>
                            <td className="px-6 py-3 font-medium text-slate-900">{p.student_name}</td>
                            <td className="px-6 py-3 text-slate-600">{p.team_name}</td>
                            <td className="px-6 py-3 text-right">
                              <button
                                onClick={() => generateCard({ id: p.id, student_name: p.student_name, chest_number: p.chest_number, team_name: p.team_name, category: eventType === 'HIFZ' ? 'Hifz' : p.category })}
                                disabled={loadingCardId === p.id}
                                className="p-2 bg-[#14532D]/10 text-[#14532D] hover:bg-[#14532D] hover:text-white rounded-lg transition-colors inline-flex disabled:opacity-50"
                                title="Download Participant Card"
                              >
                                {loadingCardId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editing Modal */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button onClick={() => setEditingProgram(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            <h3 className="text-lg font-bold text-slate-900 mb-6">Edit Program</h3>
            <form onSubmit={handleEditProgramSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Program Title</label>
                <input required value={editingProgram.title} onChange={e => setEditingProgram({ ...editingProgram, title: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                  <select value={editingProgram.category} onChange={e => setEditingProgram({ ...editingProgram, category: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                    <option value="Premier">Premier</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Event Type</label>
                  <select value={editingProgram.type} onChange={e => setEditingProgram({ ...editingProgram, type: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                    <option value="stage">Stage</option>
                    <option value="off-stage">Off-Stage</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Team Limit (0=No limit)</label>
                <input type="number" value={editingProgram.team_limit} onChange={e => setEditingProgram({ ...editingProgram, team_limit: e.target.value })} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer pt-2">
                  <input type="checkbox" checked={editingProgram.is_group} onChange={e => setEditingProgram({ ...editingProgram, is_group: e.target.checked })} className="rounded border-slate-300 text-[#14532D] focus:ring-[#14532D] w-4 h-4" />
                  Is Group Event
                </label>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingProgram(null)} className="flex-1 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-[#14532D] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#14532D]/90 transition-all shadow-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Participants Modal */}
      {viewingParticipants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button onClick={() => setViewingParticipants(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">{viewingParticipants.program.title}</h3>
              <div className="flex gap-2 mt-2">
                <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-600">{viewingParticipants.program.category}</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-600 capitalize">{viewingParticipants.program.type}</span>
                {viewingParticipants.is_group && <span className="px-2.5 py-1 bg-indigo-100 rounded-md text-xs font-medium text-indigo-700">Group Event</span>}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 bg-slate-50 border border-slate-200 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-slate-700 font-semibold text-xs uppercase">Chest No.</th>
                    <th className="px-4 py-3 text-slate-700 font-semibold text-xs uppercase">Student Name</th>
                    <th className="px-4 py-3 text-slate-700 font-semibold text-xs uppercase">Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {viewingParticipants.participants.map((p, i) => (
                    <tr key={i} className="hover:bg-white transition-colors bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.chest_number}</td>
                      <td className="px-4 py-3 text-slate-800">{p.student_name}</td>
                      <td className="px-4 py-3 text-slate-600">{p.team_name}</td>
                    </tr>
                  ))}
                  {viewingParticipants.participants.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">No participants registered for this program.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
