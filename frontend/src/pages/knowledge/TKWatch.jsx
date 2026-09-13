import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { Eye, Search, AlertTriangle, ArrowRight } from 'lucide-react';
import { knowledgeApi } from '../../api';
export default function TKWatch() {
  const {
    t
  } = useTranslation();
  const [patentNumber, setPatentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!patentNumber.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await knowledgeApi.checkMisappropriation({
        patent_text: patentNumber // We are treating the input as a proxy for the patent text to query against
      });
      setResult(response);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred checking for misappropriation.');
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif text-[#176B45] mb-2 flex items-center justify-center gap-3">
          <Eye className="w-8 h-8" />{t("tkwatch.tKMisappropriationWatch", "TK Misappropriation Watch")}</h1>
        <p className="text-[#161412]/60">{t("tkwatch.scanglobalpatentfilings", "Scan global patent filings for potential misappropriation of Indian traditional knowledge.")}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-4 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#161412]/40" />
          <input type="text" value={patentNumber} onChange={e => setPatentNumber(e.target.value)} placeholder={t("tkwatch.enterPatentPublicationNumber", "Enter Patent Publication Number or text snippet")} className="w-full bg-white border border-[#161412]/20 rounded-full pl-12 pr-6 py-4 text-sm focus:outline-none focus:border-[#176B45] shadow-sm transition-all" required />
        </div>
        <button type="submit" disabled={isLoading || !patentNumber.trim()} className="px-6 py-4 bg-[#176B45] text-white font-medium rounded-full hover:bg-[#125537] transition-colors disabled:opacity-50">
          {isLoading ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : 'Scan'}
        </button>
      </form>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center max-w-2xl mx-auto">
          {error}
        </div>}

      {isLoading && <div className="py-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#176B45] border-t-transparent animate-spin mb-4" />
          <p className="text-[#161412]/60 font-medium">{t("tkwatch.analyzingclaimsagainstTKDL", "Analyzing claims against TKDL...")}</p>
        </div>}

      {result && <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
          <div className={`p-6 border rounded-xl flex items-start gap-4 ${result.misappropriation_risk === 'High' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
            <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${result.misappropriation_risk === 'High' ? 'text-red-600' : 'text-green-600'}`} />
            <div>
              <h2 className="text-lg font-bold mb-1">{t("tkwatch.riskLevel", "Risk Level:")}{result.misappropriation_risk}
              </h2>
              <p className="text-sm opacity-90">{result.explanation}</p>
            </div>
          </div>

          {result.evidence && result.evidence.length > 0 && <div className="bg-white border border-[#161412]/10 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-[#161412]/10 bg-[#f8f7f4]">
                <h3 className="font-serif text-lg text-[#161412]">{t("tkwatch.evidenceofPriorArt", "Evidence of Prior Art")}</h3>
              </div>
              <ul className="divide-y divide-[#161412]/10">
                {result.evidence.map((ev, idx) => <li key={idx} className="p-5 space-y-2">
                    <p className="text-sm font-medium text-[#161412] bg-[#f8f7f4] p-3 rounded border border-[#161412]/10">{t("tkwatch.claim", "\"Claim:")}{ev.claim}"
                    </p>
                    <div className="flex justify-center py-1">
                      <ArrowRight className="w-4 h-4 text-[#161412]/30" />
                    </div>
                    <p className="text-sm text-[#161412]/80 bg-[#176B45]/5 p-3 rounded border border-[#176B45]/20">{t("tkwatch.priorArt", "\"Prior Art:")}{ev.prior_art}"
                    </p>
                  </li>)}
              </ul>
            </div>}
        </div>}
    </div>;
}