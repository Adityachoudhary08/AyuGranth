import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, AlertCircle, FileText, BarChart3, Database } from 'lucide-react';
import Navbar from '../../../components/Navbar';
import { ipApi } from '../../../api';
import { cn } from '../../../lib/utils/cn';
export default function PriorArtRadar() {
  const {
    t
  } = useTranslation();
  const [formData, setFormData] = useState({
    formulation_description: '',
    top_k: 10
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'top_k' ? parseInt(value) || 10 : value
    }));
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.formulation_description.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await ipApi.checkPriorArt(formData);
      setResult(res);
    } catch (err) {
      console.error(err);
      setError("Failed to run prior-art search. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const getRelevanceColor = relevance => {
    if (relevance === 'High') return 'bg-red-50 text-red-700 border-red-200';
    if (relevance === 'Moderate') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };
  const getRelevanceBarColor = relevance => {
    if (relevance === 'High') return 'bg-red-500';
    if (relevance === 'Moderate') return 'bg-yellow-500';
    return 'bg-green-500';
  };
  const reset = () => {
    setResult(null);
  };
  return <div className="min-h-screen bg-[#faf8f3] font-sans pb-20">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6" style={{
      paddingTop: '140px'
    }}>
        
        {/* Header */}
        <div className="mb-8">
          <Link to="/ip-intelligence" className="inline-flex items-center text-sm font-medium text-[#176B45] hover:text-[#125537] mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />{t("priorartradar.backtoIPIntelligence", "Back to IP Intelligence")}</Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-serif text-[#161412]">{t("priorartradar.priorArtRadar", "Prior-Art Radar")}</h1>
          </div>
          <p className="text-[#161412]/60 max-w-2xl">{t("priorartradar.semanticsimilaritysearchacross", "Semantic similarity search across the legal and patent database to identify existing formulations.")}</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>}

        {/* Input Form */}
        {!result && !loading && <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#161412]/15 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("priorartradar.formulationDescription", "Formulation Description *")}</label>
                <p className="text-xs text-[#161412]/50 mb-2">{t("priorartradar.describetheformulationingredients", "Describe the formulation, ingredients, and method.")}</p>
                <textarea required name="formulation_description" value={formData.formulation_description} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all resize-none min-h-[120px]" placeholder={t("priorartradar.egAformulationcontaining", "e.g. A formulation containing Haritaki and Bibhitaki for digestive health...")} />
              </div>

              <div className="flex items-center gap-4">
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("priorartradar.maxResults", "Max Results")}</label>
                  <select name="top_k" value={formData.top_k} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all">
                    <option value={5}>{t("priorartradar.5matches", "5 matches")}</option>
                    <option value={10}>{t("priorartradar.10matches", "10 matches")}</option>
                    <option value={20}>{t("priorartradar.20matches", "20 matches")}</option>
                  </select>
                </div>
                <div className="w-2/3 pt-6">
                  <button type="submit" className="w-full py-3.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2">
                    <Search className="w-4 h-4" />{t("priorartradar.scanPriorArt", "Scan Prior-Art")}</button>
                </div>
              </div>
            </form>
          </div>}

        {/* Loading State */}
        {loading && <div className="bg-white border border-[#161412]/10 rounded-2xl p-16 flex flex-col items-center justify-center shadow-sm animate-pulse min-h-[400px]">
            <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mb-6"></div>
            <h3 className="text-xl font-serif text-[#161412]">{t("priorartradar.scanningDatabase", "Scanning Database...")}</h3>
            <p className="text-sm text-[#161412]/50 mt-2 text-center max-w-sm">{t("priorartradar.performingvectorsimilaritysearch", "Performing vector similarity search against registered patents and legal chunks.")}</p>
          </div>}

        {/* Results Workspace */}
        {result && <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Top Stats Banner */}
            <div className="bg-white rounded-2xl border border-[#161412]/15 shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="w-full md:w-1/2 flex items-center justify-between md:justify-start gap-8">
                <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/50 mb-1">{t("priorartradar.overallRelevance", "Overall Relevance")}</h2>
                  <div className={cn("inline-flex items-center px-3 py-1 rounded border text-sm font-bold uppercase tracking-wider", getRelevanceColor(result.overall_relevance))}>
                    {result.overall_relevance}
                  </div>
                </div>
                <div className="h-12 w-px bg-[#161412]/10 hidden md:block"></div>
                <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/50 mb-1">{t("priorartradar.maxSimilarity", "Max Similarity")}</h2>
                  <div className="text-3xl font-serif text-[#161412]">
                    {(result.max_similarity * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <div className="flex items-center justify-between text-xs text-[#161412]/60 mb-2">
                  <span>{t("priorartradar.noOverlap0", "No Overlap (0%)")}</span>
                  <span>{t("priorartradar.exactMatch100", "Exact Match (100%)")}</span>
                </div>
                <div className="w-full h-3 bg-[#f8f7f4] rounded-full overflow-hidden border border-[#161412]/10">
                  <div className={cn("h-full transition-all duration-1000 ease-out", getRelevanceBarColor(result.overall_relevance))} style={{
                width: `${Math.min(Math.max(result.max_similarity * 100, 0), 100)}%`
              }}></div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button onClick={reset} className="text-xs font-medium px-4 py-2 bg-[#f8f7f4] border border-[#161412]/10 text-[#161412] rounded-lg hover:bg-white transition-colors">{t("priorartradar.newSearch", "New Search")}</button>
                </div>
              </div>
            </div>

            {/* Results List */}
            <div className="bg-white rounded-2xl border border-[#161412]/15 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#161412]/10 bg-[#faf8f3]/50 flex items-center justify-between">
                <h3 className="text-sm font-serif text-[#161412] flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />{t("priorartradar.discoveredPriorArtMatches", "Discovered Prior-Art Matches (")}{result.results.length})
                </h3>
              </div>
              
              {result.results.length === 0 ? <div className="p-8 text-center">
                  <p className="text-sm text-[#161412]/60">{t("priorartradar.nosignificantpriorartmatches", "No significant prior-art matches found in the database.")}</p>
                </div> : <div className="divide-y divide-[#161412]/10">
                  {result.results.map((item, idx) => <div key={idx} className="p-6 group hover:bg-[#faf8f3]/30 transition-colors">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[#161412]">{item.source_document}</div>
                            <div className="text-[10px] text-[#161412]/50 uppercase tracking-widest font-medium">
                              {item.law_type} {item.section ? `• ${item.section}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-[#f8f7f4] px-3 py-1.5 rounded-lg border border-[#161412]/5">
                          <BarChart3 className="w-4 h-4 text-[#161412]/40" />
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-[#161412]/40 uppercase tracking-wider leading-none mb-1">{t("priorartradar.similarity", "Similarity")}</span>
                            <span className="text-sm font-medium leading-none">{(item.semantic_similarity * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="pl-11">
                        <p className="text-sm text-[#161412]/70 leading-relaxed bg-[#f8f7f4]/50 p-4 rounded-xl border border-[#161412]/5">
                          "{item.chunk_text}"
                        </p>
                      </div>
                    </div>)}
                </div>}
            </div>

            <div className="text-center mt-6">
              <p className="text-xs text-[#161412]/40 font-medium uppercase tracking-wider">
                {result.disclaimer}
              </p>
            </div>
          </div>}
      </main>
    </div>;
}