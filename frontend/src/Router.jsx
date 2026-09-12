import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import App from './App.jsx';
import AppShell from './components/layout/AppShell.jsx';

// Core Pages (Dashboard flow - Isolated from public navigation)
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

// New Public Products
import AskAayuGranth from './pages/AskAayuGranth.jsx';
import ProductPassport from './pages/ProductPassport.jsx';
import ProductPassportPage from './pages/ProductPassportPage.jsx';
import PublicPassportPage from './pages/PublicPassportPage.jsx';
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

// Placeholder Pages for future public development
const PlaceholderPage = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#faf8f3] text-[#161412]">
    <div className="text-center">
      <h1 className="text-3xl font-serif text-[#176B45] mb-4">{title}</h1>
      <p className="opacity-70">This module is under development.</p>
      <a href="/" className="mt-6 inline-block px-4 py-2 bg-[#176B45] text-white rounded-md text-sm font-medium hover:bg-[#125537] transition-colors">Return Home</a>
    </div>
  </div>
);

export default function Router() {
  return (
    <BrowserRouter>
      <SurfaceController />
      <Routes>
        {/* Landing Page (Existing) */}
        <Route path="/" element={<App />} />

        {/* New Standalone Public Products */}
        <Route path="/ask-aayugranth" element={<AskAayuGranth />} />
        <Route path="/chat" element={<AskAayuGranth />} />
        
        {/* IP-SAKTI Product Passport */}
        <Route path="/passports" element={<Passports />} />
        <Route path="/verify/:passportId" element={<PublicPassportPage />} />
        <Route path="/product-passport" element={<ProductPassportPage />} />
        <Route path="/product-passport/:passportId" element={<ProductPassportPage />} />
        <Route path="/patent-passport" element={<ProductPassportPage />} />
        <Route path="/patent-passport-legacy" element={<ProductPassport />} />

        {/* Direct IP & Compliance routes */}
        <Route path="/knowledge-dna" element={<App />} /> {/* Using App for now since it scrolls to #knowledge-dna */}
        <Route path="/patent-process" element={<App />} />
        <Route path="/patentability" element={<PatentabilityTool />} />
        <Route path="/traditional-knowledge" element={<TKPriorArt />} />
        <Route path="/prior-art" element={<PriorArtRadar />} />
        <Route path="/abs" element={<ABSPage />} />
        <Route path="/regulatory" element={<PlaceholderPage title="Regulatory Intelligence" />} />
        <Route path="/international" element={<InternationalLanding />} />

        {/* IP Intelligence Workspace */}
        <Route path="/ip-intelligence" element={<IPIntelligenceLanding />} />
        <Route path="/ip-intelligence/patentability" element={<PatentabilityTool />} />
        <Route path="/ip-intelligence/prior-art" element={<PriorArtRadar />} />
        <Route path="/ip-intelligence/novelty" element={<NoveltySandbox />} />
        <Route path="/ip-intelligence/tk" element={<TKPriorArt />} />

        {/* Legacy / Secondary IP Tools */}
        <Route path="/trademark" element={<TrademarkPage />} />
        <Route path="/gi-tag" element={<GITagPage />} />
        <Route path="/faq" element={<App />} />

        {/* Application Shell (Isolated/Admin Dashboard flow) */}
        <Route element={<AppShell />}>
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
  );
}

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
