import { useState, useEffect } from 'react';
import { Share2, Download, Award, Newspaper, Camera, Globe, Users, Star, Image as ImageIcon, PlayCircle, MessageCircle, ThumbsUp, Info, Loader2, BookOpen, Shield } from 'lucide-react';
import api from '../../api/client';
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
  const [eventType, setEventType] = useState<'MAIN' | 'HIFZ'>('MAIN');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [results, setResults] = useState<Result[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardTeam[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { generatePoster, loadingPosterId } = usePosterGenerator();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resResults, resLeaderboard] = await Promise.all([
          api.get(`/fest/public/results?event_type=${eventType}`),
          api.get(`/fest/public/leaderboard?event_type=${eventType}`)
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
  }, [eventType]);

  const handleShare = (result: Result) => {
    const text = `Fest Result Published!\n\nEvent: ${result.program_title} (${result.category})\nWinner: ${result.student_name} (${result.team_name})\nPosition: ${result.position}\n\nCongratulations!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadPoster = (result: Result & { id: number }) => {
    generatePoster(result);
  };

  return (
    <div className="min-h-screen bg-[#F2F0E9] text-[#111111] font-sans selection:bg-[#7A0C1E] selection:text-[#F2F0E9]">
      
      {/* Sticky Header / Nav */}
      <header className="sticky top-0 z-50 bg-[#F2F0E9] border-b-[3px] border-[#111111] px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="w-full md:w-auto flex justify-between items-center">
            <div className="font-black text-xl sm:text-2xl tracking-tighter uppercase">
              ALIF DAWA <span className="text-[#7A0C1E]">FEST</span>
            </div>
          </div>
          
          <div className="w-full md:w-auto flex-1 flex justify-start md:justify-center overflow-x-auto no-scrollbar gap-2 pb-1">
            {[
              { key: 'about', label: 'About' },
              { key: 'results', label: 'Results' },
              { key: 'news', label: 'News' },
              { key: 'social', label: 'Social' },
              { key: 'gallery', label: 'Gallery' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold uppercase tracking-widest border-[2px] sm:border-[3px] border-[#111111] transition-all whitespace-nowrap
                  ${activeTab === tab.key 
                    ? 'bg-[#111111] text-[#F2F0E9] shadow-[2px_2px_0_#7A0C1E] sm:shadow-[4px_4px_0_#7A0C1E] translate-y-[-2px]' 
                    : 'bg-white text-[#111111] shadow-[2px_2px_0_#111111] sm:shadow-[4px_4px_0_#111111] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Event Switcher */}
        <div className="max-w-6xl mx-auto flex justify-center gap-4 mt-3">
          <button
            onClick={() => { setEventType('MAIN'); setCategoryFilter('All'); }}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border-[2px] border-[#111111] transition-all
              ${eventType === 'MAIN' 
                ? 'bg-[#7A0C1E] text-[#F2F0E9] shadow-[2px_2px_0_#111111] translate-y-[-2px]' 
                : 'bg-white text-[#111111] shadow-[2px_2px_0_#111111]'
              }`}
          >
            Main Fest
          </button>
          <button
            onClick={() => { setEventType('HIFZ'); setCategoryFilter('All'); }}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border-[2px] border-[#111111] transition-all
              ${eventType === 'HIFZ' 
                ? 'bg-[#14532D] text-[#F2F0E9] shadow-[2px_2px_0_#111111] translate-y-[-2px]' 
                : 'bg-white text-[#111111] shadow-[2px_2px_0_#111111]'
              }`}
          >
            Hifz Fest
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b-[3px] border-[#111111] bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#7A0C1E] border-l-[3px] border-b-[3px] border-[#111111] rounded-bl-full hidden md:block"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 border-t-[3px] border-r-[3px] border-[#111111] bg-[#111111] hidden md:block" style={{ backgroundImage: 'radial-gradient(#F2F0E9 2px, transparent 2px)', backgroundSize: '10px 10px' }}></div>
        
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-32 relative z-10 text-center">
          <div className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 border-[3px] border-[#111111] bg-[#F2F0E9] text-[#111111] text-xs sm:text-base font-bold uppercase tracking-widest mb-6 sm:mb-8 shadow-[2px_2px_0_#111111] sm:shadow-[4px_4px_0_#111111]">
            Annual Institutional Fest
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
            The Ultimate<br />
            <span className="text-[#7A0C1E] underline decoration-[4px] md:decoration-[6px] underline-offset-[8px] md:underline-offset-[12px]">Stage of Talent</span>
          </h1>
          
          <p className="text-lg sm:text-2xl font-bold mb-4" dir="rtl" lang="ml">
            കലയുടെയും സംസ്കാരത്തിന്റെയും ഉത്സവം
          </p>
          
          <p className="text-sm sm:text-lg max-w-2xl mx-auto font-medium mb-10 sm:mb-12 px-2">
            Experience the pinnacle of arts, culture, and intellect. Watch live updates, discover results, and celebrate the champions in a raw, unfiltered environment.
          </p>

          {/* Leaderboard Mini Display */}
          {leaderboard.length > 0 && (
            <div className="flex justify-center gap-3 sm:gap-4 flex-wrap max-w-4xl mx-auto">
              {leaderboard.slice(0, 3).map((team, i) => (
                <div key={team.id} className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-[3px] border-[#111111] shadow-[4px_4px_0_#111111] sm:shadow-[6px_6px_0_#111111] bg-white w-full sm:w-auto
                  ${i === 0 ? 'sm:scale-110 z-10 bg-amber-300' : ''}`}>
                  <span className="text-2xl sm:text-3xl font-black">#{i+1}</span>
                  <div className="text-left flex-1">
                    <div className="font-bold text-base sm:text-lg uppercase tracking-tight">{team.team_name}</div>
                    <div className="font-bold text-xs sm:text-sm text-[#7A0C1E]">{team.total_points} PTS</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-10 sm:py-16">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-16 h-16 border-[6px] border-[#111111] border-t-[#7A0C1E] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div>
            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="space-y-10 sm:space-y-12">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-6 sm:mb-8 text-center sm:text-left">
                  <Info className="text-[#111111] w-8 h-8 sm:w-10 sm:h-10" strokeWidth={3} />
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter">അലിഫ് ദഅവ ഫെസ്റ്റ്</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                  <div className="bg-white border-[3px] border-[#111111] shadow-[4px_4px_0_#111111] sm:shadow-[8px_8px_0_#111111] p-5 sm:p-8">
                    <h3 className="text-xl sm:text-2xl font-black uppercase mb-4 flex items-center gap-3 border-b-[3px] border-[#111111] pb-4">
                      <Star className="text-[#7A0C1E]" strokeWidth={3} /> Our Vision
                    </h3>
                    <p className="font-medium text-base sm:text-lg leading-relaxed mb-4">
                      Alif Dawa College Annual Fest is a celebration of talent, creativity, and unity. We aim to provide a platform for students to showcase their skills in arts, culture, and intellect.
                    </p>
                    <p className="font-bold text-xs sm:text-sm bg-[#F2F0E9] p-3 sm:p-4 border-[3px] border-[#111111]" dir="rtl" lang="ml">
                      അലിഫ് ദഅവ കോളേജ് വാര്‍ഷിക ഫെസ്റ്റ് കലയുടെയും സര്‍ഗാത്മകതയുടെയും ഏകത്വത്തിന്റെയും ആഘോഷമാണ്. വിദ്യാര്‍ത്ഥികള്‍ക്ക് തങ്ങളുടെ കഴിവുകള്‍ പ്രദര്‍ശിപ്പിക്കാനുള്ള ഒരു വേദിയാണ് ഇത്.
                    </p>
                  </div>
                  
                  <div className="bg-white border-[3px] border-[#111111] shadow-[4px_4px_0_#111111] sm:shadow-[8px_8px_0_#111111] p-5 sm:p-8">
                    <h3 className="text-xl sm:text-2xl font-black uppercase mb-4 flex items-center gap-3 border-b-[3px] border-[#111111] pb-4">
                      <Users className="text-[#7A0C1E]" strokeWidth={3} /> The Teams
                    </h3>
                    <p className="font-medium text-base sm:text-lg mb-6">
                      The fest is fiercely contested by three magnificent teams:
                    </p>
                    <ul className="space-y-3 sm:space-y-4">
                      {(eventType === 'MAIN' ? [
                        { name: 'Vanguard', desc: 'Leading the way' },
                        { name: 'Renegades', desc: 'Defying limits' },
                        { name: 'Divergent', desc: 'Thinking differently' },
                      ] : [
                        { name: 'Furqan', desc: 'The Criterion' },
                        { name: 'Burhan', desc: 'The Proof' }
                      ]).map(team => (
                        <li key={team.name} className="flex items-center gap-4 p-3 border-[3px] border-[#111111] bg-[#F2F0E9]">
                          <div className={`w-4 h-4 ${eventType === 'MAIN' ? 'bg-[#7A0C1E]' : 'bg-[#14532D]'} border-2 border-[#111111]`}></div>
                          <strong className="text-xl uppercase">{team.name}</strong>
                          <span className="font-medium text-sm ml-auto hidden sm:inline-block">{team.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Categories */}
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {(eventType === 'MAIN' ? [
                    { name: 'Premier', nameml: 'പ്രീമിയര്‍' },
                    { name: 'Senior', nameml: 'സീനിയര്‍' },
                    { name: 'Junior', nameml: 'ജൂനിയര്‍' },
                    { name: 'General', nameml: 'ജനറല്‍' },
                  ] : [
                    { name: 'Stage', nameml: 'സ്റ്റേജ്' },
                    { name: 'General Stage', nameml: 'ജനറല്‍ സ്റ്റേജ്' },
                    { name: 'Off-Stage', nameml: 'ഓഫ്-സ്റ്റേജ്' },
                    { name: 'General Off-Stage', nameml: 'ജനറല്‍ ഓഫ്-സ്റ്റേജ്' },
                  ]).map((cat) => (
                    <div key={cat.name} className={`bg-white border-[3px] border-[#111111] p-6 text-center shadow-[6px_6px_0_#111111] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111111] transition-all cursor-default`}>
                      <BookOpen className={`mx-auto mb-4 text-[#111111]`} size={32} strokeWidth={2.5} />
                      <p className={`font-black text-xl uppercase tracking-wider`}>{cat.name}</p>
                      <p className={`text-sm font-bold mt-2 ${eventType === 'MAIN' ? 'text-[#7A0C1E]' : 'text-[#14532D]'}`}>{cat.nameml}</p>
                    </div>
                  ))}
                </div>

                {/* Rules */}
                <div className="bg-[#111111] text-[#F2F0E9] border-[3px] border-[#111111] shadow-[4px_4px_0_#7A0C1E] sm:shadow-[8px_8px_0_#7A0C1E] p-5 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-black uppercase mb-6 flex items-center gap-3 border-b-[3px] border-[#F2F0E9] pb-4">
                    <Shield className="text-[#F2F0E9]" strokeWidth={3} /> Rules & Guidelines
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 text-sm sm:text-base">
                    <ul className="space-y-3 sm:space-y-4 font-medium">
                      <li className="flex items-start gap-3"><span className="w-3 h-3 bg-[#7A0C1E] mt-1.5 flex-shrink-0"></span>Every participant must carry their chest number at all times</li>
                      <li className="flex items-start gap-3"><span className="w-3 h-3 bg-[#7A0C1E] mt-1.5 flex-shrink-0"></span>Report to the stage when your program is called</li>
                      <li className="flex items-start gap-3"><span className="w-3 h-3 bg-[#7A0C1E] mt-1.5 flex-shrink-0"></span>Time limits must be strictly followed</li>
                      <li className="flex items-start gap-3"><span className="w-3 h-3 bg-[#7A0C1E] mt-1.5 flex-shrink-0"></span>Code letters are assigned for fair judging</li>
                    </ul>
                    <ul className="space-y-3 sm:space-y-4 font-bold" dir="rtl" lang="ml">
                      <li className="flex items-start gap-3"><span className="w-3 h-3 bg-[#7A0C1E] mt-1.5 flex-shrink-0"></span>മത്സരികള്‍ക്ക് എല്ലാ സമയത്തും ചെസ്റ്റ് നമ്പര്‍ ഉണ്ടായിരിക്കണം</li>
                      <li className="flex items-start gap-3"><span className="w-3 h-3 bg-[#7A0C1E] mt-1.5 flex-shrink-0"></span>പ്രോഗ്രാം വിളിക്കുമ്പോള്‍ സ്റ്റേജില്‍ ഹാജരാകുക</li>
                      <li className="flex items-start gap-3"><span className="w-3 h-3 bg-[#7A0C1E] mt-1.5 flex-shrink-0"></span>സമയപരിധി കാര്‍യമായി പാലിക്കണം</li>
                      <li className="flex items-start gap-3"><span className="w-3 h-3 bg-[#7A0C1E] mt-1.5 flex-shrink-0"></span>ന്യായമായ മൂല്യനിര്‍ണയത്തിന് കോഡ് ലെറ്ററുകള്‍ നല്‍കുന്നു</li>
                    </ul>
                  </div>
                </div>

                {/* Stats */}
                <div className="bg-[#7A0C1E] text-white border-[3px] border-[#111111] shadow-[4px_4px_0_#111111] sm:shadow-[8px_8px_0_#111111] p-6 sm:p-10 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full mix-blend-overlay"></div>
                  <div className="absolute bottom-[-20px] left-[-20px] w-48 h-48 border-[10px] border-white opacity-10 mix-blend-overlay rotate-45"></div>
                  
                  <h3 className="text-2xl sm:text-4xl font-black uppercase mb-4 relative z-10">ആഘോഷത്തിന്റെ ഭാഗമാകൂ</h3>
                  <p className="text-sm sm:text-lg font-bold mb-8 sm:mb-10 max-w-2xl mx-auto relative z-10">
                    Be a part of the most awaited event of the year. Witness breathtaking performances and create lasting memories.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto relative z-10">
                    {[
                      { num: eventType === 'MAIN' ? '3' : '2', label: 'Teams' },
                      { num: eventType === 'MAIN' ? '50+' : '20+', label: 'Events' },
                      { num: eventType === 'MAIN' ? '300+' : '28', label: 'Participants' },
                      { num: '4', label: 'Categories' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-[#111111] p-4 sm:p-6 border-[3px] border-white shadow-[3px_3px_0_#F2F0E9] sm:shadow-[4px_4px_0_#F2F0E9] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                        <div className="text-3xl sm:text-5xl font-black text-white mb-1 sm:mb-2">{stat.num}</div>
                        <div className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#F2F0E9]">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* RESULTS TAB */}
            {activeTab === 'results' && (
              <div className="space-y-6 sm:space-y-8">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-6 sm:mb-8 text-center sm:text-left">
                  <Award className="text-[#111111] w-8 h-8 sm:w-10 sm:h-10" strokeWidth={3} />
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter">Published Results</h2>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 sm:gap-4 mb-8 sm:mb-10">
                  {['All', ...(eventType === 'MAIN' ? ['Premier', 'Junior', 'Senior', 'General'] : ['Stage', 'General Stage', 'Off-Stage', 'General Off-Stage'])].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 sm:px-5 sm:py-2.5 text-sm sm:text-base font-black uppercase tracking-wider border-[2px] sm:border-[3px] border-[#111111] transition-all ${
                        categoryFilter === cat
                          ? 'bg-[#111111] text-[#F2F0E9] shadow-[2px_2px_0_#7A0C1E] sm:shadow-[4px_4px_0_#7A0C1E] translate-y-[2px]'
                          : 'bg-white text-[#111111] shadow-[2px_2px_0_#111111] sm:shadow-[4px_4px_0_#111111] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {results.filter(r => categoryFilter === 'All' || r.category === categoryFilter).map((res) => (
                    <div key={res.id} className="bg-white border-[3px] border-[#111111] shadow-[4px_4px_0_#111111] sm:shadow-[8px_8px_0_#111111] flex flex-col group relative">
                      
                      {res.position === 1 && (
                        <div className="absolute top-0 right-0 bg-[#7A0C1E] text-white font-black px-3 py-1 sm:px-4 sm:py-1 text-xs sm:text-base border-l-[3px] border-b-[3px] border-[#111111]">
                          WINNER
                        </div>
                      )}

                      <div className="p-4 sm:p-6 border-b-[3px] border-[#111111] bg-[#F2F0E9]">
                        <div className="flex justify-between items-start">
                          <span className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-[#111111] text-white font-black text-2xl sm:text-3xl border-[3px] border-[#111111] shadow-[2px_2px_0_#7A0C1E] sm:shadow-[4px_4px_0_#7A0C1E]">
                            #{res.position}
                          </span>
                          <span className="font-black px-2 py-1 sm:px-3 sm:py-1.5 bg-white border-[2px] sm:border-[3px] border-[#111111] uppercase tracking-widest text-xs sm:text-sm shadow-[2px_2px_0_#111111]">
                            {res.team_name}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4 sm:p-6 flex-grow bg-white">
                        <h3 className="text-xl sm:text-2xl font-black uppercase mb-1 sm:mb-2 leading-tight">{res.student_name}</h3>
                        <p className="text-base sm:text-lg font-bold text-[#7A0C1E] mb-3 sm:mb-4">{res.program_title}</p>
                        <div className="inline-block px-2 py-1 sm:px-3 sm:py-1 bg-[#111111] text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider">
                          {res.category}
                        </div>
                      </div>
                      
                      <div className="flex border-t-[3px] border-[#111111]">
                        <button onClick={() => handleShare(res)} className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 px-2 sm:py-4 sm:px-4 bg-white hover:bg-[#F2F0E9] border-r-[3px] border-[#111111] font-black uppercase text-xs sm:text-sm transition-colors">
                          <Share2 size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" /> Share
                        </button>
                        <button onClick={() => handleDownloadPoster(res)} disabled={loadingPosterId === res.id} className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 px-2 sm:py-4 sm:px-4 bg-[#111111] text-white hover:bg-[#7A0C1E] font-black uppercase text-xs sm:text-sm transition-colors disabled:opacity-50">
                          {loadingPosterId === res.id ? <Loader2 size={16} className="animate-spin sm:w-[18px] sm:h-[18px]" /> : <Download size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" />} Poster
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {results.filter(r => categoryFilter === 'All' || r.category === categoryFilter).length === 0 && (
                    <div className="col-span-full text-center py-24 bg-white border-[3px] border-[#111111] shadow-[8px_8px_0_#111111]">
                      <p className="font-black text-xl uppercase">No results found{categoryFilter !== 'All' ? ` for ${categoryFilter} category` : ''}.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NEWS TAB */}
            {activeTab === 'news' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-8">
                  <Newspaper className="text-[#111111]" size={40} strokeWidth={3} />
                  <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Latest News</h2>
                </div>
                
                <div className="space-y-6">
                  {[
                    { title: 'Grand Opening Ceremony', desc: 'The fest kicked off with a spectacular opening ceremony featuring performances from all three teams.', time: 'Today' },
                    { title: 'Premier Category Begins', desc: 'The Premier category programs are now underway with participants showcasing exceptional talent.', time: 'Today' },
                    { title: 'Teams Announced', desc: 'Three teams - Vanguard, Renegades, and Divergent - have been officially revealed with their leaders.', time: 'Yesterday' },
                  ].map((news, i) => (
                    <div key={i} className="bg-white border-[3px] border-[#111111] shadow-[6px_6px_0_#111111] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-black uppercase mb-3">{news.title}</h3>
                        <p className="font-medium text-lg max-w-3xl">{news.desc}</p>
                      </div>
                      <span className="flex-shrink-0 px-4 py-1.5 bg-[#111111] text-white font-bold uppercase text-xs tracking-widest border-[3px] border-[#111111] self-start">
                        {news.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SOCIAL MEDIA TAB */}
            {activeTab === 'social' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-8">
                  <Globe className="text-[#111111]" size={40} strokeWidth={3} />
                  <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Social Media</h2>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  {[
                    { platform: 'Instagram', handle: '@alifdawa_fest', icon: ImageIcon, bg: 'bg-[#F2F0E9]' },
                    { platform: 'YouTube', handle: 'Alif Dawa Official', icon: PlayCircle, bg: 'bg-[#F2F0E9]' },
                    { platform: 'WhatsApp', handle: 'Fest Updates Group', icon: MessageCircle, bg: 'bg-[#F2F0E9]' },
                    { platform: 'Facebook', handle: 'Alif Dawa College', icon: ThumbsUp, bg: 'bg-[#F2F0E9]' },
                  ].map((social, i) => (
                    <div key={i} className={`border-[3px] border-[#111111] bg-white shadow-[6px_6px_0_#111111] p-6 sm:p-8 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111111] transition-all cursor-pointer flex items-center gap-6`}>
                      <div className={`w-16 h-16 ${social.bg} border-[3px] border-[#111111] flex items-center justify-center flex-shrink-0`}>
                        <social.icon size={32} strokeWidth={2.5} className="text-[#111111]" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black uppercase">{social.platform}</h3>
                        <p className="font-bold text-[#7A0C1E]">{social.handle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PHOTO GALLERY TAB */}
            {activeTab === 'gallery' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-8">
                  <Camera className="text-[#111111]" size={40} strokeWidth={3} />
                  <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Photo Gallery</h2>
                </div>
                
                <div className="text-center py-24 bg-white border-[3px] border-[#111111] shadow-[8px_8px_0_#111111]">
                  <Camera className="mx-auto text-[#111111] mb-6" size={64} strokeWidth={2} />
                  <p className="font-black text-2xl uppercase mb-2">Photos will be uploaded during the fest</p>
                  <p className="font-bold text-[#7A0C1E]">Stay tuned for amazing moments captured live!</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Footer Block */}
      <footer className="bg-[#111111] border-t-[3px] border-[#111111] text-[#F2F0E9] py-12 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">ALIF DAWA FEST</h2>
          <p className="font-bold uppercase text-sm text-gray-400 mb-8 tracking-widest">© 2026 Alif Dawa College. All rights reserved.</p>
          <div className="flex justify-center gap-4">
            <a href="#" className="w-12 h-12 bg-[#F2F0E9] border-[3px] border-[#F2F0E9] text-[#111111] flex items-center justify-center hover:bg-[#7A0C1E] hover:text-[#F2F0E9] hover:border-[#7A0C1E] transition-colors"><ImageIcon size={24} strokeWidth={2.5} /></a>
            <a href="#" className="w-12 h-12 bg-[#F2F0E9] border-[3px] border-[#F2F0E9] text-[#111111] flex items-center justify-center hover:bg-[#7A0C1E] hover:text-[#F2F0E9] hover:border-[#7A0C1E] transition-colors"><PlayCircle size={24} strokeWidth={2.5} /></a>
            <a href="#" className="w-12 h-12 bg-[#F2F0E9] border-[3px] border-[#F2F0E9] text-[#111111] flex items-center justify-center hover:bg-[#7A0C1E] hover:text-[#F2F0E9] hover:border-[#7A0C1E] transition-colors"><MessageCircle size={24} strokeWidth={2.5} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FestHome;

