import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Briefcase,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  BookOpen,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLES = [
  'Ayurvedic Researcher',
  'IP Attorney / Patent Agent',
  'Herbal & AYUSH Manufacturer',
  'Academician / Scholar',
  'Regulatory Officer / SBB Member',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    organization: '',
    role: 'Ayurvedic Researcher',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password) {
      setError('Please provide an email and password.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signup({
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim() || undefined,
        organization: formData.organization.trim() || undefined,
        role: formData.role,
      });
      navigate('/passports', { replace: true });
    } catch (err) {
      console.error('Registration error:', err);
      const message =
        err.response?.data?.detail ||
        'Registration failed. Please check your information or try again with a different email.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#161412] font-sans flex flex-col justify-between selection:bg-[#176B45] selection:text-white">
      {/* ── Main Layout (No Navbar) ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Institutional Editorial Breakdown */}
          <div className="hidden lg:block space-y-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-semibold text-2xl tracking-tight text-[#161412] hover:opacity-85 transition-opacity mb-2"
            >
              <span>AayuGranth</span>
              <span className="inline-block w-2 h-2 rounded-full bg-[#176B45] shadow-[0_0_8px_#176B45]" />
            </Link>

            <div className="block">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#176B45]/10 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#176B45]">
                <Shield className="h-3.5 w-3.5" />
                Join the Network
              </div>
            </div>

            <h1 className="font-serif text-4xl xl:text-5xl leading-[1.15] text-[#161412]">
              Standardized compliance for traditional medicine & bio-resources.
            </h1>

            <p className="text-sm leading-relaxed text-[#161412]/70 max-w-lg">
              Create an institutional account to safeguard Ayurvedic intellectual property, document prior-art defenses, and streamline statutory submissions.
            </p>

            <div className="pt-4 space-y-4 max-w-md border-t border-[#161412]/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#176B45]/10 text-[#176B45] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#161412] uppercase tracking-wide">Multi-Role Support</h4>
                  <p className="text-xs text-[#161412]/60 mt-0.5">Tailored tools for Researchers, IP Attorneys, Manufacturers, and Regulators.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#176B45]/10 text-[#176B45] flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#161412] uppercase tracking-wide">Authentic Ancient Texts Grounding</h4>
                  <p className="text-xs text-[#161412]/60 mt-0.5">Cross-referenced with Charaka Samhita, Sushruta Samhita, and API monographs.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#176B45]/10 text-[#176B45] flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#161412] uppercase tracking-wide">Digital Passport Archive</h4>
                  <p className="text-xs text-[#161412]/60 mt-0.5">Maintain an encrypted audit trail of your formulation intelligence.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Registration Card */}
          <div className="w-full max-w-lg mx-auto">
            <div className="lg:hidden mb-6 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 font-semibold text-2xl tracking-tight text-[#161412] hover:opacity-85 transition-opacity"
              >
                <span>AayuGranth</span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#176B45] shadow-[0_0_8px_#176B45]" />
              </Link>
            </div>
            <div className="rounded-3xl border border-[#161412]/10 bg-white p-7 sm:p-9 shadow-[0_12px_40px_rgba(22,20,18,0.06)]">
              
              {/* Card Header */}
              <div className="mb-6">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#176B45]">
                  REGISTRATION
                </p>
                <h2 className="font-serif text-3xl font-bold text-[#161412] mt-1">
                  Create account
                </h2>
                <p className="text-xs text-[#161412]/60 mt-1.5">
                  Join the AyuGranth IP & Compliance workspace.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#161412]/75 mb-1.5">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#161412]/40" />
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Dr. Vaidya Rajesh Sharma"
                      className="w-full rounded-xl border-2 border-[#161412]/12 bg-[#FAF8F3] pl-10 pr-4 py-2.5 text-sm text-[#161412] placeholder:text-[#161412]/30 outline-none transition-all focus:border-[#176B45] focus:bg-white focus:ring-2 focus:ring-[#176B45]/15"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#161412]/75 mb-1.5">
                    Institutional / work email <span className="text-[#176B45]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#161412]/40" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="sharma@institute.org"
                      className="w-full rounded-xl border-2 border-[#161412]/12 bg-[#FAF8F3] pl-10 pr-4 py-2.5 text-sm text-[#161412] placeholder:text-[#161412]/30 outline-none transition-all focus:border-[#176B45] focus:bg-white focus:ring-2 focus:ring-[#176B45]/15"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#161412]/75 mb-1.5">
                    Password <span className="text-[#176B45]">*</span> (min 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#161412]/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create a strong password"
                      className="w-full rounded-xl border-2 border-[#161412]/12 bg-[#FAF8F3] pl-10 pr-11 py-2.5 text-sm text-[#161412] placeholder:text-[#161412]/30 outline-none transition-all focus:border-[#176B45] focus:bg-white focus:ring-2 focus:ring-[#176B45]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#161412]/40 hover:text-[#161412] transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Organization & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#161412]/75 mb-1.5">
                      Organization / Lab
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#161412]/40" />
                      <input
                        type="text"
                        name="organization"
                        value={formData.organization}
                        onChange={handleChange}
                        placeholder="e.g. CSIR / NIA"
                        className="w-full rounded-xl border-2 border-[#161412]/12 bg-[#FAF8F3] pl-10 pr-4 py-2.5 text-sm text-[#161412] placeholder:text-[#161412]/30 outline-none transition-all focus:border-[#176B45] focus:bg-white focus:ring-2 focus:ring-[#176B45]/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#161412]/75 mb-1.5">
                      Professional Role
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#161412]/40" />
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full rounded-xl border-2 border-[#161412]/12 bg-[#FAF8F3] pl-10 pr-4 py-2.5 text-sm text-[#161412] outline-none transition-all focus:border-[#176B45] focus:bg-white focus:ring-2 focus:ring-[#176B45]/15 cursor-pointer"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#176B45] hover:bg-[#125537] py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(23,107,69,0.2)] hover:shadow-[0_6px_20px_rgba(23,107,69,0.3)] transition-all disabled:opacity-60 active:scale-[0.99] cursor-pointer mt-2"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <>
                      <span>Create Free Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#161412]/10" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#161412]/40">or</span>
                <div className="h-px flex-1 bg-[#161412]/10" />
              </div>

              {/* Footer Switch */}
              <div className="text-center text-xs text-[#161412]/65">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-bold text-[#176B45] hover:underline"
                >
                  Sign in here
                </Link>
              </div>
            </div>

            {/* Back to Home Link */}
            <div className="mt-4 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#161412]/50 hover:text-[#161412] transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Return to home page
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ── Minimal Institutional Footer ── */}
      <footer className="border-t border-[#161412]/10 bg-white/50 py-4 text-center text-xs text-[#161412]/50">
        <p>AayuGranth · Traditional Knowledge and Intellectual Property Support System</p>
      </footer>
    </div>
  );
}
