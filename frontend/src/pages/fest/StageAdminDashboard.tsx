import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Play, CheckCircle, ChevronDown, ChevronUp, Key, Info, Bell, BellOff, RefreshCw } from 'lucide-react';

export default function StageAdminDashboard() {
  const [programs, setPrograms] = useState([]);
  const [expandedProgramId, setExpandedProgramId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Program</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Category</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {programs.map((p: any) => (
              <React.Fragment key={p.id}>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.title}</td>
                  <td className="px-6 py-4 text-slate-600"><span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium">{p.category}</span></td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      p.status === 'live' ? 'bg-rose-100 text-rose-700' : 
                      p.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-4">
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
                    <button onClick={() => handleToggleParticipants(p.id)} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                      Participants {expandedProgramId === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </td>
                </tr>
                
                {/* Expanded Participants Row */}
                {expandedProgramId === p.id && (
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <td colSpan={4} className="px-6 py-6">
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
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
                                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold font-mono text-lg rounded shadow-sm">{part.code_letter}</span>
                                  ) : (
                                    <button onClick={() => handleGenerateCode(part.registration_id)} className="bg-[#14532D] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#14532D]/90 flex items-center gap-1.5 ml-auto">
                                      <Key size={14} /> Pick Code
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
            {programs.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No stage programs available.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
