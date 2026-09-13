import { useTranslation } from "react-i18next";
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { passportApi } from '../api';
import { translatePassportStatus, translatePassportData } from '../lib/passportI18n';

const statusStyles = {
  green: 'border-[#176B45]/25 bg-[#176B45]/5 text-[#176B45]',
  yellow: 'border-amber-200 bg-amber-50 text-amber-900',
  red: 'border-red-200 bg-red-50 text-red-800'
};
function formatDate(value) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}
function StatusIcon({
  color
}) {
  if (color === 'green') return <CheckCircle2 className="w-4 h-4" />;
  if (color === 'red') return <AlertCircle className="w-4 h-4" />;
  return <TriangleAlert className="w-4 h-4" />;
}
export default function PublicPassportPage() {
  const {
    t
  } = useTranslation();
  const {
    passportId
  } = useParams();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!passportId) return;
    passportApi.getPublicPassport(passportId).then(setSummary).catch(() => {
      setError('This passport could not be verified or is no longer available.');
    });
  }, [passportId]);
  if (error) {
    return <main className="min-h-screen bg-[#FAF8F3] text-[#161412] flex items-center justify-center px-5">
        <section className="max-w-md text-center space-y-4">
          <AlertCircle className="w-10 h-10 mx-auto text-red-700" />
          <h1 className="font-serif text-3xl">{t("publicpassportpage.passportNotFound", "Passport Not Found")}</h1>
          <p className="text-sm text-[#161412]/65">{error}</p>
        </section>
      </main>;
  }
  if (!summary) {
    return <main className="min-h-screen bg-[#FAF8F3] text-[#161412] flex items-center justify-center px-5">
        <p className="text-sm text-[#161412]/60">{t("publicpassportpage.verifyingpassport", "Verifying passport...")}</p>
      </main>;
  }
  return <main className="min-h-screen bg-[#FAF8F3] text-[#161412] px-5 py-10 sm:py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="border-b border-[#161412]/10 pb-6 flex items-start justify-between gap-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#176B45] text-white flex items-center justify-center font-serif font-bold">आ</div>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#176B45]">{t("publicpassportpage.aayuGranth", "AayuGranth")}</p>
              <p className="text-[11px] text-[#161412]/55 mt-1">{t("publicpassportpage.publicpassportverification", "Public passport verification")}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#176B45]/25 bg-[#176B45]/5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#176B45]">
            <ShieldCheck className="w-3.5 h-3.5" />{t("publicpassportpage.verifiedbyAayuGranth", "Verified by AayuGranth")}</div>
        </header>

        <section className="bg-white border border-[#161412]/10 rounded-2xl p-6 sm:p-8 shadow-sm">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#8C6D46]">{t("publicpassportpage.authenticitysummary", "Authenticity summary")}</p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-2">{summary.product_name}</h1>
          <p className="font-serif italic text-sm text-[#161412]/65 mt-1">{translatePassportData(summary.category, t)}</p>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8 pt-5 border-t border-[#161412]/10">
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-[#161412]/50">{t("publicpassportpage.passportID", "Passport ID")}</dt>
              <dd className="font-mono font-bold text-sm mt-1">{summary.passport_id}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-[#161412]/50">{t("publicpassportpage.generated", "Generated")}</dt>
              <dd className="text-sm mt-1">{formatDate(summary.generated_at)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-[#161412]/50">{t("publicpassportpage.lastanalyzed", "Last analyzed")}</dt>
              <dd className="text-sm mt-1">{formatDate(summary.last_analyzed)}</dd>
            </div>
          </dl>
        </section>

        <section>
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="font-serif text-2xl">{t("publicpassportpage.domainstatus", "Domain status")}</h2>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800">{translatePassportStatus(summary.overall_status, t)}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.domain_statuses.map(domain => <div key={domain.label} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${statusStyles[domain.color] || statusStyles.yellow}`}>
                <span className="text-sm font-semibold">{translatePassportData(domain.label, t)}</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider">
                  <StatusIcon color={domain.color} /> {translatePassportStatus(domain.status, t)}
                </span>
              </div>)}
          </div>
        </section>

        <aside className="rounded-xl border border-[#8C6D46]/25 bg-[#FAF6EC] px-4 py-4 text-sm text-[#161412]/75">
          <strong className="text-[#161412]">{t("publicpassportpage.publicauthenticitysummary", "Public authenticity summary.")}</strong> {summary.privacy_note}
        </aside>
      </div>
    </main>;
}