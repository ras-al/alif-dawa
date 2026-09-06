import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Award, Search, X, ArrowLeft, BookOpen, Trash2, Info, IndianRupee, ChevronDown, ChevronUp } from 'lucide-react';

interface Student {
  student_id: number;
  student_name: string;
  admission_number: string;
  class_name: string;
  chest_number: string;
  team_name: string;
  individual_points: number;
  general_points: number;
  total_points: number;
  total_award_amount: number;
  total_redeemed: number;
  remaining_balance: number;
}

interface Competition {
  program_title: string;
  category: string;
  is_group: boolean;
  position: number;
  points: number;
  grade: string;
  sequence_number: number;
  effective_points: number;
  team_member_count: number;
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  note: string;
  created_at: string;
  redeemed_by_name: string;
}

interface StudentDetail extends Student {
  competitions: Competition[];
  transactions: Transaction[];
}

export default function AwardPointDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showRedeemForm, setShowRedeemForm] = useState(false);
  const [redeemDesc, setRedeemDesc] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemNote, setRedeemNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const loadStudents = async () => {
    try {
      const res = await api.get('/fest/award-point/students');
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudentDetail = async (studentId: number) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/fest/award-point/students/${studentId}`);
      setSelectedStudent(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load student details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelectStudent = (s: Student) => {
    loadStudentDetail(s.student_id);
    setShowRedeemForm(false);
  };

  const handleRedeem = async () => {
    if (!selectedStudent || !redeemDesc.trim() || !redeemAmount) return;
    const amount = parseFloat(redeemAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (amount > selectedStudent.remaining_balance) {
      alert(`Insufficient balance! Available: ₹${Number(selectedStudent.remaining_balance).toFixed(0)}`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/fest/award-point/redeem', {
        student_id: selectedStudent.student_id,
        description: redeemDesc.trim(),
        amount,
        note: redeemNote.trim() || null
      });
      // Reload student detail
      await loadStudentDetail(selectedStudent.student_id);
      await loadStudents();
      setShowRedeemForm(false);
      setRedeemDesc('');
      setRedeemAmount('');
      setRedeemNote('');
      alert('Reward recorded successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record reward');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndoRedeem = async (txId: number) => {
    if (!confirm('Are you sure you want to undo this reward/book entry?')) return;
    try {
      await api.delete(`/fest/award-point/redeem/${txId}`);
      if (selectedStudent) {
        await loadStudentDetail(selectedStudent.student_id);
      }
      await loadStudents();
    } catch (err) {
      console.error(err);
      alert('Failed to undo');
    }
  };

  const filtered = students.filter(s =>
    s.student_name.toLowerCase().includes(search.toLowerCase()) ||
    s.chest_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.team_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  const formatAmount = (val: number) => `₹${Number(val).toFixed(0)}`;

  if (selectedStudent) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedStudent(null)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Back to All Students
        </button>

        {detailLoading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : (
          <>
            {/* Student Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedStudent.student_name}</h2>
                  <p className="text-sm text-slate-500">
                    {selectedStudent.chest_number && <span className="mr-3">Chest: {selectedStudent.chest_number}</span>}
                    {selectedStudent.team_name && <span className="mr-3">Team: {selectedStudent.team_name}</span>}
                    {selectedStudent.class_name && <span>Class: {selectedStudent.class_name}</span>}
                  </p>
                </div>
                <button
                  onClick={() => { setShowRedeemForm(true); setRedeemDesc(''); setRedeemAmount(''); setRedeemNote(''); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#14532D] text-white rounded-lg font-medium hover:bg-[#166534] transition-colors text-sm self-start"
                >
                  <BookOpen size={16} /> Add Reward / Book
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Points</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{Number(selectedStudent.total_points).toFixed(1)}</p>
                  <p className="text-xs text-blue-500 mt-0.5">
                    Ind: {Number(selectedStudent.individual_points).toFixed(1)} + Gen: {Number(selectedStudent.general_points).toFixed(1)}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Award</p>
                  <p className="text-2xl font-bold text-emerald-900 mt-1">{formatAmount(selectedStudent.total_award_amount)}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">Points × ₹10</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Used</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{formatAmount(selectedStudent.total_redeemed)}</p>
                  <p className="text-xs text-amber-500 mt-0.5">Books / Rewards</p>
                </div>
                <div className={`rounded-xl p-4 border ${Number(selectedStudent.remaining_balance) > 0 ? 'bg-violet-50 border-violet-100' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${Number(selectedStudent.remaining_balance) > 0 ? 'text-violet-600' : 'text-slate-500'}`}>Balance</p>
                  <p className={`text-2xl font-bold mt-1 ${Number(selectedStudent.remaining_balance) > 0 ? 'text-violet-900' : 'text-slate-500'}`}>{formatAmount(selectedStudent.remaining_balance)}</p>
                  <p className={`text-xs mt-0.5 ${Number(selectedStudent.remaining_balance) > 0 ? 'text-violet-500' : 'text-slate-400'}`}>Available</p>
                </div>
              </div>
            </div>

            {/* Redeem Form */}
            {showRedeemForm && (
              <div className="bg-white rounded-2xl border-2 border-[#14532D]/20 p-6 mb-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen size={20} className="text-[#14532D]" /> New Reward / Book
                  </h3>
                  <button onClick={() => setShowRedeemForm(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reward / Book Name *</label>
                    <input
                      type="text"
                      value={redeemDesc}
                      onChange={e => setRedeemDesc(e.target.value)}
                      placeholder="e.g. Arabic Grammar Book"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                    <div className="relative">
                      <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={redeemAmount}
                        onChange={e => setRedeemAmount(e.target.value)}
                        placeholder="100"
                        min="1"
                        max={Number(selectedStudent.remaining_balance)}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Max available: {formatAmount(selectedStudent.remaining_balance)}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Note (Optional)</label>
                  <input
                    type="text"
                    value={redeemNote}
                    onChange={e => setRedeemNote(e.target.value)}
                    placeholder="Any additional notes..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none"
                  />
                </div>
                {redeemAmount && parseFloat(redeemAmount) > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
                    <p className="text-slate-700">
                      Balance: {formatAmount(selectedStudent.remaining_balance)} − {formatAmount(parseFloat(redeemAmount))} = <strong className="text-[#14532D]">{formatAmount(Number(selectedStudent.remaining_balance) - parseFloat(redeemAmount))}</strong> remaining
                    </p>
                  </div>
                )}
                <button
                  onClick={handleRedeem}
                  disabled={submitting || !redeemDesc.trim() || !redeemAmount || parseFloat(redeemAmount) <= 0 || parseFloat(redeemAmount) > Number(selectedStudent.remaining_balance)}
                  className="px-6 py-2.5 bg-[#14532D] text-white rounded-lg font-medium hover:bg-[#166534] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                >
                  {submitting ? 'Processing...' : '✓ Confirm & Deduct'}
                </button>
              </div>
            )}

            {/* Competition Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4">Competition Breakdown</h3>
              {selectedStudent.competitions?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-medium">Program</th>
                        <th className="px-3 py-2.5 text-left font-medium">Category</th>
                        <th className="px-3 py-2.5 text-center font-medium">Position</th>
                        <th className="px-3 py-2.5 text-center font-medium">Points</th>
                        <th className="px-3 py-2.5 text-center font-medium">Effective</th>
                        <th className="px-3 py-2.5 text-center font-medium">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudent.competitions.map((c, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2.5 font-medium text-slate-900">
                            {c.sequence_number && <span className="text-xs font-bold text-[#14532D] mr-1.5">#{String(c.sequence_number).padStart(3, '0')}</span>}
                            {c.program_title}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500">{c.category}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${c.position === 1 ? 'bg-yellow-100 text-yellow-700' : c.position === 2 ? 'bg-slate-100 text-slate-600' : c.position === 3 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'}`}>
                              {c.position}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-600">
                            {c.points}
                            {c.team_member_count > 1 && (
                              <span className="text-xs text-slate-400 ml-1">÷{c.team_member_count}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center font-semibold text-[#14532D]">
                            {Number(c.effective_points).toFixed(1)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {c.grade && c.grade !== 'No Grade' ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded">{c.grade}</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded border border-slate-200">No Grade</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No competition data found.</p>
              )}
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4">Reward History</h3>
              {selectedStudent.transactions?.length > 0 ? (
                <div className="space-y-3">
                  {selectedStudent.transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-amber-600 flex-shrink-0" />
                          <p className="text-sm font-medium text-slate-900 truncate">{tx.description}</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          {tx.redeemed_by_name && <span className="ml-2">by {tx.redeemed_by_name}</span>}
                        </p>
                        {tx.note && <p className="text-xs text-slate-400 mt-0.5 italic">{tx.note}</p>}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="text-sm font-bold text-amber-700">-{formatAmount(tx.amount)}</span>
                        <button
                          onClick={() => handleUndoRedeem(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Undo this reward"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No rewards given yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="text-[#14532D]" size={28} /> Award Point
        </h1>
      </div>

      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 text-blue-900 shadow-sm">
        <h3 className="font-bold text-base mb-2 flex items-center gap-2">
          <Info size={18} className="text-blue-600" /> How Award Points Work
        </h3>
        <ul className="list-disc pl-5 text-sm space-y-1 opacity-90">
          <li><strong>1 Point = ₹10</strong> — Each competition point is worth ₹10 in award value.</li>
          <li><strong>Individual events:</strong> Student receives full points from their result.</li>
          <li><strong>General events:</strong> Points are divided equally among all participating team members.</li>
          <li>Students can use their balance to get <strong>books or rewards</strong>.</li>
        </ul>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, chest number, team..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] outline-none shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Students</p>
            <p className="text-xl font-bold text-slate-900">{students.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Total Earned</p>
            <p className="text-xl font-bold text-emerald-700">{formatAmount(students.reduce((a, s) => a + Number(s.total_award_amount), 0))}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Total Used</p>
            <p className="text-xl font-bold text-amber-700">{formatAmount(students.reduce((a, s) => a + Number(s.total_redeemed), 0))}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Total Balance</p>
            <p className="text-xl font-bold text-violet-700">{formatAmount(students.reduce((a, s) => a + Number(s.remaining_balance), 0))}</p>
          </div>
        </div>
      )}

      {/* Student Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading students...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Student</th>
                  <th className="px-3 py-3 text-left font-medium hidden sm:table-cell">Team</th>
                  <th className="px-3 py-3 text-center font-medium">Points</th>
                  <th className="px-3 py-3 text-center font-medium">Award</th>
                  <th className="px-3 py-3 text-center font-medium hidden sm:table-cell">Used</th>
                  <th className="px-3 py-3 text-center font-medium">Balance</th>
                  <th className="px-3 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <>
                    <tr
                      key={s.student_id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(expandedRow === s.student_id ? null : s.student_id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="text-slate-400 sm:hidden">
                            {expandedRow === s.student_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <div>
                            <p className="font-medium text-slate-900">{s.student_name}</p>
                            <p className="text-xs text-slate-500">
                              {s.chest_number && `#${s.chest_number}`} {s.class_name && `· ${s.class_name}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-500 hidden sm:table-cell">{s.team_name}</td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-900">{Number(s.total_points).toFixed(1)}</td>
                      <td className="px-3 py-3 text-center font-semibold text-emerald-700">{formatAmount(s.total_award_amount)}</td>
                      <td className="px-3 py-3 text-center text-amber-700 hidden sm:table-cell">{Number(s.total_redeemed) > 0 ? formatAmount(s.total_redeemed) : '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold ${Number(s.remaining_balance) > 0 ? 'text-violet-700' : 'text-slate-400'}`}>
                          {formatAmount(s.remaining_balance)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectStudent(s); }}
                          className="px-3 py-1.5 bg-[#14532D] text-white rounded-lg text-xs font-medium hover:bg-[#166534] transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                    {/* Mobile expanded row */}
                    {expandedRow === s.student_id && (
                      <tr key={`exp-${s.student_id}`} className="sm:hidden border-b border-slate-100 bg-slate-50/50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div>
                              <p className="text-slate-500">Team</p>
                              <p className="font-medium">{s.team_name}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Used</p>
                              <p className="font-medium text-amber-700">{Number(s.total_redeemed) > 0 ? formatAmount(s.total_redeemed) : '—'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Ind / Gen</p>
                              <p className="font-medium">{Number(s.individual_points).toFixed(1)} / {Number(s.general_points).toFixed(1)}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      {search ? 'No students match your search.' : 'No students with award points found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
