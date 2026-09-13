import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Scale,
  Search,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  BookOpen,
  RotateCcw,
  FileText,
  Sliders,
  ChevronDown,
  Layers,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import Navbar from '../../../components/Navbar';
import { ipApi } from '../../../api';
import { cn } from '../../../lib/utils/cn';

export default function PatentIntelligence() {
  const [formData, setFormData] = useState({
    formulation_description: '',
    category: 'Proprietary Ayurvedic Medicine',
    region_specific: false,
    unique_packaging: false,
    new_plant_variety_bred: false,
    top_k: 10,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'top_k' ? parseInt(value, 10) || 10 : value)
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
      setError("Failed to run patent intelligence analysis. Please ensure the backend service is operational and try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
  };

  const getStatusBadgeStyle = (status) => {
    const normalized = (status || '').toLowerCase();
    if (normalized.includes('potentially_novel') || normalized.includes('favourable') || normalized.includes('potentially patentable')) {
      return {
        banner: 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950',
        badge: 'bg-emerald-100/80 border-emerald-300 text-emerald-900',
        dot: 'bg-emerald-600',
        icon: <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
      };
    }
    if (normalized.includes('potentially') || normalized.includes('concern') || normalized.includes('inventive_step') || normalized.includes('overlap') || normalized.includes('needs_review')) {
      return {
        banner: 'bg-amber-50/90 border-amber-200/90 text-amber-950',
        badge: 'bg-amber-100/80 border-amber-300 text-amber-900',
        dot: 'bg-amber-600',
        icon: <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
      };
    }
    if (normalized.includes('insufficient') || normalized.includes('further_search') || normalized.includes('limited')) {
      return {
        banner: 'bg-stone-50 border-stone-200 text-stone-900',
        badge: 'bg-stone-100 border-stone-300 text-stone-800',
        dot: 'bg-stone-500',
        icon: <AlertCircle className="w-6 h-6 text-stone-600 shrink-0 mt-0.5" />
      };
    }
    return {
      banner: 'bg-rose-50/90 border-rose-200/90 text-rose-950',
      badge: 'bg-rose-100/80 border-rose-300 text-rose-900',
      dot: 'bg-rose-600',
      icon: <ShieldAlert className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
    };
  };

  const getCriterionBadge = (assessment) => {
    const norm = (assessment || '').toLowerCase();
    if (norm.includes('favourable') || norm.includes('favorable') || norm.includes('low')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (norm.includes('review') || norm.includes('needed') || norm.includes('moderate') || norm.includes('defensible') || norm.includes('proof')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (norm.includes('risk') || norm.includes('excluded') || norm.includes('statutory') || norm.includes('concern')) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    return 'bg-stone-50 text-stone-700 border-stone-200';
  };

  const getComparisonBadge = (status) => {
    switch (status) {
      case 'exact':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'partial':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'not_found':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  const getRelevanceBadgeStyle = (relevance) => {
    const rel = (relevance || '').toLowerCase();
    if (rel === 'high') return 'bg-rose-50 text-rose-800 border-rose-200';
    if (rel === 'moderate') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  };

  // Compute maximum similarity from prior art items
  const maxSimilarityPercent = result?.prior_art?.length
    ? Math.max(...result.prior_art.map(p => Number(p.similarity_score) || 0))
    : (result?.prior_art_results?.length
      ? Math.max(...result.prior_art_results.map(p => Math.round((p.semantic_similarity || 0) * 100)))
      : 0);

  return (
    <div className="min-h-screen bg-[#faf8f3] font-sans text-[#161412] pb-28">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6" style={{ paddingTop: '135px' }}>

        {/* Navigation Breadcrumb & Header */}
        <div className="mb-8">
          <Link
            to="/ip-intelligence"
            className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-[#176B45] hover:text-[#125537] mb-5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to IP Intelligence
          </Link>

          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#176B45]/10 text-[#176B45] flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#176B45]/10 text-[#176B45] text-[10px] font-bold uppercase tracking-widest mb-1">
                Unified IP Intelligence
              </div>
              <h1 className="text-3xl font-serif text-[#161412] tracking-tight">Patent Intelligence</h1>
            </div>
          </div>
          <p className="text-sm text-[#161412]/65 max-w-3xl leading-relaxed">
            Scan statutory prior-art, compare claimed parameters feature-by-feature, and evaluate statutory patentability 
            under Indian Patent Law (Sections 2(1)(j), 3(p), 3(d), and 3(e)) in one coherent workflow.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold mb-0.5">Analysis Error</p>
              <p className="text-red-700/90">{error}</p>
            </div>
          </div>
        )}

        {/* Input Form Screen */}
        {!result && !loading && (
          <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
            <div className="border-b border-[#161412]/10 pb-4 mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Step 1 of 1</span>
              <h2 className="font-serif text-xl text-[#161412]">Describe Your Invention</h2>
              <p className="text-xs text-[#161412]/55 mt-1">
                Provide comprehensive specifications on botanical composition, processing methods, solvents, delivery carriers, and intended therapeutic utility.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#161412] mb-1.5">
                  Formulation & Process Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  name="formulation_description"
                  value={formData.formulation_description}
                  onChange={handleChange}
                  rows={6}
                  className="w-full bg-[#fbfaf7] text-[#161412] border border-[#161412]/15 rounded-xl p-4 text-sm focus:outline-none focus:border-[#176B45] focus:bg-white transition-all resize-none leading-relaxed placeholder-[#161412]/35"
                  placeholder="e.g. A topical herbal formulation comprising standardized hydro-alcoholic extracts of Curcuma longa rhizome and Boswellia serrata resin in a 2:1 weight ratio. The extracts are encapsulated into a phospholipid vesicular delivery system (average particle size 150 nm) for transdermal application in inflammatory osteoarthritis..."
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
                  <option>Phytopharmaceutical Drug</option>
                  <option>Nutraceutical / Food Supplement</option>
                  <option>Cosmeceutical</option>
                </select>
              </div>

              <div className="pt-2 border-t border-[#161412]/10">
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
                      <span className="text-[#161412]/60">Ingredients sourced from specific geographic regions with recognized terroir or traditional reputation.</span>
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
                      <span className="text-[#161412]/60">Novel external physical shape, applicator ergonomics, or decorative packaging eligible for Design Registration.</span>
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
                      <span className="text-[#161412]/60">New botanical genotype bred through controlled cultivation eligible under PPV&FR Act, 2001.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Advanced Options Collapsible */}
              <div className="pt-2 border-t border-[#161412]/10">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(prev => !prev)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#161412]/70 hover:text-[#176B45] transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Advanced Search Options</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-180")} />
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-4 bg-[#fbfaf7] border border-[#161412]/10 rounded-xl max-w-xs animate-in fade-in">
                    <label className="block text-xs font-medium text-[#161412] mb-1.5">Max Prior-Art Matches</label>
                    <select
                      name="top_k"
                      value={formData.top_k}
                      onChange={handleChange}
                      className="w-full bg-white text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#176B45]"
                    >
                      <option value={5}>Top 5 matches</option>
                      <option value={10}>Top 10 matches (Standard)</option>
                      <option value={20}>Top 20 matches (Deep scan)</option>
                    </select>
                    <p className="text-[11px] text-[#161412]/50 mt-1.5">Controls retrieval depth across indexed patent/prior-art records.</p>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#176B45] text-white font-medium text-sm rounded-xl hover:bg-[#125537] transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  Analyse Invention <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white border border-[#161412]/10 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm min-h-[400px]">
            <div className="w-12 h-12 rounded-full border-3 border-[#176B45]/20 border-t-[#176B45] animate-spin mb-5"></div>
            <h3 className="text-xl font-serif text-[#161412]">Synthesizing Patent Intelligence...</h3>
            <p className="text-xs text-[#161412]/60 mt-2 max-w-lg leading-relaxed">
              Performing semantic vector matching against indexed patent/prior-art references, building feature-by-feature claim comparisons, 
              and evaluating Section 3(p), 3(d), and 3(e) legal thresholds.
            </p>
          </div>
        )}

        {/* Results Screen */}
        {result && (
          <div className="space-y-8 animate-in fade-in duration-300">

            {/* SECTION 1: Overall Assessment Banner */}
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
                            Confidence: {result.confidence || 'Moderate'}
                          </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-serif tracking-tight text-[#161412]">
                          {result.status_label || (result.posture ? result.posture.toUpperCase() : 'PATENTABILITY EVALUATED')}
                        </h2>
                      </div>
                    </div>

                    <button
                      onClick={reset}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/95 hover:bg-white text-[#161412] text-xs font-semibold rounded-lg border border-[#161412]/15 shadow-2xs transition-all self-start shrink-0"
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

            {/* Exact Features Extracted */}
            <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
              <div className="border-b border-[#161412]/10 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Input Grounding</span>
                  <h3 className="text-xl font-serif text-[#161412]">Your Invention — Extracted Specifications</h3>
                </div>
                <span className="text-xs px-2.5 py-1 bg-[#176B45]/10 text-[#176B45] rounded-md font-medium">
                  Verbatim Parameters
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 bg-[#faf8f3] p-5 rounded-xl border border-[#161412]/8">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-0.5">Formulation / Subject</span>
                    <span className="text-sm font-semibold text-[#161412]">
                      {result.invention_features?.formulation_type || result.input_analysis?.product || 'Herbal Formulation'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-1">Key Botanical Ingredients Identified</span>
                    <div className="flex flex-wrap gap-1.5">
                      {((result.invention_features?.ingredients?.length ? result.invention_features.ingredients : result.input_analysis?.ingredients) || []).map((ing, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white border border-[#161412]/12 rounded-md text-xs font-medium text-[#161412]">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  {result.invention_features?.plant_parts && result.invention_features.plant_parts.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-1">Plant Parts Specified</span>
                      <div className="flex flex-wrap gap-1.5">
                        {result.invention_features.plant_parts.map((part, i) => (
                          <span key={i} className="px-2.5 py-0.5 bg-white border border-[#161412]/10 text-[#161412] rounded text-xs">
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.invention_features?.ratios_quantities && result.invention_features.ratios_quantities.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-0.5">Ratios / Quantities</span>
                      <span className="text-xs font-semibold text-[#161412] bg-white px-2.5 py-1 rounded border border-[#161412]/10 inline-block">
                        {result.invention_features.ratios_quantities.join(', ')}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-0.5">Regulatory Classification</span>
                    <span className="text-xs font-medium text-[#161412] bg-white px-2.5 py-0.5 rounded border border-[#161412]/10 inline-block">
                      {result.invention_features?.category || result.input_analysis?.category || formData.category}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 bg-[#faf8f3] p-5 rounded-xl border border-[#161412]/8">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-0.5">Targeted Therapeutic Utility</span>
                    <span className="text-sm text-[#161412]/85">
                      {result.invention_features?.intended_use || result.input_analysis?.intended_use || 'General physiological support'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-1">Extraction Method & Solvents</span>
                    <span className="text-xs text-[#161412]/85 bg-white px-2.5 py-1 rounded border border-[#161412]/10 inline-block">
                      {[...(result.invention_features?.extraction_methods || []), ...(result.invention_features?.solvents || [])].length
                        ? [...(result.invention_features?.extraction_methods || []), ...(result.invention_features?.solvents || [])].join(', ')
                        : (result.input_analysis?.technical_features?.[0] || 'Standard extraction')}
                    </span>
                  </div>

                  {result.invention_features?.delivery_system && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-0.5">Delivery System / Carrier</span>
                      <span className="text-xs font-medium text-[#176B45] bg-[#176B45]/10 px-2.5 py-1 rounded border border-[#176B45]/20 inline-block">
                        {result.invention_features.delivery_system}
                      </span>
                    </div>
                  )}

                  {result.invention_features?.particle_size && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-0.5">Particle Size</span>
                      <span className="text-xs text-[#161412] bg-white px-2.5 py-0.5 rounded border border-[#161412]/10 inline-block">
                        {result.invention_features.particle_size}
                      </span>
                    </div>
                  )}

                  {result.invention_features?.dosage_application && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/50 block mb-0.5">Application Regimen</span>
                      <span className="text-xs text-[#161412]/80">
                        {result.invention_features.dosage_application}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: Prior-Art Radar */}
            <div className="bg-white rounded-2xl border border-[#161412]/12 shadow-sm overflow-hidden">
              <div className="px-7 py-5 border-b border-[#161412]/10 bg-[#fbfaf7]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Semantic Vector Radar</span>
                  <h3 className="text-xl font-serif text-[#161412] flex items-center gap-2">
                    <Search className="w-5 h-5 text-[#176B45]" /> Prior-Art Radar
                  </h3>
                </div>
                <div className="text-xs text-[#161412]/60">
                  Relevant documents found in the indexed corpus
                </div>
              </div>

              {/* Radar Overview Bar */}
              <div className="p-6 md:p-8 bg-[#faf8f3]/40 border-b border-[#161412]/10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="w-full md:w-1/2 flex items-center justify-between md:justify-start gap-8">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/50 mb-1">Overall Relevance</h4>
                      <div className={cn(
                        "inline-flex items-center px-3 py-1 rounded-md border text-xs font-bold uppercase tracking-wider",
                        getRelevanceBadgeStyle(maxSimilarityPercent >= 75 ? 'High' : maxSimilarityPercent >= 50 ? 'Moderate' : 'Low')
                      )}>
                        {maxSimilarityPercent >= 75 ? 'High' : maxSimilarityPercent >= 50 ? 'Moderate' : 'Low'}
                      </div>
                    </div>
                    <div className="h-10 w-px bg-[#161412]/10 hidden md:block"></div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/50 mb-1">Highest Semantic Similarity</h4>
                      <div className="text-2xl sm:text-3xl font-serif text-[#161412]">
                        {maxSimilarityPercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-1/2">
                    <div className="flex items-center justify-between text-[11px] text-[#161412]/60 mb-1.5 font-medium">
                      <span>Lower semantic similarity (0%)</span>
                      <span>Higher semantic similarity (100%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-stone-200/80 rounded-full overflow-hidden border border-[#161412]/10">
                      <div
                        className={cn(
                          "h-full transition-all duration-1000 ease-out rounded-full",
                          maxSimilarityPercent >= 75 ? "bg-rose-500" : maxSimilarityPercent >= 50 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(Math.max(maxSimilarityPercent, 0), 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-[#161412]/50 mt-1.5">
                      Note: Semantic similarity measures textual/conceptual closeness in our indexed legal corpus, not a finding of legal infringement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Radar Documents List */}
              <div className="p-6 sm:p-8">
                {result.prior_art && result.prior_art.length > 0 ? (
                  <div className="space-y-4">
                    {result.prior_art.map((item, idx) => (
                      <div key={idx} className="border border-[#161412]/12 rounded-xl p-5 bg-[#faf8f3]/50 hover:bg-[#faf8f3] transition-colors space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#161412]/8 pb-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#176B45] shrink-0" />
                            <h4 className="font-serif font-bold text-sm text-[#161412]">{item.title}</h4>
                            {item.source_type && (
                              <span className="text-[10px] text-[#161412]/50 uppercase tracking-widest font-semibold px-2 py-0.5 bg-white border border-[#161412]/10 rounded">
                                {item.source_type_label || item.source_type}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[10px] uppercase font-bold text-[#161412]/50 tracking-wider">Semantic similarity:</span>
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-bold text-xs">
                              {typeof item.similarity_score === 'number' ? `${item.similarity_score}%` : item.similarity_score}
                            </span>
                          </div>
                        </div>

                        <blockquote className="text-xs text-[#161412]/75 italic bg-white p-3.5 rounded-lg border border-[#161412]/8 leading-relaxed">
                          "{item.excerpt}"
                        </blockquote>

                        <div className="text-xs flex items-start gap-1.5 pt-1">
                          <span className="font-semibold text-[#161412] shrink-0">Why it matters:</span>
                          <span className="text-[#161412]/75 leading-relaxed">{item.why_it_matters}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-[#161412]/15 rounded-xl bg-[#faf8f3]/30 space-y-2">
                    <p className="text-sm font-serif text-[#161412]">No supporting prior-art evidence was retrieved from the currently indexed corpus.</p>
                    <p className="text-xs text-[#161412]/60 max-w-xl mx-auto leading-relaxed">
                      Absence of direct matches in this database does not guarantee novelty — additional verification against relevant Indian and international patent databases and the CSIR-TKDL database is recommended prior to filing.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: Novelty & Feature-by-Feature Comparison */}
            {result.prior_art_comparisons && result.prior_art_comparisons.length > 0 && (
              <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm space-y-6">
                <div className="border-b border-[#161412]/10 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Claim Mapping</span>
                  <h3 className="text-xl font-serif text-[#161412]">Feature-by-Feature Prior-Art Comparison</h3>
                  <p className="text-xs text-[#161412]/60 mt-1">
                    Direct parameter-level comparison of your invention's claimed attributes against retrieved prior-art references.
                  </p>
                </div>

                <div className="space-y-6">
                  {result.prior_art_comparisons.map((item, idx) => (
                    <div key={idx} className="border border-[#161412]/12 rounded-xl p-5 bg-[#faf8f3]/40 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#161412]/8 pb-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[#176B45] shrink-0" />
                          <h4 className="font-serif font-bold text-sm text-[#161412]">{item.document_title}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[10px] uppercase font-bold text-[#161412]/50 tracking-wider">Semantic similarity</span>
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-semibold text-xs">
                            {Math.round(item.semantic_similarity * 100)}%
                          </span>
                        </div>
                      </div>

                      <blockquote className="text-xs text-[#161412]/75 italic bg-white p-3.5 rounded-lg border border-[#161412]/8 leading-relaxed">
                        "{item.excerpt}"
                      </blockquote>

                      {/* Feature Comparison Table */}
                      {item.comparisons && item.comparisons.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="patent-intelligence-table w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-[#161412]/10 bg-white/60 text-[10px] font-bold uppercase tracking-wider text-[#161412]/50">
                                <th className="py-2.5 px-3">Invention Feature</th>
                                <th className="py-2.5 px-3">Your Specification</th>
                                <th className="py-2.5 px-3">Prior-Art Disclosure</th>
                                <th className="py-2.5 px-3 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#161412]/8">
                              {item.comparisons.map((c, cIdx) => (
                                <tr key={cIdx} className="hover:bg-white/50">
                                  <td className="py-2.5 px-3 font-medium text-[#161412]">{c.feature_name}</td>
                                  <td className="py-2.5 px-3 text-[#161412]/80">{c.user_specification}</td>
                                  <td className="py-2.5 px-3 text-[#161412]/70">{c.prior_art_disclosure}</td>
                                  <td className="py-2.5 px-3 text-right">
                                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", getComparisonBadge(c.status))}>
                                      {c.status.replace('_', ' ')}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <p className="text-xs text-[#161412]/80 pt-2 border-t border-[#161412]/8">
                        <span className="font-semibold text-[#161412]">Overlap Summary: </span>
                        {item.overall_overlap_summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: Statutory Patentability Assessment */}
            <div className="space-y-6">
              <div className="border-b border-[#161412]/10 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Statutory Evaluation</span>
                <h3 className="text-xl font-serif text-[#161412]">Patentability Assessment Under Indian Patents Act</h3>
              </div>

              {/* Novelty & Inventive Step Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Novelty Card */}
                <div className="bg-white p-6 sm:p-7 rounded-2xl border border-[#161412]/12 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-[#161412]/10 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Section 2(1)(j)</span>
                      <h4 className="text-lg font-serif text-[#161412]">Novelty Requirement</h4>
                    </div>
                    <span className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md border",
                      result.novelty_assessment?.status === 'novelty_concern'
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : result.novelty_assessment?.status === 'no_anticipation_found'
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-stone-50 text-stone-800 border-stone-200"
                    )}>
                      {result.novelty_assessment?.status_label || 'Assessment Complete'}
                    </span>
                  </div>
                  <p className="text-xs text-[#161412]/80 leading-relaxed">
                    {result.novelty_assessment?.analysis || "Evaluated against retrieved corpus records."}
                  </p>
                </div>

                {/* Inventive Step Card */}
                <div className="bg-white p-6 sm:p-7 rounded-2xl border border-[#161412]/12 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-[#161412]/10 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Section 2(1)(ja)</span>
                      <h4 className="text-lg font-serif text-[#161412]">Inventive Step / Non-Obviousness</h4>
                    </div>
                    <span className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md border",
                      result.inventive_step_assessment?.status === 'inventive_step_concern'
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    )}>
                      {result.inventive_step_assessment?.status_label || 'Experimental Data Required'}
                    </span>
                  </div>
                  <p className="text-xs text-[#161412]/80 leading-relaxed">
                    {result.inventive_step_assessment?.analysis || "Under Indian patent law, formulations combining known herbal extracts face Section 3(e) objections unless comparative experimental data demonstrates unexpected synergy."}
                  </p>
                </div>
              </div>

              {/* Patentability Criteria Analysis Table */}
              {result.criteria && result.criteria.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#161412]/12 shadow-sm overflow-hidden">
                  <div className="px-7 py-5 border-b border-[#161412]/10 bg-[#fbfaf7]/70">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Statutory Criteria</span>
                    <h4 className="text-lg font-serif text-[#161412]">Statutory Patentability Criteria Table</h4>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="patent-intelligence-table w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#161412]/10 bg-[#faf8f3]/50 text-[10px] font-bold uppercase tracking-wider text-[#161412]/55">
                          <th className="py-3.5 px-6 w-1/4">Criterion</th>
                          <th className="py-3.5 px-6 w-1/4">Assessment</th>
                          <th className="py-3.5 px-6 w-1/2">Statutory Analysis & Grounds</th>
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

              {/* Applicable Legal Framework */}
              {result.legal_framework && result.legal_framework.length > 0 && (
                <div className="bg-white p-7 sm:p-9 rounded-2xl border border-[#161412]/12 shadow-sm">
                  <div className="border-b border-[#161412]/10 pb-3 mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#176B45]">Statutory Scope</span>
                    <h4 className="text-lg font-serif text-[#161412]">Applicable Legal Framework (Indian Patents Act, 1970)</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.legal_framework.map((law, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-[#faf8f3]/60 border border-[#161412]/10 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-serif text-[#176B45]">{law.section}</span>
                          <span className="text-[10px] font-medium text-[#161412]/50">{law.act}</span>
                        </div>
                        <h5 className="text-xs font-semibold text-[#161412]">{law.title}</h5>
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
                    <h4 className="text-lg font-serif text-[#161412]">Strategic IP Regime Map</h4>
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
            </div>

            {/* SECTION 5: Recommendations & Advisory Scope */}
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
