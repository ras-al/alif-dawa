import React, { useState, useEffect } from 'react';
import { Calendar, Users, Target, Activity, Trash2, Plus, UserPlus, Trophy, ChevronRight, UserCircle, Info } from 'lucide-react';
import api from '../../api/client';

export default function AdminFestDashboard() {
  const [stats, setStats] = useState({ programs: 0, teams: 0, live: 0 });
  const [programs, setPrograms] = useState([]);
  const [teams, setTeams] = useState([]);
  const [judges, setJudges] = useState([]);
  const [festUsers, setFestUsers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'teams' | 'judges' | 'users' | 'participants'>('overview');
  
  // Forms state
  const [newProgram, setNewProgram] = useState({ title: '', category: 'Premier', type: 'stage', max_judges: 3 });
  const [newTeam, setNewTeam] = useState({ name: '', chest_number_start: 100 });
  const [assignJudge, setAssignJudge] = useState({ program_id: '', judge_id: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'judge' });
  const [newParticipant, setNewParticipant] = useState({ student_id: '', fest_team_id: '' });
  const [newRegistration, setNewRegistration] = useState({ fest_participant_id: '', fest_program_id: '' });

  const loadData = async () => {
    try {
      const [progRes, teamRes, judgeRes, userRes, partRes, regRes, studRes] = await Promise.all([
        api.get('/fest/public/programs'),
        api.get('/fest/admin/teams'),
        api.get('/fest/admin/judges'),
        api.get('/fest/admin/users'),
        api.get('/fest/admin/participants'),
        api.get('/fest/admin/registrations'),
        api.get('/students') // Assumes this endpoint exists for admin
      ]);
      setPrograms(progRes.data);
      setTeams(teamRes.data);
      setJudges(judgeRes.data);
      setFestUsers(userRes.data);
      setParticipants(partRes.data);
      setRegistrations(regRes.data);
      setStudents(studRes.data.data || studRes.data); // Handle pagination structure if present
      setStats({
        programs: progRes.data.length,
        teams: teamRes.data.length,
        live: progRes.data.filter((p: any) => p.status === 'live').length
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/fest/admin/programs', newProgram);
      setNewProgram({ title: '', category: 'Premier', type: 'stage', max_judges: 3 });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to add program');
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
      await api.post('/fest/admin/teams', newTeam);
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
    try {
      await api.post('/fest/admin/assign-judge', {
        fest_program_id: assignJudge.program_id,
        judge_id: assignJudge.judge_id
      });
      alert('Judge assigned successfully!');
      setAssignJudge({ program_id: '', judge_id: '' });
    } catch (err) {
      alert('Failed to assign judge');
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
    } catch (err) {
      alert('Failed to delete user');
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14532D]"></div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'programs', label: 'Programs', icon: Trophy },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'judges', label: 'Assign Judges', icon: Target },
    { id: 'users', label: 'Fest Users', icon: UserPlus },
    { id: 'participants', label: 'Participants', icon: UserCircle },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fest Management</h1>
          <p className="text-slate-500 text-sm mt-1">Configure and manage all aspects of the Alif Dawa Fest.</p>
        </div>
        <a href="/fest" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-5 py-2.5 bg-[#14532D] text-white rounded-lg text-sm font-semibold hover:bg-[#14532D]/90 transition-all shadow-sm shadow-[#14532D]/20 gap-2">
          View Public Page <ChevronRight size={16} />
        </a>
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
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  isActive ? 'text-[#14532D] bg-emerald-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
          )}

          {activeTab === 'programs' && (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Create New Program</h3>
                <form onSubmit={handleAddProgram} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Program Title</label>
                    <input required value={newProgram.title} onChange={e => setNewProgram({...newProgram, title: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" placeholder="e.g. Essay Writing" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                    <select value={newProgram.category} onChange={e => setNewProgram({...newProgram, category: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="Premier">Premier</option>
                      <option value="Junior">Junior</option>
                      <option value="Senior">Senior</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Event Type</label>
                    <select value={newProgram.type} onChange={e => setNewProgram({...newProgram, type: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="stage">Stage</option>
                      <option value="off-stage">Off-Stage</option>
                    </select>
                  </div>
                  <button type="submit" className="bg-[#14532D] text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                    <Plus size={18} /> Add Program
                  </button>
                </form>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Title</th>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {programs.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{p.title}</td>
                        <td className="px-6 py-4 text-slate-600"><span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium">{p.category}</span></td>
                        <td className="px-6 py-4 text-slate-600 capitalize">{p.type}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteProgram(p.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors inline-flex items-center justify-center">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {programs.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No programs found. Create your first one above!</td></tr>}
                  </tbody>
                </table>
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
                    <input required value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" placeholder="e.g. Premier" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Chest Number Range Start</label>
                    <input required type="number" value={newTeam.chest_number_start} onChange={e => setNewTeam({...newTeam, chest_number_start: Number(e.target.value)})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" placeholder="e.g. 100" />
                  </div>
                  <button type="submit" className="bg-[#14532D] text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                    <Plus size={18} /> Add Team
                  </button>
                </form>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
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
          )}

          {activeTab === 'judges' && (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Assign Judge to Program</h3>
                <form onSubmit={handleAssignJudge} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Program</label>
                    <select required value={assignJudge.program_id} onChange={e => setAssignJudge({...assignJudge, program_id: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="">Select a Program</option>
                      {programs.map((p: any) => <option key={p.id} value={p.id}>{p.title} ({p.category})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Judge Account</label>
                    <select required value={assignJudge.judge_id} onChange={e => setAssignJudge({...assignJudge, judge_id: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="">Select a Judge</option>
                      {judges.map((j: any) => <option key={j.id} value={j.id}>{j.username}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="bg-[#14532D] text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                    <Target size={18} /> Confirm Assignment
                  </button>
                </form>
                {judges.length === 0 && (
                   <div className="mt-4 p-4 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-sm flex items-start gap-3">
                     <span className="text-amber-500 mt-0.5">⚠️</span>
                     <p>No judge accounts exist. Please go to the <strong>Fest Users</strong> tab and create at least one user with the "Judge" role first.</p>
                   </div>
                )}
              </div>
              
              {/* Could list existing assignments here in the future */}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Create Fest Staff Account</h3>
                <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Username</label>
                    <input required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" placeholder="e.g. stageadmin1" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                    <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all" placeholder="Enter secure password" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role Assignment</label>
                    <select required value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="judge">Judge</option>
                      <option value="stage_admin">Stage Admin</option>
                      <option value="green_room">Green Room</option>
                      <option value="announcer">Announcer</option>
                    </select>
                  </div>
                  <button type="submit" className="bg-[#14532D] text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14532D]/90 transition-all shadow-sm">
                    <UserPlus size={18} /> Create Account
                  </button>
                </form>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
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
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${
                            u.role === 'judge' ? 'bg-amber-100 text-amber-700' :
                            u.role === 'stage_admin' ? 'bg-blue-100 text-blue-700' :
                            u.role === 'green_room' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {u.role.replace('_', ' ')}
                          </span>
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
          )}

          {activeTab === 'participants' && (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Register Student as Participant</h3>
                <form onSubmit={handleAddParticipant} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Student</label>
                    <select required value={newParticipant.student_id} onChange={e => setNewParticipant({...newParticipant, student_id: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="">Select a Student</option>
                      {students.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.admission_number})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Team</label>
                    <select required value={newParticipant.fest_team_id} onChange={e => setNewParticipant({...newParticipant, fest_team_id: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
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
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Chest No.</th>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider">Team</th>
                      <th className="px-6 py-4 text-slate-700 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {participants.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold font-mono text-slate-900 bg-slate-50/50">{p.chest_number}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{p.student_name} <span className="text-slate-400 font-normal text-xs ml-2">({p.admission_number})</span></td>
                        <td className="px-6 py-4 text-slate-600">{p.team_name}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteParticipant(p.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors inline-flex items-center justify-center">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {participants.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No participants registered yet.</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* Event Registrations Form */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-12">
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Register Participant for Event</h3>
                <form onSubmit={handleAddRegistration} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Participant</label>
                    <select required value={newRegistration.fest_participant_id} onChange={e => setNewRegistration({...newRegistration, fest_participant_id: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
                      <option value="">Select a Participant</option>
                      {participants.map((p: any) => <option key={p.id} value={p.id}>[{p.chest_number}] {p.student_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Program / Event</label>
                    <select required value={newRegistration.fest_program_id} onChange={e => setNewRegistration({...newRegistration, fest_program_id: e.target.value})} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none transition-all">
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
                <table className="w-full text-sm text-left">
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
          )}
        </div>
      </div>
    </div>
  );
}
