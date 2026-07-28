import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Play, CheckCircle, ChevronDown, ChevronUp, Key, Info, Bell, BellOff, RefreshCw, Shuffle, RotateCcw } from 'lucide-react';

export default function StageAdminDashboard() {
  const [programs, setPrograms] = useState([]);
  const [expandedProgramId, setExpandedProgramId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const fetchPrograms = async () => {
    try {
      const res = await api.get('/fest/public/programs');
      setPrograms(res.data.filter((p: any) => p.type === 'stage'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

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
    
    try {
      const res = await api.get(`/fest/stage-admin/programs/${programId}/participants`);
      setParticipants(res.data);
      setExpandedProgramId(programId);
    } catch (err) {
      alert('Failed to load participants');
    }
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
      const res = await api.get(`/fest/stage-admin/programs/${programId}/participants`);
      setParticipants(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to randomize codes');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stage Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Manage Stage Events, Set Status, and Generate Participant Codes.</p>
      </div>

      <div className="mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Info size={20} className="text-blue-600" /> Stage Admin Instructions
        </h3>
        <p className="text-sm mb-2">Follow these steps to manage stage events:</p>
        <ul className="list-disc pl-5 text-sm space-y-1.5 opacity-90">
          <li><strong>Step 1:</strong> When a program is about to start, click <strong className="text-emerald-700">Set Live</strong> to activate it.</li>
          <li><strong>Step 2:</strong> Click <strong>Participants</strong> to view the list of contestants for that program.</li>
          <li><strong>Step 3:</strong> Click <strong>Pick Code</strong> for each participant as they are about to perform. Provide them this code letter. Judges will evaluate them based on this code.</li>
          <li><strong>Step 4:</strong> Once the program ends, click <strong className="text-amber-700">Finish</strong>.</li>
        </ul>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['All', 'Premier', 'Junior', 'Senior', 'General'].map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[550px] text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Program</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Category</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Registered</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(programs as any[]).filter(p => categoryFilter === 'All' || p.category === categoryFilter).map((p: any) => (
              <React.Fragment key={p.id}>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.title}</td>
                  <td className="px-6 py-4 text-slate-600"><span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium">{p.category}</span></td>
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
                    <td colSpan={5} className="px-6 py-6">
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                          <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Participants ({participants.length})</span>
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
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {(programs as any[]).filter(p => categoryFilter === 'All' || p.category === categoryFilter).length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No stage programs{categoryFilter !== 'All' ? ` in ${categoryFilter}` : ''} available.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
