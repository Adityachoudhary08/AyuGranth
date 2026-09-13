import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Search,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Shield,
  Layers,
} from 'lucide-react';
import Navbar from '../../../components/Navbar';
import { knowledgeApi } from '../../../api';
import { cn } from '../../../lib/utils/cn';

// ─── Status configuration (Never color alone) ──────────────────────────────
const STATUS_CONFIG = {
  'EXACT / NEAR-EXACT': {
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-800',
    panelBorder: 'border-emerald-200',
    panelBg: 'bg-emerald-50/40',
    Icon: CheckCircle2,
  },
  'STRONG': {
    badgeBg: 'bg-teal-50',
    badgeBorder: 'border-teal-200',
    badgeText: 'text-teal-800',
    panelBorder: 'border-teal-200',
    panelBg: 'bg-teal-50/40',
    Icon: CheckCircle2,
  },
  'STRONG TK OVERLAP': {
    badgeBg: 'bg-teal-50',
    badgeBorder: 'border-teal-200',
    badgeText: 'text-teal-800',
    panelBorder: 'border-teal-200',
    panelBg: 'bg-teal-50/40',
    Icon: CheckCircle2,
  },
  'PARTIAL': {
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
    panelBorder: 'border-amber-200/80',
    panelBg: 'bg-amber-50/40',
    Icon: AlertTriangle,
  },
  'PARTIAL TK OVERLAP': {
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
    panelBorder: 'border-amber-200/80',
    panelBg: 'bg-amber-50/40',
    Icon: AlertTriangle,
  },
  'NOT ESTABLISHED': {
    badgeBg: 'bg-stone-100',
    badgeBorder: 'border-stone-200',
    badgeText: 'text-stone-700',
    panelBorder: 'border-stone-200',
    panelBg: 'bg-stone-50/70',
    Icon: HelpCircle,
  },
  'NO SUFFICIENT TK MATCH FOUND IN THE INDEXED CORPUS': {
    badgeBg: 'bg-stone-100',
    badgeBorder: 'border-stone-200',
    badgeText: 'text-stone-700',
    panelBorder: 'border-stone-200',
    panelBg: 'bg-stone-50/70',
    Icon: HelpCircle,
  },
};

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['NOT ESTABLISHED'];
}

function StatusBadge({ value }) {
  const raw = value || 'NOT ESTABLISHED';
  const label = raw.replace(/_/g, ' ');
  const cfg = getStatusConfig(raw);
  const StatusIcon = cfg.Icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide select-none',
        cfg.badgeBg,
        cfg.badgeBorder,
        cfg.badgeText,
      )}
    >
      <StatusIcon className="h-3 w-3 shrink-0 pointer-events-none select-none" aria-hidden="true" focusable="false" role="presentation" />
      <span>{label}</span>
    </span>
  );
}

function MatchBadge({ status }) {
  const norm = (status || '').toUpperCase();
  const isSupported = norm === 'SUPPORTED';
  const isEstablished = norm === 'NOT ESTABLISHED';
  const isPartial = norm.includes('PARTIAL');

  let badgeStyle = 'bg-stone-100 border-stone-200 text-stone-600';
  let Icon = XCircle;
  let label = (status || 'NOT FOUND').replace(/_/g, ' ');

  if (isSupported) {
    badgeStyle = 'bg-emerald-50/80 border-emerald-200 text-emerald-800';
    Icon = CheckCircle2;
  } else if (isPartial) {
    badgeStyle = 'bg-amber-50/80 border-amber-200 text-amber-800';
    Icon = AlertTriangle;
  } else if (isEstablished) {
    badgeStyle = 'bg-stone-100/90 border-stone-200 text-stone-600';
    Icon = HelpCircle;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider select-none',
        badgeStyle,
      )}
    >
      <Icon className="h-2.5 w-2.5 shrink-0 pointer-events-none select-none" aria-hidden="true" focusable="false" role="presentation" />
      <span>{label}</span>
    </span>
  );
}

function EvidenceCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = item.text && item.text.length > 240;

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#176B45]">
            <BookOpen className="h-3 w-3 shrink-0" />
            {item.source_type === 'classical_tk' ? 'Classical TK Source' : 'Traditional Reference'}
          </div>
          <h4
            className="mt-1 text-xs font-semibold leading-snug text-stone-900 truncate"
            title={item.document_title}
          >
            {item.document_title}
          </h4>
          {(item.section || item.page) && (
            <p className="mt-0.5 text-[11px] text-stone-500">
              {item.section && item.section !== 'Source citation unavailable in indexed metadata.' ? `§ ${item.section}` : ''}
              {item.section && item.page && item.page !== 'Source citation unavailable in indexed metadata.' ? ' · ' : ''}
              {item.page && item.page !== 'Source citation unavailable in indexed metadata.' ? `p. ${item.page}` : ''}
            </p>
          )}
        </div>
        {item.similarity_score > 0 && (
          <span className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-600">
            {item.similarity_score}% match
          </span>
        )}
      </div>

      <p className={cn('mt-2 text-xs leading-relaxed text-stone-700', !expanded && 'line-clamp-3')}>
        {item.text || 'No excerpt available.'}
      </p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#176B45] hover:underline"
        >
          {expanded ? 'Show less' : 'Read full excerpt'}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}
    </article>
  );
}

export default function TKPriorArt() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const resultRef = useRef(null);

  // Smooth scroll into results when ready
  useEffect(() => {
    if (result && resultRef.current) {
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
  }, [result]);

  async function submit(event) {
    event.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await knowledgeApi.checkTKOverlap({
        formulation_description: description.trim(),
        top_k: 8,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'TK assessment could not be completed. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const parsed = result?.formulation_under_review;
  const matrix = result?.evidence_matrix || [];
  const status = result?.overlap_level || 'NOT ESTABLISHED';
  const cfg = getStatusConfig(status);

  return (
    <div className="min-h-screen bg-[#f8faf8] font-sans text-stone-900 pb-28">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6" style={{ paddingTop: 120 }}>
        {/* Breadcrumb */}
        <Link
          to="/ip-intelligence"
          className="mb-4 inline-flex items-center text-xs font-semibold uppercase tracking-wider text-[#176B45] hover:underline"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to IP Intelligence
        </Link>

        {/* Page Title */}
        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#176B45]/10 text-[#176B45]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-3xl tracking-tight text-stone-900 sm:text-4xl">
              Traditional Knowledge Prior-Art
            </h1>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-relaxed text-stone-500">
              Evidence-grounded comparison against classical texts (AFI, API, Ashtanga Hridaya) in the indexed Traditional Knowledge Digital Library corpus.
            </p>
          </div>
        </div>

        {/* Input Form */}
        {!result && !loading && (
          <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="mb-4 border-b border-stone-100 pb-3">
              <h2 className="font-serif text-lg font-semibold text-stone-900">Formulation Under Review</h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Enter the formulation ingredients, ratios, dosage form, or preparation method. Only explicitly stated features will be matched.
              </p>
            </div>

            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={7}
              placeholder="e.g. A traditional Ayurvedic formulation comprising Curcuma longa rhizome and Zingiber officinale rhizome in equal proportions as a simple powdered herbal mixture for digestive discomfort..."
              className="w-full resize-none rounded-xl border border-stone-300 bg-stone-50/50 p-4 text-xs sm:text-sm leading-relaxed text-stone-900 outline-none transition focus:border-[#176B45] focus:bg-white focus:ring-1 focus:ring-[#176B45]"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[#176B45] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#125537] active:scale-[0.99]"
              >
                <Search className="h-4 w-4" /> Assess TK Evidence
              </button>
              <span className="text-[11px] text-stone-400">
                Only classical text passages are evaluated. Modern research bulletins are excluded.
              </span>
            </div>
          </form>
        )}

        {/* Loading State */}
        {loading && (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-xs">
            <div className="relative mx-auto mb-4 h-10 w-10">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-[#176B45]" />
              <Shield className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-[#176B45]" />
            </div>
            <h3 className="font-serif text-xl text-stone-900">Retrieving and verifying classical TK evidence…</h3>
            <p className="mt-1.5 text-xs text-stone-500">
              Filtering classical sources and applying relevance gates.
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Result Container */}
        {result && (
          <div ref={resultRef} className="space-y-5 scroll-mt-24">
            {/* 1. OVERALL ASSESSMENT CARD */}
            <section className={cn('overflow-hidden rounded-2xl border bg-white shadow-xs', cfg.panelBorder)}>
              <div className={cn('p-6 sm:p-7 border-b', cfg.panelBorder, cfg.panelBg)}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      TK Prior-Art Assessment
                    </p>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <h2 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
                        {status === 'NOT ESTABLISHED'
                          ? 'NO SUFFICIENT TK MATCH FOUND IN THE INDEXED CORPUS'
                          : result.status_label || status}
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={status} />
                    <button
                      type="button"
                      onClick={() => setResult(null)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> New assessment
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-xs sm:text-sm leading-relaxed text-stone-700">
                  {result.assessment}
                </p>
              </div>
            </section>

            {/* 2. FORMULATION UNDER REVIEW */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
              <header className="mb-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#176B45]">
                  <FileText className="h-3.5 w-3.5" />
                  Submitted Case Facts
                </div>
                <h3 className="mt-1 font-serif text-lg font-semibold text-stone-900">
                  Exact user-provided formulation
                </h3>
              </header>

              <p className="whitespace-pre-wrap rounded-xl border border-stone-200/80 bg-stone-50/50 p-3.5 text-xs leading-relaxed text-stone-800">
                {parsed?.raw_input}
              </p>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                {[
                  ['Ingredients', parsed?.ingredients?.join(', ')],
                  ['Proportion', parsed?.proportions?.join('; ')],
                  ['Preparation', parsed?.preparation_method],
                  ['Dosage form', parsed?.dosage_form],
                  ['Intended use', parsed?.intended_use],
                  [
                    'Extraction / Delivery',
                    [parsed?.extraction_method, parsed?.delivery_technology]
                      .filter((x) => x && x !== 'Not specified by the user' && x !== 'Not specified')
                      .join(' / ') || 'Not specified',
                  ],
                  [
                    'Processing',
                    !parsed?.processing || parsed?.processing === 'Not specified by the user'
                      ? 'Not specified'
                      : parsed?.processing,
                  ],
                  [
                    'Synthetic modification',
                    !parsed?.synthetic_modification || parsed?.synthetic_modification === 'Not specified by the user'
                      ? 'Not specified'
                      : parsed?.synthetic_modification,
                  ],
                ].map(([label, value]) => {
                  const displayVal = (!value || value === 'Not specified by the user') ? 'Not specified' : value;
                  return (
                    <div key={label} className="rounded-lg border border-stone-200/60 bg-[#fbfcfb] p-2.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-xs font-medium text-stone-800 truncate" title={displayVal}>
                        {displayVal}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. EVIDENCE MATRIX */}
            <section className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
              <header className="p-5 border-b border-stone-100">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#176B45]">
                  <Layers className="h-3.5 w-3.5" />
                  Feature Match Breakdown
                </div>
                <h3 className="mt-1 font-serif text-lg font-semibold text-stone-900">
                  User facts versus retrieved evidence
                </h3>
              </header>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="p-3 sm:p-4">Feature</th>
                      <th className="p-3 sm:p-4">User input</th>
                      <th className="p-3 sm:p-4">Match Status</th>
                      <th className="p-3 sm:p-4">Citation / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {matrix.map((item, i) => (
                      <tr key={i} className="align-top hover:bg-stone-50/40">
                        <td className="p-3 sm:p-4 font-semibold text-stone-900">{item.feature}</td>
                        <td className="p-3 sm:p-4 max-w-xs text-stone-700">{item.user_value}</td>
                        <td className="p-3 sm:p-4 whitespace-nowrap">
                          <MatchBadge status={item.status} />
                        </td>
                        <td className="p-3 sm:p-4 max-w-md text-stone-600">
                          {item.source !== 'No supporting indexed source' && (
                            <span className="font-medium text-stone-800 block mb-0.5">
                              {item.source} · {item.citation}
                            </span>
                          )}
                          <span className="text-[11px] leading-snug">{item.reason}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. TRADITIONAL KNOWLEDGE EVIDENCE */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
              <header className="mb-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#176B45]">
                  <BookOpen className="h-3.5 w-3.5" />
                  Accepted Classical Evidence
                </div>
                <h3 className="mt-1 font-serif text-lg font-semibold text-stone-900">
                  Supporting classical passages
                </h3>
              </header>

              {result.evidence && result.evidence.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.evidence.map((ev, i) => (
                    <EvidenceCard key={ev.document_id || i} item={ev} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 p-6 text-center text-xs text-stone-500">
                  <p className="font-semibold text-stone-700">No accepted Traditional Knowledge evidence.</p>
                  <p className="mt-1 text-stone-500">
                    The indexed classical corpus does not contain verified support for the submitted formulation features.
                  </p>
                </div>
              )}
            </section>

            {/* 5. POTENTIAL IP SIGNIFICANCE */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#176B45]">
                <Shield className="h-3.5 w-3.5" />
                Patent &amp; Novelty Context
              </div>
              <h3 className="mt-1 font-serif text-lg font-semibold text-stone-900">
                Potential IP Significance
              </h3>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-stone-700">
                {result.potential_ip_significance}
              </p>
              <p className="mt-2.5 text-[11px] font-semibold text-stone-500">
                Preliminary interpretation · Further IP legal counsel required.
              </p>
            </section>

            {/* 6. EVIDENCE & SEARCH LIMITATIONS */}
            <section className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 text-xs leading-relaxed text-stone-600">
              <p className="font-bold uppercase tracking-wider text-[10px] text-stone-500">
                Evidence &amp; Search Limitations
              </p>
              {(result.limitations || []).map((x, i) => (
                <p key={i} className="mt-1.5">
                  • {x}
                </p>
              ))}
              <p className="mt-3 border-t border-stone-200/60 pt-2.5 text-[11px] italic text-stone-500">
                {result.disclaimer}
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
