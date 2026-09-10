import { useState } from 'react';
import { Scale, Search, CheckCircle2, ShieldAlert } from 'lucide-react';
import { complianceApi } from '../../api';

export default function Regulatory() {
  const [productCategory, setProductCategory] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [jurisdiction, setJurisdiction] = useState('India');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productCategory || !ingredients) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await complianceApi.getRegulatoryPathway({
        product_category: productCategory,
        ingredients: ingredients.split(',').map(i => i.trim()),
        jurisdiction,
      });
      setResult(response);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred fetching regulatory pathways.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-[#176B45] mb-2 flex items-center gap-3">
          <Scale className="w-8 h-8" />
          Regulatory Pathway
        </h1>
        <p className="text-[#161412]/60">Determine the correct licensing and compliance pathway for your Ayush product.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white border border-[#161412]/10 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#161412] mb-1">Product Category <span className="text-red-500">*</span></label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="w-full bg-[#f8f7f4] border border-[#161412]/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#176B45] transition-colors"
                required
              >
                <option value="">Select Category</option>
                <option value="Classical Medicine">Classical Medicine (Section 3(a))</option>
                <option value="Proprietary Ayurvedic Medicine">Proprietary Ayurvedic Medicine (Section 3(h))</option>
                <option value="Cosmetic">Ayurvedic Cosmetic</option>
                <option value="Food Supplement">Food Supplement (FSSAI)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#161412] mb-1">Key Ingredients <span className="text-red-500">*</span></label>
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="Comma separated ingredients..."
                rows={3}
                className="w-full bg-[#f8f7f4] border border-[#161412]/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#176B45] transition-colors resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !productCategory || !ingredients}
              className="w-full py-2 px-4 bg-[#176B45] text-white rounded-md text-sm font-medium hover:bg-[#125537] transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
            >
              {isLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Analyze Pathway
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!result && !isLoading && (
             <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-[#161412]/10 border-dashed rounded-xl opacity-50 bg-white">
               <Scale className="w-12 h-12 text-[#176B45] mb-4" />
               <p className="text-[#161412] font-medium">Configure product details</p>
               <p className="text-sm text-[#161412]/60 mt-1 max-w-sm">We'll map your product to the correct regulatory guidelines.</p>
             </div>
          )}

          {isLoading && (
             <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-[#161412]/10 rounded-xl bg-white shadow-sm">
               <div className="w-8 h-8 rounded-full border-2 border-[#176B45] border-t-transparent animate-spin mb-4" />
               <p className="text-[#161412] font-medium">Generating Regulatory Pathway...</p>
             </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="p-6 border border-[#161412]/10 rounded-xl bg-[#176B45]/5">
                <h2 className="text-xl font-serif text-[#176B45] mb-2">{result.pathway_name}</h2>
                <p className="text-sm leading-relaxed text-[#161412]/80">{result.summary}</p>
                <div className="mt-4 flex gap-4 text-xs font-bold uppercase tracking-wide text-[#161412]/60">
                  <span>Governing Act: {result.governing_act}</span>
                </div>
              </div>

              {result.checklist && (
                <div className="bg-white border border-[#161412]/10 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-[#161412]/10 bg-[#f8f7f4]">
                    <h3 className="font-serif text-lg text-[#161412]">Compliance Checklist</h3>
                  </div>
                  
                  <div className="divide-y divide-[#161412]/10">
                    <div className="p-5">
                      <h4 className="font-medium text-[#161412] text-sm mb-3 uppercase tracking-wider">Licensing</h4>
                      <ul className="space-y-2">
                        {result.checklist.licensing.map((item, idx) => (
                          <li key={idx} className="flex gap-2 text-sm text-[#161412]/80">
                            <CheckCircle2 className="w-4 h-4 text-[#176B45] shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-5">
                      <h4 className="font-medium text-[#161412] text-sm mb-3 uppercase tracking-wider">Labelling</h4>
                      <ul className="space-y-2">
                        {result.checklist.labelling.map((item, idx) => (
                          <li key={idx} className="flex gap-2 text-sm text-[#161412]/80">
                            <CheckCircle2 className="w-4 h-4 text-[#176B45] shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-5">
                      <h4 className="font-medium text-[#161412] text-sm mb-3 uppercase tracking-wider">Advertising</h4>
                      <ul className="space-y-2">
                        {result.checklist.advertising.map((item, idx) => (
                          <li key={idx} className="flex gap-2 text-sm text-[#161412]/80">
                            <CheckCircle2 className="w-4 h-4 text-[#176B45] shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {result.escalate && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl flex gap-3 text-red-800">
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm">Escalation Required</h4>
                    <p className="text-xs mt-1">This product profile triggers complex regulatory overlap. Formal legal review is required.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
