import { ShieldCheck, CheckCircle2, AlertTriangle, FileText, Scale } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import EvidenceBlock from './EvidenceBlock';

export default function RegulatorySection({
  classification = 'Proprietary Ayurvedic Medicine',
  pathway = 'Drugs & Cosmetics Act (Rule 158-B / Form 25-D)',
  requirements = [
    'Manufacturing under licensed AYUSH GMP facility (Schedule T)',
    'Substantiation of ingredients with classical textual citations or safety data',
    'Heavy metals (Lead, Arsenic, Cadmium, Mercury) test reports within pharmacopoeial limits',
    'Batch release testing and stability assessment data'
  ],
  claimsConsideration = 'Permissible traditional indications allowed under AYUSH licensure. Avoid allopathic disease prevention or cure claims.',
  openIssues = [
    'Stability study dossier pending completion for extended shelf life claims',
    'Batch analysis report required from NABL-accredited laboratory'
  ],
  jurisdiction = 'India',
  evidence = {
    source: 'Ministry of AYUSH / Drugs & Cosmetics Act, 1940',
    document: 'Drugs and Cosmetics Rules, 1945 — Schedule T & Rule 158-B',
    section: 'Part XVI: Licensing of Ayurvedic Drugs',
    jurisdiction: 'India',
    status: 'Statutory Requirement',
    strength: 'Strong',
    excerpt: 'Proprietary Ayurvedic medicines require proof of safety and classical bibliographic references for ingredients specified in the First Schedule.',
  },
  onOpenWhy = null,
  className = '',
}) {
  return (
    <section id="section-regulatory" className={cn("bg-white border border-[#161412]/15 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#161412]/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#176B45]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#176B45]">
              REGULATORY INTELLIGENCE
            </h3>
          </div>
          <p className="text-xs text-[#161412]/60 mt-0.5">
            Licensing pathways, domestic statutory compliance, and labelling parameters
          </p>
        </div>
        <span className="text-[10px] font-mono text-[#8C6D46] uppercase tracking-wider font-semibold">
          Section 02
        </span>
      </div>

      {/* Grid: Pathway & Classification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="bg-[#FAF8F3] border border-[#161412]/10 rounded-xl p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] block mb-1">
            Statutory Classification
          </span>
          <span className="font-serif text-base font-bold text-[#161412] block">
            {classification}
          </span>
          <span className="text-[11px] text-[#161412]/60 block mt-1">
            Jurisdiction: {jurisdiction}
          </span>
        </div>

        <div className="bg-[#FAF8F3] border border-[#161412]/10 rounded-xl p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#176B45] block mb-1">
            Primary Regulatory Pathway
          </span>
          <span className="font-serif text-base font-bold text-[#176B45] block">
            {pathway}
          </span>
          <span className="text-[11px] text-[#161412]/60 block mt-1">
            Governing Authority: State AYUSH Licensing Authority / CDSCO
          </span>
        </div>
      </div>

      {/* Key Requirements Checklist */}
      <div>
        <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#161412]/80 mb-3">
          Applicable Statutory Requirements
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {requirements.map((req, idx) => (
            <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FAF8F3]/70 border border-[#161412]/10 text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#176B45] shrink-0 mt-0.5" />
              <span className="text-[#161412]/90 leading-relaxed">{req}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Claims Considerations & Open Issues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="p-4 rounded-xl border border-[#8C6D46]/25 bg-[#8C6D46]/5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C6D46] block mb-1">
            Health Claims Consideration
          </span>
          <p className="text-[#161412] leading-relaxed">
            {claimsConsideration}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 block mb-1">
            Open Regulatory Review Items
          </span>
          <ul className="space-y-1 text-amber-950">
            {openIssues.map((issue, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="font-bold text-amber-700">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Traceable Evidence */}
      <div>
        <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8C6D46] mb-2.5">
          Statutory Evidence
        </h4>
        <EvidenceBlock
          source={evidence.source}
          document={evidence.document}
          section={evidence.section}
          jurisdiction={evidence.jurisdiction}
          status={evidence.status}
          strength={evidence.strength}
          excerpt={evidence.excerpt}
          whyThisResult={{
            title: 'Regulatory Pathway Traceability',
            signal: `Product categorized as '${classification}' with traditional biological ingredients.`,
            evidence: evidence.document,
            interpretation: 'Under Rule 158-B of the Drugs and Cosmetics Rules, Ayurvedic proprietary medicines require documented safety literature or classical compendia citations.',
            result: `Subject to ${pathway} requirements.`,
            jurisdiction: jurisdiction,
          }}
          onOpenWhy={onOpenWhy}
        />
      </div>
    </section>
  );
}
