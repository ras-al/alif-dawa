import { useState, useEffect } from 'react';
import { Share2, Download, Award, Newspaper, Camera, Globe, Users, Star, Image as ImageIcon, PlayCircle, MessageCircle, ThumbsUp, Info, Loader2, BookOpen, Shield } from 'lucide-react';
import axios from 'axios';
import { usePosterGenerator } from '../../components/ResultPosterGenerator';

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

const FestHome = () => {
  const [activeTab, setActiveTab] = useState<'about' | 'results' | 'news' | 'social' | 'gallery'>('about');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [results, setResults] = useState<Result[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardTeam[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { generatePoster, loadingPosterId } = usePosterGenerator();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resResults, resLeaderboard] = await Promise.all([
          axios.get('http://localhost:5000/api/fest/public/results'),
          axios.get('http://localhost:5000/api/fest/public/leaderboard')
        ]);
        setResults(resResults.data);
        setLeaderboard(resLeaderboard.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleShare = (result: Result) => {
    const text = `Fest Result Published!\n\nEvent: ${result.program_title} (${result.category})\nWinner: ${result.student_name} (${result.team_name})\nPosition: ${result.position}\n\nCongratulations!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadPoster = (result: Result & { id: number }) => {
    generatePoster(result);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200 relative overflow-hidden">
      
      {/* Background Animated Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/20 mix-blend-screen filter blur-[100px] animate-blob z-0 pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-900/10 mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000 z-0 pointer-events-none"></div>
      <div className="fixed top-[20%] left-[40%] w-[30vw] h-[30vw] rounded-full bg-emerald-900/10 mix-blend-screen filter blur-[80px] animate-blob animation-delay-4000 z-0 pointer-events-none"></div>

      {/* Top Navigation */}
      <div className="absolute top-0 right-0 p-4 sm:p-6 z-50 flex items-center gap-2">
        <a href="/fest/login" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-xs sm:text-sm font-semibold transition-all">
          Team Login
        </a>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden min-h-[55vh] flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img src="/poster.jpeg" alt="Fest Poster" className="w-full h-full object-cover opacity-40 blur-[4px] scale-105 transform hover:scale-110 transition-transform duration-10000" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-[#0a0f1c]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1c]/80 via-transparent to-[#0a0f1c]/80" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-20 sm:mt-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 backdrop-blur-md border border-amber-500/30 text-xs font-bold tracking-widest uppercase text-amber-400 mb-6 sm:mb-8 animate-fade-in-up">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
            Alif Dawa College Annual Fest
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-3 text-white drop-shadow-2xl">
            The Ultimate <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 animate-gradient-x inline-block mt-2">Stage of Talent</span>
          </h1>
          <p className="text-base sm:text-lg text-amber-200/60 mb-2 font-medium" dir="rtl" lang="ml">
            കലയുടെയും സംസ്കാരത്തിന്റെയും ഉത്സവം
          </p>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 sm:mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Experience the pinnacle of arts, culture, and intellect. Watch live updates, discover results, and celebrate the champions.
          </p>

          {/* Leaderboard Mini Display */}
          {leaderboard.length > 0 && (
            <div className="flex justify-center gap-4 flex-wrap mt-4 mb-4">
              {leaderboard.slice(0, 3).map((team, i) => (
                <div key={team.id} className={`px-5 py-3 rounded-2xl backdrop-blur-xl border flex items-center gap-3 ${
                  i === 0 ? 'bg-amber-500/10 border-amber-500/30' :
                  i === 1 ? 'bg-slate-300/10 border-slate-300/30' :
                  'bg-orange-500/10 border-orange-500/30'
                }`}>
                  <span className={`text-xl font-black ${
                    i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : 'text-orange-400'
                  }`}>#{i+1}</span>
                  <span className="text-sm font-bold text-white">{team.team_name}</span>
                  <span className="text-sm font-medium text-slate-400">{team.total_points} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-40 bg-[#0a0f1c]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-center gap-2 sm:gap-8 overflow-x-auto no-scrollbar">
            {[
              { key: 'about', label: 'About', icon: Info },
              { key: 'results', label: 'Results', icon: Award },
              { key: 'news', label: 'News', icon: Newspaper },
              { key: 'social', label: 'Social Media', icon: Globe },
              { key: 'gallery', label: 'Photo Gallery', icon: Camera },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 sm:px-6 py-5 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all duration-300 relative whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'text-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {activeTab === tab.key && (
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
              <div className="space-y-10 relative z-10 animate-fade-in-up">
                <div className="flex items-center gap-4 mb-8 justify-center">
                  <div className="relative">
                    <Info className="text-amber-400 relative z-10" size={32} />
                    <div className="absolute inset-0 bg-amber-400 rounded-full blur-md animate-pulse opacity-50"></div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">അലിഫ് ദഅവ ഫെസ്റ്റ്</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                  <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
                      <Star className="text-amber-400 flex-shrink-0" /> Our Vision
                    </h3>
                    <p className="text-slate-300 leading-relaxed text-base sm:text-lg font-light mb-4">
                      Alif Dawa College Annual Fest is a celebration of talent, creativity, and unity. We aim to provide a platform for students to showcase their skills in arts, culture, and intellect.
                    </p>
                    <p className="text-slate-400 leading-relaxed text-sm" dir="rtl" lang="ml">
                      അലിഫ് ദഅവ കോളേജ് വാര്‍ഷിക ഫെസ്റ്റ് കലയുടെയും സര്‍ഗാത്മകതയുടെയും ഏകത്വത്തിന്റെയും ആഘോഷമാണ്. വിദ്യാര്‍ത്ഥികള്‍ക്ക് തങ്ങളുടെ കഴിവുകള്‍ പ്രദര്‍ശിപ്പിക്കാനുള്ള ഒരു വേദിയാണ് ഇത്.
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-3">
                      <Users className="text-blue-400 flex-shrink-0" /> The Teams
                    </h3>
                    <p className="text-slate-300 leading-relaxed text-base sm:text-lg font-light mb-4">
                      The fest is fiercely contested by three magnificent teams:
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-amber-500"></span><strong className="text-white">Vanguard</strong><span className="text-slate-400">- Leading the way</span></li>
                      <li className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-slate-300"></span><strong className="text-white">Renegades</strong><span className="text-slate-400">- Defying limits</span></li>
                      <li className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-orange-500"></span><strong className="text-white">Divergent</strong><span className="text-slate-400">- Thinking differently</span></li>
                    </ul>
                  </div>
                </div>

                {/* Categories */}
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'Premier', nameml: 'പ്രീമിയര്‍', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30', text: 'text-amber-400' },
                    { name: 'Senior', nameml: 'സീനിയര്‍', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30', text: 'text-blue-400' },
                    { name: 'Junior', nameml: 'ജൂനിയര്‍', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30', text: 'text-emerald-400' },
                    { name: 'General', nameml: 'ജനറല്‍', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30', text: 'text-purple-400' },
                  ].map(cat => (
                    <div key={cat.name} className={`bg-gradient-to-br ${cat.color} border rounded-2xl p-5 backdrop-blur-xl text-center`}>
                      <BookOpen className={`mx-auto mb-2 ${cat.text}`} size={24} />
                      <p className={`font-bold text-lg ${cat.text}`}>{cat.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{cat.nameml}</p>
                    </div>
                  ))}
                </div>

                {/* Rules */}
                <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-5 flex items-center gap-3">
                    <Shield className="text-emerald-400 flex-shrink-0" /> Rules & Guidelines
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>Every participant must carry their chest number at all times</li>
                      <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>Report to the stage when your program is called</li>
                      <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>Time limits must be strictly followed</li>
                      <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>Code letters are assigned for fair judging</li>
                    </ul>
                    <ul className="space-y-3 text-sm text-slate-400" dir="rtl" lang="ml">
                      <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"></span>മത്സരികള്‍ക്ക് എല്ലാ സമയത്തും ചെസ്റ്റ് നമ്പര്‍ ഉണ്ടായിരിക്കണം</li>
                      <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"></span>പ്രോഗ്രാം വിളിക്കുമ്പോള്‍ സ്റ്റേജില്‍ ഹാജരാകുക</li>
                      <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"></span>സമയപരിധി കാര്‍യമായി പാലിക്കണം</li>
                      <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"></span>ന്യായമായ മൂല്യനിര്‍ണയത്തിന് കോഡ് ലെറ്ററുകള്‍ നല്‍കുന്നു</li>
                    </ul>
                  </div>
                </div>

                {/* Stats */}
                <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-10 text-center backdrop-blur-xl">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">ആഘോഷത്തിന്റെ ഭാഗമാകൂ</h3>
                  <p className="text-slate-300 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
                    Be a part of the most awaited event of the year. Witness breathtaking performances and create lasting memories.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto">
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-black text-amber-400 mb-2">3</div>
                      <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest">Teams</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-black text-emerald-400 mb-2">50+</div>
                      <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest">Events</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-black text-blue-400 mb-2">300+</div>
                      <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest">Participants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-black text-purple-400 mb-2">4</div>
                      <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-widest">Categories</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RESULTS TAB */}
            {activeTab === 'results' && (
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-4 mb-6 justify-center">
                  <div className="relative">
                    <Award className="text-amber-400 relative z-10" size={32} />
                    <div className="absolute inset-0 bg-amber-400 rounded-full blur-md animate-pulse opacity-50"></div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">Published Results</h2>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {['All', 'Premier', 'Junior', 'Senior', 'General'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                        categoryFilter === cat
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {results.filter(r => categoryFilter === 'All' || r.category === categoryFilter).map((res) => (
                    <div key={res.id} className="group relative rounded-2xl sm:rounded-3xl transition-all duration-500 hover:-translate-y-2 overflow-hidden bg-white/5 border border-white/10 backdrop-blur-xl">
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
                          <button onClick={() => handleDownloadPoster(res)} disabled={loadingPosterId === res.id} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-colors text-sm font-bold disabled:opacity-50">
                            {loadingPosterId === res.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Poster
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {results.filter(r => categoryFilter === 'All' || r.category === categoryFilter).length === 0 && (
                    <div className="col-span-full text-center py-16 sm:py-20 bg-white/5 border border-white/5 rounded-2xl sm:rounded-3xl backdrop-blur-sm">
                      <p className="text-slate-400 text-base sm:text-lg">No results found{categoryFilter !== 'All' ? ` for ${categoryFilter} category` : ''}.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NEWS TAB */}
            {activeTab === 'news' && (
              <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-4 mb-10 justify-center">
                  <div className="relative">
                    <Newspaper className="text-emerald-400 relative z-10" size={32} />
                    <div className="absolute inset-0 bg-emerald-400 rounded-full blur-md animate-pulse opacity-50"></div>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white">Latest News</h2>
                </div>
                <div className="space-y-6">
                  {[
                    { title: 'Grand Opening Ceremony', desc: 'The fest kicked off with a spectacular opening ceremony featuring performances from all three teams.', time: 'Today' },
                    { title: 'Premier Category Begins', desc: 'The Premier category programs are now underway with participants showcasing exceptional talent.', time: 'Today' },
                    { title: 'Teams Announced', desc: 'Three teams - Vanguard, Renegades, and Divergent - have been officially revealed with their leaders.', time: 'Yesterday' },
                  ].map((news, i) => (
                    <div key={i} className="group bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-3">{news.title}</h3>
                          <p className="text-slate-400 leading-relaxed">{news.desc}</p>
                        </div>
                        <span className="flex-shrink-0 px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-slate-400 border border-white/5">{news.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SOCIAL MEDIA TAB */}
            {activeTab === 'social' && (
              <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-4 mb-10 justify-center">
                  <div className="relative">
                    <Globe className="text-blue-400 relative z-10" size={32} />
                    <div className="absolute inset-0 bg-blue-400 rounded-full blur-md animate-pulse opacity-50"></div>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white">Social Media</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {[
                    { platform: 'Instagram', handle: '@alifdawa_fest', color: 'from-pink-500 to-purple-500', icon: ImageIcon },
                    { platform: 'YouTube', handle: 'Alif Dawa Official', color: 'from-red-500 to-red-600', icon: PlayCircle },
                    { platform: 'WhatsApp', handle: 'Fest Updates Group', color: 'from-green-500 to-green-600', icon: MessageCircle },
                    { platform: 'Facebook', handle: 'Alif Dawa College', color: 'from-blue-600 to-blue-700', icon: ThumbsUp },
                  ].map((social, i) => (
                    <div key={i} className="group bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${social.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                          <social.icon size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{social.platform}</h3>
                          <p className="text-sm text-slate-400">{social.handle}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PHOTO GALLERY TAB */}
            {activeTab === 'gallery' && (
              <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-4 mb-10 justify-center">
                  <div className="relative">
                    <Camera className="text-purple-400 relative z-10" size={32} />
                    <div className="absolute inset-0 bg-purple-400 rounded-full blur-md animate-pulse opacity-50"></div>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white">Photo Gallery</h2>
                </div>
                <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-sm">
                  <Camera className="mx-auto text-slate-500 mb-4" size={48} />
                  <p className="text-slate-400 text-lg mb-2">Photos will be uploaded during the fest</p>
                  <p className="text-slate-500 text-sm">Stay tuned for amazing moments captured live!</p>
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
