import { useState } from 'react';
import { CheckCircle2, AlertTriangle, FileText, ChevronDown, ChevronUp, ShieldCheck, Lock } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export default function PatentReadinessCard({
  analysis = {},
  isDarkMode = false,
}) {
  const [showPreview, setShowPreview] = useState(false);

  const docType = analysis.document_type_detected || "Patent Application Draft";
  const score = analysis.readiness_score || "0/6";
  const present = analysis.present || [];
  const missing = analysis.missing || [];
  const preview = analysis.extracted_text_preview || "";
  const llmMode = analysis.llm_mode_used || "local";
  const privacyWarning = analysis.privacy_warning;

  return (
    <div className={cn(
      "border rounded-2xl p-4 sm:p-5 transition-all space-y-4",
      isDarkMode 
        ? "bg-[#1E2824] border-[#2E3D36] text-gray-100" 
        : "bg-[#FAF8F3] border-[#161412]/15 text-[#161412]"
    )}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-inherit/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#176B45] text-white flex items-center justify-center font-bold text-sm">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10.5px] uppercase font-bold tracking-widest text-[#176B45]">
                PATENT READINESS CHECK
              </span>
              <span className={cn(
                "px-2 py-0.2 rounded text-[10px] font-mono",
                isDarkMode ? "bg-white/10 text-gray-300" : "bg-[#161412]/5 text-[#161412]/70"
              )}>
                {llmMode === 'local' ? '🔒 Local NER' : 'Cloud Analyzed'}
              </span>
            </div>
            <h3 className="font-serif font-bold text-base leading-tight mt-0.5">
              {docType.replace(/_/g, ' ').toUpperCase()}
            </h3>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-mono opacity-60 uppercase">Readiness Score</div>
          <div className="font-mono text-lg font-bold text-[#176B45]">
            {score}
          </div>
        </div>
      </div>

      {privacyWarning && (
        <div className="text-xs p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>{privacyWarning}</span>
        </div>
      )}

      {/* Present Items */}
      {present.length > 0 && (
        <div>
          <span className="text-[10.5px] font-mono uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block mb-2">
            ✓ Present Documentation ({present.length})
          </span>
          <div className="space-y-1.5">
            {present.map((item, idx) => (
              <div key={idx} className={cn(
                "p-2.5 rounded-xl border flex items-start gap-2 text-xs",
                isDarkMode ? "bg-emerald-950/20 border-emerald-800/30" : "bg-emerald-50/70 border-emerald-200/60"
              )}>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">{item.label}</span>
                  {item.guidance && <p className="opacity-80 text-[11px] mt-0.5">{item.guidance}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Items & Guidance */}
      {missing.length > 0 && (
        <div>
          <span className="text-[10.5px] font-mono uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 block mb-2">
            ⚠ Missing Required Filing Elements ({missing.length})
          </span>
          <div className="space-y-2">
            {missing.map((item, idx) => (
              <div key={idx} className={cn(
                "p-3 rounded-xl border flex items-start gap-2.5 text-xs",
                isDarkMode ? "bg-amber-950/20 border-amber-800/30 text-amber-100" : "bg-amber-50/70 border-amber-200 text-amber-950"
              )}>
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">{item.label}</span>
                  {item.guidance && (
                    <p className="opacity-90 text-[11.5px] mt-1 leading-relaxed border-t border-inherit/20 pt-1">
                      {item.guidance}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Text Preview Toggle */}
      {preview && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs font-semibold text-[#176B45] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            {showPreview ? "Hide document preview" : "View extracted text snippet"}
            {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showPreview && (
            <div className={cn(
              "mt-2 p-3 rounded-xl font-mono text-[11px] max-h-40 overflow-y-auto leading-relaxed border",
              isDarkMode ? "bg-black/30 border-white/10" : "bg-white border-black/10"
            )}>
              {preview}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
