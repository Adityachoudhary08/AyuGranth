import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import App from './App.jsx';
import AppShell from './components/layout/AppShell.jsx';

// Core Pages (Dashboard flow)
import Dashboard from './pages/Dashboard.jsx';
import Assistant from './pages/Assistant.jsx';
import Documents from './pages/Documents.jsx';

// IP Suite (Dashboard flow)
import Patents from './pages/ip/Patents.jsx';
import Novelty from './pages/ip/Novelty.jsx';
import Trademarks from './pages/ip/Trademarks.jsx';

// Compliance (Dashboard flow)
import Regulatory from './pages/compliance/Regulatory.jsx';
import ABS from './pages/compliance/ABS.jsx';

// Knowledge (Dashboard flow)
import TKOverlap from './pages/knowledge/TKOverlap.jsx';
import TKWatch from './pages/knowledge/TKWatch.jsx';

// Analytics (Dashboard flow)
import Evaluation from './pages/analytics/Evaluation.jsx';

// Feature Pages (require login)
import AskAayuGranth from './pages/AskAayuGranth.jsx';
import ProductPassport from './pages/ProductPassport.jsx';
import ProductPassportPage from './pages/ProductPassportPage.jsx';
import Passports from './pages/Passports.jsx';
import TrademarkPage from './pages/ip/TrademarkPage.jsx';
import GITagPage from './pages/ip/GITagPage.jsx';
import ABSPage from './pages/compliance/ABSPage.jsx';
import IPIntelligenceLanding from './pages/ip/workspace/IPIntelligenceLanding.jsx';
import PatentabilityTool from './pages/ip/workspace/PatentabilityTool.jsx';
import PriorArtRadar from './pages/ip/workspace/PriorArtRadar.jsx';
import NoveltySandbox from './pages/ip/workspace/NoveltySandbox.jsx';
import TKPriorArt from './pages/ip/workspace/TKPriorArt.jsx';
import InternationalLanding from './pages/international/InternationalLanding.jsx';

// Public-only pages
import PublicPassportPage from './pages/PublicPassportPage.jsx';

// Auth
import { AuthProvider } from './context/AuthContext.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────

/** Shorthand — keeps JSX tidy without repeating ProtectedRoute everywhere. */
const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

/** Placeholder for routes still under development. */
const PlaceholderPage = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#faf8f3] text-[#161412]">
    <div className="text-center">
      <h1 className="text-3xl font-serif text-[#176B45] mb-4">{title}</h1>
      <p className="opacity-70">This module is under development.</p>
      <a
        href="/"
        className="mt-6 inline-block px-4 py-2 bg-[#176B45] text-white rounded-md text-sm font-medium hover:bg-[#125537] transition-colors"
      >
        Return Home
      </a>
    </div>
  </div>
);

// ── Router ────────────────────────────────────────────────────────────────

export default function Router() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SurfaceController />
        <Routes>

          {/* ── Truly public routes (no login required) ───────────────────── */}
          <Route path="/" element={<App />} />
          <Route path="/faq" element={<App />} />
          <Route path="/knowledge-dna" element={<App />} />  {/* scrolls to section */}
          <Route path="/patent-process" element={<App />} />  {/* scrolls to section */}

          {/* Auth pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signup" element={<RegisterPage />} />

          {/* Public QR verification — shareable without an account */}
          <Route path="/verify/:passportId" element={<PublicPassportPage />} />

          {/* ── Protected feature routes (login required) ─────────────────── */}

          {/* AI Assistant / Chat */}
          <Route path="/ask-aayugranth" element={<P><AskAayuGranth /></P>} />
          <Route path="/chat" element={<P><AskAayuGranth /></P>} />

          {/* Product Passports */}
          <Route path="/passports" element={<P><Passports /></P>} />
          <Route path="/product-passport" element={<P><ProductPassportPage /></P>} />
          <Route path="/product-passport/:passportId" element={<P><ProductPassportPage /></P>} />
          <Route path="/patent-passport" element={<P><ProductPassportPage /></P>} />
          <Route path="/patent-passport-legacy" element={<P><ProductPassport /></P>} />

          {/* IP & Compliance tools */}
          <Route path="/patentability" element={<P><PatentabilityTool /></P>} />
          <Route path="/traditional-knowledge" element={<P><TKPriorArt /></P>} />
          <Route path="/prior-art" element={<P><PriorArtRadar /></P>} />
          <Route path="/abs" element={<P><ABSPage /></P>} />
          <Route path="/regulatory" element={<P><PlaceholderPage title="Regulatory Intelligence" /></P>} />
          <Route path="/international" element={<P><InternationalLanding /></P>} />
          <Route path="/trademark" element={<P><TrademarkPage /></P>} />
          <Route path="/gi-tag" element={<P><GITagPage /></P>} />

          {/* IP Intelligence Workspace */}
          <Route path="/ip-intelligence" element={<P><IPIntelligenceLanding /></P>} />
          <Route path="/ip-intelligence/patentability" element={<P><PatentabilityTool /></P>} />
          <Route path="/ip-intelligence/prior-art" element={<P><PriorArtRadar /></P>} />
          <Route path="/ip-intelligence/novelty" element={<P><NoveltySandbox /></P>} />
          <Route path="/ip-intelligence/tk" element={<P><TKPriorArt /></P>} />

          {/* ── Application Shell / Dashboard — entire subtree protected ──── */}
          <Route element={<P><AppShell /></P>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/documents" element={<Documents />} />

            {/* IP Suite */}
            <Route path="/ip/patents" element={<Patents />} />
            <Route path="/ip/novelty" element={<Novelty />} />
            <Route path="/ip/trademarks" element={<Trademarks />} />

            {/* Compliance */}
            <Route path="/compliance/regulatory" element={<Regulatory />} />
            <Route path="/compliance/abs" element={<ABS />} />

            {/* Knowledge */}
            <Route path="/knowledge/traditional" element={<TKOverlap />} />
            <Route path="/knowledge/tk-watch" element={<TKWatch />} />

            {/* Analytics */}
            <Route path="/analytics/evaluation" element={<Evaluation />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// ── Surface controller (landing vs functional body class) ─────────────────

function SurfaceController() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.body.dataset.surface = pathname === '/' ? 'landing' : 'functional';
    return () => {
      delete document.body.dataset.surface;
    };
  }, [pathname]);

  return null;
}

