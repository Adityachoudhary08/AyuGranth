import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FlaskConical, X, Plus, AlertCircle, Lightbulb, Activity, FileText } from 'lucide-react';
import Navbar from '../../../components/Navbar';
import { ipApi } from '../../../api';
import { cn } from '../../../lib/utils/cn';
import { useTranslation } from 'react-i18next';

export default function NoveltySandbox() {
  const { t } = useTranslation();
  const [ingredients, setIngredients] = useState(['Ashwagandha']);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAddIngredient = (e) => {
    e.preventDefault();
    if (currentInput.trim() && !ingredients.includes(currentInput.trim())) {
      setIngredients([...ingredients, currentInput.trim()]);
      setCurrentInput('');
      setResult(null); // Reset result when ingredients change
    }
  };

  const handleRemoveIngredient = (index) => {
    const newIngredients = [...ingredients];
    newIngredients.splice(index, 1);
    setIngredients(newIngredients);
    setResult(null);
  };

  const handleCheckNovelty = async () => {
    if (ingredients.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await ipApi.checkNovelty({ ingredients });
      setResult(res);
    } catch (err) {
      console.error(err);
      setError(t('novelty.errorMsg'));
    } finally {
      setLoading(false);
    }
  };

  const getNoveltyColor = (level) => {
    if (level === 'High Novelty' || level === t('novelty.highNovelty')) return 'text-green-600 bg-green-50 border-green-200';
    if (level === 'Moderate' || level === t('novelty.moderate')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getNoveltyBarColor = (level) => {
    if (level === 'High Novelty' || level === t('novelty.highNovelty')) return 'bg-green-500';
    if (level === 'Moderate' || level === t('novelty.moderate')) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] font-sans pb-20">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6" style={{ paddingTop: '140px' }}>
        
        {/* Header */}
        <div className="mb-8">
          <Link to="/ip-intelligence" className="inline-flex items-center text-sm font-medium text-[#176B45] hover:text-[#125537] mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('novelty.backToIP')}
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <FlaskConical className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-serif text-[#161412]">{t('novelty.pageTitle')}</h1>
          </div>
          <p className="text-[#161412]/60">{t('novelty.pageSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left: Input Sandbox */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#161412]/15 shadow-sm h-fit">
            <h2 className="text-sm font-serif text-[#161412] mb-4 flex items-center gap-2 border-b border-[#161412]/10 pb-4">
              <FlaskConical className="w-4 h-4 text-purple-600" /> {t('novelty.formulationIngredients')}
            </h2>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f7f4] border border-[#161412]/10 rounded-lg text-sm text-[#161412]">
                  {ing}
                  <button onClick={() => handleRemoveIngredient(idx)} className="text-[#161412]/40 hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {ingredients.length === 0 && (
                <p className="text-sm text-[#161412]/40 italic py-1">{t('novelty.noIngredients')}</p>
              )}
            </div>

            <form onSubmit={handleAddIngredient} className="flex gap-2 mb-8">
              <input 
                type="text" 
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder={t('novelty.addIngredientPlaceholder')}
                className="flex-1 bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-all"
              />
              <button type="submit" disabled={!currentInput.trim()} className="px-4 py-2.5 bg-[#f8f7f4] border border-[#161412]/15 text-[#161412] font-medium rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <button 
              onClick={handleCheckNovelty} 
              disabled={loading || ingredients.length === 0}
              className="w-full py-3.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:bg-purple-600"
            >
              {loading ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span> {t('novelty.calculating')}</>
              ) : (
                <><Activity className="w-4 h-4" /> {t('novelty.checkNoveltyBtn')}</>
              )}
            </button>
          </div>

          {/* Right: Results Dashboard */}
          <div>
            {!result && !loading && (
              <div className="h-full border-2 border-dashed border-[#161412]/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-white/50">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-purple-300" />
                </div>
                <p className="text-sm text-[#161412]/40 font-medium">{t('novelty.emptyPrompt')}</p>
              </div>
            )}

            {loading && (
              <div className="h-full border border-[#161412]/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-white shadow-sm animate-pulse min-h-[300px]">
                <div className="w-10 h-10 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin mb-4"></div>
                <p className="text-sm text-[#161412]/50">{t('novelty.computingSemantic')}</p>
              </div>
            )}

            {result && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Score Card */}
                <div className="bg-white rounded-2xl border border-[#161412]/15 shadow-sm p-6 text-center">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/50 mb-4">{t('novelty.noveltyScore')}</h3>
                  <div className="flex items-end justify-center gap-2 mb-4">
                    <span className="text-5xl font-serif text-[#161412] leading-none">{result.novelty_score.toFixed(0)}</span>
                    <span className="text-xl text-[#161412]/40 font-medium leading-none mb-1">/ 100</span>
                  </div>
                  
                  <div className={cn("inline-flex items-center px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider mb-6", getNoveltyColor(result.novelty_level))}>
                    {result.novelty_level === 'High Novelty' ? t('novelty.highNovelty') : result.novelty_level === 'Moderate' ? t('novelty.moderate') : t('novelty.lowNovelty')}
                  </div>

                  <div className="w-full h-2 bg-[#f8f7f4] rounded-full overflow-hidden border border-[#161412]/10 relative">
                    <div 
                      className={cn("absolute top-0 left-0 bottom-0 transition-all duration-1000 ease-out", getNoveltyBarColor(result.novelty_level))} 
                      style={{ width: `${result.novelty_score}%` }}
                    ></div>
                  </div>
                </div>

                {/* Suggestion Card */}
                {result.suggestion && (
                  <div className="bg-purple-50/50 rounded-2xl border border-purple-100 p-5 shadow-sm">
                    <h4 className="text-xs font-bold text-purple-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" /> {t('novelty.suggestion')}
                    </h4>
                    <p className="text-sm text-purple-900/80 leading-relaxed">{result.suggestion}</p>
                  </div>
                )}

                {/* Closest Match Snippet */}
                {result.closest_match && (
                  <div className="bg-white rounded-2xl border border-[#161412]/15 p-5 shadow-sm">
                    <h4 className="text-xs font-bold text-[#161412]/50 uppercase tracking-widest mb-3 flex items-center justify-between">
                      <span>{t('novelty.closestPriorArt')}</span>
                      <span className="text-[10px] bg-[#f8f7f4] px-2 py-0.5 rounded border border-[#161412]/5 text-[#161412]/60">
                        {(result.closest_match.semantic_similarity * 100).toFixed(1)}% {t('novelty.similarity')}
                      </span>
                    </h4>
                    <div className="bg-[#f8f7f4]/80 p-3 rounded-lg border border-[#161412]/5 mb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#161412] mb-1">
                        <FileText className="w-3.5 h-3.5 text-[#161412]/50" /> {result.closest_match.source_document}
                      </div>
                    </div>
                    <p className="text-xs text-[#161412]/70 leading-relaxed italic line-clamp-3">
                      "...{result.closest_match.chunk_text_snippet}..."
                    </p>
                  </div>
                )}
                
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
