import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Leaf, ChevronLeft, BookOpen, FileCheck2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LanguageSelector from '../../components/LanguageSelector';
export default function LoginPage() {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const redirectPath = location.state?.from || '/passports';
  const handleSubmit = async e => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your registered email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(redirectPath, {
        replace: true
      });
    } catch (err) {
      console.error('Login error:', err);
      const message = err.response?.data?.detail || 'Unable to sign in. Please check your email and password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  const handleDemoFill = () => {
    setEmail('ananya.sen.test@ayurveda.org');
    setPassword('SecureVaidya2026!');
    setError(null);
  };
  return <div className="min-h-screen bg-[#FAF8F3] text-[#161412] font-sans flex flex-col justify-between selection:bg-[#176B45] selection:text-white relative">
      <div className="absolute top-6 right-6 z-50">
        <LanguageSelector />
      </div>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Institutional Editorial Showcase */}
          <div className="hidden lg:block space-y-6">
            <Link to="/" className="inline-flex items-center gap-2 font-semibold text-2xl tracking-tight text-[#161412] hover:opacity-85 transition-opacity mb-2">
              <span>{t("loginpage.aayuGranth", "AayuGranth")}</span>
              <span className="inline-block w-2 h-2 rounded-full bg-[#176B45] shadow-[0_0_8px_#176B45]" />
            </Link>

            <div className="block">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#176B45]/10 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#176B45]">
                <Shield className="h-3.5 w-3.5" />{t("loginpage.iPSAKTISahayakAyuGranthPortal", "IP-SAKTI Sahayak & AyuGranth Portal")}</div>
            </div>

            <h1 className="font-serif text-4xl xl:text-5xl leading-[1.15] text-[#161412]">{t("loginpage.evidencegroundedintelligenceforAyurvedic", "Evidence-grounded intelligence for Ayurvedic Intellectual Property.")}</h1>

            <p className="text-sm leading-relaxed text-[#161412]/70 max-w-lg">{t("loginpage.signintogenerate", "Sign in to generate verifiable Product Passports, cross-reference formulations against the Traditional Knowledge Digital Library (TKDL), and screen statutory ABS obligations under the National Biodiversity Act.")}</p>

            <div className="pt-4 space-y-4 max-w-md border-t border-[#161412]/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#176B45]/10 text-[#176B45] flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#161412] uppercase tracking-wide">{t("loginpage.tKDLPriorArtScreening", "TKDL Prior-Art Screening")}</h4>
                  <p className="text-xs text-[#161412]/60 mt-0.5">{t("loginpage.crosscheckagainstclassicalformulations", "Cross-check against classical formulations and shloka citations.")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#176B45]/10 text-[#176B45] flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#161412] uppercase tracking-wide">{t("loginpage.aBSStatutoryCompliance", "ABS & Statutory Compliance")}</h4>
                  <p className="text-xs text-[#161412]/60 mt-0.5">{t("loginpage.determineStateBiodiversityBoard", "Determine State Biodiversity Board and NBA regulatory pathways.")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#176B45]/10 text-[#176B45] flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#161412] uppercase tracking-wide">{t("loginpage.qRProductPassports", "QR Product Passports")}</h4>
                  <p className="text-xs text-[#161412]/60 mt-0.5">{t("loginpage.exportverifiabledigitalpassports", "Export verifiable digital passports for market and regulatory audit.")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean White Authentication Card */}
          <div className="w-full max-w-md mx-auto">
            <div className="lg:hidden mb-6 text-center">
              <Link to="/" className="inline-flex items-center gap-2 font-semibold text-2xl tracking-tight text-[#161412] hover:opacity-85 transition-opacity">
                <span>{t("loginpage.aayuGranth", "AayuGranth")}</span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#176B45] shadow-[0_0_8px_#176B45]" />
              </Link>
            </div>
            <div className="rounded-3xl border border-[#161412]/10 bg-white p-7 sm:p-9 shadow-[0_12px_40px_rgba(22,20,18,0.06)]">
              
              {/* Card Header */}
              <div className="mb-6">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#176B45]">{t("loginpage.sECUREACCESS", "SECURE ACCESS")}</p>
                <h2 className="font-serif text-3xl font-bold text-[#161412] mt-1">{t("loginpage.signin", "Sign in")}</h2>
                <p className="text-xs text-[#161412]/60 mt-1.5">{t("loginpage.enteryourinstitutionalor", "Enter your institutional or practitioner credentials.")}</p>
              </div>

              {/* Error Alert */}
              {error && <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#161412]/75 mb-1.5">{t("loginpage.emailaddress", "Email address")}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#161412]/40" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={t("loginpage.vaidyaayugranthorg", "vaidya@ayugranth.org")} className="w-full rounded-xl border-2 border-[#161412]/12 bg-[#FAF8F3] pl-10 pr-4 py-2.5 text-sm text-[#161412] placeholder:text-[#161412]/30 outline-none transition-all focus:border-[#176B45] focus:bg-white focus:ring-2 focus:ring-[#176B45]/15" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#161412]/75 mb-1.5">{t("loginpage.password", "Password")}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#161412]/40" />
                    <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" className="w-full rounded-xl border-2 border-[#161412]/12 bg-[#FAF8F3] pl-10 pr-11 py-2.5 text-sm text-[#161412] placeholder:text-[#161412]/30 outline-none transition-all focus:border-[#176B45] focus:bg-white focus:ring-2 focus:ring-[#176B45]/15" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#161412]/40 hover:text-[#161412] transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick Demo Credentials */}
                <div className="flex items-center justify-between pt-1">
                  <button type="button" onClick={handleDemoFill} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#176B45] hover:text-[#125537] hover:underline cursor-pointer">
                    <Leaf className="w-3.5 h-3.5" />{t("loginpage.filldemoaccount", "Fill demo account")}</button>
                </div>

                {/* Submit Button */}
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#176B45] hover:bg-[#125537] py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(23,107,69,0.2)] hover:shadow-[0_6px_20px_rgba(23,107,69,0.3)] transition-all disabled:opacity-60 active:scale-[0.99] cursor-pointer mt-2">
                  {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <>
                      <span>{t("loginpage.signIn", "Sign In")}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#161412]/10" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#161412]/40">{t("loginpage.or", "or")}</span>
                <div className="h-px flex-1 bg-[#161412]/10" />
              </div>

              {/* Footer Switch */}
              <div className="text-center text-xs text-[#161412]/65">{t("loginpage.donthaveanaccount", "Don't have an account?")}{' '}
                <Link to="/register" className="font-bold text-[#176B45] hover:underline">{t("loginpage.registerhere", "Register here")}</Link>
              </div>
            </div>

            {/* Back to Home Link */}
            <div className="mt-4 text-center">
              <Link to="/" className="inline-flex items-center gap-1 text-xs font-medium text-[#161412]/50 hover:text-[#161412] transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />{t("loginpage.returntohomepage", "Return to home page")}</Link>
            </div>
          </div>
        </div>
      </main>

      {/* ── Minimal Institutional Footer ── */}
      <footer className="border-t border-[#161412]/10 bg-white/50 py-4 text-center text-xs text-[#161412]/50">
        <p>{t("loginpage.aayuGranthTraditionalKnowledgeand", "AayuGranth · Traditional Knowledge and Intellectual Property Support System")}</p>
      </footer>
    </div>;
}