import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { Lightbulb, Search, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { ipApi } from '../../api';
import { cn } from '../../lib/utils/cn';
export default function Patents() {
  const {
    t
  } = useTranslation();
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!description.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await ipApi.checkPatentability({
        formulation_description: description,
        jurisdiction: 'India'
      });
      setResult(response);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred during patentability check.');
    } finally {
      setIsLoading(false);
    }
  };
  const getPostureColor = posture => {
    if (posture === 'Likely Patentable') return 'text-green-700 bg-green-50 border-green-200';
    if (posture === 'Uncertain') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };
  const getPostureIcon = posture => {
    if (posture === 'Likely Patentable') return <CheckCircle2 className="w-6 h-6" />;
    if (posture === 'Uncertain') return <AlertTriangle className="w-6 h-6" />;
    return <ShieldAlert className="w-6 h-6" />;
  };
  return <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-[#176B45] mb-2 flex items-center gap-3">
          <Lightbulb className="w-8 h-8" />{t("patents.patentIntelligence", "Patent Intelligence")}</h1>
        <p className="text-[#161412]/60">{t("patents.evaluateformulationsforpotential", "Evaluate formulations for potential patentability and Section 3(p) risks.")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white border border-[#161412]/10 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#161412] mb-1">{t("patents.formulationDescription", "Formulation Description")}</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t("patents.describeyourformulationingredients", "Describe your formulation, ingredients, and processing methods...")} rows={6} className="w-full bg-[#f8f7f4] border border-[#161412]/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#176B45] transition-colors resize-none" required />
            </div>

            <button type="submit" disabled={isLoading || !description.trim()} className="w-full py-2 px-4 bg-[#176B45] text-white rounded-md text-sm font-medium hover:bg-[#125537] transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
              {isLoading ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Search className="w-4 h-4" />}{t("patents.analyzePatentability", "Analyze Patentability")}</button>
          </form>

          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!result && !isLoading && <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-[#161412]/10 border-dashed rounded-xl opacity-50 bg-white">
               <Lightbulb className="w-12 h-12 text-[#176B45] mb-4" />
               <p className="text-[#161412] font-medium">{t("patents.enteraformulationdescription", "Enter a formulation description")}</p>
               <p className="text-sm text-[#161412]/60 mt-1 max-w-sm">{t("patents.wellassessnoveltyinventive", "We'll assess novelty, inventive step, and traditional knowledge overlap.")}</p>
             </div>}

          {isLoading && <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-[#161412]/10 rounded-xl bg-white shadow-sm">
               <div className="w-8 h-8 rounded-full border-2 border-[#176B45] border-t-transparent animate-spin mb-4" />
               <p className="text-[#161412] font-medium">{t("patents.analyzingPatentability", "Analyzing Patentability...")}</p>
             </div>}

          {result && <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className={cn("p-6 border rounded-xl", getPostureColor(result.overall_posture))}>
                <div className="flex items-center gap-3 mb-3">
                  {getPostureIcon(result.overall_posture)}
                  <div>
                    <h2 className="text-xl font-serif">{t("patents.posture", "Posture:")}{result.overall_posture}
                    </h2>
                  </div>
                </div>
                <p className="text-sm leading-relaxed opacity-90">{result.summary}</p>
              </div>

              {result.suggestions && result.suggestions.length > 0 && <div className="bg-white border border-[#161412]/10 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-[#161412]/10 bg-[#f8f7f4]">
                    <h3 className="font-serif text-lg text-[#161412]">{t("patents.strategicSuggestions", "Strategic Suggestions")}</h3>
                  </div>
                  <ul className="p-5 space-y-3">
                    {result.suggestions.map((suggestion, idx) => <li key={idx} className="flex gap-3 text-sm text-[#161412]/80">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[#176B45]/10 text-[#176B45] flex items-center justify-center font-bold text-xs mt-0.5">{idx + 1}</span>
                        <span className="leading-relaxed">{suggestion}</span>
                      </li>)}
                  </ul>
                </div>}

              {result.regime_map && <div className="bg-white border border-[#161412]/10 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-[#161412]/10 bg-[#f8f7f4]">
                    <h3 className="font-serif text-lg text-[#161412]">{t("patents.iPRegimeApplicabilityMap", "IP Regime Applicability Map")}</h3>
                  </div>
                  <div className="divide-y divide-[#161412]/10">
                    {Object.entries(result.regime_map).map(([regime, entry]) => <div key={regime} className="p-5 flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium text-[#161412] mb-1">{regime}</h4>
                          <p className="text-sm text-[#161412]/60">{entry.reason}</p>
                        </div>
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider", entry.applicable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600")}>
                          {entry.applicable ? 'Applicable' : 'N/A'}
                        </span>
                      </div>)}
                  </div>
                </div>}
            </div>}
        </div>
      </div>
    </div>;
}