import { useState } from 'react';
import { Shield, ShieldAlert, CheckCircle2, ArrowRight, ArrowDown, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import Navbar from '../../components/Navbar';
import { complianceApi } from '../../api';

function StepCard({ obs, idx }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-[#161412]/15 p-6 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold text-[#161412]/30">{String(idx + 1).padStart(2, '0')}</div>
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#faf8f3] border border-[#161412]/10 text-[9px] font-bold uppercase tracking-wider text-[#161412]/70">
          {obs.color === 'yellow' ? <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> : 
           obs.color === 'red' ? <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> : 
           <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
          {obs.status}
        </div>
      </div>
      
      <h3 className="font-bold text-sm uppercase tracking-wider text-[#161412] mb-5">
        {obs.area}
      </h3>

      <div className="space-y-4 grow">
        <div>
          <h4 className="text-[10px] font-bold text-[#161412]/40 uppercase tracking-wider mb-1">What this means</h4>
          <p className="text-sm text-[#161412]/80 leading-relaxed">{obs.what_this_means}</p>
        </div>
        <div>
          <h4 className="text-[10px] font-bold text-[#161412]/40 uppercase tracking-wider mb-1">Next step</h4>
          <p className="text-sm font-medium text-[#161412]">{obs.next_step}</p>
        </div>
        <div>
          <h4 className="text-[10px] font-bold text-[#161412]/40 uppercase tracking-wider mb-1">Why it matters</h4>
          <p className="text-sm text-[#161412]/80 leading-relaxed">{obs.why_it_matters}</p>
        </div>
      </div>

      {obs.details && (
        <div className="mt-5 pt-4 border-t border-[#161412]/10">
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="flex items-center gap-1.5 text-xs font-medium text-[#176B45] hover:text-[#125537] transition-colors"
          >
            {expanded ? "Hide details" : "View details"}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expanded && (
            <div className="mt-3 text-xs text-[#161412]/70 leading-relaxed p-3 bg-[#faf8f3] rounded-lg border border-[#161412]/5">
              {obs.details}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ABSPage() {
  const [formData, setFormData] = useState({
    ingredients: '',
    source_region: '',
    is_biological: true,
  });

  const [stage, setStage] = useState(0); 
  const [screenResult, setScreenResult] = useState(null);
  const [obligationResult, setObligationResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetFlow = () => {
    setStage(0);
    setScreenResult(null);
    setObligationResult(null);
    setError(null);
  };

  const handleScreening = async (e) => {
    e.preventDefault();
    if (!formData.ingredients.trim() || !formData.source_region.trim()) return;

    setStage(1);
    setError(null);
    setScreenResult(null);
    setObligationResult(null);

    try {
      const payload = {
        ingredients: formData.ingredients.split(',').map(i => i.trim()).filter(Boolean),
        source_region: formData.source_region,
        is_biological: formData.is_biological,
      };

      const res = await complianceApi.screenABS(payload);
      setScreenResult(res);
      if (res.applicable) {
        setObligationResult({
          obligations: res.obligations || [],
          summary: res.summary || '',
          confidence: res.confidence || '',
          sources: res.sources || [],
          escalate: res.escalate || false,
        });
      }
      setStage(2);
    } catch (err) {
      console.error(err);
      setError("Failed to complete ABS screening. Please try again.");
      setStage(0);
    }
  };

  const handleRevealObligations = () => {
    setStage(4);
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] font-sans pb-20">
      <Navbar />

      <main className="max-w-5xl mx-auto pt-28 px-4 sm:px-6 flex flex-col items-center">

        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#176B45]/10 text-[#176B45] text-xs font-bold uppercase tracking-widest rounded-full mb-4">
            <Shield className="w-3.5 h-3.5" />
            Access & Benefit Sharing
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#161412] mb-4">ABS Duties</h1>
          <p className="text-[#161412]/60 max-w-xl mx-auto">
            Determine whether Access and Benefit Sharing obligations may apply to your product.
          </p>
        </div>

        {/* Stage Indicator */}
        <div className="w-full max-w-3xl flex items-center justify-center gap-4 mb-10">
          <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full border transition-all",
            stage >= 0 && stage < 4 ? "bg-white border-[#176B45] text-[#176B45] shadow-sm" : 
            stage >= 4 ? "bg-[#f8f7f4] border-[#161412]/10 text-[#161412]/80" :
            "bg-[#f8f7f4] border-[#161412]/10 text-[#161412]/40")}>
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
              01 Applicability {stage >= 4 && <CheckCircle2 className="w-3.5 h-3.5 text-[#176B45]" />}
            </span>
          </div>
          <div className="h-px w-8 bg-[#161412]/15"></div>
          <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full border transition-all",
            stage >= 4 ? "bg-white border-[#176B45] text-[#176B45] shadow-sm" : "bg-[#f8f7f4] border-[#161412]/10 text-[#161412]/40")}>
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
              02 Obligations 
              {stage < 4 && <span className="w-2 h-2 rounded-full border border-current opacity-50" />}
              {stage >= 4 && <span className="w-2 h-2 rounded-full bg-[#176B45]" />}
            </span>
          </div>
        </div>

        {error && (
          <div className="w-full max-w-3xl p-4 mb-8 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="w-full max-w-4xl flex flex-col gap-8">

          {/* STAGE 0: Form */}
          {stage === 0 && (
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#161412]/15 shadow-sm max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
              <form onSubmit={handleScreening} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">Ingredients *</label>
                  <p className="text-xs text-[#161412]/50 mb-2">List the active biological resources (e.g. herbs, plants, extracts) used in the formulation.</p>
                  <textarea
                    required
                    name="ingredients"
                    value={formData.ingredients}
                    onChange={handleChange}
                    className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#176B45] transition-all resize-none"
                    rows={3}
                    placeholder="e.g. Ashwagandha, Tulsi, Neem"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">Source Region *</label>
                  <p className="text-xs text-[#161412]/50 mb-2">Where were these ingredients primarily sourced or cultivated?</p>
                  <input
                    required
                    name="source_region"
                    value={formData.source_region}
                    onChange={handleChange}
                    className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#176B45] transition-all"
                    placeholder="e.g. India, Brazil, South Africa"
                  />
                </div>

                <div className="flex items-start gap-3 p-4 bg-[#f8f7f4] border border-[#161412]/10 rounded-xl">
                  <input
                    type="checkbox"
                    id="is_biological"
                    name="is_biological"
                    checked={formData.is_biological}
                    onChange={handleChange}
                    className="mt-1 shrink-0 w-4 h-4 text-[#176B45] focus:ring-[#176B45] rounded border-[#161412]/20"
                  />
                  <label htmlFor="is_biological" className="text-sm text-[#161412]/80 cursor-pointer">
                    <span className="font-medium text-[#161412] block mb-0.5">Biological Origin</span>
                    Check this box if the ingredients are naturally occurring biological resources. Uncheck only if they are purely synthetic chemicals.
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#176B45] text-white font-medium rounded-xl hover:bg-[#125537] transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  Screen for ABS Applicability <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* LOADING STATES */}
          {stage === 1 && (
            <div className="bg-white border border-[#161412]/10 rounded-2xl p-10 flex flex-col items-center justify-center shadow-sm max-w-3xl mx-auto w-full animate-pulse min-h-[300px]">
              <div className="w-10 h-10 rounded-full border-4 border-gray-100 border-t-[#176B45] animate-spin mb-4"></div>
              <h3 className="text-lg font-serif text-[#161412]">
                Assessing ABS applicability...
              </h3>
              <p className="text-sm text-[#161412]/50 mt-2 text-center max-w-sm">
                Analyzing the biological nature and source region.
              </p>
            </div>
          )}

          {/* STAGE 1 RESULT (Applicable / Not Applicable) */}
          {(stage === 2 || stage === 4) && screenResult && (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
              
              {/* Compact Input Summary */}
              {stage === 2 && (
                <div className="bg-white p-6 rounded-2xl border border-[#161412]/15 shadow-sm">
                  <h3 className="text-[10px] font-bold text-[#161412]/40 uppercase tracking-widest mb-4 border-b border-[#161412]/10 pb-2">INPUT / SCREENING CRITERIA</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">Ingredients</div>
                      <div className="text-sm text-[#161412] font-medium">{formData.ingredients}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">Source Region</div>
                      <div className="text-sm text-[#161412] font-medium">{formData.source_region}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">Biological Origin</div>
                      <div className="text-sm text-[#161412] font-medium">{formData.is_biological ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Applicability Result */}
              <div className="bg-white rounded-2xl border border-[#161412]/15 p-6 md:p-8 shadow-sm relative">
                
                {stage === 2 && (
                  <button onClick={resetFlow} className="absolute top-6 right-6 text-[11px] font-medium text-[#161412]/50 hover:text-[#161412] transition-colors uppercase tracking-wider px-2 py-1">
                    Start Over
                  </button>
                )}

                <div className="mb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/50 mb-2">ABS ASSESSMENT</h3>
                  <div className="flex items-center gap-2.5">
                    <span className={cn("w-2.5 h-2.5 rounded-full shadow-sm", screenResult.applicable ? "bg-amber-400" : "bg-green-500")}></span>
                    <h3 className="text-xl font-bold uppercase tracking-tight text-[#161412]">
                      {screenResult.applicable ? "ABS APPLICABLE" : "ABS NOT APPLICABLE"}
                    </h3>
                  </div>
                </div>
                
                <p className="text-sm font-medium leading-relaxed text-[#161412]/80 mb-2 max-w-xl">
                  {screenResult.reasoning}
                </p>

                {/* View Obligations CTA */}
                {stage === 2 && screenResult.applicable && (
                  <div className="mt-8 border-t border-[#161412]/10 pt-6 animate-in fade-in">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/40 mb-2">Next step</p>
                    <p className="text-sm text-[#161412]/80 mb-4">Review the applicable obligations and documentation.</p>
                    <button 
                      onClick={handleRevealObligations}
                      className="px-6 py-2.5 bg-white border border-[#161412]/20 text-[#161412] text-sm font-medium rounded-xl hover:bg-[#161412]/5 transition-all shadow-sm flex items-center gap-2"
                    >
                      Review Obligations <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <p className="text-[10px] text-[#161412]/40 mt-6 pt-4 border-t border-[#161412]/5">{screenResult.disclaimer}</p>
              </div>
            </div>
          )}

          {/* STAGE 2: OBLIGATIONS NAVIGATOR */}
          {stage === 4 && obligationResult && obligationResult.obligations.length === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 w-full">
              <div className="mb-12 text-center max-w-2xl mx-auto">
                <h2 className="text-3xl font-serif text-[#161412] mb-3">OBLIGATION NAVIGATOR</h2>
                <p className="text-sm text-[#161412]/70 leading-relaxed whitespace-pre-line">{obligationResult.summary}</p>
              </div>

              {/* DESKTOP/TABLET GRID (Snake Layout) */}
              <div className="hidden lg:grid grid-cols-3 gap-6 relative">
                {/* Row 1 */}
                <div className="relative">
                  <StepCard obs={obligationResult.obligations[0]} idx={0} />
                  <ArrowRight className="absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#161412]/20 z-10" />
                </div>
                <div className="relative">
                  <StepCard obs={obligationResult.obligations[1]} idx={1} />
                  <ArrowRight className="absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#161412]/20 z-10" />
                </div>
                <div className="relative">
                  <StepCard obs={obligationResult.obligations[2]} idx={2} />
                  {/* Arrow pointing down to Row 2 */}
                  <ArrowDown className="absolute left-1/2 -bottom-5 -translate-x-1/2 w-4 h-4 text-[#161412]/20 z-10" />
                </div>
                
                {/* Row 2 (Centered around cols 2 and 3) */}
                <div className="col-start-2 relative mt-4">
                  <StepCard obs={obligationResult.obligations[3]} idx={3} />
                  <ArrowRight className="absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#161412]/20 z-10" />
                </div>
                <div className="relative mt-4">
                  <StepCard obs={obligationResult.obligations[4]} idx={4} />
                </div>
              </div>

              {/* TABLET GRID */}
              <div className="hidden md:grid lg:hidden grid-cols-2 gap-6 relative">
                <div className="relative">
                  <StepCard obs={obligationResult.obligations[0]} idx={0} />
                  <ArrowRight className="absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#161412]/20 z-10" />
                </div>
                <div className="relative">
                  <StepCard obs={obligationResult.obligations[1]} idx={1} />
                  <ArrowDown className="absolute left-1/2 -bottom-5 -translate-x-1/2 w-4 h-4 text-[#161412]/20 z-10" />
                </div>
                <div className="relative mt-4">
                  <StepCard obs={obligationResult.obligations[2]} idx={2} />
                  <ArrowRight className="absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#161412]/20 z-10" />
                </div>
                <div className="relative mt-4">
                  <StepCard obs={obligationResult.obligations[3]} idx={3} />
                  <ArrowDown className="absolute left-1/2 -bottom-5 -translate-x-1/2 w-4 h-4 text-[#161412]/20 z-10" />
                </div>
                <div className="col-start-1 col-span-2 max-w-sm mx-auto w-full relative mt-4">
                  <StepCard obs={obligationResult.obligations[4]} idx={4} />
                </div>
              </div>

              {/* MOBILE STACK */}
              <div className="flex flex-col md:hidden gap-6 items-center">
                <div className="w-full relative pb-6"><StepCard obs={obligationResult.obligations[0]} idx={0} /><ArrowDown className="absolute left-1/2 bottom-1 -translate-x-1/2 w-4 h-4 text-[#161412]/20" /></div>
                <div className="w-full relative pb-6"><StepCard obs={obligationResult.obligations[1]} idx={1} /><ArrowDown className="absolute left-1/2 bottom-1 -translate-x-1/2 w-4 h-4 text-[#161412]/20" /></div>
                <div className="w-full relative pb-6"><StepCard obs={obligationResult.obligations[2]} idx={2} /><ArrowDown className="absolute left-1/2 bottom-1 -translate-x-1/2 w-4 h-4 text-[#161412]/20" /></div>
                <div className="w-full relative pb-6"><StepCard obs={obligationResult.obligations[3]} idx={3} /><ArrowDown className="absolute left-1/2 bottom-1 -translate-x-1/2 w-4 h-4 text-[#161412]/20" /></div>
                <div className="w-full"><StepCard obs={obligationResult.obligations[4]} idx={4} /></div>
              </div>

              {/* WHAT DO I DO NOW SUMMARY */}
              <div className="mt-16 max-w-3xl mx-auto bg-white rounded-2xl border border-[#161412]/15 p-8 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#161412]/50 mb-6">WHAT DO I DO NOW?</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#176B45] shrink-0" />
                    <span className="text-sm font-medium text-[#161412]">1. Confirm the competent authority.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#176B45] shrink-0" />
                    <span className="text-sm font-medium text-[#161412]">2. Determine whether approval or intimation is required.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#176B45] shrink-0" />
                    <span className="text-sm font-medium text-[#161412]">3. Review applicable benefit-sharing requirements.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#176B45] shrink-0" />
                    <span className="text-sm font-medium text-[#161412]">4. Check ABS-related IPR requirements if relevant.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#176B45] shrink-0" />
                    <span className="text-sm font-medium text-[#161412]">5. Prepare the required documentation.</span>
                  </li>
                </ul>
              </div>

              {/* Sources Footer */}
              <div className="mt-8 max-w-3xl mx-auto pt-6 border-t border-[#161412]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                   <div className="text-[10px] font-bold text-[#161412]/40 uppercase tracking-widest">SOURCES</div>
                   <div className="flex items-center gap-2 text-xs text-[#161412]/60 font-medium">
                     <BookOpen className="w-4 h-4 text-[#176B45]" />
                     {obligationResult.sources?.length ? `${obligationResult.sources.length} sources referenced` : "Baseline obligations"}
                   </div>
                </div>
              </div>
              
              <div className="mt-16 flex flex-col items-center text-center">
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/50 mb-4">ABS COMPLIANCE PATHWAY</h3>
                 <p className="text-sm text-[#161412]/80 font-medium mb-6 max-w-xl leading-relaxed">
                   Your screening indicates that ABS-related requirements may apply. Complete the steps above to determine the applicable authority, approvals, benefit-sharing requirements and documentation.
                 </p>
                 <button onClick={resetFlow} className="text-xs font-medium text-[#161412]/60 hover:text-[#161412] transition-colors border border-[#161412]/20 hover:border-[#161412]/40 px-6 py-2.5 bg-white rounded-lg shadow-sm">
                    Start Over
                 </button>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
