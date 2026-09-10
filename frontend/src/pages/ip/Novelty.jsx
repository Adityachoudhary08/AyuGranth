import { useState } from 'react';
import { Sparkles, Plus, X, Search, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ipApi } from '../../api';
import { cn } from '../../lib/utils/cn';

export default function Novelty() {
  const [ingredients, setIngredients] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const addIngredient = (e) => {
    e.preventDefault();
    if (currentInput.trim() && !ingredients.includes(currentInput.trim())) {
      setIngredients([...ingredients, currentInput.trim()]);
      setCurrentInput('');
    }
  };

  const removeIngredient = (idx) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const handleSandboxCheck = async () => {
    if (ingredients.length === 0) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await ipApi.checkNovelty({
        ingredients,
        fast_mode: true,
      });
      setResult(response);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred during novelty check.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-[#176B45] mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8" />
          Novelty Sandbox
        </h1>
        <p className="text-[#161412]/60">Iteratively test formulation ingredients for novelty against prior art.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[#161412]/10 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-serif text-lg text-[#161412] border-b border-[#161412]/10 pb-2">Formulation Builder</h2>
            
            <form onSubmit={addIngredient} className="flex gap-2">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Add ingredient (e.g. Ashwagandha)"
                className="flex-1 bg-[#f8f7f4] border border-[#161412]/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#176B45]"
              />
              <button
                type="submit"
                disabled={!currentInput.trim()}
                className="p-2 bg-[#f8f7f4] border border-[#161412]/10 text-[#161412] rounded-md hover:bg-[#161412]/5 transition-colors disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>

            <div className="flex flex-wrap gap-2 pt-2">
              {ingredients.map((ing, idx) => (
                <span key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-[#176B45]/10 text-[#176B45] text-sm font-medium rounded-full border border-[#176B45]/20">
                  {ing}
                  <button onClick={() => removeIngredient(idx)} className="hover:text-red-500 focus:outline-none">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {ingredients.length === 0 && (
                <p className="text-sm text-[#161412]/40 italic">No ingredients added yet.</p>
              )}
            </div>

            <button
              onClick={handleSandboxCheck}
              disabled={isLoading || ingredients.length === 0}
              className="w-full mt-4 py-2 px-4 bg-[#176B45] text-white rounded-md text-sm font-medium hover:bg-[#125537] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Check Novelty
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!result && !isLoading && (
             <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-[#161412]/10 border-dashed rounded-xl opacity-50 bg-white">
               <Sparkles className="w-12 h-12 text-[#176B45] mb-4" />
               <p className="text-[#161412] font-medium">Build a formulation</p>
               <p className="text-sm text-[#161412]/60 mt-1 max-w-sm">Add ingredients to assess their combined novelty score in real-time.</p>
             </div>
          )}

          {isLoading && (
             <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-[#161412]/10 rounded-xl bg-white shadow-sm">
               <div className="w-8 h-8 rounded-full border-2 border-[#176B45] border-t-transparent animate-spin mb-4" />
               <p className="text-[#161412] font-medium">Computing Novelty Vector...</p>
             </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="bg-white border border-[#161412]/10 rounded-xl p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif text-[#161412] mb-1">Novelty Score</h2>
                  <p className="text-sm text-[#161412]/60">AI assessment, not a legal determination.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={cn("text-4xl font-serif font-bold", 
                      result.novelty_score >= 80 ? "text-green-600" : 
                      result.novelty_score >= 50 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {result.novelty_score}
                    </span>
                    <span className="text-[#161412]/40 text-lg">/100</span>
                  </div>
                  {result.novelty_score >= 80 ? <CheckCircle2 className="w-10 h-10 text-green-600 opacity-20" /> : <ShieldAlert className="w-10 h-10 text-red-600 opacity-20" />}
                </div>
              </div>

              {result.closest_prior_art && (
                <div className="bg-white border border-[#161412]/10 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-[#161412]/10 bg-[#f8f7f4]">
                    <h3 className="font-serif text-lg text-[#161412]">Closest Prior Art Match</h3>
                  </div>
                  <div className="p-5">
                    <p className="font-medium text-[#161412] mb-2">{result.closest_prior_art.title}</p>
                    <p className="text-sm text-[#161412]/60 bg-[#f8f7f4] p-3 rounded border border-[#161412]/10">"{result.closest_prior_art.abstract_snippet}"</p>
                  </div>
                </div>
              )}

              {result.suggestions && result.suggestions.length > 0 && (
                <div className="bg-white border border-[#161412]/10 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-[#161412]/10 bg-[#f8f7f4]">
                    <h3 className="font-serif text-lg text-[#161412]">Suggestions to Improve Novelty</h3>
                  </div>
                  <ul className="p-5 space-y-3">
                    {result.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-[#161412]/80">
                        <Plus className="w-4 h-4 text-[#176B45] shrink-0 mt-0.5" />
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
