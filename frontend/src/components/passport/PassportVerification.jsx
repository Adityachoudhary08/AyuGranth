import { useTranslation } from "react-i18next";
import { ShieldCheck, Check, Copy, ExternalLink, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils/cn';
import { getPassportQrUrl, getPublicPassportUrl } from '../../api';
export default function PassportVerification({
  passportId = 'IPS-2026-008412',
  productId = passportId,
  generatedDate = '10 Sep 2026',
  lastUpdated = '10 Sep 2026',
  evidenceCount = 8,
  status = 'NEEDS REVIEW',
  className = ''
}) {
  const {
    t
  } = useTranslation();
  const [copied, setCopied] = useState(false);
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(getPublicPassportUrl(productId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return <section className={cn("bg-[#FAF8F3] border-2 border-[#D9CEBE] rounded-2xl p-6 sm:p-8 shadow-xs", className)}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Verification Info */}
        <div className="space-y-3 text-left w-full md:w-auto">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#176B45]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#176B45]">{t("passportverification.vERIFYPRODUCTPASSPORT", "VERIFY PRODUCT PASSPORT")}</h3>
          </div>

          <p className="text-xs text-[#161412]/70 max-w-md leading-relaxed">{t("passportverification.everyAayuGranthProductPassport", "Every AayuGranth Product Passport is cryptographically keyed to its formulation record and evidence index.")}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs font-sans">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#161412]/50 block mb-0.5">{t("passportverification.pASSPORTID", "PASSPORT ID")}</span>
              <span className="font-mono font-bold text-[#161412] text-sm">
                {passportId}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#161412]/50 block mb-0.5">{t("passportverification.gENERATED", "GENERATED")}</span>
              <span className="font-medium text-[#161412]">
                {generatedDate}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#161412]/50 block mb-0.5">{t("passportverification.lASTUPDATED", "LAST UPDATED")}</span>
              <span className="font-medium text-[#161412]">
                {lastUpdated}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#161412]/50 block mb-0.5">{t("passportverification.eVIDENCECITED", "EVIDENCE CITED")}</span>
              <span className="font-bold text-[#176B45]">
                {evidenceCount} {t("passportverification.sources", "Sources")}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#161412]/20 hover:border-[#176B45]/50 text-xs font-semibold text-[#161412] rounded-lg transition-all shadow-2xs cursor-pointer">
              {copied ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5 text-[#176B45]" />}
              <span>{copied ? t('productPassport.ui.linkCopied', 'Link Copied') : t('productPassport.ui.copyVerificationLink', 'Copy Verification Link')}</span>
            </button>
          </div>
        </div>

        {/* Verification QR */}
        <div className="p-4 bg-white border border-[#161412]/15 rounded-xl shadow-xs flex flex-col items-center shrink-0">
          <div className="w-28 h-28 bg-[#FAF8F3] border border-[#161412]/10 rounded-lg p-2.5 flex items-center justify-center">
            <img src={getPassportQrUrl(productId)} alt="Scan to verify this public passport summary" className="w-full h-full object-contain" />
          </div>
          <span className="text-[9px] font-mono text-[#161412]/50 uppercase tracking-widest mt-2">{t("passportverification.pASSPORTAUTHENTICITY", "PASSPORT AUTHENTICITY")}</span>
        </div>

      </div>
    </section>;
}