import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import Navbar from '../../../components/Navbar';
import { knowledgeApi } from '../../../api';

const badgeStyles = {
  SUPPORTED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PARTIAL: 'bg-amber-50 text-amber-800 border-amber-200',
  NOT_FOUND: 'bg-stone-100 text-stone-700 border-stone-200',
  CONTRADICTED: 'bg-rose-50 text-rose-800 border-rose-200',
};

function Badge({ value }) {
  const label = value || 'NOT ESTABLISHED';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeStyles[label] || badgeStyles.NOT_FOUND}`}>{label.replaceAll('_', ' ')}</span>;
}

function EvidenceCard({ title, item }) {
  if (!item) return null;
  return (
    <div className="rounded-xl border border-[#161412]/10 bg-[#fbfaf7] p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-sm text-[#17211d]">{title}</h4>
        <Badge value={item.status} />
      </div>
      <dl className="grid gap-2 text-xs">
        <div><dt className="font-semibold text-[#17211d]/55">User input</dt><dd className="text-[#17211d]/80 mt-0.5">{item.user_value}</dd></div>
        <div><dt className="font-semibold text-[#17211d]/55">Retrieved evidence</dt><dd className="text-[#17211d]/80 mt-0.5 leading-relaxed">{item.evidence_value}</dd></div>
        <div><dt className="font-semibold text-[#17211d]/55">Reason</dt><dd className="text-[#17211d]/70 mt-0.5 leading-relaxed">{item.reason}</dd></div>
      </dl>
      <p className="border-t border-[#161412]/8 pt-2 text-[11px] text-[#17211d]/55">{item.source} · {item.citation}</p>
    </div>
  );
}

export default function TKPriorArt() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!description.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try { setResult(await knowledgeApi.checkTKOverlap({ formulation_description: description.trim(), top_k: 8 })); }
    catch (err) { setError(err.response?.data?.detail || 'TK assessment could not be completed.'); }
    finally { setLoading(false); }
  }

  const parsed = result?.formulation_under_review;
  const matrix = result?.evidence_matrix || [];
  const status = result?.overlap_level || 'NOT ESTABLISHED';

  return (
    <div className="min-h-screen bg-[#faf8f3] font-sans text-[#161412] pb-28">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6" style={{ paddingTop: 135 }}>
        <Link to="/ip-intelligence" className="mb-5 inline-flex items-center text-xs font-semibold uppercase tracking-wider text-[#176B45]"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to IP Intelligence</Link>
        <div className="mb-8 flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8C6D46]/10 text-[#8C6D46]"><BookOpen className="h-5 w-5" /></div><div><h1 className="font-serif text-3xl tracking-tight">Traditional Knowledge Prior-Art</h1><p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#161412]/65">Evidence-led comparison against indexed classical and Traditional Knowledge sources. Semantic similarity is a retrieval signal, not a legal conclusion.</p></div></div>

        {!result && !loading && <form onSubmit={submit} className="rounded-2xl border border-[#161412]/12 bg-white p-7 shadow-sm sm:p-9"><h2 className="font-serif text-xl">Formulation Under Review</h2><p className="mt-1 mb-5 text-xs text-[#161412]/55">Enter the formulation exactly as you want it assessed. Missing facts remain unspecified.</p><textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={8} placeholder="Ingredients, proportions, preparation, intended use, extraction or delivery technology..." className="w-full resize-none rounded-xl border border-[#161412]/15 bg-[#fbfaf7] p-4 text-sm leading-relaxed focus:border-[#8C6D46] focus:outline-none" /><button type="submit" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#8C6D46] px-6 py-3 text-sm font-semibold text-white hover:bg-[#735836]"><Search className="h-4 w-4" /> Assess TK Evidence</button></form>}
        {loading && <div className="rounded-2xl border border-[#161412]/10 bg-white p-16 text-center shadow-sm"><div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-[#8C6D46]/20 border-t-[#8C6D46]" /><p className="font-serif text-xl">Retrieving and verifying TK evidence…</p></div>}
        {error && <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}

        {result && <div className="space-y-6">
          <section className={`rounded-2xl border p-6 shadow-sm ${status === 'NOT ESTABLISHED' ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/55">Overall TK Assessment</p><h2 className="mt-1 font-serif text-3xl">{status}</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#161412]/80">{result.assessment}</p></div><button onClick={() => setResult(null)} className="inline-flex items-center gap-2 rounded-lg border border-[#161412]/15 bg-white px-3 py-2 text-xs font-semibold"><RotateCcw className="h-3.5 w-3.5" /> New assessment</button></div></section>

          <section className="rounded-2xl border border-[#161412]/10 bg-white p-6 shadow-sm"><header className="mb-4 border-b border-[#161412]/10 pb-3"><p className="text-[10px] font-bold uppercase tracking-widest text-[#8C6D46]">Formulation Under Review</p><h3 className="font-serif text-xl">Exact user-provided facts</h3></header><p className="whitespace-pre-wrap rounded-xl bg-[#fbfaf7] p-4 text-sm leading-relaxed">{parsed?.raw_input}</p><div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">{[['Ingredients', parsed?.ingredients?.join(', ')], ['Proportions', parsed?.proportions?.join('; ')], ['Preparation', parsed?.preparation_method], ['Dosage form', parsed?.dosage_form], ['Intended use', parsed?.intended_use], ['Extraction / delivery', [parsed?.extraction_method, parsed?.delivery_technology].filter(x => x && x !== 'Not specified by the user').join(' · ') || 'Not specified by the user'], ['Processing', parsed?.processing], ['Synthetic modification', parsed?.synthetic_modification]].map(([label, value]) => <div key={label} className="rounded-lg border border-[#161412]/8 bg-[#fbfaf7] p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-[#161412]/50">{label}</span><span className="mt-1 block text-[#161412]/80">{value || 'Not specified by the user'}</span></div>)}</div></section>

          <section className="rounded-2xl border border-[#161412]/10 bg-white p-6 shadow-sm"><header className="mb-4 border-b border-[#161412]/10 pb-3"><p className="text-[10px] font-bold uppercase tracking-widest text-[#8C6D46]">Traditional Knowledge Evidence</p><h3 className="font-serif text-xl">Feature-by-feature findings</h3></header><div className="grid gap-4 md:grid-cols-2">{(result.ingredient_evidence || []).map((item, i) => <EvidenceCard key={i} title={item.feature} item={item} />)}<EvidenceCard title="Combination evidence" item={result.combination_evidence} /><EvidenceCard title="Preparation evidence" item={result.preparation_evidence} /><EvidenceCard title="Intended-use evidence" item={result.intended_use_evidence} /><EvidenceCard title="Exact formulation match" item={result.exact_formulation_match} /></div></section>

          <section className="rounded-2xl border border-[#161412]/10 bg-white shadow-sm overflow-hidden"><header className="p-6 border-b border-[#161412]/10"><p className="text-[10px] font-bold uppercase tracking-widest text-[#8C6D46]">Evidence Matrix</p><h3 className="font-serif text-xl">User facts versus retrieved evidence</h3></header><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#fbfaf7] text-[10px] uppercase tracking-wider text-[#161412]/55"><tr><th className="p-4">Feature</th><th className="p-4">User input</th><th className="p-4">Match</th><th className="p-4">Citation / reason</th></tr></thead><tbody className="divide-y divide-[#161412]/8">{matrix.map((item, i) => <tr key={i} className="align-top"><td className="p-4 font-semibold">{item.feature}</td><td className="p-4 max-w-xs text-[#161412]/75">{item.user_value}</td><td className="p-4"><Badge value={item.status} /></td><td className="p-4 max-w-md text-[#161412]/70">{item.citation}<br />{item.reason}</td></tr>)}</tbody></table></div></section>

          <section className="rounded-2xl border border-[#161412]/10 bg-white p-6 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-[#8C6D46]">Potential IP Significance</p><h3 className="mt-1 font-serif text-xl">Preliminary interpretation</h3><p className="mt-3 text-sm leading-relaxed text-[#161412]/75">{result.potential_ip_significance}</p><p className="mt-3 font-semibold text-sm text-[#8C6D46]">Further IP review required.</p></section>
          <section className="rounded-2xl border border-[#161412]/10 bg-[#fbfaf7] p-6 text-xs leading-relaxed text-[#161412]/65"><p className="font-bold uppercase tracking-wider text-[10px] text-[#161412]/75">Evidence & Search Limitations</p>{(result.limitations || []).map((x, i) => <p key={i} className="mt-2">{x}</p>)}<p className="mt-3 border-t border-[#161412]/10 pt-3 italic">{result.disclaimer}</p></section>
        </div>}
      </main>
    </div>
  );
}
