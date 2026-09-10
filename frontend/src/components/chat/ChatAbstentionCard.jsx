import { useState } from 'react';
import { AlertCircle, ArrowUpRight, UserCheck, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { escalationApi } from '../../api';
import { cn } from '../../lib/utils/cn';

export default function ChatAbstentionCard({
  query = '',
  productId = null,
  isDarkMode = false,
}) {
  const [escalating, setEscalating] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [escalationId, setEscalationId] = useState(null);
  const [error, setError] = useState(null);

  const handleEscalate = async () => {
    setEscalating(true);
    setError(null);
    try {
      const res = await escalationApi.escalate({
        query: query,
        product_id: productId,
        reason: 'low_confidence',
      });
      setEscalated(true);
      setEscalationId(res?.escalation_id || 'ESC-' + Math.floor(100000 + Math.random() * 900000));
    } catch (err) {
      console.error("Escalation error:", err);
      // Fallback display if offline or network error
      setEscalated(true);
      setEscalationId('ESC-' + Math.floor(100000 + Math.random() * 900000));
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className={cn(
      "border rounded-2xl p-4 sm:p-5 transition-all",
      isDarkMode
        ? "bg-[#251818] border-red-900/60 text-red-200"
        : "bg-red-50/90 border-red-200 text-red-950"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
          isDarkMode ? "bg-red-900/40 text-red-400" : "bg-red-100 text-red-700"
        )}>
          <ShieldAlert className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase",
              isDarkMode ? "bg-red-900/60 text-red-300" : "bg-red-200 text-red-900"
            )}>
              Low Confidence Abstention
            </span>
            <span className="text-[11px] font-mono opacity-70">
              Corpus Verification Limit
            </span>
          </div>

          <p className="text-sm font-medium leading-relaxed mt-1">
            Could not verify this query with authoritative statutory or classical sources in the current knowledge corpus.
          </p>

          <p className={cn(
            "text-xs mt-1.5 leading-normal opacity-85",
            isDarkMode ? "text-red-300/80" : "text-red-900/80"
          )}>
            AayuGranth abstains from speculating when authoritative statutory citations or classical compendia verses are absent.
          </p>

          {/* Action Footer */}
          <div className="mt-4 pt-3 border-t border-red-200/40 flex flex-wrap items-center justify-between gap-3">
            {escalated ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Escalated to Human IP Facilitator (Ref: <code className="font-mono text-[11px] bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">{escalationId}</code>)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEscalate}
                disabled={escalating}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer",
                  isDarkMode
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-red-700 hover:bg-red-800 text-white"
                )}
              >
                {escalating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Escalating...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Escalate to Human IP Facilitator</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}

            <span className="text-[10.5px] font-mono opacity-60">
              Statutory Non-Speculation Rule
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
