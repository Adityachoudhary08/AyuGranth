import { X, ArrowDown, Sparkles, Scale, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export default function WhyThisResultModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const {
    title = 'Assessment Traceability',
    signal = 'Formulation contains documented biological resource',
    evidence = 'Charaka Samhita / Biological Diversity Act, 2002',
    interpretation = 'The retrieved authority identifies this ingredient as traditional prior art under Indian jurisprudence.',
    result = 'Further patent review recommended to substantiate synergy beyond traditional preparation methods.',
    jurisdiction = 'India',
  } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-[#FAF8F3] border border-[#161412]/20 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#176B45] text-white px-6 py-4 flex items-center justify-between border-b border-[#8C6D46]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E5B558]" />
            <h3 className="font-serif text-base sm:text-lg font-medium">Why This Result?</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Traceability Flow */}
        <div className="p-6 sm:p-7 space-y-4 text-xs font-sans">
          <p className="text-[#161412]/70 font-serif italic text-sm mb-4">
            AayuGranth decision-support chain connecting product characteristics to indexed legal sources:
          </p>

          {/* Step 1: Product Signal */}
          <div className="bg-white border border-[#161412]/15 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C6D46]">
                1. Product Signal
              </span>
              <span className="text-[10px] font-mono text-[#161412]/40">Input Characteristic</span>
            </div>
            <p className="font-semibold text-sm text-[#161412] leading-snug">
              {signal}
            </p>
          </div>

          <div className="flex justify-center -my-2 text-[#176B45]">
            <ArrowDown className="w-4 h-4 animate-pulse" />
          </div>

          {/* Step 2: Retrieved Evidence */}
          <div className="bg-white border border-[#161412]/15 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#176B45]">
                2. Retrieved Evidence
              </span>
              <span className="text-[10px] font-mono text-[#161412]/40">{jurisdiction} Jurisdiction</span>
            </div>
            <p className="font-medium text-xs text-[#161412] leading-relaxed">
              {evidence}
            </p>
          </div>

          <div className="flex justify-center -my-2 text-[#176B45]">
            <ArrowDown className="w-4 h-4 animate-pulse" />
          </div>

          {/* Step 3: Legal / Technical Interpretation */}
          <div className="bg-white border border-[#161412]/15 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C6D46]">
                3. Statutory Interpretation
              </span>
              <span className="text-[10px] font-mono text-[#161412]/40">Reasoning</span>
            </div>
            <p className="text-xs text-[#161412]/80 leading-relaxed">
              {interpretation}
            </p>
          </div>

          <div className="flex justify-center -my-2 text-[#176B45]">
            <ArrowDown className="w-4 h-4 animate-pulse" />
          </div>

          {/* Step 4: Result */}
          <div className="bg-[#176B45]/10 border border-[#176B45]/30 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#176B45]">
                4. Computed Finding / Posture
              </span>
              <span className="text-[10px] font-mono text-[#176B45] font-bold">Conclusion</span>
            </div>
            <p className="font-serif text-sm font-semibold text-[#161412] leading-snug">
              {result}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#FAF0DE] border-t border-[#d8cbb7] px-6 py-3.5 flex items-center justify-between text-[11px] font-mono text-[#6b5e4d]">
          <span>Evidence-Linked Explainability</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white border border-[#161412]/20 rounded-md text-xs font-sans font-semibold text-[#161412] hover:bg-[#FAF8F3] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
