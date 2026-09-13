import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { BookOpen, Scale, FileText, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
export default function EvidenceBlock({
  source = 'Ayurvedic Pharmacopoeia of India (API)',
  document = 'Classical & Statutory Legal Corpus',
  section = '',
  jurisdiction = 'India',
  status = 'Indexed',
  strength = 'Moderate',
  excerpt = '',
  whyThisResult = null,
  onOpenWhy = null,
  className = ''
}) {
  const {
    t
  } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const getStrengthColor = s => {
    const lower = String(s).toLowerCase();
    if (lower === 'strong' || lower === 'high') return 'bg-[#176B45]/10 text-[#176B45] border-[#176B45]/20';
    if (lower === 'moderate' || lower === 'medium') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-[#161412]/5 text-[#161412]/70 border-[#161412]/10';
  };
  return <div className={cn("bg-white border border-[#161412]/15 rounded-xl p-4 sm:p-5 shadow-xs transition-all hover:border-[#176B45]/40", className)}>
      {/* Top Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C6D46]">
          <BookOpen className="w-3.5 h-3.5 text-[#8C6D46]" />
          <span>{t("evidenceblock.eVIDENCESOURCE", "EVIDENCE SOURCE")}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold border", getStrengthColor(strength))}>
            {strength}{t("evidenceblock.strength", "Strength")}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#161412]/5 text-[#161412]/60 border border-[#161412]/10">
            {jurisdiction}
          </span>
        </div>
      </div>

      {/* Main Document & Section */}
      <div className="mb-2">
        <h4 className="font-serif text-sm sm:text-base font-semibold text-[#161412] leading-snug">
          {source}
        </h4>
        <p className="text-xs text-[#161412]/70 font-mono mt-0.5 truncate" title={document}>
          {document} {section ? `· ${section}` : ''}
        </p>
      </div>

      {/* Excerpt if present */}
      {excerpt && <div className="mt-2.5 p-2.5 bg-[#FAF8F3] border border-[#161412]/10 rounded-lg text-xs text-[#161412]/80 leading-relaxed font-serif italic">
          &ldquo;{excerpt}&rdquo;
        </div>}

      {/* Bottom Actions */}
      <div className="mt-3.5 pt-3 border-t border-[#161412]/10 flex items-center justify-between gap-2 text-xs">
        <span className="text-[10px] font-mono text-[#161412]/50">{t("evidenceblock.status", "Status:")}{status}
        </span>

        {whyThisResult && onOpenWhy && <button type="button" onClick={() => onOpenWhy(whyThisResult)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#176B45] hover:text-[#125537] transition-colors cursor-pointer">
            <Info className="w-3.5 h-3.5" />
            <span>{t("evidenceblock.whythisresult", "Why this result?")}</span>
          </button>}
      </div>
    </div>;
}