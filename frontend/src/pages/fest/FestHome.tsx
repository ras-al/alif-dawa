import { useState, useEffect } from 'react';
import { Share2, Download, Calendar, MapPin, Award, Radio, Users, Star, Music, Activity, Trophy } from 'lucide-react';
import axios from 'axios';

interface Result {
  id: number;
  position: number;
  points: number;
  program_title: string;
  category: string;
  team_name: string;
  student_name: string;
}

interface LeaderboardTeam {
  id: number;
  team_name: string;
  total_points: number;
}

interface Program {
  id: number;
  title: string;
  category: string;
  type: string;
  status: string;
}

const FestHome = () => {
  const [activeTab, setActiveTab] = useState<'about' | 'live' | 'results' | 'leaderboard'>('about');
  const [results, setResults] = useState<Result[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resPrograms, resResults, resLeaderboard] = await Promise.all([
          axios.get('http://localhost:5000/api/fest/public/programs'),
          axios.get('http://localhost:5000/api/fest/public/results'),
          axios.get('http://localhost:5000/api/fest/public/leaderboard')
        ]);
        setPrograms(resPrograms.data);
        setResults(resResults.data);
        setLeaderboard(resLeaderboard.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleShare = (result: Result) => {
    const text = `Fest Result Published!\n\nEvent: ${result.program_title} (${result.category})\nWinner: ${result.student_name} (${result.team_name})\nPosition: ${result.position}\n\nCongratulations!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadPoster = (result: Result) => {
    // Placeholder for actual poster download logic, since PDF isn't implemented completely in backend yet.
    alert(`Downloading poster for ${result.student_name}...`);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200 relative overflow-hidden">
      
      {/* Background Animated Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/20 mix-blend-screen filter blur-[100px] animate-blob z-0 pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-900/10 mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000 z-0 pointer-events-none"></div>
      <div className="fixed top-[20%] left-[40%] w-[30vw] h-[30vw] rounded-full bg-emerald-900/10 mix-blend-screen filter blur-[80px] animate-blob animation-delay-4000 z-0 pointer-events-none"></div>

      {/* Top Navigation */}
      <div className="absolute top-0 right-0 p-6 z-50">
        <a href="/fest/login" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-sm font-semibold transition-all">
          Staff Login
        </a>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden min-h-[65vh] flex items-center justify-center">
        {/* Background Poster/Image */}
        <div className="absolute inset-0 z-0">
          <img src="/poster.jpeg" alt="Fest Poster" className="w-full h-full object-cover opacity-40 blur-[4px] scale-105 transform hover:scale-110 transition-transform duration-10000" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-[#0a0f1c]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1c]/80 via-transparent to-[#0a0f1c]/80" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 backdrop-blur-md border border-amber-500/30 text-xs font-bold tracking-widest uppercase text-amber-400 mb-8 animate-fade-in-up">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
            Alif Dawa College Annual Fest
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-6 text-white drop-shadow-2xl">
            The Ultimate <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 animate-gradient-x inline-block mt-2">Stage of Talent</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Experience the pinnacle of arts, culture, and intellect. Watch live updates, discover results, and celebrate the champions.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-40 bg-[#0a0f1c]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-center gap-2 sm:gap-8 overflow-x-auto no-scrollbar">
            {['about', 'live', 'results', 'leaderboard'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 sm:px-6 py-5 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all duration-300 relative whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'about' ? 'About Event' : tab === 'live' ? 'Live Events' : tab === 'results' ? 'Results' : 'Leaderboard'}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0 shadow-[0_-2px_10px_rgba(251,191,36,0.5)]"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="space-y-16">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Celebrating Excellence</h2>
                      <p className="text-slate-400 leading-relaxed text-lg font-light">
                        The Alif Dawa College Fest brings together the brightest minds and talents. Spanning across literature, arts, speaking, and more, this event is a true testament to our students' capabilities.
                      </p>
                    </div>
                    
                    <div className="space-y-6 pt-2">
                      <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                          <Calendar size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-bold text-white text-lg">3 Days of Festivity</p>
                          <p className="text-sm text-slate-400">Non-stop action and performances</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                          <MapPin size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-bold text-white text-lg">Main Campus Grounds</p>
                          <p className="text-sm text-slate-400">Multiple stages and off-stage venues</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative group perspective-1000">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-indigo-500/20 rounded-3xl transform rotate-3 scale-105 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 blur-xl"></div>
                    <img src="/poster.jpeg" alt="Event" className="relative rounded-3xl shadow-2xl border border-white/10 transform transition-transform duration-500 group-hover:-translate-y-2" />
                  </div>
                </div>

                {/* Stat Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Events', value: '96', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Categories', value: '4', icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Participants', value: '300+', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Stages', value: '3', icon: Music, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  ].map((stat, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-all hover:-translate-y-1">
                      <div className={`w-12 h-12 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
                        <stat.icon size={24} />
                      </div>
                      <h4 className="text-3xl font-black text-white mb-1">{stat.value}</h4>
                      <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LIVE EVENTS TAB */}
            {activeTab === 'live' && (
              <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-4 mb-10 justify-center">
                  <div className="relative">
                    <Radio className="text-rose-500 relative z-10" size={32} />
                    <div className="absolute inset-0 bg-rose-500 rounded-full blur-md animate-pulse opacity-50"></div>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white">Live & Scheduled Events</h2>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  {programs.filter(p => p.status !== 'completed').map((prog) => (
                    <div key={prog.id} className="group relative bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10 overflow-hidden">
                      {prog.status === 'live' && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-rose-400 to-rose-500 animate-gradient-x"></div>
                      )}
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">{prog.title}</h3>
                          <div className="flex gap-2 items-center">
                            <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-slate-300 border border-white/5">{prog.category}</span>
                            <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-slate-300 border border-white/5">{prog.type}</span>
                          </div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg ${
                          prog.status === 'live' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-rose-500/20' : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {prog.status === 'live' ? (
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                              Live Now
                            </span>
                          ) : 'Scheduled'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {programs.filter(p => p.status !== 'completed').length === 0 && (
                    <div className="col-span-2 text-center py-20 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-sm">
                      <p className="text-slate-400 text-lg">No live or scheduled events at the moment.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RESULTS TAB */}
            {activeTab === 'results' && (
              <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-4 mb-10 justify-center">
                  <div className="relative">
                    <Award className="text-amber-400 relative z-10" size={32} />
                    <div className="absolute inset-0 bg-amber-400 rounded-full blur-md animate-pulse opacity-50"></div>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white">Published Results</h2>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {results.map((res) => (
                    <div key={res.id} className="group relative rounded-3xl transition-all duration-500 hover:-translate-y-2 overflow-hidden bg-white/5 border border-white/10 backdrop-blur-xl">
                      {/* Position glowing background based on rank */}
                      <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full mix-blend-screen filter blur-[50px] opacity-50 transition-opacity group-hover:opacity-100 ${
                        res.position === 1 ? 'bg-amber-500' :
                        res.position === 2 ? 'bg-slate-300' :
                        'bg-orange-600'
                      }`}></div>

                      <div className="p-8 h-full flex flex-col relative z-10">
                        <div className="flex justify-between items-start mb-8">
                          <span className={`inline-flex items-center justify-center w-14 h-14 rounded-full font-black text-2xl border-2 shadow-lg ${
                            res.position === 1 ? 'border-amber-400 text-amber-400 bg-amber-400/10 shadow-amber-400/20' :
                            res.position === 2 ? 'border-slate-300 text-slate-300 bg-slate-300/10 shadow-slate-300/20' :
                            'border-orange-500 text-orange-500 bg-orange-500/10 shadow-orange-500/20'
                          }`}>
                            #{res.position}
                          </span>
                          <span className="text-xs font-bold px-3 py-1.5 bg-white/10 text-white rounded-lg uppercase tracking-widest border border-white/5">
                            {res.team_name}
                          </span>
                        </div>
                        
                        <div className="flex-grow">
                          <h3 className="text-2xl font-bold text-white mb-2 leading-tight">{res.student_name}</h3>
                          <p className="text-indigo-300 font-semibold mb-4 text-lg">{res.program_title}</p>
                          <div className="inline-block px-3 py-1 bg-white/5 rounded text-xs font-medium text-slate-400 border border-white/5 uppercase tracking-wider">{res.category}</div>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-white/10 flex gap-3">
                          <button onClick={() => handleShare(res)} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-xl transition-colors text-sm font-bold">
                            <Share2 size={18} /> Share
                          </button>
                          <button onClick={() => handleDownloadPoster(res)} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-colors text-sm font-bold">
                            <Download size={18} /> Poster
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {results.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-sm">
                      <p className="text-slate-400 text-lg">Results will be published here soon.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* LEADERBOARD TAB */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-4 mb-10 justify-center">
                  <div className="relative">
                    <Trophy className="text-amber-400 relative z-10" size={32} />
                    <div className="absolute inset-0 bg-amber-400 rounded-full blur-md animate-pulse opacity-50"></div>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white">Overall Leaderboard</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
                  {leaderboard.map((team, index) => (
                    <div key={team.id} className="group relative rounded-3xl transition-all duration-500 hover:-translate-y-2 overflow-hidden bg-white/5 border border-white/10 backdrop-blur-xl p-8 flex flex-col items-center text-center">
                      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full mix-blend-screen filter blur-[40px] opacity-30 transition-opacity group-hover:opacity-60 ${
                        index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-300' : 'bg-orange-600'
                      }`}></div>
                      
                      <span className={`w-16 h-16 flex items-center justify-center rounded-full font-black text-3xl mb-6 shadow-lg border-2 z-10 ${
                        index === 0 ? 'border-amber-400 text-amber-400 bg-amber-400/10 shadow-amber-400/20' :
                        index === 1 ? 'border-slate-300 text-slate-300 bg-slate-300/10 shadow-slate-300/20' :
                        index === 2 ? 'border-orange-500 text-orange-500 bg-orange-500/10 shadow-orange-500/20' :
                        'border-white/20 text-slate-300 bg-white/5'
                      }`}>
                        #{index + 1}
                      </span>
                      
                      <h3 className="text-2xl font-bold text-white mb-2 z-10">{team.team_name}</h3>
                      <div className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400 z-10">
                        {team.total_points}
                        <span className="text-sm font-medium text-slate-500 ml-2">PTS</span>
                      </div>
                    </div>
                  ))}
                  {leaderboard.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-sm">
                      <p className="text-slate-400 text-lg">No points have been awarded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FestHome;
