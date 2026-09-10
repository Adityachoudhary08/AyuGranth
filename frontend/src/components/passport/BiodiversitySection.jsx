import { Leaf, BookOpen, ShieldAlert, CheckCircle2, FileText, Info } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import EvidenceBlock from './EvidenceBlock';

export default function BiodiversitySection({
  isBiological = true,
  absApplicable = true,
  absSummary = 'Product utilizes biological resources originating from India. Entities accessing Indian bio-resources for commercial utilization or patenting must comply with Section 3, 4, and 6 of the Biological Diversity Act, 2002.',
  absObligations = [
    'Obtain prior approval from National Biodiversity Authority (NBA) via Form I for commercial utilization',
    'Mandatory disclosure of biological resource geographical origin in patent filings (Section 6)',
    'Ensure Prior Informed Consent (PIC) and fair and equitable benefit-sharing compliance'
  ],
  tkOverlapStatus = 'Potential Prior-Art Overlap Identified',
  tkSummary = 'Botanical active ingredients have documented classical therapeutic indications in foundational Ayurvedic treatises.',
  classicalReferences = [
    'Charaka Samhita — Chikitsa Sthana (Rasayana Vidhi)',
    'Ayurvedic Pharmacopoeia of India (API) Monograph Index',
    'Traditional Knowledge Digital Library (TKDL) Prior-Art Database'
  ],
  evidence = {
    source: 'National Biodiversity Authority / Biological Diversity Act, 2002',
    document: 'Biological Diversity Act, 2002 & Biological Diversity (Amendment) Act, 2023',
    section: 'Section 3, Section 4 & Section 6',
    jurisdiction: 'India',
    status: 'Statutory Obligation',
    strength: 'Strong',
    excerpt: 'No person shall apply for any intellectual property right, by whatever name called, in or outside India for any invention based on any research or information on a biological resource obtained from India without obtaining the previous approval of the National Biodiversity Authority.',
  },
  onOpenWhy = null,
  className = '',
}) {
  return (
    <section id="section-biodiversity" className={cn("bg-white border border-[#161412]/15 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#161412]/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-emerald-800">
              BIODIVERSITY &amp; TRADITIONAL KNOWLEDGE
            </h3>
          </div>
          <p className="text-xs text-[#161412]/60 mt-0.5">
            Biological Diversity Act compliance, ABS benefit-sharing clearance, and classical corpus overlap
          </p>
        </div>
        <span className="text-[10px] font-mono text-[#8C6D46] uppercase tracking-wider font-semibold">
          Section 04
        </span>
      </div>

      {/* Grid: ABS & Traditional Knowledge Overlap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* ABS Compliance */}
        <div className="bg-[#FAF8F3] border border-[#161412]/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C6D46]">
              ABS / Biological Diversity Clearance
            </span>
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border",
              absApplicable ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-green-100 text-green-900 border-green-300")}>
              {absApplicable ? 'ABS Obligations Apply' : 'Screening Not Triggered'}
            </span>
          </div>

          <p className="text-[#161412]/85 leading-relaxed">
            {absSummary}
          </p>

          {absObligations.length > 0 && (
            <div className="border-t border-[#161412]/10 pt-2.5 space-y-1.5">
              <span className="text-[9.5px] font-mono uppercase tracking-wider text-[#161412]/50 font-semibold block">
                Statutory Obligations:
              </span>
              {absObligations.map((ob, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span className="text-[#161412]/90 leading-snug">{ob}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Traditional Knowledge Corpus */}
        <div className="bg-[#FAF8F3] border border-[#161412]/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#176B45]">
              Traditional Knowledge Overlap
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#176B45]/10 text-[#176B45] border border-[#176B45]/20">
              {tkOverlapStatus}
            </span>
          </div>

          <p className="text-[#161412]/85 leading-relaxed">
            {tkSummary}
          </p>

          <div className="border-t border-[#161412]/10 pt-2.5">
            <span className="text-[9.5px] font-mono uppercase tracking-wider text-[#161412]/50 font-semibold block mb-1.5">
              Indexed Canonical Treatise:
            </span>
            <ul className="space-y-1 text-[#161412]/90 font-serif">
              {classicalReferences.map((ref, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-[#8C6D46] shrink-0" />
                  <span>{ref}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Traceable Biodiversity Evidence */}
      <div>
        <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8C6D46] mb-2.5">
          Biological Diversity Act Evidence
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
            title: 'Biodiversity & ABS Traceability',
            signal: 'Product formulation utilizes biological resources originating from Indian jurisdiction.',
            evidence: 'Biological Diversity Act, 2002 — Section 6',
            interpretation: 'Requires mandatory prior approval of the National Biodiversity Authority (NBA) before filing or commercial grant of IPR.',
            result: 'ABS statutory clearance and origin disclosure required.',
            jurisdiction: 'India',
          }}
          onOpenWhy={onOpenWhy}
        />
      </div>
    </section>
  );
}
