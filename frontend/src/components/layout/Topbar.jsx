import { useState, useRef, useEffect } from 'react';
import { Bell, Search, LayoutGrid, ChevronDown, Scale, ShieldCheck, Globe, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils/cn';

export default function Topbar() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const services = [
    { name: 'Regulatory Pathway', href: '/compliance/regulatory', icon: Scale, desc: 'Find Ayush licensing requirements' },
    { name: 'ABS Compliance', href: '/compliance/abs', icon: ShieldCheck, desc: 'Biological Diversity Act checks' },
    { name: 'Evaluation Dashboard', href: '/analytics/evaluation', icon: BarChart, desc: 'System benchmark metrics' },
    { name: 'Export Navigator', href: '#', icon: Globe, desc: 'Cross-border compliance' },
  ];

  return (
    <header className="h-16 border-b border-[#161412]/10 bg-[#f8f7f4] flex items-center justify-between px-6 z-40 relative">
      <div className="flex-1 flex items-center gap-4">
        {/* Command Search Bar Trigger */}
        <button className="flex items-center gap-2 text-sm text-[#161412]/50 bg-white border border-[#161412]/10 rounded-xl px-4 py-2 w-72 hover:border-[#176B45]/50 hover:bg-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#176B45]/20">
          <Search className="w-4 h-4" />
          <span>Search AyuGranth...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-[#f8f7f4] px-1.5 font-mono text-[10px] font-medium text-[#161412]/50 border border-[#161412]/10">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* Services Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setServicesOpen(!servicesOpen)}
            className={cn(
              "flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors border",
              servicesOpen ? "bg-[#176B45]/10 text-[#176B45] border-[#176B45]/20" : "bg-white border-[#161412]/10 text-[#161412]/70 hover:bg-[#161412]/5 shadow-sm"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Services
            <ChevronDown className="w-4 h-4 opacity-50" />
          </button>

          {servicesOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-[#161412]/10 rounded-xl shadow-lg p-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#161412]/40">Explore Tools</h4>
              <div className="flex flex-col gap-1">
                {services.map((service) => (
                  <Link
                    key={service.name}
                    to={service.href}
                    onClick={() => setServicesOpen(false)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#161412]/5 transition-colors group"
                  >
                    <div className="bg-[#176B45]/10 text-[#176B45] p-2 rounded-md shrink-0 group-hover:bg-[#176B45] group-hover:text-white transition-colors">
                      <service.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#161412] group-hover:text-[#176B45] transition-colors">{service.name}</p>
                      <p className="text-xs text-[#161412]/50 mt-0.5">{service.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-[#161412]/60 hover:text-[#176B45] transition-colors bg-white border border-[#161412]/10 rounded-xl shadow-sm">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#d97706] rounded-full border-2 border-white"></span>
        </button>
        <div className="w-10 h-10 rounded-xl bg-[#176B45] flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm border border-[#176B45]/20">
          A
        </div>
      </div>
    </header>
  );
}
