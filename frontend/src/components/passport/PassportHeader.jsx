import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Download, 
  MessageSquare, 
  ChevronRight, 
  ShieldCheck, 
  CreditCard, 
  FileText, 
  Database, 
  ChevronDown 
  , Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export default function PassportHeader({
  passportId = 'IPS-2026-008412',
  productName = 'AshwaBalance Capsules',
  onDownloadCard,
  onDownloadFullDossier,
  onExportFullData,
  onDelete,
  className = '',
}) {
  const [isFullDataMenuOpen, setIsFullDataMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsFullDataMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={cn("mb-8 border-b border-[#161412]/10 pb-6", className)}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#161412]/50 mb-3">
        <Link to="/" className="hover:text-[#176B45] transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3 h-3 text-[#161412]/30" />
        <span>Product Intelligence</span>
        <ChevronRight className="w-3 h-3 text-[#161412]/30" />
        <span className="text-[#176B45] font-bold">Product Passport</span>
      </nav>

      {/* Main Title & Description with Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-[#176B45]" />
            <span className="text-[10.5px] font-mono font-bold uppercase tracking-[0.2em] text-[#176B45]">
              AAYUGRANTH VERIFIED DOSSIER
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif text-[#161412] tracking-tight">
            Product Passport
          </h1>

          <p className="text-sm text-[#161412]/70 mt-1 max-w-2xl leading-relaxed">
            Traceable intelligence record for Ayurvedic product compliance, IP and market readiness.
          </p>
        </div>

        {/* Action Buttons: 2 Download Options */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 print:hidden">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-red-200 hover:border-red-400 text-xs font-semibold text-red-700 rounded-xl transition-all shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Passport</span>
            </button>
          )}
          <Link
            to={{
              pathname: "/ask-aayugranth",
              search: passportId ? `?passportId=${encodeURIComponent(passportId)}` : "?from=passport",
            }}
            state={{
              fromPassport: true,
              hasPassport: true,
              passportId: passportId,
              productName: productName,
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-[#161412]/20 hover:border-[#176B45]/50 text-xs font-semibold text-[#161412] rounded-xl transition-all shadow-xs hover:bg-[#FAF8F3]"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#176B45]" />
            <span>Ask AayuGranth</span>
          </Link>

          {/* OPTION 1: PASSPORT CARD ONLY */}
          <button
            type="button"
            onClick={onDownloadCard}
            title="Download or Print only the Virtual Product Passport ID Card"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#176B45]/30 hover:border-[#176B45] text-xs font-bold text-[#176B45] rounded-xl transition-all shadow-xs hover:bg-[#176B45]/5 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-[#176B45]" />
            <span>Passport Only</span>
          </button>

          {/* OPTION 2: FULL DATA OF PASSPORT (DOSSIER & JSON) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsFullDataMenuOpen(!isFullDataMenuOpen)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#176B45] hover:bg-[#125537] text-xs font-bold uppercase tracking-wider text-white rounded-xl transition-all shadow-[0_2px_10px_rgba(23,107,69,0.25)] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Full Data</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isFullDataMenuOpen && "rotate-180")} />
            </button>

            {isFullDataMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-[#161412]/15 rounded-xl shadow-xl z-50 p-2 py-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1 mb-1 border-b border-[#161412]/10">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#161412]/50">
                    Full Passport Export
                  </span>
                </div>

                {/* Option 2A: Full Dossier (PDF / Print) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFullDataMenuOpen(false);
                    onDownloadFullDossier();
                  }}
                  className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[#FAF8F3] transition-colors group cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#176B45] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-[#161412] group-hover:text-[#176B45]">
                      Full Dossier (PDF / Print)
                    </div>
                    <div className="text-[11px] text-[#161412]/60 mt-0.5 leading-tight">
                      All 6 regulatory & IP domains, citations and action plan
                    </div>
                  </div>
                </button>

                {/* Option 2B: Full Data (JSON) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFullDataMenuOpen(false);
                    onExportFullData();
                  }}
                  className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[#FAF8F3] transition-colors group cursor-pointer"
                >
                  <Database className="w-4 h-4 text-[#8C6D46] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-[#161412] group-hover:text-[#8C6D46]">
                      Full Data Package (JSON)
                    </div>
                    <div className="text-[11px] text-[#161412]/60 mt-0.5 leading-tight">
                      Structured raw JSON dataset with all verification hashes
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
