import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  FileText, 
  ShieldAlert, 
  BookOpen,
  RotateCcw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import Navbar from '../../../components/Navbar';
import { ipApi } from '../../../api';
import { cn } from '../../../lib/utils/cn';

export default function PatentabilityTool() {
  const [formData, setFormData] = useState({
    formulation_description: '',
    category: 'Proprietary Ayurvedic Medicine',
    region_specific: false,
    unique_packaging: false,
    new_plant_variety_bred: false,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.formulation_description.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await ipApi.checkPatentability(formData);
      setResult(res);
    } catch (err) {
      console.error(err);
      setError("Failed to run patentability assessment. Please ensure the backend service is operational and try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
  };

  const getStatusBadgeStyle = (status) => {
    const normalized = (status || '').toLowerCase();
    if (normalized.includes('likely_patentable') || normalized.includes('likely patentable')) {
      return {
        banner: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950',
        badge: 'bg-emerald-100/70 border-emerald-300 text-emerald-900',
        dot: 'bg-emerald-600',
        icon: <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
      };
    }
    if (normalized.includes('potentially') || normalized.includes('uncertain')) {
      return {
        banner: 'bg-amber-50/80 border-amber-200/80 text-amber-950',
        badge: 'bg-amber-100/70 border-amber-300 text-amber-900',
        dot: 'bg-amber-600',
        icon: <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
      };
    }
    if (normalized.includes('insufficient')) {
      return {
        banner: 'bg-stone-50 border-stone-200 text-stone-900',
        badge: 'bg-stone-100 border-stone-300 text-stone-800',
        dot: 'bg-stone-500',
        icon: <AlertCircle className="w-6 h-6 text-stone-600 shrink-0 mt-0.5" />
      };
    }
    return {
      banner: 'bg-rose-50/80 border-rose-200/80 text-rose-950',
      badge: 'bg-rose-100/70 border-rose-300 text-rose-900',
      dot: 'bg-rose-600',
      icon: <ShieldAlert className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
    };
  };

  const getCriterionBadge = (assessment) => {
    const norm = (assessment || '').toLowerCase();
    if (norm.includes('favourable') || norm.includes('favorable') || norm.includes('low')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (norm.includes('review') || norm.includes('needed') || norm.includes('moderate') || norm.includes('defensible')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (norm.includes('risk') || norm.includes('excluded') || norm.includes('statutory')) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
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
            <div className="w-10 h-10 rounded-lg bg-[#176B45]/10 text-[#176B45] flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-serif text-[#161412] tracking-tight">Patentability Assessment</h1>
            </div>
          </div>
          <p className="text-sm text-[#161412]/65 max-w-2xl leading-relaxed">
            Evaluate your formulation and processing methods against Indian Patent Law (specifically Section 3(p), Section 3(d), and Section 3(e)). 
            This is an AI-assisted preliminary evaluation to support research and patent strategy.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold mb-0.5">Evaluation Error</p>
              <p className="text-red-700/90">{error}</p>
            </div>
          </div>
        )}

        {/* Input Form Screen */}
        {!result && !loading && (
          <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
            <div className="border-b border-[#161412]/10 pb-4 mb-6">
              <h2 className="font-serif text-lg text-[#161412]">Formulation Details</h2>
              <p className="text-xs text-[#161412]/55 mt-1">Provide clear specifications on composition, manufacturing, and delivery format.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#161412] mb-1.5">
                  Formulation Description <span className="text-red-600">*</span>
                </label>
                <p className="text-xs text-[#161412]/55 mb-2.5">
                  Include botanical names, specialized extraction methods (e.g. CO2, hydroalcoholic), targeted therapeutic use, and carrier systems.
                </p>
                <textarea 
                  required 
                  name="formulation_description" 
                  value={formData.formulation_description} 
                  onChange={handleChange} 
                  rows={5}
                  className="w-full bg-[#fbfaf7] text-[#161412] border border-[#161412]/15 rounded-xl p-4 text-sm focus:outline-none focus:border-[#176B45] focus:bg-white transition-all resize-none leading-relaxed placeholder-[#161412]/35" 
                  placeholder="e.g. A synergistic phytopharmaceutical formulation comprising supercritical CO2 extract of Ashwagandha (Withania somnifera) standardized to 5% withanolides and liposomal-encapsulated Curcuminoids, demonstrating 4-fold bioavailability enhancement for anti-inflammatory therapy..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#161412] mb-1.5">Regulatory Category</label>
                <select 
                  name="category" 
                  value={formData.category} 
                  onChange={handleChange} 
                  className="w-full bg-[#fbfaf7] text-[#161412] border border-[#161412]/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#176B45] focus:bg-white transition-all"
                >
                  <option>Proprietary Ayurvedic Medicine</option>
                  <option>Classical Medicine</option>
                  <option>Phytopharmaceutical</option>
                  <option>Cosmetic</option>
                  <option>Ayurveda-Aahar</option>
                </select>
                <p className="text-xs text-[#161412]/50 mt-1.5">Classical medicine classifications face immediate statutory exclusion under Section 3(p).</p>
              </div>

              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#161412]/60 mb-3">Additional IP Characteristics</p>
                <div className="space-y-2.5">
                  <label className="flex items-start gap-3 p-3.5 bg-[#fbfaf7] hover:bg-[#f6f4ed] border border-[#161412]/10 rounded-xl cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      name="region_specific" 
                      checked={formData.region_specific} 
                      onChange={handleChange} 
                      className="mt-0.5 w-4 h-4 text-[#176B45] rounded border-[#161412]/20 focus:ring-[#176B45]" 
                    />
                    <div className="text-xs">
                      <span className="font-medium text-[#161412] block mb-0.5">Region-specific botanical origin (Geographical Indication context)</span>
                      <span className="text-[#161412]/55">Botanical materials sourced from distinct agro-climatic zones with established reputation.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 bg-[#fbfaf7] hover:bg-[#f6f4ed] border border-[#161412]/10 rounded-xl cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      name="unique_packaging" 
                      checked={formData.unique_packaging} 
                      onChange={handleChange} 
                      className="mt-0.5 w-4 h-4 text-[#176B45] rounded border-[#161412]/20 focus:ring-[#176B45]" 
                    />
                    <div className="text-xs">
                      <span className="font-medium text-[#161412] block mb-0.5">Proprietary container geometry or industrial dispenser design</span>
                      <span className="text-[#161412]/55">Applies to novel visual shape, configuration, or ornamental packaging under the Designs Act, 2000.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 bg-[#fbfaf7] hover:bg-[#f6f4ed] border border-[#161412]/10 rounded-xl cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      name="new_plant_variety_bred" 
                      checked={formData.new_plant_variety_bred} 
                      onChange={handleChange} 
                      className="mt-0.5 w-4 h-4 text-[#176B45] rounded border-[#161412]/20 focus:ring-[#176B45]" 
                    />
                    <div className="text-xs">
                      <span className="font-medium text-[#161412] block mb-0.5">Utilizes a novel bred botanical variety</span>
                      <span className="text-[#161412]/55">Evaluates applicability under the Protection of Plant Varieties and Farmers' Rights (PPV&FR) Act, 2001.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-3">
                <button 
                  type="submit" 
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#176B45] text-white font-medium text-sm rounded-xl hover:bg-[#125537] transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  Analyze Patentability <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white border border-[#161412]/10 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm min-h-[380px]">
            <div className="w-10 h-10 rounded-full border-3 border-[#176B45]/20 border-t-[#176B45] animate-spin mb-5"></div>
            <h3 className="text-xl font-serif text-[#161412]">Evaluating Patentability Framework...</h3>
            <p className="text-xs text-[#161412]/60 mt-2 max-w-md leading-relaxed">
              Performing semantic vector matching against indexed statutory prior-art chunks and evaluating Section 3(p), 3(d), and 3(e) criteria.
            </p>
          </div>
        )}

        {/* Results Screen */}
        {result && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Primary Result Banner */}
            {(() => {
              const style = getStatusBadgeStyle(result.status || result.posture);
              return (
                <div className={cn("p-6 sm:p-8 rounded-2xl border shadow-sm transition-all", style.banner)}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                    <div className="flex items-start gap-4">
                      {style.icon}
                      <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/60">Preliminary Patentability Posture</span>
                          <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider", style.badge)}>
                            {result.confidence ? `Confidence: ${result.confidence}` : 'Confidence: Moderate'}
                            {result.confidence_score ? ` (${result.confidence_score}%)` : ''}
                          </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-serif tracking-tight text-[#161412]">
                          {result.status_label || (result.posture ? result.posture.toUpperCase() : 'PATENTABILITY EVALUATED')}
                        </h2>
                      </div>
                    </div>

                    <button 
                      onClick={reset} 
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/90 hover:bg-white text-[#161412] text-xs font-semibold rounded-lg border border-[#161412]/15 shadow-2xs transition-all self-start"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#176B45]" />
                      Edit Inputs / New Query
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-black/8 text-sm leading-relaxed text-[#161412]/85 font-normal">
                    {result.primary_notice || (
                      "Based on the information provided, the formulation has been reviewed against documented statutory prior-art criteria and traditional knowledge exclusions."
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Executive Summary */}
            <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
              <div className="border-b border-[#161412]/10 pb-3 mb-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Analysis Synthesis</span>
                <h3 className="text-xl font-serif text-[#161412]">Executive Summary</h3>
              </div>
              
              <div className="text-sm leading-relaxed text-[#161412]/80 space-y-4">
                {(result.summary || result.reasoning || '').split('\n\n').map((para, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* User Input → Analysis Connection ("Information Considered") */}
            {result.input_analysis && (
              <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
                <div className="border-b border-[#161412]/10 pb-3 mb-5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Input Grounding</span>
                  <h3 className="text-xl font-serif text-[#161412]">Information Considered & Relevance</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3.5 bg-[#faf8f3] p-5 rounded-xl border border-[#161412]/8">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block">Evaluated Subject</span>
                      <span className="text-sm font-semibold text-[#161412]">{result.input_analysis.product || 'Botanical Formulation'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-1">Key Botanical Ingredients Identified</span>
                      <div className="flex flex-wrap gap-1.5">
                        {result.input_analysis.ingredients && result.input_analysis.ingredients.length > 0 ? (
                          result.input_analysis.ingredients.map((ing, i) => (
                            <span key={i} className="px-2.5 py-1 bg-white border border-[#161412]/12 rounded-md text-xs font-medium text-[#161412]">
                              {ing}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#161412]/60 italic">Botanical constituents extracted from text</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block">Regulatory Classification</span>
                      <span className="text-xs font-medium text-[#161412] bg-white px-2.5 py-0.5 rounded border border-[#161412]/10 inline-block mt-0.5">
                        {result.input_analysis.category || 'Proprietary Ayurvedic Medicine'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3.5 bg-[#faf8f3] p-5 rounded-xl border border-[#161412]/8">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block">Targeted Therapeutic Utility</span>
                      <span className="text-sm text-[#161412]/85">{result.input_analysis.intended_use || 'General physiological support'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-1">Distinguishing Technical Interventions</span>
                      <div className="flex flex-wrap gap-1.5">
                        {result.input_analysis.technical_features && result.input_analysis.technical_features.length > 0 ? (
                          result.input_analysis.technical_features.map((feat, i) => (
                            <span key={i} className="px-2.5 py-1 bg-[#176B45]/10 border border-[#176B45]/20 rounded-md text-xs font-medium text-[#176B45]">
                              {feat}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#161412]/55 italic">Standard uncharacterized herbal mixture</span>
                        )}
                      </div>
                    </div>

                    {result.input_analysis.traditional_references_mentioned && result.input_analysis.traditional_references_mentioned.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block">Classical Literature Mentioned</span>
                        <span className="text-xs text-[#161412]/80">{result.input_analysis.traditional_references_mentioned.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {result.input_analysis.why_this_matters && (
                  <div className="p-4 bg-[#176B45]/5 border border-[#176B45]/15 rounded-xl">
                    <span className="text-xs font-bold text-[#176B45] uppercase tracking-wider block mb-1">
                      Why This Information Matters to Patent Examination
                    </span>
                    <p className="text-xs leading-relaxed text-[#161412]/80">
                      {result.input_analysis.why_this_matters}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Patentability Analysis Table */}
            {result.criteria && result.criteria.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#161412]/12 shadow-sm overflow-hidden">
                <div className="px-7 py-5 border-b border-[#161412]/10 bg-[#fbfaf7]/70">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Legal Standards</span>
                  <h3 className="text-xl font-serif text-[#161412]">Patentability Criteria Analysis</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#161412]/10 bg-[#faf8f3]/50 text-[10px] font-bold uppercase tracking-wider text-[#161412]/55">
                        <th className="py-3.5 px-6 w-1/4">Criterion</th>
                        <th className="py-3.5 px-6 w-1/4">Assessment</th>
                        <th className="py-3.5 px-6 w-1/2">Statutory Analysis & Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#161412]/8 text-xs">
                      {result.criteria.map((crit, idx) => (
                        <tr key={idx} className="hover:bg-[#fbfaf7]/60 transition-colors">
                          <td className="py-4 px-6 font-semibold text-[#161412] align-top">
                            {crit.name}
                          </td>
                          <td className="py-4 px-6 align-top">
                            <span className={cn(
                              "inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border",
                              getCriterionBadge(crit.assessment)
                            )}>
                              {crit.assessment_label || crit.assessment}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-[#161412]/80 leading-relaxed align-top">
                            {crit.explanation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Relevant Prior-Art / Classical Evidence */}
            <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
              <div className="border-b border-[#161412]/10 pb-3 mb-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Documented Evidence</span>
                <h3 className="text-xl font-serif text-[#161412]">Relevant Prior-Art & Classical References</h3>
              </div>

              {result.prior_art && result.prior_art.length > 0 ? (
                <div className="space-y-4">
                  {result.prior_art.map((item, idx) => (
                    <div key={idx} className="border border-[#161412]/12 rounded-xl p-5 bg-[#faf8f3]/40 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#161412]/8 pb-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[#176B45] shrink-0" />
                          <h4 className="font-serif font-bold text-sm text-[#161412]">{item.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[10px] uppercase font-bold text-[#161412]/50 tracking-wider">Semantic Similarity</span>
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-semibold text-xs">
                            {typeof item.similarity_score === 'number' ? `${item.similarity_score}%` : item.similarity_score}
                          </span>
                        </div>
                      </div>

                      <blockquote className="text-xs text-[#161412]/75 italic bg-white p-3.5 rounded-lg border border-[#161412]/8 leading-relaxed">
                        "{item.excerpt}"
                      </blockquote>

                      <div className="text-xs">
                        <span className="font-semibold text-[#161412] mr-1">Why this matters:</span>
                        <span className="text-[#161412]/75 leading-relaxed">{item.why_it_matters}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-[#161412]/15 rounded-xl bg-[#faf8f3]/30">
                  <p className="text-xs text-[#161412]/60">
                    No direct statutory or classical citations met the similarity threshold in the currently indexed corpus.
                    A full clearance across the international Patent Cooperation Treaty (PCT) minimum documentation is advised.
                  </p>
                </div>
              )}
            </div>

            {/* Applicable Legal Framework */}
            {result.legal_framework && result.legal_framework.length > 0 && (
              <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
                <div className="border-b border-[#161412]/10 pb-3 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Statutory Scope</span>
                  <h3 className="text-xl font-serif text-[#161412]">Applicable Legal Framework (Indian Patents Act, 1970)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.legal_framework.map((law, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[#faf8f3]/60 border border-[#161412]/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-serif text-[#176B45]">{law.section}</span>
                        <span className="text-[10px] font-medium text-[#161412]/50">{law.act}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-[#161412]">{law.title}</h4>
                      <p className="text-xs text-[#161412]/70 leading-relaxed">{law.relevance}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic IP Regime Map */}
            {result.ip_map && result.ip_map.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#161412]/12 shadow-sm overflow-hidden">
                <div className="px-7 py-5 border-b border-[#161412]/10 bg-[#fbfaf7]/70">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Multimodal Protection</span>
                  <h3 className="text-xl font-serif text-[#161412]">Strategic IP Regime Map</h3>
                </div>

                <div className="divide-y divide-[#161412]/8">
                  {result.ip_map.map((item, idx) => (
                    <div key={idx} className="p-4 sm:px-7 flex flex-col sm:flex-row gap-3 sm:items-center justify-between hover:bg-[#faf8f3]/40 transition-colors">
                      <div className="flex items-center gap-3 w-full sm:w-1/3">
                        <span className="text-xs font-bold text-[#161412] w-32 shrink-0">{item.regime}</span>
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border",
                          item.color === 'green' ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                          item.color === 'red' ? "bg-rose-50 text-rose-800 border-rose-200" :
                          "bg-amber-50 text-amber-800 border-amber-200"
                        )}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#161412]/70 sm:w-2/3 leading-relaxed">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What You Should Do Next (Recommendations) */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
                <div className="border-b border-[#161412]/10 pb-3 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Actionable Pathway</span>
                  <h3 className="text-xl font-serif text-[#161412]">What You Should Do Next</h3>
                </div>

                <ol className="space-y-3.5">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-3.5 text-xs text-[#161412]/85 leading-relaxed">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-[#176B45]/10 text-[#176B45] flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5">{rec}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Scope, Limitations & Professional Legal Disclaimer */}
            <div className="p-6 rounded-2xl bg-[#faf8f3] border border-[#161412]/12 space-y-3 text-xs text-[#161412]/60">
              <span className="font-bold text-[#161412]/75 uppercase tracking-wider block text-[10px]">
                Advisory Scope & Verification Boundaries
              </span>
              <ul className="space-y-1.5 list-disc list-inside leading-relaxed">
                {(result.limitations || [
                  "This evaluation is an AI-assisted preliminary assessment based on currently indexed Indian statutory corpora.",
                  "Under Section 3(p) of the Patents Act, 1970, Indian patent examiners routinely issue objections against Ayurvedic combinations.",
                  "This tool does not provide legal advice or replace formal clearance by an accredited patent attorney."
                ]).map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
              <div className="pt-2 border-t border-[#161412]/10 text-[11px] italic text-[#161412]/50">
                {result.disclaimer || "AayuGranth Preliminary IP Intelligence — Consult a registered patent agent before public filing."}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
