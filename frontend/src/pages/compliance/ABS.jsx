import { useState } from 'react';
import { ShieldCheck, Search, Info } from 'lucide-react';
import { complianceApi } from '../../api';

export default function ABS() {
  const [ingredients, setIngredients] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ingredients.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await complianceApi.screenABS({
        ingredients: ingredients.split(',').map(i => i.trim()),
      });
      setResult(response);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred during ABS screening.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif text-[#176B45] mb-2 flex items-center justify-center gap-3">
          <ShieldCheck className="w-8 h-8" />
          Access & Benefit Sharing (ABS)
        </h1>
        <p className="text-[#161412]/60">Screen ingredients against the Biological Diversity Act (BDA) requirements.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-2xl mx-auto">
        <div className="relative">
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="Enter ingredients (e.g. Neem, Ashwagandha, Aloe Vera)..."
            rows={4}
            className="w-full bg-white border border-[#161412]/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#176B45] shadow-sm resize-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !ingredients.trim()}
          className="w-full py-3 bg-[#176B45] text-white font-medium rounded-xl hover:bg-[#125537] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {isLoading ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Search className="w-5 h-5" />}
          Screen for ABS Compliance
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center max-w-2xl mx-auto">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#176B45] border-t-transparent animate-spin mb-4" />
          <p className="text-[#161412]/60 font-medium">Screening against biodiversity databases...</p>
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
          <div className={`p-6 border rounded-xl flex items-start gap-4 ${
            result.requires_approval ? 'bg-red-50 border-red-200 text-red-900' : 'bg-green-50 border-green-200 text-green-900'
          }`}>
            <Info className={`w-6 h-6 shrink-0 mt-0.5 ${result.requires_approval ? 'text-red-600' : 'text-green-600'}`} />
            <div>
              <h2 className="text-lg font-bold mb-1">
                {result.requires_approval ? 'NBA Approval Required' : 'No NBA Approval Required'}
              </h2>
              <p className="text-sm opacity-90">{result.summary}</p>
            </div>
          </div>

          {result.flagged_ingredients && result.flagged_ingredients.length > 0 && (
            <div className="bg-white border border-[#161412]/10 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-[#161412]/10 bg-[#f8f7f4]">
                <h3 className="font-serif text-lg text-[#161412]">Flagged Biological Resources</h3>
              </div>
              <ul className="divide-y divide-[#161412]/10">
                {result.flagged_ingredients.map((ing, idx) => (
                  <li key={idx} className="p-4 flex items-center justify-between">
                    <span className="font-medium text-[#161412]">{ing.name}</span>
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">Regulated</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.exemptions && result.exemptions.length > 0 && (
            <div className="bg-white border border-[#161412]/10 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-[#161412]/10 bg-[#f8f7f4]">
                <h3 className="font-serif text-lg text-[#161412]">Exempted Ingredients (NTAC/VAT)</h3>
              </div>
              <ul className="divide-y divide-[#161412]/10">
                {result.exemptions.map((ing, idx) => (
                  <li key={idx} className="p-4 flex items-center justify-between">
                    <span className="font-medium text-[#161412]">{ing.name}</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">Exempted</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
