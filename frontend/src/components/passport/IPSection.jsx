import { useTranslation } from "react-i18next";
import { Scale, AlertCircle, ShieldAlert, CheckCircle2, FileText, Info } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import EvidenceBlock from './EvidenceBlock';
export default function IPSection({
  posture = 'Potential Section 3(p) & 3(d) Overlap — Further Review Recommended',
  confidence = 'Moderate',
  reasoning = 'Under Section 3(p) of the Indian Patents Act, 1970, formulations derived from known Ayurvedic properties face inherent novelty objections. Demonstrating non-obvious synergistic therapeutic efficacy under Section 3(d) is required with comparative experimental data.',
  risks = ['Section 3(p) statutory objection regarding aggregation of known traditional Ayurvedic properties', 'Section 3(d) requirement to demonstrate enhanced therapeutic efficacy over standard extracts', 'Mandatory prior approval from National Biodiversity Authority (NBA) under Section 6 of Biological Diversity Act 2002 before patent grant'],
  trademarkConsiderations = 'Verify that the brand name does not infringe existing classical Ayurvedic generic terms (e.g. Churna, Kwath, Taila) or registered pharmaceutical trademarks under Class 5.',
  evidence = {
    source: 'Indian Patent Office / Patents Act, 1970',
    document: 'Guidelines for Processing of Patent Applications Relating to Traditional Knowledge and Biological Material',
    section: 'Section 3(p) & Section 3(d)',
    jurisdiction: 'India',
    status: 'Statutory Exclusion Guideline',
    strength: 'Strong',
    excerpt: 'An invention which in effect is traditional knowledge or which is an aggregation or duplication of known properties of traditionally known component or components is not an invention within the meaning of this Act.'
  },
  onOpenWhy = null,
  className = ''
}) {
  const {
    t
  } = useTranslation();
  return <section id="section-ip" className={cn("bg-white border border-[#161412]/15 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#161412]/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#8C6D46]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#8C6D46]">{t("ipsection.iNTELLECTUALPROPERTYNOVELTY", "INTELLECTUAL PROPERTY & NOVELTY")}</h3>
          </div>
          <p className="text-xs text-[#161412]/60 mt-0.5">{t("ipsection.indianpatentlawsignals", "Indian patent law signals, Section 3(p)/3(d) criteria, prior-art relevance, and trademark bounds")}</p>
        </div>
        <span className="text-[10px] font-mono text-[#8C6D46] uppercase tracking-wider font-semibold">{t("ipsection.section03", "Section 03")}</span>
      </div>

      {/* Primary Patentability Posture Banner */}
      <div className="bg-[#FAF6EC] border border-[#d8cbb7] rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C6D46]">{t("ipsection.pATENTABILITYSIGNAL", "PATENTABILITY SIGNAL")}</span>
          <span className="px-2.5 py-0.5 rounded font-mono text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">{t("ipsection.confidence", "Confidence:")}{confidence}
          </span>
        </div>

        <h4 className="font-serif text-base sm:text-lg font-bold text-[#161412] leading-snug mb-2">
          {posture}
        </h4>

        <p className="text-xs sm:text-sm text-[#161412]/80 leading-relaxed">
          {reasoning}
        </p>
      </div>

      {/* Potential IP Risks */}
      <div>
        <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#161412]/80 mb-3">{t("ipsection.identifiedPatentabilityRegulatoryRisks", "Identified Patentability & Regulatory Risks")}</h4>
        <div className="space-y-2">
          {risks.map((risk, idx) => <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span className="text-[#161412]/90 leading-relaxed font-medium">{risk}</span>
            </div>)}
        </div>
      </div>

      {/* Trademark Considerations */}
      <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#161412]/10 text-xs">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C6D46] block mb-1">{t("ipsection.trademarkClass5Branding", "Trademark & Class 5 Branding Bounds")}</span>
        <p className="text-[#161412]/80 leading-relaxed">
          {trademarkConsiderations}
        </p>
      </div>

      {/* Traceable Legal Evidence */}
      <div>
        <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8C6D46] mb-2.5">{t("ipsection.legalBasisPriorArtEvidence", "Legal Basis & Prior-Art Evidence")}</h4>
        <EvidenceBlock source={evidence.source} document={evidence.document} section={evidence.section} jurisdiction={evidence.jurisdiction} status={evidence.status} strength={evidence.strength} excerpt={evidence.excerpt} whyThisResult={{
        title: 'Patentability Signal Traceability',
        signal: 'Formulation ingredients documented in traditional Ayurvedic knowledge.',
        evidence: 'Patents Act, 1970 — Section 3(p) Guidelines',
        interpretation: 'Under Section 3(p), traditional knowledge is excluded from patentability unless non-obvious synergistic therapeutic efficacy is established under Section 3(d).',
        result: posture,
        jurisdiction: 'India'
      }} onOpenWhy={onOpenWhy} />
      </div>
    </section>;
}