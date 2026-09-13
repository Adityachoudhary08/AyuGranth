import { useState } from 'react';
import {
  MapPin,
  Info,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import Navbar from '../../components/Navbar';
import { ipApi } from '../../api';

export default function GITagPage() {
  const [formData, setFormData] = useState({
    product_name: '',
    ingredients: '',
    source_region: '',
    region_specific: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isNextStepsOpen, setIsNextStepsOpen] = useState(true);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!formData.product_name.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        product_name: formData.product_name.trim(),
        ingredients: formData.ingredients
          .split(',')
          .map((i) => i.trim())
          .filter(Boolean),
        source_region: formData.source_region.trim(),
        region_specific: formData.region_specific,
      };
      const res = await ipApi.checkGI(payload);
      setResult(res);
      setIsNextStepsOpen(true);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.detail ||
          'Failed to connect to the GI Navigator engine. Please check connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (color) => {
    if (color === 'red') return <ShieldAlert className="w-5 h-5 text-red-600" />;
    if (color === 'yellow') return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <CheckCircle2 className="w-5 h-5 text-green-600" />;
  };

  const getStatusColor = (color) => {
    if (color === 'red') return 'bg-red-50 border-red-200 text-red-800';
    if (color === 'yellow') return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-green-50 border-green-200 text-green-800';
  };

  const assessmentText =
    result?.assessment ||
    result?.reasoning ||
    (result?.regional_association_detected
      ? 'Regional association detected from the information provided. However, no directly matched GI Act evidence was retrieved, so legal eligibility cannot be conclusively assessed from the indexed corpus.'
      : 'No specific regional origin association was detected. Geographical Indication protection is not applicable.');

  return (
    <div className="min-h-screen bg-[#faf8f3] font-sans pb-20">
      <Navbar />

      <main className="max-w-4xl mx-auto pt-28 px-4 sm:px-6 flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#176B45]/10 text-[#176B45] text-xs font-bold uppercase tracking-widest rounded-full mb-4">
            <MapPin className="w-3.5 h-3.5" />
            Origin Assessment
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#161412] mb-4">GI Navigator</h1>
          <p className="text-[#161412]/60 max-w-xl mx-auto">
            Check if your product has a documented regional-origin association and evaluate eligibility under the Geographical Indications Act.
          </p>
        </div>

        <div className="w-full max-w-3xl flex flex-col md:flex-row gap-8">
          {/* Input Form */}
          <div className="w-full md:w-1/2">
            <form onSubmit={handleSearch} className="bg-white p-6 rounded-2xl border border-[#161412]/15 shadow-sm space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#161412] mb-1.5">Product Name *</label>
                <input
                  required
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all"
                  placeholder="e.g. Darjeeling Tea, Kanchipuram Silk"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#161412] mb-1.5">Key Ingredients</label>
                <textarea
                  name="ingredients"
                  value={formData.ingredients}
                  onChange={handleChange}
                  className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all resize-none"
                  rows={2}
                  placeholder="Comma separated list..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#161412] mb-1.5">Source Region</label>
                <input
                  name="source_region"
                  value={formData.source_region}
                  onChange={handleChange}
                  className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all"
                  placeholder="e.g. Darjeeling, West Bengal"
                />
              </div>

              <div className="flex items-start gap-3 p-3 bg-[#f8f7f4] border border-[#161412]/10 rounded-lg">
                <input
                  type="checkbox"
                  id="region_specific"
                  name="region_specific"
                  checked={formData.region_specific}
                  onChange={handleChange}
                  className="mt-1 shrink-0 text-[#176B45] focus:ring-[#176B45] rounded border-[#161412]/20"
                />
                <label htmlFor="region_specific" className="text-sm text-[#161412]/80 cursor-pointer">
                  <span className="font-medium text-[#161412] block">Region Specific Origin</span>
                  This product's quality, reputation, or characteristics are essentially attributable to its geographic origin.
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || !formData.product_name.trim()}
                className="w-full py-3 bg-[#176B45] text-white font-medium rounded-xl hover:bg-[#125537] transition-all disabled:opacity-50 shadow-[0_4px_14px_rgba(23,107,69,0.25)] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    Analyzing Origin...
                  </>
                ) : (
                  <>
                    Check Eligibility <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Display */}
          <div className="w-full md:w-1/2 flex flex-col">
            {error && (
              <div className="w-full p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!result && !error && !isLoading && (
              <div className="flex-1 border-2 border-dashed border-[#161412]/15 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-[#f8f7f4]/50">
                <MapPin className="w-10 h-10 text-[#161412]/20 mb-3" />
                <p className="text-sm text-[#161412]/50 font-medium">Results will appear here</p>
                <p className="text-xs text-[#161412]/40 mt-1 max-w-[200px]">
                  Fill out the details to evaluate Geographical Indication eligibility.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="flex-1 bg-white border border-[#161412]/10 rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                <div className="space-y-3 mb-6">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
                <div className="h-20 bg-gray-100 rounded-xl w-full"></div>
              </div>
            )}

            {result && !isLoading && (
              <div className="flex-1 bg-white rounded-2xl border border-[#161412]/15 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                <div className={cn('p-4 border-b flex items-start gap-3', getStatusColor(result.color))}>
                  {getStatusIcon(result.color)}
                  <div>
                    <div className="font-bold uppercase tracking-wider text-[10px] opacity-70 mb-0.5">Eligibility Status</div>
                    <div className="font-bold capitalize leading-tight">{result.status}</div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Assessment Section */}
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-[#176B45] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Assessment
                    </h3>
                    <div className="p-3.5 bg-stone-50/80 border border-stone-200/80 rounded-xl text-xs sm:text-sm text-stone-800 leading-relaxed">
                      <p className="whitespace-pre-wrap">{assessmentText}</p>
                    </div>
                  </div>

                  {/* Next Steps Accordion */}
                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={() => setIsNextStepsOpen((prev) => !prev)}
                      aria-expanded={isNextStepsOpen}
                      className="w-full flex items-center justify-between text-xs font-bold text-[#176B45] uppercase tracking-widest mb-2 p-1.5 -ml-1.5 rounded-lg hover:bg-[#176B45]/5 transition-colors focus:outline-none focus:ring-1 focus:ring-[#176B45] cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5" /> Next Steps
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold lowercase tracking-normal text-[#176B45]/80">
                        {isNextStepsOpen ? 'collapse' : 'expand'}
                        {isNextStepsOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-[#176B45]" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-[#176B45]" />
                        )}
                      </span>
                    </button>

                    {isNextStepsOpen && (
                      <div className="p-3.5 bg-[#176B45]/5 border border-[#176B45]/15 rounded-xl text-sm text-[#161412] leading-relaxed animate-in fade-in duration-200">
                        {result.next_steps_list && result.next_steps_list.length > 0 ? (
                          <ul className="space-y-2">
                            {result.next_steps_list.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-800">
                                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#176B45] mt-1.5" />
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs sm:text-sm text-stone-800 whitespace-pre-wrap">{result.next_steps}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sources & Confidence Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#161412]/10">
                    <div className="flex items-center gap-1.5 text-xs text-[#161412]/50 font-medium">
                      <BookOpen className="w-3.5 h-3.5" />
                      {result.sources?.length ? `${result.sources.length} sources referenced` : 'No directly matched GI Act evidence retrieved'}
                    </div>
                    <div className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      Confidence:{' '}
                      <span className="capitalize">
                        {(!result.evidence_grounded && (!result.sources || result.sources.length === 0) && result.confidence?.toLowerCase() === 'high')
                          ? (result.regional_association_detected ? 'preliminary' : 'limited')
                          : result.confidence}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
