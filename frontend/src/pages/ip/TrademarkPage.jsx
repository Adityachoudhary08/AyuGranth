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

  const getRiskColor = (level) => {
    if (level === 'high') return 'bg-red-50 text-red-700 border-red-200';
    if (level === 'moderate') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  const getRiskIcon = (level) => {
    if (level === 'high') return <ShieldAlert className="w-5 h-5" />;
    if (level === 'moderate') return <AlertTriangle className="w-5 h-5" />;
    return <CheckCircle2 className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] font-sans pb-20">
      <Navbar />

      <main className="max-w-4xl mx-auto pt-28 px-4 sm:px-6 flex flex-col items-center">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#176B45]/10 text-[#176B45] text-xs font-bold uppercase tracking-widest rounded-full mb-4">
            <Search className="w-3.5 h-3.5" />
            Conflict Radar
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#161412] mb-4">Trademark Scanner</h1>
          <p className="text-[#161412]/60 max-w-xl mx-auto">
            Perform a preliminary assessment of your proposed brand name against a database of known traditional and proprietary Ayurvedic trademarks.
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-12">
          <div className="relative flex items-center p-2 rounded-2xl bg-white border border-[#161412]/15 shadow-sm focus-within:ring-2 focus-within:ring-[#176B45]/30 transition-all">
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Enter brand name to check (e.g., Dabur, Patanjali)"
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
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl border border-[#161412]/15 shadow-sm overflow-hidden mb-6">
              <div className="p-6 md:p-8 border-b border-[#161412]/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-sm font-bold text-[#161412]/50 uppercase tracking-widest mb-1">Target Name</h2>
                  <p className="text-2xl font-serif text-[#161412]">{result.brand_name}</p>
                </div>
                
                <div className={cn("px-4 py-3 rounded-xl border flex items-center gap-3", getRiskColor(result.risk_level))}>
                  {getRiskIcon(result.risk_level)}
                  <div>
                    <div className="text-[10px] uppercase font-bold opacity-70 tracking-widest leading-none mb-1">Risk Level</div>
                    <div className="text-lg font-bold capitalize leading-none">{result.risk_level}</div>
                  </div>
                </div>
              </div>

              {/* Match Details */}
              <div className="p-6 md:p-8 bg-[#faf8f3]/50">
                <h3 className="text-sm font-bold text-[#161412] mb-4 flex items-center justify-between">
                  Similarity Matches
                  <span className="text-xs font-normal text-[#161412]/50">Top {result.matches?.length || 0} results</span>
                </h3>
                
                {result.matches && result.matches.length > 0 ? (
                  <div className="space-y-3">
                    {result.matches.map((match, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-[#161412]/10 rounded-lg">
                        <span className="font-medium text-[#161412]">{match.existing_mark}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-1000", match.similarity_score >= 85 ? "bg-red-500" : match.similarity_score >= 70 ? "bg-yellow-500" : "bg-green-500")}
                              style={{ width: `${match.similarity_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-[#161412]/60 w-10 text-right">{match.similarity_score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[#161412]/50 text-sm border border-dashed border-[#161412]/20 rounded-lg bg-white">
                    No significant matches found in the database.
                  </div>
                )}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 px-4 text-[#161412]/40 text-xs">
              <span className="font-bold text-[10px] uppercase tracking-wider mt-0.5">Note:</span>
              <p>{result.disclaimer}</p>
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
