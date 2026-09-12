import { useState, useEffect } from 'react';
import { 
  Globe2, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
  PackageCheck,
  ListChecks,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../components/Navbar';
import { productsApi, exportApi } from '../../api';

const RequirementCard = ({ item, sources, confidence, getStatusVisuals }) => {
  const [expanded, setExpanded] = useState(null);
  const visual = getStatusVisuals(item.status);
  const Icon = visual.icon;

  return (
    <div className="bg-white rounded-xl border border-[#161412]/15 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className={`px-5 py-3 border-b border-[#161412]/5 flex items-center justify-between ${visual.bg}`}>
        <div className="font-serif text-[#161412] text-lg">{item.area}</div>
        <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border bg-white ${visual.text} ${visual.border}`}>
          <Icon className="w-3.5 h-3.5" />
          {visual.label}
        </div>
      </div>
      <div className="p-5 md:p-6">
        <div className="text-sm font-medium text-[#161412] mb-3">
          {item.requirement}
        </div>
        <p className="text-sm text-[#161412]/70 leading-relaxed mb-6">
          {item.detail}
        </p>
        
        <div className="flex gap-6 pt-4 border-t border-[#161412]/10">
          <button 
            onClick={() => setExpanded(expanded === 'why' ? null : 'why')}
            className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${expanded === 'why' ? 'text-[#176B45]' : 'text-[#161412]/50 hover:text-[#161412]'}`}
          >
            {expanded === 'why' ? '− Hide reasoning' : '+ Why this result?'}
          </button>
          <button 
            onClick={() => setExpanded(expanded === 'evidence' ? null : 'evidence')}
            className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${expanded === 'evidence' ? 'text-[#176B45]' : 'text-[#161412]/50 hover:text-[#161412]'}`}
          >
            {expanded === 'evidence' ? '− Hide evidence' : '+ View Evidence'}
          </button>
        </div>
        
        <AnimatePresence>
          {expanded === 'why' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-4 p-4 bg-[#f8f7f4] rounded-lg border border-[#161412]/10 text-sm">
                <div className="text-[10px] font-bold text-[#161412]/50 uppercase tracking-widest mb-1.5">Assessment Reasoning</div>
                <div className="text-[#161412]/80 leading-relaxed mb-4">{item.reasoning || item.detail}</div>
                <div className="text-[10px] font-bold text-[#161412]/50 uppercase tracking-widest mb-1.5">Evidence Strength</div>
                <div className="text-[#161412]/80 font-medium uppercase text-xs">{confidence}</div>
              </div>
            </motion.div>
          )}
          {expanded === 'evidence' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-4 p-4 bg-[#f8f7f4] rounded-lg border border-[#161412]/10 text-sm">
                {item.evidence_section || item.evidence_excerpt ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#161412]/10 pb-2">
                      <div>
                        <span className="text-[10px] font-bold text-[#161412]/50 uppercase tracking-widest block">Authoritative Statutory Instrument</span>
                        <span className="text-xs font-bold text-[#176B45]">{item.evidence_source || 'Official Regulatory Framework'}</span>
                      </div>
                      {item.evidence_section && (
                        <span className="inline-flex text-[10px] font-mono font-bold bg-[#176B45]/10 text-[#176B45] px-2 py-0.5 rounded border border-[#176B45]/20">
                          {item.evidence_section}
                        </span>
                      )}
                    </div>

                    {item.evidence_excerpt && (
                      <div>
                        <div className="text-[10px] font-bold text-[#161412]/50 uppercase tracking-widest mb-1">
                          Extracted Legal Provision / Statutory Excerpt:
                        </div>
                        <div className="p-3 bg-white rounded border border-[#161412]/10 font-serif text-xs text-[#161412]/90 leading-relaxed italic">
                          "{item.evidence_excerpt}"
                        </div>
                      </div>
                    )}
                  </div>
                ) : sources && sources.length > 0 ? (
                  <>
                    <div className="text-[10px] font-bold text-[#161412]/50 uppercase tracking-widest mb-2">Retrieved Regulatory Sources</div>
                    <ul className="list-disc pl-5 text-[#161412]/80 space-y-1">
                      {sources.map((src, i) => <li key={i}>{src}</li>)}
                    </ul>
                  </>
                ) : (
                  <div className="text-[#161412]/60 italic">Source evidence unavailable for this assessment.</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function InternationalLanding() {
  const [jurisdiction, setJurisdiction] = useState('USA');
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [error, setError] = useState(null);
  const [showReasoning, setShowReasoning] = useState(false);
  
  // Loading steps animation state
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingSteps = [
    "Checking product composition...",
    "Reviewing target-market requirements...",
    "Building market-access checklist..."
  ];

  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await productsApi.listProducts();
        const products = Array.isArray(data) ? data : [];
        setProducts(products);
        if (products.length > 0) {
          setSelectedProductId(products[0]._id);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    }
    fetchProducts();
  }, []);

  // Simulate loading steps progression
  useEffect(() => {
    if (!isAssessing) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < 2 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, [isAssessing]);

  // Handle assessment trigger
  const handleAssess = async () => {
    if (!selectedProductId) {
      setError("Please select a product first.");
      return;
    }
    
    setIsAssessing(true);
    setError(null);
    setAssessmentResult(null);
    setShowReasoning(false);
    
    try {
      const result = await exportApi.navigateExport({
        product_id: selectedProductId,
        target_country: jurisdiction
      });
      setAssessmentResult(result);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred while assessing market access.");
    } finally {
      setIsAssessing(false);
    }
  };

  // Change jurisdiction handles resetting result if it doesn't match
  const handleJurisdictionChange = (target) => {
    setJurisdiction(target);
    if (assessmentResult && assessmentResult.target_country !== target) {
      setAssessmentResult(null); // Clear previous result to avoid confusion
    }
  };

  const getStatusVisuals = (status) => {
    if (status === 'action_required') return { icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'ACTION REQUIRED' };
    if (status === 'review_required') return { icon: Info, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'REVIEW REQUIRED' };
    return { icon: CheckCircle2, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'COMPLIANT' };
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] font-sans pb-32">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6" style={{ paddingTop: '140px' }}>
        
        {/* HERO SECTION */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#176B45]/10 text-[#176B45] text-xs font-bold uppercase tracking-widest rounded-full mb-6">
            <Globe2 className="w-3.5 h-3.5" />
            International
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#161412] mb-6 tracking-tight">
            Take your Ayurvedic product global.
          </h1>
          <p className="text-[#161412]/60 max-w-2xl mx-auto text-lg leading-relaxed">
            Assess export requirements, regulatory considerations, IP requirements and market-access readiness for your target jurisdiction.
          </p>
        </div>

        {/* SETUP PANEL (Jurisdiction & Product) */}
        <div className="bg-white p-8 md:p-10 rounded-2xl border border-[#161412]/15 shadow-sm mb-12">
          <h2 className="text-2xl font-serif text-[#161412] mb-8 text-center">Configure Market Assessment</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Product Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#161412]/60 mb-2">
                Select Product Passport
              </label>
              {products.length === 0 ? (
                <div className="bg-[#f8f7f4] border border-[#161412]/10 py-3.5 px-4 rounded-xl text-sm text-[#161412]/60">
                  No products found. Please create one in Product Passport.
                </div>
              ) : (
                <div className="relative">
                  <select 
                    value={selectedProductId} 
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full appearance-none bg-[#f8f7f4] border border-[#161412]/15 rounded-xl py-3.5 pl-4 pr-10 text-[#161412] text-sm focus:outline-none focus:border-[#176B45] focus:ring-1 focus:ring-[#176B45]/50 transition-all cursor-pointer font-medium"
                  >
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name} (Source: India)</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#161412]/40 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Jurisdiction Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#161412]/60 mb-2">
                Target Country
              </label>
              <div className="relative">
                <select 
                  value={jurisdiction} 
                  onChange={(e) => handleJurisdictionChange(e.target.value)}
                  className="w-full appearance-none bg-[#f8f7f4] border border-[#161412]/15 rounded-xl py-3.5 pl-4 pr-10 text-[#161412] text-sm focus:outline-none focus:border-[#176B45] focus:ring-1 focus:ring-[#176B45]/50 transition-all cursor-pointer font-medium"
                >
                  <option value="USA">🇺🇸 United States (USA)</option>
                  <option value="Germany">🇩🇪 Germany (EU)</option>
                  <option value="Japan">🇯🇵 Japan</option>
                  <option value="UK">🇬🇧 United Kingdom</option>
                  <option value="Australia">🇦🇺 Australia</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#161412]/40 pointer-events-none" />
              </div>
            </div>
          </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg text-center flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}

            {/* CTA */}
            <div className="mt-8 flex justify-center">
              <button 
                onClick={handleAssess}
                disabled={isAssessing || products.length === 0}
                className="group relative flex items-center gap-2 px-8 py-4 text-sm font-bold tracking-wide text-white bg-[#161412] rounded-xl hover:bg-[#176B45] transition-all duration-300 disabled:opacity-50 disabled:hover:bg-[#161412] shadow-xl shadow-black/5"
              >
                {isAssessing ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                    Assessing...
                  </>
                ) : (
                  <>
                    Assess Market Access
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
        </div>

        {/* LOADING STATE */}
        <AnimatePresence>
          {isAssessing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-12 text-center"
            >
              <div className="inline-flex flex-col items-center justify-center p-8 bg-white border border-[#161412]/10 rounded-2xl shadow-sm w-full max-w-2xl mx-auto">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-[#176B45]/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-[#176B45] border-t-transparent animate-spin"></div>
                  <Globe2 className="absolute inset-0 m-auto w-6 h-6 text-[#176B45] animate-pulse" />
                </div>
                <h3 className="font-serif text-xl text-[#161412] mb-2">Assessing export requirements...</h3>
                <p className="text-sm text-[#161412]/60 min-h-[1.5rem] transition-all duration-300">
                  {loadingSteps[loadingStep]}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESULTS SECTION */}
        <AnimatePresence>
          {assessmentResult && !isAssessing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
            >
              {/* LEFT COLUMN: Visual Pathway */}
              <div className="lg:col-span-4">
                <div className="sticky top-32">
                  <h3 className="text-xs font-bold text-[#161412]/40 uppercase tracking-widest mb-6">Market Access Pathway</h3>
                  
                  <div className="relative border-l-2 border-[#161412]/10 ml-6 space-y-8 pb-4">
                    {/* Node 1 */}
                    <div className="relative">
                      <div className="absolute -left-[29px] top-1/2 -translate-y-1/2 w-14 h-14 bg-[#faf8f3] rounded-full flex items-center justify-center">
                        <div className="w-10 h-10 bg-white border border-[#161412]/15 rounded-full flex items-center justify-center shadow-sm text-[#161412]/60">
                          <PackageCheck className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="pl-12">
                        <div className="text-[10px] uppercase font-bold text-[#161412]/50 tracking-wider">PRODUCT</div>
                        <div className="text-sm font-medium text-[#161412] mt-1 truncate">{assessmentResult.product_name}</div>
                      </div>
                    </div>

                    {/* Node 2 */}
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1/2 -translate-y-1/2 w-12 h-12 bg-[#faf8f3] rounded-full flex items-center justify-center">
                        <div className="w-8 h-8 bg-white border border-[#161412]/15 rounded-full flex items-center justify-center shadow-sm text-[#161412]/60">
                          <MapPin className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="pl-12">
                        <div className="text-[10px] uppercase font-bold text-[#161412]/50 tracking-wider">INDIAN COMPLIANCE</div>
                        <div className="text-xs text-[#161412]/60 mt-1">Sourced from India</div>
                      </div>
                    </div>

                    {/* Node 3 */}
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1/2 -translate-y-1/2 w-12 h-12 bg-[#faf8f3] rounded-full flex items-center justify-center">
                        <div className="w-8 h-8 bg-[#161412] border border-[#161412] rounded-full flex items-center justify-center shadow-sm text-white">
                          <Globe2 className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="pl-12">
                        <div className="text-[10px] uppercase font-bold text-[#161412]/50 tracking-wider">TARGET JURISDICTION</div>
                        <div className="text-sm font-medium text-[#161412] mt-1">{assessmentResult.target_country}</div>
                      </div>
                    </div>

                    {/* Node 4 */}
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1/2 -translate-y-1/2 w-12 h-12 bg-[#faf8f3] rounded-full flex items-center justify-center">
                        <div className="w-8 h-8 bg-white border border-[#176B45]/30 rounded-full flex items-center justify-center shadow-sm text-[#176B45]">
                          <ListChecks className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="pl-12">
                        <div className="text-[10px] uppercase font-bold text-[#161412]/50 tracking-wider">REGULATORY CHECK</div>
                        <div className="text-xs text-[#161412]/60 mt-1">{assessmentResult.checklist.length + (assessmentResult.heavy_metal_warning.triggered ? 1 : 0)} requirements identified</div>
                      </div>
                    </div>

                    {/* Node 5 */}
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1/2 -translate-y-1/2 w-12 h-12 bg-[#faf8f3] rounded-full flex items-center justify-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm border ${
                          assessmentResult.heavy_metal_warning.triggered 
                            ? 'bg-red-50 border-red-200 text-red-600' 
                            : 'bg-yellow-50 border-yellow-200 text-yellow-600'
                        }`}>
                          <Target className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="pl-12">
                        <div className="text-[10px] uppercase font-bold text-[#161412]/50 tracking-wider">MARKET ACCESS</div>
                        <div className="text-sm font-bold text-[#161412] mt-1 uppercase">
                          {assessmentResult.heavy_metal_warning.triggered ? 'Critical Actions Needed' : 'Review Required'}
                        </div>
                        <div className="text-xs text-[#161412]/60 mt-1 leading-relaxed">
                          {assessmentResult.checklist.length + (assessmentResult.heavy_metal_warning.triggered ? 1 : 0)} checks <br/>
                          {assessmentResult.checklist.filter(c => c.status === 'action_required').length + (assessmentResult.heavy_metal_warning.triggered ? 1 : 0)} action items <br/>
                          {assessmentResult.checklist.filter(c => c.status === 'review_required').length} review items
                        </div>
                        <button className="mt-3 text-xs font-bold uppercase tracking-wider text-[#176B45] hover:text-[#161412] transition-colors flex items-center gap-1">
                          View Action Plan <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary Box */}
                  <div className="mt-8 bg-white p-5 rounded-xl border border-[#161412]/10 shadow-sm">
                    <div className="text-[10px] font-bold text-[#161412]/40 uppercase tracking-widest mb-3">Assessment Summary</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#161412]/70">Actions Required</span>
                        <span className="font-bold text-[#161412]">{assessmentResult.checklist.filter(c => c.status === 'action_required').length + (assessmentResult.heavy_metal_warning.triggered ? 1 : 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#161412]/70">Reviews Required</span>
                        <span className="font-bold text-[#161412]">{assessmentResult.checklist.filter(c => c.status === 'review_required').length}</span>
                      </div>
                      <div className="pt-3 mt-3 border-t border-[#161412]/10 flex justify-between items-center text-sm">
                        <span className="text-[#161412]/70">Evidence Strength</span>
                        <span className={`font-medium uppercase text-xs tracking-wider ${assessmentResult.confidence.toLowerCase() === 'high' ? 'text-green-600' : assessmentResult.confidence.toLowerCase() === 'low' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {assessmentResult.confidence}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Checklist & Details */}
              <div className="lg:col-span-8 space-y-8">

                {/* Abstention Warning */}
                {assessmentResult.confidence.toLowerCase() === 'low' && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6 md:p-8 shadow-sm">
                    <h3 className="text-lg font-serif text-red-900 mb-2">INSUFFICIENT VERIFIED EVIDENCE</h3>
                    <p className="text-sm text-red-900/80 leading-relaxed font-medium mb-4">
                      The available authoritative evidence is insufficient to make a reliable determination for all requirements. The system abstains from definitive legal conclusions.
                    </p>
                    <div className="text-xs text-red-800 leading-relaxed bg-white/50 p-4 rounded-xl border border-red-100">
                      <strong>Missing:</strong> Specific product classification data or comprehensive regulatory precedent. <br/>
                      <strong>Needed:</strong> Official regulatory consultation or deeper corpus retrieval.
                    </div>
                  </div>
                )}
                
                {/* Heavy Metal / Ingredient Safety Check */}
                {assessmentResult.heavy_metal_warning.triggered ? (
                  <div className="bg-white rounded-xl border border-red-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-red-100 flex items-center justify-between bg-red-50">
                      <div className="font-serif text-red-900 text-lg">Heavy-Metal / Restricted Substance Review</div>
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border bg-white text-red-700 border-red-200">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        ACTION REQUIRED
                      </div>
                    </div>
                    <div className="p-5 md:p-6">
                      <div className="text-sm font-bold text-[#161412] mb-2">Detected ingredient(s):</div>
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded bg-white text-[#161412] text-xs font-bold uppercase tracking-widest border border-[#161412]/15 mb-4">
                        {assessmentResult.heavy_metal_warning.flagged_ingredients.join(', ')}
                      </div>
                      <p className="text-sm text-[#161412]/70 leading-relaxed font-medium mb-6">
                        Export-market review may require additional safety/testing evidence. {assessmentResult.heavy_metal_warning.message}
                      </p>
                      <div className="flex gap-6 pt-4 border-t border-[#161412]/10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#161412]/40">System Guardrail Triggered</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-[#161412]/15 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="px-5 py-3 border-b border-[#161412]/5 flex items-center justify-between bg-green-50">
                      <div className="font-serif text-[#161412] text-lg">Ingredient Safety</div>
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border bg-white text-green-700 border-green-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        COMPLIANT
                      </div>
                    </div>
                    <div className="p-5 md:p-6 text-sm text-[#161412]/70">
                      No mineral/metal-based ingredient detected from available product data.
                    </div>
                  </div>
                )}

                {/* Regulatory Checklist */}
                <div>
                  <h3 className="text-2xl font-serif text-[#161412] mb-6 border-b border-[#161412]/10 pb-4">
                    {assessmentResult.target_country} Regulatory Checklist
                  </h3>
                  
                  <div className="space-y-4">
                    {assessmentResult.checklist.map((item, idx) => (
                      <RequirementCard 
                        key={idx} 
                        item={item} 
                        sources={assessmentResult.sources} 
                        confidence={assessmentResult.confidence}
                        getStatusVisuals={getStatusVisuals} 
                      />
                    ))}
                  </div>
                </div>

                {/* RAG Reasoning */}
                <div className="bg-white rounded-xl border border-[#161412]/10 overflow-hidden mt-8">
                  <button 
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#161412]/5 transition-colors"
                  >
                    <span className="font-serif text-[#161412] text-lg">Assessment Reasoning</span>
                    {showReasoning ? <ChevronUp className="w-5 h-5 text-[#161412]/50" /> : <ChevronDown className="w-5 h-5 text-[#161412]/50" />}
                  </button>
                  <AnimatePresence>
                    {showReasoning && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-2 border-t border-[#161412]/5 text-sm text-[#161412]/70 leading-relaxed bg-[#f8f7f4]/50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                              <div className="text-[10px] font-bold text-[#161412]/50 uppercase tracking-widest mb-2">Product</div>
                              <ul className="space-y-1.5">
                                <li><span className="font-medium text-[#161412]">Name:</span> {assessmentResult.product_name}</li>
                                <li><span className="font-medium text-[#161412]">Source:</span> India</li>
                              </ul>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-[#161412]/50 uppercase tracking-widest mb-2">Target Jurisdiction</div>
                              <ul className="space-y-1.5">
                                <li><span className="font-medium text-[#161412]">Country:</span> {assessmentResult.target_country}</li>
                                <li><span className="font-medium text-[#161412]">Framework:</span> {assessmentResult.target_country === 'USA' ? 'FDA/USA' : 'EU + Germany'}</li>
                              </ul>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-[#161412]/50 uppercase tracking-widest mb-2">Assessment Basis</div>
                              <ul className="space-y-1.5">
                                <li><span className="font-medium text-[#161412]">Domain:</span> Export Market Access</li>
                                <li><span className="font-medium text-[#161412]">Evidence:</span> {assessmentResult.sources.length} relevant sources retrieved</li>
                              </ul>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-[#161412]/50 uppercase tracking-widest mb-2">Evidence Strength</div>
                              <div className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${assessmentResult.confidence.toLowerCase() === 'high' ? 'bg-green-50 text-green-700 border-green-200' : assessmentResult.confidence.toLowerCase() === 'low' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                {assessmentResult.confidence}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-[10px] font-bold text-[#161412]/50 uppercase tracking-widest mb-2 pt-4 border-t border-[#161412]/10">Reasoning</div>
                          <div className="whitespace-pre-wrap">{assessmentResult.rag_reasoning}</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sources & Disclaimer */}
                <div className="flex flex-col md:flex-row gap-6 pt-6 mt-6 border-t border-[#161412]/10">
                  <div className="flex-1">
                    <div className="text-[10px] uppercase font-bold text-[#161412]/40 tracking-wider mb-2">Sources & Regulatory Basis</div>
                    <div className="flex flex-wrap gap-2">
                      {assessmentResult.sources.map((src, idx) => (
                        <span key={idx} className="inline-flex text-xs font-medium text-[#176B45] bg-[#176B45]/5 px-2.5 py-1 rounded border border-[#176B45]/15">
                          {src}
                        </span>
                      ))}
                      {assessmentResult.sources.length === 0 && (
                        <span className="text-xs text-[#161412]/40">General knowledge utilized</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[10px] text-[#161412]/40 uppercase tracking-wider leading-relaxed text-left md:text-right">
                      {assessmentResult.disclaimer}
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
