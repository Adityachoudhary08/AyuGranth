import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  FlaskConical,
  Globe2,
  Leaf,
  Briefcase,
  Scale,
  ScrollText,
  Sparkles,
  Shield,
  ShieldAlert,
  Tag,
  X,
  Info,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Layers,
  Building2,
  ClipboardCheck,
  Lightbulb,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import Navbar from '../../components/Navbar';
import { complianceApi } from '../../api';

const AREA_ORDER = [
  'COMPETENT AUTHORITY',
  'APPROVAL / INTIMATION',
  'BENEFIT-SHARING',
  'IPR / DISCLOSURE',
  'REQUIRED DOCUMENTATION',
];

const AREA_ICONS = {
  'COMPETENT AUTHORITY': Building2,
  'APPROVAL / INTIMATION': ClipboardCheck,
  'BENEFIT-SHARING': Scale,
  'IPR / DISCLOSURE': Lock,
  'REQUIRED DOCUMENTATION': FileText,
};

// ─── Status configuration — understated, restrained palette (icon + text, never color alone) ──
const STATUS_CONFIG = {
  RELEVANT: {
    label: 'RELEVANT',
    bg: 'bg-emerald-50/60',
    border: 'border-emerald-200/90',
    text: 'text-emerald-900',
    dot: 'bg-emerald-600',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-800',
    Icon: CheckCircle2,
  },
  'POTENTIALLY APPLICABLE': {
    label: 'POTENTIALLY APPLICABLE',
    bg: 'bg-amber-50/40',
    border: 'border-amber-200/80',
    text: 'text-amber-900',
    dot: 'bg-amber-500',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
    Icon: AlertTriangle,
  },
  'INFORMATION REQUIRED': {
    label: 'INFORMATION REQUIRED',
    bg: 'bg-stone-50/70',
    border: 'border-stone-200',
    text: 'text-stone-800',
    dot: 'bg-stone-400',
    badgeBg: 'bg-stone-100',
    badgeBorder: 'border-stone-200',
    badgeText: 'text-stone-700',
    Icon: HelpCircle,
  },
  'NOT CLEARLY TRIGGERED': {
    label: 'NOT CLEARLY TRIGGERED',
    bg: 'bg-slate-50/60',
    border: 'border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-200',
    badgeText: 'text-slate-600',
    Icon: XCircle,
  },
  'NOT IDENTIFIED': {
    label: 'NOT IDENTIFIED',
    bg: 'bg-zinc-50/60',
    border: 'border-zinc-200',
    text: 'text-zinc-600',
    dot: 'bg-zinc-300',
    badgeBg: 'bg-zinc-100',
    badgeBorder: 'border-zinc-200',
    badgeText: 'text-zinc-500',
    Icon: Info,
  },
};

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['INFORMATION REQUIRED'];
}

// ─── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status, size = 'sm' }) {
  const cfg = getStatusConfig(status);
  const StatusIcon = cfg.Icon;
  const isSmall = size === 'sm';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide',
        cfg.badgeBg,
        cfg.badgeBorder || cfg.border,
        cfg.badgeText,
        isSmall ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
      )}
    >
      <StatusIcon className={isSmall ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />
      <span>{status}</span>
    </span>
  );
}

// ─── Evidence Card ──────────────────────────────────────────────────────────
function EvidenceCard({ item, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = item.excerpt && item.excerpt.length > 240;

  return (
    <article className={cn('rounded-lg border border-stone-200/80 bg-[#fbfcfb]', compact ? 'p-3' : 'p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#176B45]">
            <BookOpen className="h-3 w-3 shrink-0" />
            {item.evidence_type || 'Retrieved statutory excerpt'}
          </div>
          <h4
            className="mt-1 text-xs font-semibold leading-snug text-stone-900"
            title={item.document || item.source}
          >
            {item.document || item.source || 'Retrieved source'}
          </h4>
          {(item.section || item.page) && (
            <p className="mt-0.5 text-[11px] text-stone-500">
              {item.section ? `§ ${item.section}` : ''}
              {item.section && item.page ? ' · ' : ''}
              {item.page ? `p. ${item.page}` : ''}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
          {item.verified ? 'Verified ID' : 'Retrieved'}
        </span>
      </div>
      <p className={cn('mt-2 text-xs leading-relaxed text-stone-700', !expanded && 'line-clamp-3')}>
        {item.excerpt || 'No excerpt was returned for this source.'}
      </p>
      {item.relevance && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
          <span className="font-semibold text-stone-600">Why it matters:</span> {item.relevance}
        </p>
      )}
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

// ─── Obligation Card (Tighter, less visually heavy, compact typography) ─────
function ObligationCard({ item, index }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getStatusConfig(item.status);
  const AreaIcon = AREA_ICONS[item.area] || FileText;
  const hasDetail = !!(item.details || (item.evidence && item.evidence.length > 0));
  const evidenceCount = item.evidence ? item.evidence.length : 0;

  return (
    <article className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className={cn('flex items-center justify-between gap-3 rounded-t-xl border-b border-stone-100 px-4 py-3', cfg.bg)}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/80 font-mono text-[10px] font-bold text-stone-600 shadow-2xs">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <AreaIcon className={cn('h-3.5 w-3.5 shrink-0', cfg.text)} />
            <h3 className={cn('text-xs font-bold uppercase tracking-wide truncate', cfg.text)}>
              {item.area}
            </h3>
          </div>
        </div>
        <StatusBadge status={item.status} size="sm" />
      </div>

      {/* Body — compact spacing and comfortable line-height */}
      <div className="flex-1 p-4 space-y-3">
        <div>
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">What this means</p>
          <p className="text-[12.5px] leading-relaxed text-stone-800">{item.what_this_means}</p>
        </div>
        <div>
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">Next step</p>
          <p className="text-[12.5px] font-medium leading-relaxed text-stone-900">{item.next_step}</p>
        </div>
        <div>
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">Why it matters</p>
          <p className="text-[12px] leading-relaxed text-stone-600">{item.why_it_matters}</p>
        </div>
      </div>

      {/* Supporting Evidence Toggle */}
      {hasDetail && (
        <div className="border-t border-stone-100 bg-stone-50/30 px-4 py-2.5 rounded-b-xl">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#176B45] hover:text-[#125537]"
          >
            {expanded ? 'Hide supporting detail' : (
              evidenceCount > 0
                ? `View supporting detail · ${evidenceCount} source${evidenceCount === 1 ? '' : 's'}`
                : 'View supporting detail'
            )}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expanded && (
            <div className="mt-3 space-y-2.5">
              {item.details && (
                <p className="rounded-lg border border-stone-200/60 bg-stone-50 p-2.5 text-xs leading-relaxed text-stone-700">
                  {item.details}
                </p>
              )}
              {item.evidence && item.evidence.map((ev) => (
                <EvidenceCard key={ev.source_chunk_id} item={ev} compact />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Grouped Evidence Section (Expandable by document, clean hierarchy) ─────
function GroupedEvidenceSection({ evidence }) {
  // Group passages by source document
  const grouped = useMemo(() => {
    const map = {};
    for (const item of evidence) {
      const key = item.document || item.source || 'Unknown source';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return Object.entries(map);
  }, [evidence]);

  const [expandedDocs, setExpandedDocs] = useState({});
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleDoc = (docName) => {
    setExpandedDocs((prev) => ({ ...prev, [docName]: !prev[docName] }));
  };

  const toggleAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const updated = {};
    grouped.forEach(([name]) => { updated[name] = nextState; });
    setExpandedDocs(updated);
  };

  const uniqueSources = grouped.length;
  const totalPassages = evidence.length;

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#176B45]">
            <BookOpen className="h-3.5 w-3.5" />
            Supporting Legal Evidence
          </div>
          <h3 className="mt-1 font-serif text-xl text-stone-900">Retrieved statutory sources</h3>
          <p className="mt-0.5 text-xs text-stone-500">
            {uniqueSources} unique source{uniqueSources !== 1 ? 's' : ''} · {totalPassages} supporting passage{totalPassages !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
        >
          {allExpanded ? 'Collapse all passages' : 'Expand all passages'}
          {allExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {grouped.map(([docName, items]) => {
          const isDocOpen = expandedDocs[docName] || false;
          return (
            <div key={docName} className="rounded-lg border border-stone-200/90 bg-[#fafbfa] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleDoc(docName)}
                className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left transition hover:bg-stone-50/60"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <BookOpen className="h-4 w-4 shrink-0 text-[#176B45]" />
                  <span className="truncate text-xs font-semibold text-stone-900" title={docName}>
                    {docName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                    {items.length} passage{items.length !== 1 ? 's' : ''}
                  </span>
                  {isDocOpen ? <ChevronUp className="h-3.5 w-3.5 text-stone-400" /> : <ChevronDown className="h-3.5 w-3.5 text-stone-400" />}
                </div>
              </button>

              {isDocOpen && (
                <div className="divide-y divide-stone-100 border-t border-stone-100 p-3 space-y-2.5 bg-[#fbfcfb]">
                  {items.map((ev) => (
                    <EvidenceCard key={ev.source_chunk_id} item={ev} compact />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Screening Summary (Collapsible submitted case parameters) ───────────────
function ScreeningSummary({ result }) {
  const [open, setOpen] = useState(false);
  const input = result.input_screening || {};
  const primaryFacts = [
    ['Ingredients', Array.isArray(input.ingredients) ? input.ingredients.join(', ') || 'Not provided' : input.ingredients],
    ['Source region', input.source_region],
    ['Biological origin', input.biological_origin],
    ['Category', input.category],
    ['Product / use', input.product_use],
    ['IP activity', input.ip_activity],
  ];
  const contextFacts = [
    ['Access / use context', input.access_use_context],
    ['Applicant / entity status', input.applicant_entity_status],
    ['Purpose', input.research_or_commercial_purpose],
    ['Traditional knowledge used', input.traditional_knowledge_used],
    ['Accessed from region', input.access_from_region],
    ['Procurement details', input.procurement_details],
    ['Existing permissions', input.existing_permissions],
  ];

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-stone-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
            Submitted case parameters
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B45] hover:underline">
          {open ? 'Hide parameters' : 'Review submitted facts'}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {open && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {primaryFacts.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
                <p className={cn('mt-0.5 text-xs font-medium', value === 'Not provided' ? 'text-stone-400' : 'text-stone-800')}>
                  {value || 'Not provided'}
                </p>
              </div>
            ))}
            {contextFacts.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
                <p className={cn('mt-0.5 text-xs font-medium', value === 'Not provided' ? 'text-stone-400' : 'text-stone-800')}>
                  {value || 'Not provided'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Ingredient Tag Input ───────────────────────────────────────────────────
function IngredientInput({ value, onChange }) {
  const [inputVal, setInputVal] = useState('');
  const tags = value ? value.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const addTag = (raw) => {
    const tag = raw.trim();
    if (!tag) return;
    const existing = tags.map((t) => t.toLowerCase());
    if (existing.includes(tag.toLowerCase())) return;
    const newVal = [...tags, tag].join(', ');
    onChange({ target: { name: 'ingredients', value: newVal, type: 'text' } });
    setInputVal('');
  };

  const removeTag = (index) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange({ target: { name: 'ingredients', value: newTags.join(', '), type: 'text' } });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    }
    if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-2">
        <Leaf className="h-4 w-4 text-[#176B45]" />
        <span className="text-sm font-semibold text-stone-900">Biological resources / ingredients</span>
        <span className="rounded bg-[#176B45]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#176B45]">Required</span>
      </div>
      <div className={cn(
        'flex min-h-[52px] flex-wrap items-start gap-2 rounded-xl border bg-white px-3.5 py-2.5 transition-all duration-200',
        'border-stone-300 focus-within:border-[#176B45] focus-within:ring-2 focus-within:ring-[#176B45]/10',
      )}>
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-800">
            <Leaf className="h-3 w-3 text-[#176B45]" />
            {tag}
            <button type="button" onClick={() => removeTag(i)} className="ml-0.5 rounded p-0.5 text-stone-400 hover:text-stone-700">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(inputVal)}
          placeholder={tags.length === 0 ? 'Type ingredient and press Enter (e.g. Ashwagandha)' : 'Add another...'}
          className="min-w-[140px] flex-1 bg-transparent py-1 text-xs text-stone-900 outline-none placeholder:text-stone-400"
        />
      </div>
      <p className="mt-1 text-[11px] text-stone-500">Press Enter or comma to add each ingredient. Click X to remove.</p>
    </div>
  );
}

// ─── Toggle Switch ──────────────────────────────────────────────────────────
function BiologicalToggle({ checked, onChange }) {
  return (
    <div
      className={cn(
        'group relative flex items-start gap-3.5 rounded-xl border p-4 transition-all cursor-pointer select-none',
        checked ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200 bg-stone-50/50 hover:border-stone-300',
      )}
      onClick={() => onChange({ target: { name: 'is_biological', type: 'checkbox', checked: !checked } })}
    >
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
        checked ? 'bg-[#176B45] text-white' : 'bg-stone-200 text-stone-500',
      )}>
        <Leaf className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-stone-900">Biological origin declared</span>
          <div className={cn(
            'relative h-5 w-9 rounded-full transition-colors',
            checked ? 'bg-[#176B45]' : 'bg-stone-300',
          )}>
            <div className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-all',
              checked ? 'left-4.5' : 'left-0.5',
            )} />
          </div>
        </div>
        <p className="mt-1 text-xs text-stone-500 leading-relaxed">
          {checked
            ? 'The submitted materials include biological resources. Screening will assess statutory ABS triggers.'
            : 'Uncheck only if the materials are purely synthetic. The screening will note this as a non-trigger.'}
        </p>
      </div>
    </div>
  );
}

// ─── Collapsible Form Section ───────────────────────────────────────────────
function CollapsibleSection({ icon: Icon, title, subtitle, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn(
      'rounded-xl border transition-colors overflow-hidden',
      open ? 'border-stone-300 bg-white shadow-2xs' : 'border-stone-200 bg-stone-50/40 hover:border-stone-300',
    )}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3.5 px-5 py-4 text-left">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
          open ? 'bg-[#176B45] text-white' : 'bg-stone-200 text-stone-600',
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-semibold', open ? 'text-[#176B45]' : 'text-stone-900')}>{title}</span>
            {badge && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-600">{badge}</span>}
          </div>
          <p className="mt-0.5 text-xs text-stone-500 truncate">{subtitle}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-stone-200 px-5 pb-5 pt-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

function FormProgress({ formData }) {
  const fields = [
    formData.ingredients,
    formData.source_region,
    formData.category,
    formData.product_use,
    formData.access_use_context,
    formData.applicant_entity_status,
    formData.research_or_commercial_purpose,
    formData.ip_activity,
  ];
  const filled = fields.filter((f) => f && f.trim()).length;
  const pct = Math.round((filled / fields.length) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full bg-[#176B45] transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-medium text-stone-500">{filled}/{fields.length} facts</span>
    </div>
  );
}

function PremiumField({ label, hint, name, value, onChange, placeholder, multiline = false, icon: Icon }) {
  const Component = multiline ? 'textarea' : 'input';
  return (
    <label className="group block">
      <div className="mb-1.5 flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-stone-400 transition-colors group-focus-within:text-[#176B45]" />}
        <span className="text-xs font-semibold text-stone-800">{label}</span>
      </div>
      {hint && <span className="mb-1.5 block text-[11px] text-stone-400">{hint}</span>}
      <Component
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={multiline ? 2 : undefined}
        className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-[#176B45] focus:ring-1 focus:ring-[#176B45]"
      />
    </label>
  );
}

function PremiumSelect({ label, name, value, onChange, icon: Icon }) {
  return (
    <label className="group block">
      <div className="mb-1.5 flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-stone-400 transition-colors group-focus-within:text-[#176B45]" />}
        <span className="text-xs font-semibold text-stone-800">{label}</span>
      </div>
      <select
        name={name}
        value={value === null ? '' : String(value)}
        onChange={onChange}
        className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 outline-none transition-all focus:border-[#176B45] focus:ring-1 focus:ring-[#176B45]"
      >
        <option value="">Not provided</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}

// ─── Overall Assessment Card (Subtle bordered panel, restrained colors) ────
function AssessmentCard({ result }) {
  const colorMap = {
    green: {
      bg: 'bg-emerald-50/40',
      border: 'border-emerald-200/90',
      dot: 'bg-emerald-600',
      text: 'text-emerald-950',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    yellow: {
      bg: 'bg-amber-50/30',
      border: 'border-amber-200/90',
      dot: 'bg-amber-500',
      text: 'text-amber-950',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    amber: {
      bg: 'bg-stone-50',
      border: 'border-stone-300/80',
      dot: 'bg-stone-500',
      text: 'text-stone-900',
      badge: 'bg-stone-100 text-stone-800 border-stone-200',
    },
  };
  const colors = colorMap[result.color] || colorMap.amber;

  return (
    <section className={cn('overflow-hidden rounded-xl border bg-white shadow-xs', colors.border)}>
      <div className={cn('border-b px-5 py-5 sm:px-6 sm:py-6', colors.border, colors.bg)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                ABS Assessment
              </span>
              <span className="text-stone-300">·</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Statutory screening
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2.5">
              <span className={cn('h-3 w-3 shrink-0 rounded-full', colors.dot)} />
              <h2 className={cn('text-xl font-bold tracking-tight sm:text-2xl', colors.text)}>
                {result.overall_status}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-stone-500">Confidence:</span>
            <span className={cn('rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider', colors.badge)}>
              {result.confidence}
            </span>
            {result.confidence_score > 0 && (
              <span className="text-xs font-semibold text-stone-700">
                ({Math.round(result.confidence_score * 100)}%)
              </span>
            )}
          </div>
        </div>

        <p className="mt-3.5 max-w-3xl text-xs sm:text-sm leading-relaxed text-stone-700">
          {result.reasoning}
        </p>

        {result.disclaimer && (
          <p className="mt-3 border-t border-stone-200/60 pt-2.5 text-[11px] leading-relaxed text-stone-500">
            {result.disclaimer}
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Main ABSPage Component ─────────────────────────────────────────────────
export default function ABSPage() {
  const [formData, setFormData] = useState({
    ingredients: '',
    source_region: '',
    is_biological: true,
    category: '',
    product_use: '',
    access_use_context: '',
    applicant_entity_status: '',
    research_or_commercial_purpose: '',
    traditional_knowledge_used: null,
    ip_activity: '',
    access_from_region: null,
    procurement_details: '',
    existing_permissions: '',
  });
  const [stage, setStage] = useState(0); // 0: Form, 1: Loading, 2: Result
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Ref for smooth scrolling to result header
  const resultRef = useRef(null);

  // Scroll smoothly to results on transition to stage 2
  useEffect(() => {
    if (stage === 2 && result && resultRef.current) {
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
  }, [stage, result]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((previous) => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (event) =>
    setFormData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value === '' ? null : event.target.value === 'true',
    }));

  const resetFlow = () => {
    setStage(0);
    setResult(null);
    setError(null);
  };

  const handleScreening = async (event) => {
    event.preventDefault();
    if (!formData.ingredients.trim()) {
      setError('Add at least one biological resource or ingredient to begin.');
      return;
    }
    setStage(1);
    setError(null);
    setResult(null);
    try {
      const payload = {
        ...formData,
        ingredients: formData.ingredients.split(',').map((item) => item.trim()).filter(Boolean),
        source_region: formData.source_region.trim() || null,
        category: formData.category.trim() || null,
        product_use: formData.product_use.trim() || null,
        access_use_context: formData.access_use_context.trim() || null,
        applicant_entity_status: formData.applicant_entity_status.trim() || null,
        research_or_commercial_purpose: formData.research_or_commercial_purpose.trim() || null,
        ip_activity: formData.ip_activity.trim() || null,
        procurement_details: formData.procurement_details.trim() || null,
        existing_permissions: formData.existing_permissions.trim() || null,
      };
      const response = await complianceApi.screenABS(payload);
      setResult(response);
      setStage(2);
    } catch (err) {
      console.error(err);
      setError('Failed to complete the ABS assessment. Please check that the backend is running and try again.');
      setStage(0);
    }
  };

  const obligations = useMemo(() => {
    const items = result?.obligations || [];
    return [...items].sort((a, b) => AREA_ORDER.indexOf(a.area) - AREA_ORDER.indexOf(b.area));
  }, [result]);

  return (
    <div className="abs-page min-h-screen bg-[#f8faf8] pb-20 font-sans text-stone-900">
      <Navbar />
      <main className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-12 pt-28 sm:px-6">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <header className="mb-8 max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-800">
            <Shield className="h-3.5 w-3.5" /> Access &amp; Benefit Sharing (ABS)
          </div>
          <h1 className="font-serif text-3xl text-stone-900 sm:text-4xl">ABS Statutory Screening</h1>
          <p className="mx-auto mt-2.5 max-w-xl text-xs sm:text-sm leading-relaxed text-stone-500">
            Assess biological resource access, statutory authorities (NBA / SBB), benefit-sharing triggers, and IPR requirements under the Biological Diversity Act.
          </p>
        </header>

        {/* ─── Step Indicator ─────────────────────────────────────────── */}
        <div className="mb-8 flex items-center">
          <div className={cn(
            'flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
            stage <= 1 ? 'border-[#176B45] bg-white text-[#176B45] shadow-2xs' : 'border-stone-200 text-stone-400',
          )}>
            <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold', stage <= 1 ? 'bg-[#176B45] text-white' : 'bg-stone-200 text-stone-500')}>1</span>
            <span>Case Facts</span>
          </div>
          <div className="flex items-center">
            <span className={cn('h-0.5 w-8 transition-colors', stage === 2 ? 'bg-[#176B45]' : 'bg-stone-200')} />
            <span className={cn('h-2 w-2 rotate-45 border-r border-t -ml-1 transition-colors', stage === 2 ? 'border-[#176B45]' : 'border-stone-200')} />
          </div>
          <div className={cn(
            'flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
            stage === 2 ? 'border-[#176B45] bg-white text-[#176B45] shadow-2xs' : 'border-stone-200 text-stone-400',
          )}>
            <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold', stage === 2 ? 'bg-[#176B45] text-white' : 'bg-stone-200 text-stone-500')}>2</span>
            <span>Obligation Assessment</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex w-full max-w-3xl items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* ─── FORM (Stage 0) ─────────────────────────────────────────── */}
        {stage === 0 && (
          <section className="w-full max-w-4xl">
            <form onSubmit={handleScreening} className="space-y-4">
              {/* Essential Information */}
              <div className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
                <div className="mb-5 flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#176B45] text-white">
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-stone-900">Essential Case Facts</h2>
                      <p className="text-[11px] text-stone-500">The biological materials and source region to be screened.</p>
                    </div>
                  </div>
                  <FormProgress formData={formData} />
                </div>
                <div className="space-y-4">
                  <IngredientInput value={formData.ingredients} onChange={handleChange} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PremiumField
                      label="Source region"
                      hint="Leave blank if unknown — will be flagged as an information gap."
                      name="source_region"
                      value={formData.source_region}
                      onChange={handleChange}
                      placeholder="e.g. India, Brazil, Kenya"
                      icon={Globe2}
                    />
                    <PremiumField
                      label="Category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      placeholder="e.g. herbal medicine, cosmetic, nutraceutical"
                      icon={Tag}
                    />
                  </div>
                  <BiologicalToggle checked={formData.is_biological} onChange={handleChange} />
                </div>
              </div>

              {/* Resource & Product Details */}
              <CollapsibleSection
                icon={FlaskConical}
                title="Resource &amp; Product Details"
                subtitle="Describe intended preparation and access form."
                badge="Optional"
              >
                <PremiumField label="Product / use information" name="product_use" value={formData.product_use} onChange={handleChange} placeholder="e.g. research extract, finished herbal formulation, dietary supplement" multiline icon={FlaskConical} />
                <PremiumField label="Access / use context" name="access_use_context" value={formData.access_use_context} onChange={handleChange} placeholder="How will the resource be accessed or used?" multiline icon={ScrollText} />
              </CollapsibleSection>

              {/* Applicant & Purpose */}
              <CollapsibleSection
                icon={Briefcase}
                title="Applicant &amp; Purpose"
                subtitle="Who is applying and what is the commercial status?"
                badge="Optional"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <PremiumField label="Applicant / entity status" name="applicant_entity_status" value={formData.applicant_entity_status} onChange={handleChange} placeholder="e.g. Indian company, foreign entity, individual researcher" icon={Briefcase} />
                  <PremiumField label="Purpose" name="research_or_commercial_purpose" value={formData.research_or_commercial_purpose} onChange={handleChange} placeholder="e.g. commercial utilization, non-commercial research" icon={FlaskConical} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <PremiumField label="Procurement details" name="procurement_details" value={formData.procurement_details} onChange={handleChange} placeholder="Source, local supplier, wild collection details" multiline icon={ScrollText} />
                  <PremiumField label="Existing permissions / agreements" name="existing_permissions" value={formData.existing_permissions} onChange={handleChange} placeholder="Any existing permits, MTAs, or prior intimation" multiline icon={FileText} />
                </div>
              </CollapsibleSection>

              {/* Legal & IP Context */}
              <CollapsibleSection
                icon={Scale}
                title="Legal &amp; IP Context"
                subtitle="Patent filing intentions and traditional knowledge."
                badge="Optional"
              >
                <PremiumField label="IP activity" name="ip_activity" value={formData.ip_activity} onChange={handleChange} placeholder="e.g. Patent application planned, patent filed IN12345, none" multiline icon={Scale} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <PremiumSelect label="Associated traditional knowledge used?" name="traditional_knowledge_used" value={formData.traditional_knowledge_used} onChange={handleSelectChange} icon={BookOpen} />
                  <PremiumSelect label="Accessed from the stated region?" name="access_from_region" value={formData.access_from_region} onChange={handleSelectChange} icon={Globe2} />
                </div>
              </CollapsibleSection>

              {/* Submit */}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#176B45] py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#125537] active:scale-[0.99]"
              >
                <Shield className="h-4 w-4" />
                Screen for ABS Considerations
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-center text-[11px] text-stone-400">
                Only the ingredients field is mandatory. Adding applicant and purpose facts refines the statutory pathway.
              </p>
            </form>
          </section>
        )}

        {/* ─── LOADING (Stage 1) ───────────────────────────────────────── */}
        {stage === 1 && (
          <section className="flex min-h-[340px] w-full max-w-3xl flex-col items-center justify-center rounded-xl border border-stone-200 bg-white p-8 text-center shadow-xs">
            <div className="relative mb-5">
              <div className="h-12 w-12 animate-spin rounded-full border-3 border-stone-100 border-t-[#176B45]" />
              <Shield className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-[#176B45]" />
            </div>
            <h2 className="font-serif text-xl text-stone-900">Screening biological-resource context…</h2>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-stone-500">
              Retrieving relevant ABS evidence and evaluating statutory pathways.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[11px] font-medium text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#176B45]" /> Verifying biological context
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#176B45] [animation-delay:0.3s]" /> Retrieving statutory evidence
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#176B45] [animation-delay:0.6s]" /> Evaluating applicability
              </span>
            </div>
          </section>
        )}

        {/* ─── RESULTS (Stage 2) ───────────────────────────────────────── */}
        {stage === 2 && result && (
          <div ref={resultRef} className="w-full max-w-6xl space-y-5 scroll-mt-24">
            {/* 1. RESULT HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Assessment Complete</p>
                <p className="text-xs text-stone-500">Screening based on submitted facts · Not formal legal advice</p>
              </div>
              <button
                type="button"
                onClick={resetFlow}
                className="rounded-lg border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-[#176B45] hover:text-[#176B45]"
              >
                Start new screening
              </button>
            </div>

            {/* 2. OVERALL ASSESSMENT */}
            <AssessmentCard result={result} />

            {/* 3. KEY FINDINGS / INFORMATION GAPS */}
            <div className="space-y-4">
              {/* Key Statutory Findings */}
              {result.key_findings && result.key_findings.length > 0 && (
                <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
                  <div className="mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-[#176B45]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                      Key Compliance &amp; Statutory Findings
                    </h3>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {result.key_findings.slice(0, 6).map((finding, index) => (
                      <div
                        key={`finding-${index}`}
                        className="flex items-start gap-2.5 rounded-lg border border-stone-200/70 bg-[#fafbfa] p-3 text-xs leading-relaxed text-stone-800"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#176B45]" />
                        <span>{finding}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Information Gaps: "To refine this assessment" */}
              {result.information_gaps && result.information_gaps.length > 0 && (
                <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-5 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-200/80 text-stone-700">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-stone-900">To refine this assessment</h3>
                      <p className="mt-0.5 text-xs text-stone-500">
                        The following facts are missing or unconfirmed. Providing them will help establish the exact statutory pathway:
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {result.information_gaps.map((gap, i) => (
                          <div
                            key={`gap-${i}`}
                            className="flex items-start gap-2 rounded-lg border border-stone-200/80 bg-white px-3 py-2 text-xs text-stone-800 shadow-2xs"
                          >
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            <span className="leading-snug">{gap}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Submitted Screening Criteria (Collapsible) */}
              <ScreeningSummary result={result} />
            </div>

            {/* 4. OBLIGATION NAVIGATOR HEADER */}
            <section className="pt-2">
              <div className="mb-4 flex flex-col justify-between gap-1.5 sm:flex-row sm:items-end">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#176B45]">
                    <Layers className="h-3.5 w-3.5" />
                    Obligation Navigator
                  </div>
                  <h2 className="mt-1 font-serif text-2xl text-stone-900">
                    Five areas, assessed separately
                  </h2>
                </div>
                <p className="text-xs text-stone-500 sm:max-w-md sm:text-right">
                  Each area is assessed independently using the supplied case facts and retrieved evidence.
                </p>
              </div>

              {/* 5. FIVE OBLIGATION CARDS */}
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {obligations.map((item, index) => (
                  <ObligationCard key={item.area} item={item} index={index} />
                ))}
              </div>
            </section>

            {/* 6. EVIDENCE SECTION */}
            {result.evidence && result.evidence.length > 0 ? (
              <GroupedEvidenceSection evidence={result.evidence} />
            ) : (
              <section className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#176B45]">Evidence / Sources</p>
                    <h3 className="mt-1 font-serif text-xl text-stone-900">Retrieved support for this assessment</h3>
                  </div>
                  <BookOpen className="h-5 w-5 text-stone-400" />
                </div>
                <div className="mt-4 rounded-lg border border-dashed border-stone-200 bg-stone-50 p-4 text-xs leading-relaxed text-stone-500">
                  No supporting ABS statutory evidence was retrieved. The system deliberately refrains from fabricating statutory citations or applicability.
                </div>
              </section>
            )}

            {/* Footer */}
            <div className="flex flex-col items-center gap-3 border-t border-stone-200 pt-6 text-center">
              <p className="max-w-2xl text-[11px] leading-relaxed text-stone-500">
                This screening is preliminary information derived from retrieved regulatory materials and does not constitute formal legal counsel. Confirm with competent authorities (NBA / SBB) prior to commercial utilization or patent grant.
              </p>
              <button
                type="button"
                onClick={resetFlow}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-[#176B45] hover:text-[#176B45]"
              >
                Run another screening <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
