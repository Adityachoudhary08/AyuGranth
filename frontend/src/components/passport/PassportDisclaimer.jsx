import { ShieldAlert, CheckCircle2, Lock, FileCheck } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export default function PassportDisclaimer({
  className = '',
}) {
  return (
    <footer className={cn("space-y-4 pt-6", className)}>
      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#176B45]">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#176B45]/10 border border-[#176B45]/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          SOURCE-CITED
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#176B45]/10 border border-[#176B45]/20">
          <FileCheck className="w-3.5 h-3.5" />
          JURISDICTION-AWARE
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#176B45]/10 border border-[#176B45]/20">
          <Lock className="w-3.5 h-3.5" />
          EVIDENCE-LINKED
        </span>
      </div>

      {/* Official Advisory Notice */}
      <div className="bg-[#FAF0DE] border border-[#d8cbb7] rounded-xl p-5 text-center max-w-3xl mx-auto">
        <p className="text-xs text-[#6b5e4d] leading-relaxed font-sans">
          <strong className="font-semibold text-[#161412]">ADVISORY NOTICE:</strong> This Product Passport is an AI-generated intelligence and evidence report based on the sources available to the AayuGranth system. It is not a government-issued certificate, approval, registration, legal opinion, or substitute for advice from a qualified IP/regulatory attorney or competent statutory authority.
        </p>
      </div>
    </footer>
  );
}
