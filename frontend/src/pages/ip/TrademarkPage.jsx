import { useState } from 'react';
import { Search, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import Navbar from '../../components/Navbar';
import { ipApi } from '../../api';

export default function TrademarkPage() {
  const [brandName, setBrandName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!brandName.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await ipApi.checkTrademark({ brand_name: brandName });
      setResult(res);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the Trademark analysis engine. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPostureColor = (posture = '', level = '') => {
    const p = posture.toLowerCase();
    const l = level.toLowerCase();
    if (p.includes('conflict') || l === 'high' || l === 'potential_conflict') {
      return 'bg-red-50 text-red-800 border-red-200';
    }
    if (p.includes('similarity') || l === 'moderate' || l === 'potential_similarity') {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (p.includes('descriptive') || l === 'descriptive_flag') {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  };

  const getPostureIcon = (posture = '', level = '') => {
    const p = posture.toLowerCase();
    const l = level.toLowerCase();
    if (p.includes('conflict') || l === 'high' || l === 'potential_conflict') {
      return <ShieldAlert className="w-5 h-5 text-red-700" />;
    }
    if (p.includes('similarity') || l === 'moderate' || l === 'potential_similarity') {
      return <AlertTriangle className="w-5 h-5 text-amber-700" />;
    }
    if (p.includes('descriptive') || l === 'descriptive_flag') {
      return <AlertTriangle className="w-5 h-5 text-blue-700" />;
    }
    return <CheckCircle2 className="w-5 h-5 text-emerald-700" />;
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] font-sans pb-20">
      <Navbar />

      <main className="max-w-4xl mx-auto pt-28 px-4 sm:px-6 flex flex-col items-center">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#176B45]/10 text-[#176B45] text-xs font-bold uppercase tracking-widest rounded-full mb-4">
            <Search className="w-3.5 h-3.5" />
            Trademark Screening Radar
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#161412] mb-4">Trademark Scanner</h1>
          <p className="text-[#161412]/60 max-w-xl mx-auto">
            Preliminary candidate screening of your proposed brand name against an indexed dataset of traditional and herbal marks.
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-12">
          <div className="relative flex items-center p-2 rounded-2xl bg-white border border-[#161412]/15 shadow-sm focus-within:ring-2 focus-within:ring-[#176B45]/30 transition-all">
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Enter proposed brand name (e.g., Dabur, Daboor, VAYORA)"
              className="w-full bg-transparent border-none pl-4 pr-32 py-3 text-[#161412] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !brandName.trim()}
              className="absolute right-2 px-6 py-2.5 bg-[#176B45] text-white font-medium rounded-xl hover:bg-[#125537] transition-all disabled:opacity-50 shadow-sm"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  Checking
                </span>
              ) : (
                "Scan Name"
              )}
            </button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="w-full max-w-2xl p-4 mb-8 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Result Area */}
        {result && (
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            
            {/* BRAND SCREENING & CLEARANCE POSTURE CARD */}
            <div className="bg-white rounded-2xl border border-[#161412]/15 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-[#161412]/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-[10px] font-bold text-[#176B45] uppercase tracking-widest mb-1">Brand Screening</h2>
                  <p className="text-2xl font-serif text-[#161412]">{result.brand_name}</p>
                </div>
                
                <div className={cn("px-4 py-3 rounded-xl border flex items-center gap-3", getPostureColor(result.clearance_posture || result.status, result.risk_level))}>
                  {getPostureIcon(result.clearance_posture || result.status, result.risk_level)}
                  <div>
                    <div className="text-[10px] uppercase font-bold opacity-75 tracking-widest leading-none mb-1">Clearance Posture</div>
                    <div className="text-sm md:text-base font-bold leading-tight">{result.clearance_posture || result.status}</div>
                  </div>
                </div>
              </div>

              {/* Summary text */}
              <div className="px-6 py-4 bg-[#faf8f3]/60 border-b border-[#161412]/10 text-xs sm:text-sm text-stone-700 leading-relaxed">
                <p>{result.summary}</p>
              </div>

              {/* Descriptive / Generic Notice */}
              {result.term_analysis && (
                <div className="p-4 mx-6 my-4 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs sm:text-sm text-blue-900 leading-relaxed">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-blue-700 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Descriptive / Generic Term Flag
                  </div>
                  <p>{result.term_analysis}</p>
                </div>
              )}

              {/* SIMILAR CANDIDATES SECTION */}
              <div className="p-6 md:p-8">
                <h3 className="text-xs font-bold text-[#176B45] uppercase tracking-widest mb-4 flex items-center justify-between">
                  <span>Similar Candidates (Screening Signals)</span>
                  <span className="text-[11px] font-normal text-[#161412]/50 lowercase">
                    {result.matches?.length || 0} candidate(s)
                  </span>
                </h3>
                
                {result.matches && result.matches.length > 0 ? (
                  <div className="space-y-3">
                    {result.matches.map((match, idx) => (
                      <div key={idx} className="p-4 bg-stone-50/80 border border-stone-200/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-base text-[#161412]">{match.name || match.existing_mark}</span>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#176B45]/10 text-[#176B45]">
                            {match.similarity_signal || `${match.similarity}% similarity`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#161412]/60 pt-1 border-t border-stone-200/50">
                          <span>Source: <strong className="font-medium text-stone-700">{match.source || 'Indexed trademark dataset'}</strong></span>
                          <span className="text-[11px] text-stone-500 italic">Screening signal (not legal conflict)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 px-4 border border-dashed border-[#161412]/20 rounded-xl bg-stone-50/50">
                    <p className="font-medium text-stone-800 text-sm">No Similar Candidate Found in Indexed Dataset</p>
                    <p className="text-xs text-[#161412]/60 mt-1 max-w-md mx-auto">
                      This does not establish trademark availability or registrability. Formal clearance requires searching official IP India registry records.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* LIMITATIONS SECTION */}
            {result.limitations && result.limitations.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#161412]/15 p-6 shadow-sm">
                <h3 className="text-xs font-bold text-[#176B45] uppercase tracking-widest mb-3">
                  Limitations & Screening Scope
                </h3>
                <ul className="space-y-2">
                  {result.limitations.map((lim, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-stone-700 leading-relaxed">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-stone-400 mt-1.5" />
                      <span>{lim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* NEXT STEPS SECTION */}
            {result.next_steps && result.next_steps.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#161412]/15 p-6 shadow-sm">
                <h3 className="text-xs font-bold text-[#176B45] uppercase tracking-widest mb-3">
                  Recommended Next Steps
                </h3>
                <ul className="space-y-2">
                  {result.next_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-800 leading-relaxed">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#176B45] mt-1.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-4 bg-stone-100/70 border border-stone-200 rounded-xl text-[#161412]/60 text-xs leading-relaxed">
              <strong className="text-stone-700">Screening Notice: </strong>
              {result.disclaimer}
            </div>
            
            <div className="mt-8 text-center">
              <button 
                onClick={() => {
                  setResult(null);
                  setBrandName('');
                }}
                className="text-[#176B45] text-sm font-medium hover:underline inline-flex items-center gap-1"
              >
                Scan another brand name <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
