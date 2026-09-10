import { ShieldCheck, Scale, Globe, Leaf, ArrowDownRight, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export default function IntelligenceOverview({
  regulatoryStatus = 'Needs Review',
  regulatorySummary = 'Product classification requires further regulatory assessment under the Drugs & Cosmetics Act.',
  ipStatus = 'Further Review Recommended',
  ipSummary = 'Traditional knowledge overlap identified; comparative synergistic efficacy data required under Section 3(p).',
  tkStatus = 'Prior-Art Overlap Identified',
  tkSummary = 'Classical Ayurvedic literature documents botanical constituents and Rasayana indications.',
  internationalStatus = 'Documentation Required',
  internationalSummary = 'Destination compliance dossier required for target export market (US FDA 21 CFR 111).',
  onScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  },
  className = '',
}) {
  const cards = [
    {
      id: 'section-regulatory',
      title: 'REGULATORY',
      icon: ShieldCheck,
      status: regulatoryStatus,
      summary: regulatorySummary,
      color: 'text-[#176B45]',
      border: 'border-[#176B45]/25',
      badgeBg: 'bg-[#176B45]/10 text-[#176B45]',
    },
    {
      id: 'section-ip',
      title: 'IP & NOVELTY',
      icon: Scale,
      status: ipStatus,
      summary: ipSummary,
      color: 'text-[#8C6D46]',
      border: 'border-[#8C6D46]/25',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    {
      id: 'section-biodiversity',
      title: 'BIODIVERSITY & TK',
      icon: Leaf,
      status: tkStatus,
      summary: tkSummary,
      color: 'text-emerald-700',
      border: 'border-emerald-700/25',
      badgeBg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    },
    {
      id: 'section-international',
      title: 'INTERNATIONAL',
      icon: Globe,
      status: internationalStatus,
      summary: internationalSummary,
      color: 'text-[#176B45]',
      border: 'border-[#176B45]/25',
      badgeBg: 'bg-[#176B45]/10 text-[#176B45]',
    },
  ];

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#8C6D46]">
          INTELLIGENCE OVERVIEW
        </h3>
        <span className="text-[10px] font-mono text-[#161412]/40">
          4 Living Domains
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              className="bg-white border border-[#161412]/15 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#176B45]/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#161412]/80">
                    <Icon className={cn("w-4 h-4", c.color)} />
                    <span>{c.title}</span>
                  </div>
                </div>

                <div className="mb-2">
                  <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border mb-2", c.badgeBg)}>
                    {c.status}
                  </span>
                  <p className="text-xs text-[#161412]/80 leading-relaxed line-clamp-3">
                    {c.summary}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#161412]/10 mt-3">
                <button
                  type="button"
                  onClick={() => onScrollTo(c.id)}
                  className="w-full inline-flex items-center justify-between text-[11px] font-semibold text-[#176B45] group-hover:text-[#125537] transition-colors cursor-pointer"
                >
                  <span>View Intelligence</span>
                  <ArrowDownRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
