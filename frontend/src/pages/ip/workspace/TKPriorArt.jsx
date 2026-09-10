import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen, 
  AlertCircle, 
  Search, 
  ScrollText, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import Navbar from '../../../components/Navbar';
import { knowledgeApi } from '../../../api';
import { cn } from '../../../lib/utils/cn';

export default function TKPriorArt() {
  const [formData, setFormData] = useState({
    formulation_description: '',
    top_k: 10,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'top_k' ? parseInt(value) || 10 : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.formulation_description.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await knowledgeApi.checkTKOverlap(formData);
      setResult(res);
    } catch (err) {
      console.error(err);
      setError("Failed to run traditional knowledge check. Please check backend connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
  };

  const getStatusStyle = (status, overlapLevel) => {
    const norm = (overlapLevel || status || '').toLowerCase();
    if (norm.includes('high')) {
      return {
        banner: 'bg-rose-50/80 border-rose-200 text-rose-950',
        badge: 'bg-rose-100 border-rose-300 text-rose-900',
        icon: <AlertTriangle className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
      };
    }
    if (norm.includes('moderate') || norm.includes('possible')) {
      return {
        banner: 'bg-amber-50/80 border-amber-200 text-amber-950',
        badge: 'bg-amber-100 border-amber-300 text-amber-900',
        icon: <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
      };
    }
    return {
      banner: 'bg-emerald-50/80 border-emerald-200 text-emerald-950',
      badge: 'bg-emerald-100 border-emerald-300 text-emerald-900',
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
    };
  };

  const getMatchBadge = (match) => {
    const norm = (match || '').toLowerCase();
    if (norm.includes('strong')) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    if (norm.includes('partial') || norm.includes('moderate') || norm.includes('related')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (norm.includes('differentiated') || norm.includes('modern') || norm.includes('novel')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    return 'bg-stone-50 text-stone-700 border-stone-200';
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] font-sans text-[#161412] pb-28">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6" style={{ paddingTop: '135px' }}>
        
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <Link 
            to="/ip-intelligence" 
            className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-[#176B45] hover:text-[#125537] mb-5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to IP Intelligence
          </Link>
          
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#8C6D46]/10 text-[#8C6D46] flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-serif text-[#161412] tracking-tight">Traditional Knowledge Prior-Art</h1>
            </div>
          </div>
          <p className="text-sm text-[#161412]/65 max-w-2xl leading-relaxed">
            Search documented traditional knowledge and classical Ayurvedic treatises (including Charaka Samhita, Sushruta Samhita, and Ashtanga Hridaya) 
            for references relevant to your botanical composition.
          </p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold mb-0.5">Search Error</p>
              <p className="text-red-700/90">{error}</p>
            </div>
          </div>
        )}

        {/* Input Form Screen */}
        {!result && !loading && (
          <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
            <div className="border-b border-[#161412]/10 pb-4 mb-6">
              <h2 className="font-serif text-lg text-[#161412]">Classical Literature Query</h2>
              <p className="text-xs text-[#161412]/55 mt-1">Specify botanical names, preparation methods, and intended traditional uses.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#161412] mb-1.5">
                  Formulation Description <span className="text-red-600">*</span>
                </label>
                <p className="text-xs text-[#161412]/55 mb-2.5">
                  Describe botanical ingredients, quantitative proportions, dosage format (e.g. Kwatha, Churna, Taila), and intended therapeutic conditions.
                </p>
                <textarea 
                  required 
                  name="formulation_description" 
                  value={formData.formulation_description} 
                  onChange={handleChange} 
                  rows={5}
                  className="w-full bg-[#fbfaf7] text-[#161412] border border-[#161412]/15 rounded-xl p-4 text-sm focus:outline-none focus:border-[#8C6D46] focus:bg-white transition-all resize-none leading-relaxed placeholder-[#161412]/35" 
                  placeholder="e.g. A decoction of Guduchi (Tinospora cordifolia) and Pippali (Piper longum) administered for the management of chronic Jwara (fever) and digestive debility..."
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#8C6D46] text-white font-medium text-sm rounded-xl hover:bg-[#735836] transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" /> Scan Classical Texts
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white border border-[#161412]/10 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm min-h-[380px]">
            <div className="w-10 h-10 rounded-full border-3 border-[#8C6D46]/20 border-t-[#8C6D46] animate-spin mb-5"></div>
            <h3 className="text-xl font-serif text-[#161412]">Scanning Ancient Sanskrit Treatises...</h3>
            <p className="text-xs text-[#161412]/60 mt-2 max-w-md leading-relaxed">
              Cross-referencing formulation entities with canonical texts (Charaka Samhita, Sushruta Samhita, Ashtanga Hridaya) and statutory prior-art records.
            </p>
          </div>
        )}

        {/* Results Screen */}
        {result && (
          <div className="space-y-8 animate-in fade-in duration-300">

            {/* Primary Result Banner */}
            {(() => {
              const style = getStatusStyle(result.status, result.overlap_level);
              return (
                <div className={cn("p-6 sm:p-8 rounded-2xl border shadow-sm transition-all", style.banner)}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                    <div className="flex items-start gap-4">
                      {style.icon}
                      <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/60">Traditional Knowledge Assessment</span>
                          <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider", style.badge)}>
                            {result.overlap_level ? `Overlap Level: ${result.overlap_level}` : 'Evaluated'}
                            {result.overlap_score ? ` (${result.overlap_score}% similarity)` : ''}
                          </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-serif tracking-tight text-[#161412]">
                          {result.status_label || (result.has_tk_overlap ? 'OVERLAP DETECTED' : 'NO SIGNIFICANT OVERLAP')}
                        </h2>
                      </div>
                    </div>

                    <button 
                      onClick={reset} 
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/90 hover:bg-white text-[#161412] text-xs font-semibold rounded-lg border border-[#161412]/15 shadow-2xs transition-all self-start"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#8C6D46]" />
                      Edit Query / New Search
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-black/8 text-sm leading-relaxed text-[#161412]/85 font-normal">
                    {result.primary_notice || (
                      "The submitted formulation has been cross-referenced against indexed traditional knowledge records and canonical Sanskrit medical treatises."
                    )}
                  </div>
                </div>
              );
            })()}

            {/* "What We Found" Section */}
            <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
              <div className="border-b border-[#161412]/10 pb-3 mb-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C6D46]">Evidence Findings</span>
                <h3 className="text-xl font-serif text-[#161412]">What We Found</h3>
              </div>
              
              <div className="text-sm leading-relaxed text-[#161412]/80 space-y-4">
                {(result.summary || '').split('\n\n').map((para, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Overlap Factors Breakdown */}
            {result.overlap_factors && result.overlap_factors.length > 0 && (
              <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
                <div className="border-b border-[#161412]/10 pb-3 mb-5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C6D46]">Correspondence Spectrum</span>
                  <h3 className="text-xl font-serif text-[#161412]">Potential Overlap Factors</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {result.overlap_factors.map((factor, idx) => (
                    <div key={idx} className="p-4 bg-[#faf8f3]/60 rounded-xl border border-[#161412]/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#161412]">{factor.factor}</span>
                      </div>
                      <span className={cn(
                        "inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                        getMatchBadge(factor.assessment)
                      )}>
                        {factor.assessment_label || factor.assessment}
                      </span>
                      <p className="text-xs text-[#161412]/70 leading-relaxed pt-1">
                        {factor.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How Your Input Compares (Comparison Section) */}
            {result.comparison && result.comparison.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#161412]/12 shadow-sm overflow-hidden">
                <div className="px-7 py-5 border-b border-[#161412]/10 bg-[#fbfaf7]/70">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C6D46]">Side-by-Side Analysis</span>
                  <h3 className="text-xl font-serif text-[#161412]">How Your Input Compares to Documented Knowledge</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#161412]/10 bg-[#faf8f3]/50 text-[10px] font-bold uppercase tracking-wider text-[#161412]/55">
                        <th className="py-3.5 px-6 w-1/4">Aspect</th>
                        <th className="py-3.5 px-6 w-1/3">Your Submitted Input</th>
                        <th className="py-3.5 px-6 w-1/3">Documented Classical Reference</th>
                        <th className="py-3.5 px-6 w-1/6">Alignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#161412]/8 text-xs">
                      {result.comparison.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#fbfaf7]/60 transition-colors">
                          <td className="py-4 px-6 font-semibold text-[#161412] align-top">
                            {item.aspect}
                          </td>
                          <td className="py-4 px-6 text-[#161412]/80 align-top leading-relaxed">
                            {item.user_input}
                          </td>
                          <td className="py-4 px-6 text-[#161412]/80 align-top leading-relaxed">
                            {item.reference}
                          </td>
                          <td className="py-4 px-6 align-top">
                            <span className={cn(
                              "inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider",
                              getMatchBadge(item.match)
                            )}>
                              {item.match}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Classical Text References */}
            {result.references && result.references.length > 0 && (
              <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
                <div className="border-b border-[#161412]/10 pb-3 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C6D46]">Canonical Treatises</span>
                  <h3 className="text-xl font-serif text-[#161412]">Classical Ayurvedic Text References</h3>
                </div>

                <div className="space-y-5">
                  {result.references.map((ref, idx) => (
                    <div key={idx} className="border border-[#161412]/12 rounded-xl p-5 sm:p-6 bg-[#faf8f3]/40 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#161412]/8 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#8C6D46] shrink-0" />
                            <h4 className="font-serif font-bold text-base text-[#161412]">{ref.title}</h4>
                          </div>
                          <p className="text-xs text-[#161412]/60 mt-0.5">
                            {ref.section} • {ref.chapter} {ref.verse ? `• ${ref.verse}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[10px] uppercase font-bold text-[#161412]/50 tracking-wider">Semantic Similarity</span>
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-semibold text-xs">
                            {typeof ref.similarity_score === 'number' ? `${ref.similarity_score}%` : ref.similarity_score}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-1">Classical Excerpt / Translation</span>
                        <blockquote className="text-xs text-[#161412]/85 italic bg-white p-4 rounded-lg border border-[#161412]/8 leading-relaxed">
                          "{ref.excerpt}"
                        </blockquote>
                      </div>

                      <div className="text-xs pt-1">
                        <span className="font-semibold text-[#161412] mr-1">Statutory & Practical Interpretation:</span>
                        <span className="text-[#161412]/80 leading-relaxed">{ref.interpretation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What You Should Do Next (Recommendations) */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
                <div className="border-b border-[#161412]/10 pb-3 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C6D46]">Strategic Direction</span>
                  <h3 className="text-xl font-serif text-[#161412]">What You Should Do Next</h3>
                </div>

                <ol className="space-y-3.5">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-3.5 text-xs text-[#161412]/85 leading-relaxed">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-[#8C6D46]/10 text-[#8C6D46] flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5">{rec}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Scope & Corpus Limitations */}
            <div className="p-6 rounded-2xl bg-[#faf8f3] border border-[#161412]/12 space-y-3 text-xs text-[#161412]/60">
              <span className="font-bold text-[#161412]/75 uppercase tracking-wider block text-[10px]">
                Search Scope & Traditional Knowledge Limitations
              </span>
              <ul className="space-y-1.5 list-disc list-inside leading-relaxed">
                {(result.limitations || [
                  "This evaluation matches against indexed sections of Charaka Samhita, Sushruta Samhita, and Ashtanga Hridaya.",
                  "The confidential CSIR-TKDL database contains over 300,000 formulations; clearance here does not replace official TKDL inspection.",
                  "Semantic similarity is informational and does not constitute a legal determination of anticipation under Section 3(p)."
                ]).map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
              <div className="pt-2 border-t border-[#161412]/10 text-[11px] italic text-[#161412]/50">
                {result.disclaimer || "Traditional Knowledge Prior-Art Assistant — Consult accredited Indian patent and Ayurvedic experts."}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
