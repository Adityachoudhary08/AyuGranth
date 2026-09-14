import { useTranslation } from "react-i18next";
import { CheckSquare, ArrowRight, AlertCircle, Sparkles, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
export default function ActionPlanSection({
  actions = [{
    id: '01',
    title: 'Substantiate Synergistic Efficacy (Section 3(p) / 3(d))',
    priority: 'High',
    reason: 'Because the formulation contains known classical botanical constituents, the Indian Patent Office requires comparative experimental synergy data (e.g. combination index < 1) to overcome traditional knowledge objections.',
    evidenceCount: 2
  }, {
    id: '02',
    title: 'File NBA Form I for Access & Benefit-Sharing Clearance',
    priority: 'High',
    reason: 'Commercial utilization or patent filing for biological resources accessed from India requires mandatory prior approval from the National Biodiversity Authority under Section 3 & 6 of the Biological Diversity Act, 2002.',
    evidenceCount: 1
  }, {
    id: '03',
    title: 'Compile US FDA 21 CFR 111 cGMP & Heavy Metals Testing Dossier',
    priority: 'Medium',
    reason: 'Destination export into the United States mandates USP <2232> contaminant threshold compliance and formulation structure/function claim notification within 30 days of marketing.',
    evidenceCount: 3
  }],
  onOpenEvidence = null,
  className = ''
}) {
  const {
    t
  } = useTranslation();
  const getPriorityBadge = p => {
    const lower = String(p).toLowerCase();
    if (lower === 'high' || lower === 'critical') {
      return 'bg-red-50 text-red-800 border-red-200';
    }
    if (lower === 'medium' || lower === 'moderate') {
      return 'bg-amber-50 text-amber-900 border-amber-200';
    }
    return 'bg-blue-50 text-blue-800 border-blue-200';
  };
  return <section className={cn("bg-white border border-[#161412]/15 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6", className)}>
      <div className="flex items-center justify-between border-b border-[#161412]/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#176B45]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#176B45]">{t("actionplansection.rECOMMENDEDACTIONS", "RECOMMENDED ACTIONS")}</h3>
          </div>
          <p className="text-xs text-[#161412]/60 mt-0.5">{t("actionplansection.prioritizedstrategicactionsgrounded", "Prioritized strategic actions grounded in legal and regulatory findings")}</p>
        </div>
        <span className="text-[10px] font-mono text-[#8C6D46] uppercase tracking-wider font-semibold">{t("actionplansection.actionPlan", "Action Plan")}</span>
      </div>

      {actions.length === 0 ? <p className="text-xs text-[#161412]/60 italic py-4 text-center">{t("actionplansection.norecommendedactionsavailable", "No recommended actions available for this analysis.")}</p> : <div className="space-y-4">
          {actions.map(act => <div key={act.id} className="bg-[#FAF8F3] border border-[#161412]/15 rounded-xl p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:border-[#176B45]/40 transition-all">
              <div className="flex items-start gap-4">
                <span className="font-mono text-xl font-bold text-[#8C6D46]/60 shrink-0">
                  {act.id}
                </span>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-serif text-sm sm:text-base font-bold text-[#161412]">
                      {act.title}
                    </h4>
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border", getPriorityBadge(act.priority))}>{t("actionplansection.priority", "Priority:")}{act.priority}
                    </span>
                  </div>

                  <p className="text-xs text-[#161412]/80 leading-relaxed max-w-2xl">
                    {act.reason}
                  </p>
                </div>
              </div>

              {act.evidenceCount > 0 && <div className="shrink-0 self-end md:self-center">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#176B45] bg-white border border-[#161412]/10 px-3 py-1.5 rounded-lg shadow-2xs">
                    <BookOpen className="w-3.5 h-3.5 text-[#176B45]" />
                    <span>{act.evidenceCount}{t("actionplansection.sourcesCited", "Sources Cited")}</span>
                  </span>
                </div>}
            </div>)}
        </div>}
    </section>;
}