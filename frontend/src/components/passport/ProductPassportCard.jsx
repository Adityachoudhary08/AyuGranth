import { Shield, Sparkles, QrCode, CheckCircle2, AlertTriangle, AlertCircle, Clock, Globe, Download } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export default function ProductPassportCard({
  productName = 'AshwaBalance Capsules',
  productCategory = 'Ayurvedic Formulation',
  passportId = 'IPS-2026-008412',
  originJurisdiction = 'India',
  targetMarket = 'United States',
  status = 'NEEDS REVIEW', // 'EVIDENCE REVIEWED' | 'NEEDS REVIEW' | 'HIGH-RISK ISSUES DETECTED' | 'NOT YET ASSESSED'
  lastAnalyzed = '10 Sep 2026',
  evidenceCount = 8,
  verified = true,
  onDownloadCard,
  className = '',
}) {
  const getStatusBadge = (st) => {
    const s = String(st).toUpperCase();
    if (s.includes('EVIDENCE REVIEWED') || s.includes('READY')) {
      return {
        label: 'EVIDENCE REVIEWED',
        bg: 'bg-[#176B45]/15 text-[#176B45] border-[#176B45]/30',
        dot: 'bg-[#176B45]',
        icon: CheckCircle2,
      };
    }
    if (s.includes('HIGH-RISK') || s.includes('EXCLUDED') || s.includes('CRITICAL')) {
      return {
        label: 'HIGH-RISK ISSUES DETECTED',
        bg: 'bg-red-50 text-red-800 border-red-200',
        dot: 'bg-red-600',
        icon: AlertCircle,
      };
    }
    if (s.includes('NOT YET') || s.includes('PENDING')) {
      return {
        label: 'NOT YET ASSESSED',
        bg: 'bg-[#161412]/10 text-[#161412]/70 border-[#161412]/20',
        dot: 'bg-[#161412]/50',
        icon: Clock,
      };
    }
    return {
      label: 'NEEDS REVIEW',
      bg: 'bg-amber-50 text-amber-900 border-amber-300',
      dot: 'bg-amber-600',
      icon: AlertTriangle,
    };
  };

  const statusInfo = getStatusBadge(status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className={cn("w-full max-w-[820px] mx-auto", className)}>
      {/* VIRTUAL IDENTIFICATION CARD */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#FFFCF6] via-[#FAF6ED] to-[#F5EFE1] border-2 border-[#D9CEBE] p-6 sm:p-9 shadow-[0_12px_40px_rgba(22,20,18,0.08)] overflow-hidden">
        
        {/* Subtle security micro-pattern background */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#176B45 1px, transparent 1px), radial-gradient(#8C6D46 1px, #FAF6ED 1px)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px'
          }}
        />

        {/* Security Hologram Strip Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#176B45] via-[#8C6D46] to-[#176B45]" />

        {/* Top Identification Row */}
        <div className="relative z-10 flex items-center justify-between border-b border-[#161412]/15 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#176B45] text-white flex items-center justify-center font-serif font-bold text-base shadow-xs">
              आ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#176B45]">
                  IP-SAKTI
                </span>
                <span className="text-[10px] font-mono text-[#8C6D46]">•</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#8C6D46] font-semibold">
                  SAHAYAK
                </span>
              </div>
              <p className="text-[9px] font-mono text-[#161412]/50 tracking-wider uppercase">
                Digital Product Credential
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownloadCard && (
              <button
                type="button"
                onClick={onDownloadCard}
                className="print:hidden inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-[#FAF8F3] border border-[#176B45]/25 hover:border-[#176B45] text-[#176B45] text-[10px] font-mono font-bold uppercase rounded-md transition-all shadow-2xs cursor-pointer"
                title="Download / Print ID Card Only"
              >
                <Download className="w-3 h-3" />
                <span>Save Card</span>
              </button>
            )}
            <span className="inline-block px-3 py-1 bg-[#176B45]/10 border border-[#176B45]/25 rounded-md font-mono text-[10px] font-bold tracking-widest text-[#176B45] uppercase">
              PRODUCT PASS
            </span>
          </div>
        </div>

        {/* Middle Body: Identity & Emblems */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-6">
          
          {/* Col 1 & 2: Primary Identity */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-[#8C6D46] font-bold block mb-1">
                FORMULATION IDENTITY
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#161412] tracking-tight leading-snug">
                {productName.toUpperCase()}
              </h2>
              <p className="font-serif italic text-xs sm:text-sm text-[#161412]/70 mt-0.5">
                {productCategory}
              </p>
            </div>

            {/* Micro Details Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2 text-xs font-sans">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#161412]/50 block mb-0.5">
                  PASSPORT ID
                </span>
                <span className="font-mono font-bold text-sm tracking-wider text-[#161412]">
                  {passportId}
                </span>
              </div>

              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#161412]/50 block mb-0.5">
                  JURISDICTION
                </span>
                <span className="font-medium text-xs sm:text-sm text-[#176B45] flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>{originJurisdiction} → {targetMarket}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Col 3: Visual Credential / QR Pattern */}
          <div className="flex flex-col items-center md:items-end justify-center">
            <div className="p-3 bg-white border border-[#161412]/15 rounded-xl shadow-xs flex flex-col items-center text-center">
              {/* QR Pattern visual */}
              <div className="w-24 h-24 bg-[#FAF8F3] border border-[#161412]/10 rounded-lg p-2 flex items-center justify-center relative overflow-hidden">
                <QrCode className="w-full h-full text-[#161412]/85" />
                <div className="absolute inset-0 bg-[#176B45]/5 pointer-events-none" />
              </div>
              <span className="text-[9px] font-mono text-[#161412]/50 uppercase tracking-widest mt-1.5">
                SECURE VERIFY
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Status & Trust Ribbon */}
        <div className="relative z-10 pt-4 border-t border-[#161412]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] font-mono uppercase text-[#161412]/50 font-bold tracking-wider">
              STATUS:
            </span>
            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10.5px] font-bold uppercase tracking-wider border", statusInfo.bg)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", statusInfo.dot)} />
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusInfo.label}</span>
            </span>
          </div>

          {/* Provenance Metadata */}
          <div className="flex items-center gap-4 text-[10px] font-mono text-[#161412]/60">
            {evidenceCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-bold text-[#176B45]">{evidenceCount}</span> Sources Cited
              </span>
            )}
            <span>Analyzed: {lastAnalyzed}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
