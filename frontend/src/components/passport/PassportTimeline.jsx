import { useTranslation } from "react-i18next";
import { Clock, History, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
export default function PassportTimeline({
  history = [],
  lastAnalyzed = '10 Sep 2026',
  className = ''
}) {
  const {
    t
  } = useTranslation();
  const defaultHistory = history.length > 0 ? history : [{
    date: lastAnalyzed,
    event: 'Product Passport synthesized & evidence indexed',
    detail: 'Full cross-module analysis (Regulatory, IP, Biodiversity, International)',
    status: 'Needs Review'
  }];
  return <section className={cn("bg-white border border-[#161412]/15 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6", className)}>
      <div className="flex items-center justify-between border-b border-[#161412]/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#8C6D46]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#8C6D46]">{t("passporttimeline.aNALYSISHISTORYTIMELINE", "ANALYSIS HISTORY & TIMELINE")}</h3>
          </div>
          <p className="text-xs text-[#161412]/60 mt-0.5">{t("passporttimeline.audithistoryversionupdates", "Audit history, version updates, and intelligence refreshes")}</p>
        </div>
        <span className="text-[10px] font-mono text-[#8C6D46] uppercase tracking-wider font-semibold">{t("passporttimeline.livingRecord", "Living Record")}</span>
      </div>

      <div className="relative border-l-2 border-[#161412]/10 ml-3.5 space-y-6">
        {defaultHistory.map((item, idx) => <div key={idx} className="relative pl-6">
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-[#176B45] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#176B45]" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] font-bold text-[#8C6D46]">
                  {item.date}
                </span>
                {item.status && <span className="px-2 py-0.2 rounded text-[9.5px] font-mono font-bold uppercase bg-amber-50 text-amber-900 border border-amber-200">
                    {item.status}
                  </span>}
              </div>

              <h4 className="font-serif text-sm font-semibold text-[#161412]">
                {item.event}
              </h4>

              {item.detail && <p className="text-xs text-[#161412]/70 leading-relaxed">
                  {item.detail}
                </p>}
            </div>
          </div>)}
      </div>
    </section>;
}