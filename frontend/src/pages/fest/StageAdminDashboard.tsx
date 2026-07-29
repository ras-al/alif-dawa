import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Play, CheckCircle, ChevronDown, ChevronUp, Key, Info, Bell, BellOff, RefreshCw, Shuffle, RotateCcw, Users } from 'lucide-react';

export default function StageAdminDashboard() {
  const [programs, setPrograms] = useState([]);
  const [expandedProgramId, setExpandedProgramId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isGroupEvent, setIsGroupEvent] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  
  const fetchPrograms = async () => {
    try {
      const res = await api.get('/fest/public/programs');
      // No longer filtering by type - show all events
      setPrograms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPrograms();
    const interval = setInterval(() => {
      fetchPrograms();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchParticipants = async (programId: number) => {
    try {
      const res = await api.get(`/fest/stage-admin/programs/${programId}/participants`);
      setParticipants(res.data.participants || res.data);
      setIsGroupEvent(res.data.is_group || false);
    } catch (err) {
      console.error('Failed to load participants', err);
    }
  };

  useEffect(() => {
    if (expandedProgramId) {
      const interval = setInterval(() => {
        fetchParticipants(expandedProgramId);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [expandedProgramId]);

  const handleSetStatus = async (id: number, status: string) => {
    try {
      await api.put(`/fest/admin/programs/${id}/status-notify`, { status });
      fetchPrograms();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleToggleCall = async (program: any) => {
    const isCalled = program.is_called;
    if (isCalled) {
      if (!confirm('Are you sure you want to revoke the reporting call for this program?')) return;
      try {
        await api.put(`/fest/admin/programs/${program.id}/revoke-call`);
        fetchPrograms();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to revoke call');
      }
    } else {
      try {
        await api.put(`/fest/admin/programs/${program.id}/call-participants`);
        fetchPrograms();
        alert('Reporting call sent to leaders!');
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to send call');
      }
    }
  };

  const handleToggleParticipants = async (programId: number) => {
    if (expandedProgramId === programId) {
      setExpandedProgramId(null);
      return;
    }
    setExpandedProgramId(programId);
    await fetchParticipants(programId);
  };

  const handleGenerateCode = async (registrationId: number) => {
    try {
      const res = await api.post('/fest/stage-admin/generate-code', { registration_id: registrationId });
      // Update local state to show the new code
      setParticipants(participants.map(p => 
        p.registration_id === registrationId ? { ...p, code_letter: res.data.code_letter } : p
      ));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate code');
    }
  };

  const handleResetSingleCode = async (registrationId: number) => {
    if (!confirm('Reset code for this participant?')) return;
    try {
      await api.post('/fest/stage-admin/reset-code', { registration_id: registrationId });
      setParticipants(participants.map(p => 
        p.registration_id === registrationId ? { ...p, code_letter: null } : p
      ));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset code');
    }
  };

  const handleResetAllCodes = async (programId: number) => {
    if (!confirm('Reset code letters for ALL participants in this program?')) return;
    try {
      await api.post('/fest/stage-admin/reset-program-codes', { program_id: programId });
      setParticipants(participants.map(p => ({ ...p, code_letter: null })));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset codes');
    }
  };

  const handleRandomizeAllCodes = async (programId: number) => {
    if (!confirm('Randomize & assign code letters to ALL participants in this program?')) return;
    try {
      await api.post('/fest/stage-admin/randomize-program-codes', { program_id: programId });
      await fetchParticipants(programId);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to randomize codes');
    }
  };

  // Group participants by team for group events
  const getGroupedParticipants = () => {
    if (!isGroupEvent) return null;
    const groups: Record<string, any[]> = {};
    participants.forEach(p => {
      const key = p.team_name || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  };

  const filteredPrograms = (programs as any[]).filter(p => {
    const catMatch = categoryFilter === 'All' || p.category === categoryFilter;
    const typeMatch = typeFilter === 'All' || p.type === typeFilter;
    return catMatch && typeMatch;
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stage Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Manage Stage & Off-Stage Events, Set Status, and Generate Participant Codes.</p>
      </div>

      <div className="mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Info size={20} className="text-blue-600" /> Stage Admin Instructions
        </h3>
        <p className="text-sm mb-2">Follow these steps to manage events:</p>
        <ul className="list-disc pl-5 text-sm space-y-1.5 opacity-90">
          <li><strong>Step 1:</strong> When a program is about to start, click <strong className="text-emerald-700">Set Live</strong> to activate it.</li>
          <li><strong>Step 2:</strong> Click <strong>Participants</strong> to view the list of contestants for that program.</li>
          <li><strong>Step 3:</strong> Click <strong>Pick Code</strong> for each participant as they are about to perform. Provide them this code letter. Judges will evaluate them based on this code.</li>
          <li><strong>Step 4:</strong> Once the program ends, click <strong className="text-amber-700">Finish</strong>.</li>
        </ul>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider self-center mr-1">Category:</span>
        {['All', 'Premier', 'Junior', 'Senior', 'General'].map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider self-center mr-1">Type:</span>
        {['All', 'stage', 'off-stage'].map(type => (
          <button key={type} onClick={() => setTypeFilter(type)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${typeFilter === type ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {type === 'All' ? 'All Types' : type}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Program</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Category</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Type</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Registered</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPrograms.map((p: any) => (
              <React.Fragment key={p.id}>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {p.title}
                      {p.is_group && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase">
                          <Users size={10} /> Group
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600"><span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium">{p.category}</span></td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${p.type === 'stage' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                      {p.registered_count || 0} Registered
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      p.status === 'live' ? 'bg-rose-100 text-rose-700' : 
                      p.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 sm:gap-4 flex-wrap">
                    {p.status === 'scheduled' && (
                      <>
                        <button onClick={() => handleToggleCall(p)} title={p.is_called ? "Revoke Call" : "Call Participants"} className={`${p.is_called ? 'text-rose-600 hover:text-rose-700' : 'text-indigo-600 hover:text-indigo-700'} font-semibold flex items-center gap-1.5`}>
                          {p.is_called ? <><BellOff size={16} /> Revoke</> : <><Bell size={16} /> Call</>}
                        </button>
                        <button onClick={() => handleSetStatus(p.id, 'live')} className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1.5"><Play size={16} /> Set Live</button>
                      </>
                    )}
                    {p.status === 'live' && (
                      <>
                        <button onClick={() => handleSetStatus(p.id, 'scheduled')} className="text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1.5"><RefreshCw size={16} /> Reset</button>
                        <button onClick={() => handleSetStatus(p.id, 'completed')} className="text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1.5"><CheckCircle size={16} /> Finish</button>
                      </>
                    )}
                    {p.status === 'completed' && (
                      <button onClick={() => handleSetStatus(p.id, 'scheduled')} className="text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1.5"><RefreshCw size={16} /> Reset</button>
                    )}
                    <button onClick={() => handleToggleParticipants(p.id)} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 text-sm">
                      Participants {expandedProgramId === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Participants Row */}
                {expandedProgramId === p.id && (
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <td colSpan={6} className="px-6 py-6">
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                          <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                            Participants ({participants.length})
                            {isGroupEvent && <span className="ml-2 text-indigo-600 normal-case">(Group Event — participants grouped by team)</span>}
                          </span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleRandomizeAllCodes(p.id)}
                              title="Randomly assign code letters to all participants"
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Shuffle size={14} /> Randomize All Codes
                            </button>
                            <button 
                              onClick={() => handleResetAllCodes(p.id)}
                              title="Clear all assigned code letters for this program"
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <RotateCcw size={14} /> Reset All Codes
                            </button>
                          </div>
                        </div>

                        {isGroupEvent ? (
                          /* Group Event View — grouped by team */
                          <div className="divide-y divide-slate-100">
                            {Object.entries(getGroupedParticipants() || {}).map(([teamName, members]) => {
                              const representative = members[0];
                              return (
                                <div key={teamName} className="p-4">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="p-1.5 bg-indigo-100 rounded-lg"><Users size={16} className="text-indigo-600" /></div>
                                    <div>
                                      <p className="font-bold text-slate-900">Team {teamName}</p>
                                      <p className="text-xs text-slate-500">Representative: <strong>{representative?.student_name}</strong> (Chest: {representative?.chest_number}) · {members.length} members</p>
                                    </div>
                                    <div className="ml-auto">
                                      {representative?.code_letter ? (
                                        <div className="flex items-center gap-2">
                                          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold font-mono text-lg rounded shadow-sm">{representative.code_letter}</span>
                                          <button 
                                            onClick={() => handleResetSingleCode(representative.registration_id)}
                                            title="Reset Code Letter"
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                          >
                                            <RotateCcw size={14} />
                                          </button>
                                        </div>
                                      ) : (
                                        <button onClick={() => handleGenerateCode(representative.registration_id)} className="bg-[#14532D] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#14532D]/90 flex items-center gap-1.5 shadow-sm">
                                          <Key size={14} /> Pick Code for Team
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="ml-10 flex flex-wrap gap-2">
                                    {members.map((m: any) => (
                                      <span key={m.registration_id} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                                        {m.student_name} <span className="text-slate-400 font-mono">#{m.chest_number}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Solo Event View — original table */
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50/50 border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-3 text-slate-600 font-medium">Chest No.</th>
                                <th className="px-4 py-3 text-slate-600 font-medium">Name</th>
                                <th className="px-4 py-3 text-slate-600 font-medium">Team</th>
                                <th className="px-4 py-3 text-slate-600 font-medium text-right">Code Letter</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {participants.map(part => (
                                <tr key={part.registration_id}>
                                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{part.chest_number}</td>
                                  <td className="px-4 py-3 font-medium">{part.student_name}</td>
                                  <td className="px-4 py-3 text-slate-600">{part.team_name}</td>
                                  <td className="px-4 py-3 text-right">
                                    {part.code_letter ? (
                                      <div className="flex items-center justify-end gap-2">
                                        <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold font-mono text-lg rounded shadow-sm">{part.code_letter}</span>
                                        <button 
                                          onClick={() => handleResetSingleCode(part.registration_id)}
                                          title="Reset Code Letter"
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        >
                                          <RotateCcw size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <button onClick={() => handleGenerateCode(part.registration_id)} className="bg-[#14532D] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#14532D]/90 flex items-center gap-1.5 ml-auto shadow-sm">
                                        <Key size={14} /> Pick Random Code
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {participants.length === 0 && (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">No participants registered for this program.</td></tr>
                              )}
                            </tbody>
                          </table>
                        )}

                        {isGroupEvent && participants.length === 0 && (
                          <div className="px-4 py-8 text-center text-slate-500 italic">No participants registered for this program.</div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filteredPrograms.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No programs{categoryFilter !== 'All' ? ` in ${categoryFilter}` : ''}{typeFilter !== 'All' ? ` (${typeFilter})` : ''} available.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
