import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { BookOpen, Search, AlertCircle, FileText } from 'lucide-react';
import { knowledgeApi } from '../../api';
export default function TKOverlap() {
  const {
    t
  } = useTranslation();
  const [ingredients, setIngredients] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!ingredients.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await knowledgeApi.checkTKOverlap({
        ingredients: ingredients.split(',').map(i => i.trim())
      });
      setResult(response);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred checking TKDL overlap.');
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-[#176B45] mb-2 flex items-center gap-3">
          <BookOpen className="w-8 h-8" />{t("tkoverlap.traditionalKnowledgeOverlap", "Traditional Knowledge Overlap")}</h1>
        <p className="text-[#161412]/60">{t("tkoverlap.checkingredientsagainstthe", "Check ingredients against the TKDL (Traditional Knowledge Digital Library) parameters.")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white border border-[#161412]/10 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#161412] mb-1">{t("tkoverlap.ingredients", "Ingredients")}<span className="text-red-500">*</span></label>
              <textarea value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder={t("tkoverlap.egTurmericNeemAshwagandha", "E.g., Turmeric, Neem, Ashwagandha...")} rows={5} className="w-full bg-[#f8f7f4] border border-[#161412]/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#176B45] transition-colors resize-none" required />
            </div>
            <button type="submit" disabled={isLoading || !ingredients} className="w-full py-2 px-4 bg-[#176B45] text-white rounded-md text-sm font-medium hover:bg-[#125537] transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
              {isLoading ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Search className="w-4 h-4" />}{t("tkoverlap.checkOverlap", "Check Overlap")}</button>
          </form>

          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!result && !isLoading && <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-[#161412]/10 border-dashed rounded-xl opacity-50 bg-white">
               <BookOpen className="w-12 h-12 text-[#176B45] mb-4" />
               <p className="text-[#161412] font-medium">{t("tkoverlap.enteringredients", "Enter ingredients")}</p>
               <p className="text-sm text-[#161412]/60 mt-1 max-w-sm">{t("tkoverlap.wellsearchforclassical", "We'll search for classical formulations and TKDL mappings.")}</p>
             </div>}

          {isLoading && <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-[#161412]/10 rounded-xl bg-white shadow-sm">
               <div className="w-8 h-8 rounded-full border-2 border-[#176B45] border-t-transparent animate-spin mb-4" />
               <p className="text-[#161412] font-medium">{t("tkoverlap.scanningTKDLreferences", "Scanning TKDL references...")}</p>
             </div>}

          {result && <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`p-6 border rounded-xl ${result.overlap_detected ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                <h2 className="text-xl font-serif mb-2 flex items-center gap-2">
                  {result.overlap_detected ? <AlertCircle className="text-yellow-600" /> : <CheckCircle2 className="text-green-600" />}
                  {result.overlap_detected ? 'Overlap Detected' : 'No Direct Overlap'}
                </h2>
                <p className="text-sm opacity-90">{result.summary}</p>
              </div>

              {result.classical_references && result.classical_references.length > 0 && <div className="bg-white border border-[#161412]/10 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-[#161412]/10 bg-[#f8f7f4]">
                    <h3 className="font-serif text-lg text-[#161412]">{t("tkoverlap.classicalTextReferences", "Classical Text References")}</h3>
                  </div>
                  <div className="divide-y divide-[#161412]/10">
                    {result.classical_references.map((ref, idx) => <div key={idx} className="p-5 flex items-start gap-4">
                        <FileText className="w-5 h-5 text-[#176B45] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-[#161412] mb-1">{ref.text_name}</h4>
                          <p className="text-sm text-[#161412]/60">{t("tkoverlap.chapter", "Chapter:")}{ref.chapter}{t("tkoverlap.verse", ", Verse:")}{ref.verse}</p>
                          <p className="text-sm italic bg-[#f8f7f4] p-3 rounded border border-[#161412]/10 mt-2">"{ref.translation}"</p>
                        </div>
                      </div>)}
                  </div>
                </div>}
            </div>}
        </div>
      </div>
    </div>;
}