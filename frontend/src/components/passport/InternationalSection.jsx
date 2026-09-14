import { useTranslation } from "react-i18next";
import { Globe, CheckCircle2, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import EvidenceBlock from './EvidenceBlock';
import { translatePassportData, translatePassportStatus } from '../../lib/passportI18n';

export default function InternationalSection({
  origin = 'India',
  targetCountry = 'United States',
  status = 'Documentation Required for US FDA Route',
  summary = 'Export to the United States operates under the Dietary Supplement Health and Education Act (DSHEA 1994). Products are classified as Dietary Supplements and must comply with 21 CFR Part 111 cGMP regulations.',
  requirements = ['US FDA Food & Dietary Supplement Facility Registration (21 CFR Part 1)', 'Manufacturing under 21 CFR Part 111 (Dietary Supplement cGMP)', 'Structure/Function claim substantiation dossier with mandatory FDA disclaimer', 'USP <2232> heavy metals compliance (Lead < 0.5 mcg/day, Arsenic, Cadmium, Mercury)', 'Pre-market New Dietary Ingredient (NDI) notification if botanical was not marketed in US pre-1994'],
  missingInfo = ['Quality certifications (WHO-GMP, ISO 22000, AYUSH Premium Mark)', 'Botanical taxonomical verification (voucher specimen number)', 'Heavy metal and microbial laboratory test reports'],
  evidence = {
    source: 'United States Food and Drug Administration (US FDA)',
    document: '21 CFR Part 111 — Current Good Manufacturing Practice in Manufacturing, Packaging, Labeling, or Holding Operations for Dietary Supplements',
    section: 'Subpart E: Requirement for a Quality Control Operation',
    jurisdiction: 'United States',
    status: 'Federal Regulation',
    strength: 'Strong',
    excerpt: 'Dietary supplement manufacturers must establish specifications for identity, purity, strength, and composition, and limits on those types of contamination that may adulterate the product.'
  },
  onOpenWhy = null,
  className = ''
}) {
  const { t } = useTranslation();

  return (
    <section id="section-international" className={cn("bg-white border border-[#161412]/15 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#161412]/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#176B45]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#176B45]">{t("internationalsection.iNTERNATIONALMARKETREADINESS", "INTERNATIONAL MARKET READINESS")}</h3>
          </div>
          <p className="text-xs text-[#161412]/60 mt-0.5">{t("internationalsection.crossborderregulatoryalignmentexport", "Cross-border regulatory alignment, export quality thresholds, and destination compliance")}</p>
        </div>
        <span className="text-[10px] font-mono text-[#8C6D46] uppercase tracking-wider font-semibold">{t("productPassport.ui.section05", "Section 05")}</span>
      </div>

      {/* Corridor Banner */}
      <div className="bg-[#FAF8F3] border border-[#161412]/15 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] font-bold block mb-1">{t("internationalsection.tRADECORRIDOR", "TRADE CORRIDOR")}</span>
          <div className="font-serif text-lg sm:text-xl font-bold text-[#161412] flex items-center gap-2">
            <span>{origin}</span>
            <span className="text-[#176B45]">→</span>
            <span className="text-[#176B45]">{targetCountry}</span>
          </div>
        </div>

        <div className="sm:text-right">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#161412]/50 block mb-1">{t("internationalsection.destinationStatus", "Destination Status")}</span>
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded font-mono text-[11px] font-bold uppercase tracking-wider">
            {translatePassportStatus(status, t)}
          </span>
        </div>
      </div>

      {/* Summary Narrative */}
      <p className="text-xs sm:text-sm text-[#161412]/80 leading-relaxed">
        {translatePassportData(summary, t)}
      </p>

      {/* Requirements Checklist */}
      <div>
        <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#161412]/80 mb-3">
          {t("internationalsection.destinationMarketRequirements", "Destination Market Requirements (")}{targetCountry})
        </h4>
        <div className="space-y-2">
          {requirements.map((req, idx) => (
            <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FAF8F3]/80 border border-[#161412]/10 text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#176B45] shrink-0 mt-0.5" />
              <span className="text-[#161412]/90 leading-relaxed font-medium">{translatePassportData(req, t)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Missing Information Items */}
      {missingInfo && missingInfo.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-xs">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 block mb-1.5">{t("internationalsection.dossierGapsMissingDocumentation", "Dossier Gaps / Missing Documentation for Clearance:")}</span>
          <ul className="space-y-1 text-amber-950">
            {missingInfo.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-700 font-bold">!</span>
                <span>{translatePassportData(item, t)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Traceable International Evidence */}
      <div>
        <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8C6D46] mb-2.5">{t("internationalsection.destinationRegulatorySource", "Destination Regulatory Source")}</h4>
        <EvidenceBlock
          source={evidence.source}
          document={evidence.document}
          section={evidence.section}
          jurisdiction={evidence.jurisdiction}
          status={evidence.status}
          strength={evidence.strength}
          excerpt={evidence.excerpt}
          whyThisResult={{
            title: 'International Export Pathway Traceability',
            signal: `Product export intended for '${targetCountry}' market.`,
            evidence: evidence.document,
            interpretation: 'Under destination regulations, botanical formulations must adhere to mandatory facility registration, contaminant testing, and non-disease structure/function claim language.',
            result: status,
            jurisdiction: targetCountry
          }}
          onOpenWhy={onOpenWhy}
        />
      </div>
    </section>
  );
}