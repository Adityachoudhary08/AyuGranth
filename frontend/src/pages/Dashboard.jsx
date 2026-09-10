import { useState, useRef, useEffect } from 'react';
import { BookOpen, AlertTriangle, Scale, Leaf, FileText, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';

export default function Dashboard() {
  const navigate = useNavigate();
  const statCardsRef = useRef([]);
  const dashboardRef = useRef(null);

  const [stats] = useState({
    documentsAnalyzed: 14,
    documentsTrend: '+12%',
    noveltyChecks: 28,
    noveltyTrend: '+5%',
    activeAlerts: 2,
    alertsTrend: '-1',
  });

  useEffect(() => {
    // GSAP entrance animation for stat cards
    gsap.fromTo(
      statCardsRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
    );
  }, []);

  return (
    <div ref={dashboardRef} className="max-w-6xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-serif text-[#176B45] mb-2">Welcome to AyuGranth</h1>
        <p className="text-[#161412]/60">Your central hub for Ayurveda IP intelligence and regulatory compliance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div ref={el => statCardsRef.current[0] = el} className="bg-white border border-[#161412]/10 rounded-xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-blue-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
            <FileText className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-[#161412]/60 mb-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-medium">Documents Analyzed</h3>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-serif font-bold text-[#161412] tracking-tight">{stats.documentsAnalyzed}</p>
              <div className="flex items-center gap-1 text-sm font-medium text-green-600 mb-1.5">
                <TrendingUp className="w-4 h-4" />
                {stats.documentsTrend}
              </div>
            </div>
          </div>
        </div>
        
        <div ref={el => statCardsRef.current[1] = el} className="bg-white border border-[#161412]/10 rounded-xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-purple-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
            <BookOpen className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-[#161412]/60 mb-3">
              <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-medium">Formulations Checked</h3>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-serif font-bold text-[#161412] tracking-tight">{stats.noveltyChecks}</p>
              <div className="flex items-center gap-1 text-sm font-medium text-green-600 mb-1.5">
                <TrendingUp className="w-4 h-4" />
                {stats.noveltyTrend}
              </div>
            </div>
          </div>
        </div>

        <div ref={el => statCardsRef.current[2] = el} className="bg-white border border-[#161412]/10 rounded-xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-amber-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
            <AlertTriangle className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-[#161412]/60 mb-3">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-medium">Active TK Alerts</h3>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-serif font-bold text-[#161412] tracking-tight">{stats.activeAlerts}</p>
              <div className="flex items-center gap-1 text-sm font-medium text-green-600 mb-1.5">
                <TrendingDown className="w-4 h-4" />
                {stats.alertsTrend}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-[#161412]/10 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#161412]/10 bg-[#f8f7f4]">
            <h3 className="font-serif text-lg text-[#176B45]">Quick Actions</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/assistant" className="flex flex-col gap-3 p-5 border border-[#161412]/10 rounded-xl hover:border-[#176B45]/50 hover:bg-[#176B45]/5 hover:scale-[1.02] transition-all shadow-sm">
              <div className="p-2 bg-[#176B45]/10 rounded-xl w-fit text-[#176B45]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-[#161412] block mb-1">Ask AI Assistant</span>
                <span className="text-xs text-[#161412]/60 leading-relaxed block">Research classical texts and regulations</span>
              </div>
            </Link>
            <Link to="/ip/novelty" className="flex flex-col gap-3 p-5 border border-[#161412]/10 rounded-xl hover:border-[#176B45]/50 hover:bg-[#176B45]/5 hover:scale-[1.02] transition-all shadow-sm">
              <div className="p-2 bg-[#176B45]/10 rounded-xl w-fit text-[#176B45]">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-[#161412] block mb-1">Check Novelty</span>
                <span className="text-xs text-[#161412]/60 leading-relaxed block">Verify formulation patentability</span>
              </div>
            </Link>
            <Link to="/compliance/regulatory" className="flex flex-col gap-3 p-5 border border-[#161412]/10 rounded-xl hover:border-[#176B45]/50 hover:bg-[#176B45]/5 hover:scale-[1.02] transition-all shadow-sm">
              <div className="p-2 bg-[#176B45]/10 rounded-xl w-fit text-[#176B45]">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-[#161412] block mb-1">Regulatory Pathway</span>
                <span className="text-xs text-[#161412]/60 leading-relaxed block">Find Ayush licensing requirements</span>
              </div>
            </Link>
            <Link to="/documents" className="flex flex-col gap-3 p-5 border border-[#161412]/10 rounded-xl hover:border-[#176B45]/50 hover:bg-[#176B45]/5 hover:scale-[1.02] transition-all shadow-sm">
              <div className="p-2 bg-[#176B45]/10 rounded-xl w-fit text-[#176B45]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-[#161412] block mb-1">Upload Document</span>
                <span className="text-xs text-[#161412]/60 leading-relaxed block">Analyze patents and claims</span>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-[#f8f7f4] border border-[#161412]/10 rounded-xl shadow-inner overflow-hidden">
          <div className="px-6 py-5 border-b border-[#161412]/10 bg-white shadow-sm">
            <h3 className="font-serif text-lg text-[#161412]">Recent Activity</h3>
          </div>
          <div className="p-4 space-y-3">
            <button 
              onClick={() => navigate('/ip/novelty', { state: { prefill: 'Ashwagandha & Turmeric extract' } })}
              className="w-full text-left bg-white p-4 rounded-xl border border-[#161412]/10 hover:border-[#176B45]/40 hover:shadow-md transition-all flex gap-4 group"
            >
              <div className="mt-1"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="font-bold text-[#161412] group-hover:text-[#176B45] transition-colors">Novelty Check Completed</p>
                <p className="text-sm text-[#161412]/60 mt-0.5">"Ashwagandha & Turmeric extract" returned 82% novelty score.</p>
                <p className="text-xs font-medium text-[#161412]/40 mt-2 uppercase tracking-wider">2 hours ago</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/knowledge/tk-watch', { state: { prefill: 'Neem Extract' } })}
              className="w-full text-left bg-white p-4 rounded-xl border border-[#161412]/10 hover:border-amber-400/50 hover:shadow-md transition-all flex gap-4 group"
            >
              <div className="mt-1"><AlertTriangle className="w-5 h-5 text-amber-500" /></div>
              <div>
                <p className="font-bold text-[#161412] group-hover:text-amber-600 transition-colors">TK Watch Alert</p>
                <p className="text-sm text-[#161412]/60 mt-0.5">New WIPO filing detected containing "Neem Extract".</p>
                <p className="text-xs font-medium text-[#161412]/40 mt-2 uppercase tracking-wider">5 hours ago</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
