import { useState } from 'react';
import { BadgeCheck, Search, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ipApi } from '../../api';
import { cn } from '../../lib/utils/cn';

export default function Trademarks() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await ipApi.checkTrademark({
        query: query.trim(),
        top_k: 5,
      });
      setResult(response);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred during trademark search.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    if (risk === 'Low') return 'text-green-700 bg-green-50 border-green-200';
    if (risk === 'Medium') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getRiskIcon = (risk) => {
    if (risk === 'Low') return <CheckCircle2 className="w-6 h-6" />;
    if (risk === 'Medium') return <AlertTriangle className="w-6 h-6" />;
    return <ShieldAlert className="w-6 h-6" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif text-[#176B45] mb-2 flex items-center justify-center gap-3">
          <BadgeCheck className="w-8 h-8" />
          Trademark Checker
        </h1>
        <p className="text-[#161412]/60">Fuzzy match your proposed brand name against known Ayurveda & Healthcare trademarks.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#161412]/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter proposed brand name (e.g. AyurHeal)"
            className="w-full bg-white border border-[#161412]/20 rounded-full pl-12 pr-6 py-4 text-lg focus:outline-none focus:border-[#176B45] shadow-sm transition-all"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-8 py-4 bg-[#176B45] text-white font-medium rounded-full hover:bg-[#125537] transition-colors disabled:opacity-50"
        >
          {isLoading ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : 'Search'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#176B45] border-t-transparent animate-spin mb-4" />
          <p className="text-[#161412]/60 font-medium">Scanning indexed trademark dataset...</p>
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={cn("p-6 border rounded-xl flex items-center justify-between", getRiskColor(result.conflict_risk || result.clearance_posture))}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {getRiskIcon(result.conflict_risk || result.clearance_posture)}
                <h2 className="text-xl font-serif">Clearance Posture: {result.clearance_posture || result.conflict_risk}</h2>
              </div>
              <p className="text-sm opacity-90">{result.summary}</p>
            </div>
          </div>

          {result.term_analysis && (
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs sm:text-sm text-blue-900 leading-relaxed">
              <strong className="block mb-1 text-blue-800 uppercase tracking-wider text-[10px]">Descriptive / Generic Term Flag</strong>
              <p>{result.term_analysis}</p>
            </div>
          )}

          {result.matches && result.matches.length > 0 ? (
            <div className="bg-white border border-[#161412]/10 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#161412]/10 bg-[#f8f7f4]">
                <h3 className="font-serif text-lg text-[#161412]">Closest Indexed Candidates (Screening Signals)</h3>
              </div>
              <div className="divide-y divide-[#161412]/10">
                {result.matches.map((match, idx) => (
                  <div key={idx} className="p-6 flex items-center justify-between hover:bg-[#161412]/5 transition-colors">
                    <div>
                      <h4 className="font-bold text-lg text-[#161412] tracking-wide">{match.name || match.mark}</h4>
                      <p className="text-xs text-[#161412]/60 mt-1 flex gap-4">
                        <span>Source: <strong>{match.source || 'Indexed trademark dataset'}</strong></span>
                        <span className="italic">{match.similarity_signal || 'Screening signal'}</span>
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-xl font-serif text-[#176B45]">{match.similarity || match.similarity_score}%</span>
                      <span className="text-[10px] text-[#161412]/50 uppercase tracking-wider">Similarity Signal</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-white border border-dashed border-[#161412]/20 rounded-xl">
              <h3 className="font-bold text-stone-800 text-base">No Similar Candidate Found in Indexed Dataset</h3>
              <p className="text-xs text-[#161412]/60 mt-1 max-w-md mx-auto">
                This screening signal does not establish trademark availability or registrability.
              </p>
            </div>
          )}

          {/* Limitations */}
          {result.limitations && result.limitations.length > 0 && (
            <div className="bg-white border border-[#161412]/10 rounded-xl p-6 shadow-sm">
              <h4 className="text-xs font-bold text-[#176B45] uppercase tracking-widest mb-3">Limitations & Screening Scope</h4>
              <ul className="space-y-1.5">
                {result.limitations.map((lim, idx) => (
                  <li key={idx} className="text-xs text-stone-700 flex items-start gap-2">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-stone-400 mt-1.5" />
                    <span>{lim}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {result.next_steps && result.next_steps.length > 0 && (
            <div className="bg-white border border-[#161412]/10 rounded-xl p-6 shadow-sm">
              <h4 className="text-xs font-bold text-[#176B45] uppercase tracking-widest mb-3">Recommended Next Steps</h4>
              <ul className="space-y-1.5">
                {result.next_steps.map((step, idx) => (
                  <li key={idx} className="text-xs text-stone-800 flex items-start gap-2">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#176B45] mt-1.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
