import { useState } from 'react';
import { BookOpen, Check, Copy, ChevronDown, ChevronUp, Scale, ShieldCheck, FileText, ExternalLink, Globe } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export default function ChatSourceCard({
  source = {},
  isDarkMode = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Normalize source details
  const docName = source.source_document || source.source || source.law_name || source.document || "Statutory / Classical Authority";
  const section = source.section || source.rule || "";
  const excerpt = source.excerpt || source.chunk_text || source.text || "";
  const claimText = source.claim || "";
  const jurisdiction = source.jurisdiction || "India";
  const relevance = source.relevance || "Retrieved as supporting evidence for the assessment.";
  const similarity = source.semantic_similarity;
  const isVerified = source.verified !== false;
  const pubNumber = source.publication_number || "";
  const date = source.date || "";
  // Multilingual provenance — citation source names/sections are NEVER translated
  const originalLanguageNote = source.original_language_note || "";
  const originalLanguageName = source.original_language_name || "";
  
  // Evidence type detection
  const evType = source.evidence_type || source.type || (
    docName.toLowerCase().includes('patent') || pubNumber ? 'prior_art' :
    docName.toLowerCase().includes('samhita') || docName.toLowerCase().includes('nighantu') || docName.toLowerCase().includes('pharmacopoeia') || docName.toLowerCase().includes('api-') || docName.toLowerCase().includes('afi-') ? 'traditional_knowledge' :
    docName.toLowerCase().includes('abs') || docName.toLowerCase().includes('biodiversity') ? 'abs' :
    docName.toLowerCase().includes('fssai') || docName.toLowerCase().includes('cdsco') || docName.toLowerCase().includes('licen') ? 'regulatory' :
    'statutory'
  );

  const handleCopy = () => {
    const textToCopy = `${docName}${section ? ` (${section})` : ''}: "${excerpt || claimText}"`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBadge = () => {
    switch (evType) {
      case 'prior_art':
        return (
          <span className={cn(
            "px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider",
            isDarkMode ? "bg-blue-950/50 text-blue-400 border border-blue-800/40" : "bg-blue-50 text-blue-700 border border-blue-200"
          )}>
            Patent / Prior-Art Review
          </span>
        );
      case 'traditional_knowledge':
        return (
          <span className={cn(
            "px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider",
            isDarkMode ? "bg-[#8C6D46]/20 text-[#D4AF37] border border-[#8C6D46]/30" : "bg-[#8C6D46]/10 text-[#8C6D46] border border-[#8C6D46]/20"
          )}>
            Traditional Knowledge (TK)
          </span>
        );
      case 'abs':
        return (
          <span className={cn(
            "px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider",
            isDarkMode ? "bg-teal-950/50 text-teal-300 border border-teal-800/40" : "bg-teal-50 text-teal-700 border border-teal-200"
          )}>
            ABS / Biodiversity Law
          </span>
        );
      case 'regulatory':
        return (
          <span className={cn(
            "px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider",
            isDarkMode ? "bg-purple-950/50 text-purple-300 border border-purple-800/40" : "bg-purple-50 text-purple-700 border border-purple-200"
          )}>
            Regulatory Requirement
          </span>
        );
      default:
        return (
          <span className={cn(
            "px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider",
            isDarkMode ? "bg-[#176B45]/30 text-[#4ADE80] border border-[#176B45]/40" : "bg-[#176B45]/10 text-[#176B45] border border-[#176B45]/20"
          )}>
            Statutory Law
          </span>
        );
    }
  };

  return (
    <div className={cn(
      "border rounded-xl p-3.5 sm:p-4 text-xs transition-all duration-200 shadow-2xs",
      isDarkMode 
        ? "bg-[#16231D] border-[#253A2F] text-gray-200" 
        : "bg-[#FAF8F3] border-[#161412]/15 text-[#161412]"
    )}>
      {/* Header Info */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {getBadge()}

          {isVerified && (
            <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Evidence</span>
            </span>
          )}

          {typeof similarity === 'number' && similarity > 0 && (
            <span className="font-mono text-[10px] opacity-60">
              Relevance: {(similarity * 100).toFixed(0)}%
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "p-1 px-1.5 rounded transition-colors flex items-center gap-1 text-[10.5px] font-mono cursor-pointer",
            isDarkMode ? "hover:bg-white/10 text-gray-300" : "hover:bg-black/5 text-[#161412]/70"
          )}
          title="Copy Citation"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Copied" : "Cite"}</span>
        </button>
      </div>

      {/* Document Name */}
      <div className="mt-2 font-medium font-serif text-[14px] leading-snug">
        {docName}
      </div>

      {/* Publication Number / Section info / Date / Original Language note */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] font-mono opacity-80">
        {pubNumber && (
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            Doc #: {pubNumber}
          </span>
        )}
        {section && (
          <span className="font-semibold text-[#176B45] dark:text-[#4ADE80]">
            {section.startsWith('Section') || section.startsWith('Rule') || section.startsWith('Vol') ? section : `Provision: ${section}`}
          </span>
        )}
        {jurisdiction && (
          <span>Jurisdiction: {jurisdiction}</span>
        )}
        {date && (
          <span>Date: {date}</span>
        )}
        {/* Original language note — shown when chunk was NOT originally in English.
            Source document names and section references are never translated. */}
        {originalLanguageNote && (
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border",
            isDarkMode
              ? "bg-amber-950/40 text-amber-300 border-amber-800/40"
              : "bg-amber-50 text-amber-700 border-amber-200"
          )}>
            <Globe className="w-2.5 h-2.5" />
            {originalLanguageNote}
          </span>
        )}
      </div>

      {/* Claim summary from assessment */}
      {claimText && (
        <div className={cn(
          "mt-2 text-[12.5px] leading-relaxed font-medium p-2 rounded-lg border",
          isDarkMode ? "bg-[#1A2D23] border-[#2A4435] text-emerald-200" : "bg-[#176B45]/[0.05] border-[#176B45]/15 text-[#176B45]"
        )}>
          <span className="font-semibold opacity-75 text-[10px] font-mono uppercase tracking-wide block mb-0.5">Finding:</span>
          {claimText}
        </div>
      )}

      {/* Excerpt Section with View Evidence Button */}
      {excerpt && (
        <div className="mt-2.5">
          <div className={cn(
            "leading-relaxed text-xs border-l-2 pl-3 py-1 font-serif",
            isDarkMode ? "border-[#176B45] text-gray-300" : "border-[#176B45] text-[#161412]/85",
            !isExpanded && "line-clamp-2"
          )}>
            "{excerpt}"
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border",
                isDarkMode 
                  ? "bg-[#1A2922] border-[#2A3F34] text-[#4ADE80] hover:bg-[#253A2F]" 
                  : "bg-white border-[#161412]/15 text-[#176B45] hover:bg-[#F0EDE3]"
              )}
            >
              {isExpanded ? (
                <>Hide Full Evidence <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>View Full Evidence <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          </div>
        </div>
      )}

      {relevance && (
        <div className="mt-2.5 pt-2 border-t border-inherit/30 text-[11px] leading-relaxed opacity-80">
          <span className="font-semibold">Relevance:</span> {relevance}
        </div>
      )}
    </div>
  );
}
