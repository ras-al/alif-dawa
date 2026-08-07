import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Play, CheckCircle, ChevronDown, ChevronUp, Key, Info, Bell, BellOff, RefreshCw, Shuffle, RotateCcw, Users, UserCheck, ArrowRight, Zap } from 'lucide-react';

type WorkflowStep = 'programs' | 'attendance' | 'codes' | null;

export default function StageAdminDashboard() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [step, setStep] = useState<WorkflowStep>('programs');
  const [participants, setParticipants] = useState<any[]>([]);
  const [isGroupEvent, setIsGroupEvent] = useState(false);
  const [presentIds, setPresentIds] = useState<Set<number>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [saving, setSaving] = useState(false);

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/fest/public/programs');
      setPrograms(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchPrograms();
    const iv = setInterval(fetchPrograms, 15000);
    return () => clearInterval(iv);
  }, []);

  const fetchParticipants = async (programId: number) => {
    try {
      const res = await api.get(`/fest/stage-admin/programs/${programId}/participants`);
      const parts = res.data.participants || res.data;
      setParticipants(parts);
      setIsGroupEvent(res.data.is_group || false);
      const present = new Set<number>();
      parts.forEach((p: any) => { if (p.is_present) present.add(p.registration_id); });
      setPresentIds(present);
    } catch (err) { console.error(err); }
  };

  const handleGoLive = async (program: any) => {
    try {
      await api.put(`/fest/admin/programs/${program.id}/status-notify`, { status: 'live' });
      await fetchPrograms();
      setActiveProgram({ ...program, status: 'live' });
      await fetchParticipants(program.id);
      setStep('attendance');
    } catch { alert('Failed to go live'); }
  };

  const handleToggleCall = async (program: any) => {
    const isCalled = program.is_called;
    try {
      if (isCalled) {
        if (!confirm('Revoke the reporting call?')) return;
        await api.put(`/fest/admin/programs/${program.id}/revoke-call`);
      } else {
        await api.put(`/fest/admin/programs/${program.id}/call-participants`);
        alert('Reporting call sent!');
      }
      fetchPrograms();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleOpenWorkflow = async (program: any) => {
    setActiveProgram(program);
    await fetchParticipants(program.id);
    if (program.status === 'live') {
      const hasAnyCodes = (await api.get(`/fest/stage-admin/programs/${program.id}/participants`)).data.participants?.some((p: any) => p.code_letter);
      setStep(hasAnyCodes ? 'codes' : 'attendance');
    } else {
      setStep('attendance');
    }
  };

  const togglePresent = (regId: number) => {
    setPresentIds(prev => {
      const next = new Set(prev);
      next.has(regId) ? next.delete(regId) : next.add(regId);
      return next;
    });
  };

  const toggleAllPresent = () => {
    if (presentIds.size === participants.length) {
      setPresentIds(new Set());
    } else {
      setPresentIds(new Set(participants.map(p => p.registration_id)));
    }
  };

  const handleSaveAttendance = async () => {
    if (!activeProgram) return;
    setSaving(true);
    try {
      await api.post(`/fest/stage-admin/programs/${activeProgram.id}/mark-attendance`, {
        present_ids: Array.from(presentIds)
      });
      setStep('codes');
      await fetchParticipants(activeProgram.id);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save attendance');
    } finally { setSaving(false); }
  };

  const handleGenerateCode = async (registrationId: number) => {
    try {
      const res = await api.post('/fest/stage-admin/generate-code', { registration_id: registrationId });
      setParticipants(prev => prev.map(p =>
        p.registration_id === registrationId ? { ...p, code_letter: res.data.code_letter } : p
      ));
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleResetSingleCode = async (registrationId: number) => {
    if (!confirm('Reset code?')) return;
    try {
      await api.post('/fest/stage-admin/reset-code', { registration_id: registrationId });
      setParticipants(prev => prev.map(p =>
        p.registration_id === registrationId ? { ...p, code_letter: null } : p
      ));
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleRandomizeAllCodes = async () => {
    if (!activeProgram || !confirm('Randomize codes for present participants?')) return;
    try {
      await api.post('/fest/stage-admin/randomize-program-codes', { program_id: activeProgram.id });
      await fetchParticipants(activeProgram.id);
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleResetAllCodes = async () => {
    if (!activeProgram || !confirm('Reset ALL codes?')) return;
    try {
      await api.post('/fest/stage-admin/reset-program-codes', { program_id: activeProgram.id });
      setParticipants(prev => prev.map(p => ({ ...p, code_letter: null })));
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleFinishStage = async () => {
    if (!activeProgram) return;
    if (!confirm('Finish this stage? The program will move to the Judging phase.')) return;
    try {
      await api.post(`/fest/stage-admin/programs/${activeProgram.id}/finish-stage`);
      alert('Stage finished! Program moved to Judging phase.');
      setActiveProgram(null);
      setStep('programs');
      setParticipants([]);
      fetchPrograms();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleSetStatus = async (id: number, status: string) => {
    try {
      await api.put(`/fest/admin/programs/${id}/status-notify`, { status });
      fetchPrograms();
    } catch { alert('Failed to update status'); }
  };

  const presentParticipants = participants.filter(p => p.is_present);
  const filteredPrograms = programs.filter(p => {
    const catMatch = categoryFilter === 'All' || p.category === categoryFilter;
    const typeMatch = typeFilter === 'All' || p.type === typeFilter;
    return catMatch && typeMatch;
  });

  const stepIndicator = (currentStep: WorkflowStep) => {
    const steps = [
      { key: 'attendance', label: 'Attendance', icon: UserCheck },
      { key: 'codes', label: 'Pick Codes', icon: Key },
      { key: 'finish', label: 'Finish', icon: CheckCircle },
    ];
    const activeIdx = currentStep === 'attendance' ? 0 : currentStep === 'codes' ? 1 : 2;
    return (
      <div className="flex items-center justify-center gap-1 mb-6">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === activeIdx;
          const isDone = i < activeIdx;
          return (
            <React.Fragment key={s.key}>
              {i > 0 && <div className={`w-8 sm:w-12 h-0.5 ${isDone ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-[#14532D] text-white shadow-lg scale-105' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                <Icon size={14} />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // ===== WORKFLOW VIEW =====
  if (activeProgram && step !== 'programs') {
    return (
      <div className="max-w-5xl mx-auto pb-12">
        <button onClick={() => { setActiveProgram(null); setStep('programs'); }} className="text-sm text-slate-500 hover:text-slate-900 mb-4 flex items-center gap-1">← Back to Programs</button>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {activeProgram.title}
                {isGroupEvent && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold uppercase"><Users size={10} className="inline mr-1" />Group</span>}
              </h2>
              <p className="text-sm text-slate-500">{activeProgram.category} • {activeProgram.type}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${activeProgram.status === 'live' ? 'bg-rose-100 text-rose-700 animate-pulse' : activeProgram.status === 'judging' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
              ● {activeProgram.status?.toUpperCase()}
            </span>
          </div>
        </div>

        {stepIndicator(step)}

        {/* STEP 1: ATTENDANCE */}
        {step === 'attendance' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-up">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><UserCheck size={18} className="text-emerald-600" /> Mark Present Participants</h3>
                <p className="text-xs text-slate-500 mt-0.5">{presentIds.size} of {participants.length} marked present</p>
              </div>
              <button onClick={toggleAllPresent} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors">
                {presentIds.size === participants.length ? 'Uncheck All' : 'Check All'}
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {participants.map(p => (
                <label key={p.registration_id} className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors ${presentIds.has(p.registration_id) ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={presentIds.has(p.registration_id)} onChange={() => togglePresent(p.registration_id)}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600" />
                  <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded">{p.chest_number}</span>
                  <span className="font-medium text-slate-800 flex-1">{p.student_name}</span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{p.team_name}</span>
                </label>
              ))}
              {participants.length === 0 && <div className="px-5 py-12 text-center text-slate-500 italic">No participants registered.</div>}
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={handleSaveAttendance} disabled={presentIds.size === 0 || saving}
                className="px-6 py-2.5 bg-[#14532D] hover:bg-[#166534] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                {saving ? 'Saving...' : <><ArrowRight size={16} /> Next: Generate Codes</>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PICK CODES */}
        {step === 'codes' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-up">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Key size={18} className="text-amber-600" /> Pick Codes</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {presentParticipants.filter(p => p.code_letter).length} of {presentParticipants.length} codes assigned
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('attendance')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors">← Attendance</button>
                <button onClick={handleRandomizeAllCodes} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm">
                  <Shuffle size={14} /> Randomize All
                </button>
                <button onClick={handleResetAllCodes} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm">
                  <RotateCcw size={14} /> Reset All
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-slate-600 font-medium">Chest</th>
                    <th className="px-5 py-3 text-left text-slate-600 font-medium">Name</th>
                    <th className="px-5 py-3 text-left text-slate-600 font-medium">Team</th>
                    <th className="px-5 py-3 text-right text-slate-600 font-medium">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {presentParticipants.map(p => (
                    <tr key={p.registration_id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">{p.chest_number}</td>
                      <td className="px-5 py-3 font-medium">{p.student_name}</td>
                      <td className="px-5 py-3 text-slate-600">{p.team_name}</td>
                      <td className="px-5 py-3 text-right">
                        {p.code_letter ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold font-mono text-lg rounded shadow-sm">{p.code_letter}</span>
                            <button onClick={() => handleResetSingleCode(p.registration_id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><RotateCcw size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => handleGenerateCode(p.registration_id)} className="bg-[#14532D] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#14532D]/90 flex items-center gap-1.5 ml-auto shadow-sm">
                            <Key size={14} /> Pick Code
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {presentParticipants.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500 italic">No present participants. Go back to mark attendance.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={handleFinishStage}
                disabled={presentParticipants.filter(p => p.code_letter).length === 0}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                <Zap size={16} /> Finish Stage → Judging
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== PROGRAMS LIST VIEW =====
  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stage Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Manage events with the workflow: Go Live → Attendance → Pick Codes → Finish → Judging</p>
      </div>

      <div className="mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900 shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Info size={20} className="text-blue-600" /> Workflow Instructions</h3>
        <ul className="list-disc pl-5 text-sm space-y-1.5 opacity-90">
          <li><strong>Step 1:</strong> Click <strong className="text-emerald-700">Go Live</strong> to start the competition.</li>
          <li><strong>Step 2:</strong> Mark present participants in the <strong>Attendance</strong> tab.</li>
          <li><strong>Step 3:</strong> Generate <strong>Pick Codes</strong> for each present participant.</li>
          <li><strong>Step 4:</strong> Click <strong className="text-amber-700">Finish Stage</strong> to move to Judging.</li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider self-center mr-1">Category:</span>
        {['All', 'Premier', 'Junior', 'Senior', 'General'].map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${categoryFilter === cat ? 'bg-[#14532D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat}</button>
        ))}
      </div>
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
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">
                  <div className="flex items-center gap-2">
                    {p.title}
                    {p.is_group && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase"><Users size={10} /> Group</span>}
                  </div>
                </td>
                <td className="px-6 py-4"><span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium">{p.category}</span></td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${p.type === 'stage' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{p.type}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">{p.registered_count || 0}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    p.status === 'live' ? 'bg-rose-100 text-rose-700' :
                    p.status === 'judging' ? 'bg-blue-100 text-blue-700' :
                    p.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{p.status}</span>
                </td>
                <td className="px-4 sm:px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 sm:gap-3 flex-wrap">
                    {p.status === 'scheduled' && (
                      <>
                        <button onClick={() => handleToggleCall(p)} className={`${p.is_called ? 'text-rose-600 hover:text-rose-700' : 'text-indigo-600 hover:text-indigo-700'} font-semibold flex items-center gap-1.5 text-sm`}>
                          {p.is_called ? <><BellOff size={16} /> Revoke</> : <><Bell size={16} /> Call</>}
                        </button>
                        <button onClick={() => handleGoLive(p)} className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1.5 text-sm"><Play size={16} /> Go Live</button>
                      </>
                    )}
                    {p.status === 'live' && (
                      <>
                        <button onClick={() => handleOpenWorkflow(p)} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 text-sm bg-blue-50 px-3 py-1.5 rounded-lg"><ArrowRight size={16} /> Continue</button>
                        <button onClick={() => handleSetStatus(p.id, 'scheduled')} className="text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1.5 text-sm"><RefreshCw size={16} /> Reset</button>
                      </>
                    )}
                    {p.status === 'judging' && (
                      <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg">Awaiting Judges</span>
                    )}
                    {p.status === 'completed' && (
                      <button onClick={() => handleSetStatus(p.id, 'scheduled')} className="text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1.5 text-sm"><RefreshCw size={16} /> Reset</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredPrograms.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No programs available.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
