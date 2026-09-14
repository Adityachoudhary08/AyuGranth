import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Search, 
  FlaskConical, 
  BookOpen,
  ArrowRight,
  Shield,
  MapPin,
  Copyright,
  PenTool,
  Lock,
  Leaf
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../../../components/Navbar';
export default function IPIntelligenceLanding() {
  const { t } = useTranslation();

  const coreTools = [
    {
      id: 'patentability',
      title: t('ip.intelligence.tools.patentability.title', 'Patentability'),
      description: t('ip.intelligence.tools.patentability.desc', 'Assess whether your formulation may be patentable under Sections 3(p) and 3(d).'),
      icon: ShieldCheck,
      href: '/ip-intelligence/patent-intelligence',
      color: 'bg-emerald-50 text-emerald-700',
    },
    {
      id: 'prior-art',
      title: t('ip.intelligence.tools.priorArt.title', 'Prior-Art Radar'),
      description: t('ip.intelligence.tools.priorArt.desc', 'Find semantically similar patents and existing formulations to assess novelty risks.'),
      icon: Search,
      href: '/ip-intelligence/prior-art',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      id: 'novelty',
      title: t('ip.intelligence.tools.novelty.title', 'Novelty Sandbox'),
      description: t('ip.intelligence.tools.novelty.desc', 'Experiment with ingredients and measure real-time novelty scores to guide R&D.'),
      icon: FlaskConical,
      href: '/ip-intelligence/novelty',
      color: 'bg-purple-50 text-purple-700',
    },
    {
      id: 'tk',
      title: t('ip.intelligence.tools.tk.title', 'TK Prior-Art'),
      description: t('ip.intelligence.tools.tk.desc', 'Search traditional Ayurvedic knowledge to prevent misappropriation claims.'),
      icon: BookOpen,
      href: '/ip-intelligence/tk',
      color: 'bg-amber-50 text-amber-700',
    }
  ];

  const secondaryTools = [
    { title: t('ip.intelligence.secondary.trademark', 'Trademark'), href: '/trademark', icon: Shield, active: true },
    { title: t('ip.intelligence.secondary.giTag', 'GI Tag'), href: '/gi-tag', icon: MapPin, active: true },
    { title: t('ip.intelligence.secondary.copyright', 'Copyright'), href: '#', icon: Copyright, active: false },
    { title: t('ip.intelligence.secondary.design', 'Design'), href: '#', icon: PenTool, active: false },
    { title: t('ip.intelligence.secondary.tradeSecret', 'Trade Secret'), href: '#', icon: Lock, active: false },
    { title: t('ip.intelligence.secondary.plantVariety', 'Plant Variety'), href: '#', icon: Leaf, active: false },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f3] font-sans pb-20">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6" style={{ paddingTop: '140px' }}>
        
        {/* HERO */}
        <div className="mb-16 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#176B45]/10 text-[#176B45] text-xs font-bold uppercase tracking-widest rounded-full mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('ip.intelligence.badge', 'IP Intelligence')}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#161412] mb-6 tracking-tight">
            {t('ip.intelligence.heading1', "Understand your product's")} <br className="hidden md:block"/> {t('ip.intelligence.heading2', "IP landscape.")}
          </h1>
          <p className="text-[#161412]/60 max-w-2xl mx-auto text-lg leading-relaxed">
            {t('ip.intelligence.subtitle', 'Use AI-powered patentability assessment, prior-art search, novelty analysis, and traditional-knowledge screening to understand the IP position of your Ayurvedic formulation.')}
          </p>
        </div>

        {/* CORE TOOLS */}
        <div className="mb-20">
          <div className="mb-8 border-b border-[#161412]/10 pb-4">
            <h2 className="text-2xl font-serif text-[#161412] mb-2">{t('ip.intelligence.coreTools', 'Core IP Intelligence')}</h2>
            <p className="text-sm text-[#161412]/60">{t('ip.intelligence.coreToolsDesc', 'Four AI-powered tools for evaluating novelty, patentability and existing knowledge.')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coreTools.map((tool) => (
              <Link 
                key={tool.id} 
                to={tool.href}
                className="group flex flex-col justify-between bg-white p-8 rounded-2xl border border-[#161412]/15 shadow-sm hover:shadow-md hover:border-[#176B45]/40 transition-all duration-300"
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${tool.color}`}>
                    <tool.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-serif text-[#161412] mb-3 group-hover:text-[#176B45] transition-colors">{tool.title}</h3>
                  <p className="text-sm text-[#161412]/70 leading-relaxed mb-6">{tool.description}</p>
                </div>
                <div className="flex items-center text-sm font-medium text-[#176B45]">
                  {t('ip.intelligence.openWorkspace', 'Open Workspace')} <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* SECONDARY TOOLS */}
        <div>
          <div className="mb-6 border-b border-[#161412]/10 pb-4">
            <h2 className="text-lg font-serif text-[#161412] mb-1">{t('ip.intelligence.otherTools', 'Other IP Tools')}</h2>
            <p className="text-xs text-[#161412]/50">{t('ip.intelligence.otherToolsDesc', 'Specialized registration checks and specialized IP regimes.')}</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {secondaryTools.map((tool, idx) => (
              tool.active ? (
                <Link 
                  key={idx}
                  to={tool.href}
                  className="bg-white p-4 rounded-xl border border-[#161412]/10 hover:border-[#176B45]/30 hover:bg-[#176B45]/5 transition-all text-center flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#f8f7f4] flex items-center justify-center text-[#161412]/60 group-hover:text-[#176B45] group-hover:bg-white transition-colors">
                    <tool.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-[#161412]">{tool.title}</span>
                </Link>
              ) : (
                <div 
                  key={idx}
                  className="bg-[#f8f7f4]/50 p-4 rounded-xl border border-[#161412]/5 text-center flex flex-col items-center justify-center gap-3 relative overflow-hidden"
                >
                  <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-[#161412]/30">
                    <tool.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-[#161412]/40">{tool.title}</span>
                  <div className="absolute top-1 right-1 bg-black/5 text-[#161412]/40 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded">
                    {t('common.soon', 'Soon')}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
