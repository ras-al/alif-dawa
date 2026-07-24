import React, { useState } from 'react';
import axios from 'axios';

const ParticipantCodePicker = () => {
  const [chestNumber, setChestNumber] = useState('');
  const [programId, setProgramId] = useState('');
  const [codeLetter, setCodeLetter] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState('');

  const handlePick = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsPicking(true);
    setCodeLetter(null);

    // Simulate slot machine effect
    setTimeout(async () => {
      try {
        const response = await axios.post('http://localhost:5000/api/fest/public/pick-code', {
          chest_number: chestNumber,
          program_id: parseInt(programId, 10),
        });
        setCodeLetter(response.data.code_letter);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to generate code letter');
      } finally {
        setIsPicking(false);
      }
    }, 1500); // 1.5s animation delay
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 text-center mb-8">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
            Pick Your Code
          </h2>
          <p className="text-slate-400 text-sm mt-2">Enter your chest number and program ID to reveal your unique code letter.</p>
        </div>

        {codeLetter ? (
          <div className="text-center animate-fade-in-up">
            <div className="w-32 h-32 mx-auto bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 transform transition-transform hover:scale-105 mb-6">
              <span className="text-6xl font-black text-white">{codeLetter}</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Congratulations!</h3>
            <p className="text-slate-400 mb-8">This is your unique code for the event. Do not share it with the judges.</p>
            <button 
              onClick={() => { setCodeLetter(null); setChestNumber(''); setProgramId(''); }}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors border border-white/10 w-full"
            >
              Pick Another Code
            </button>
          </div>
        ) : (
          <form onSubmit={handlePick} className="space-y-6 relative z-10">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm text-center">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Chest Number</label>
              <input 
                type="text" 
                value={chestNumber}
                onChange={(e) => setChestNumber(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="e.g., 105"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Program ID</label>
              <input 
                type="number" 
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="e.g., 1"
              />
            </div>
            <button 
              type="submit"
              disabled={isPicking}
              className={`w-full py-4 rounded-xl font-bold text-lg text-slate-900 transition-all ${
                isPicking 
                  ? 'bg-emerald-500/50 cursor-not-allowed animate-pulse' 
                  : 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
              }`}
            >
              {isPicking ? 'Randomizing...' : 'Reveal My Code'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ParticipantCodePicker;
