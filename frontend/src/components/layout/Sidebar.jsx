import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils/cn';
import {
  LayoutDashboard,
  Bot,
  Search,
  Network,
  Files,
  BookOpen,
  Lightbulb,
  Sparkles,
  BadgeCheck,
  Copyright,
  Lock,
  Leaf,
  Tags,
  Scale,
  ShieldCheck,
  Map,
  Activity,
  Award,
  Eye,
  Bell,
  BarChart,
  Settings,
  User,
  Globe
} from 'lucide-react';

const navigation = [
  {
    group: 'Overview',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Knowledge',
    items: [
      { name: 'AI Assistant', href: '/assistant', icon: Bot },
      { name: 'Knowledge Search', href: '/knowledge/search', icon: Search },
      { name: 'Knowledge Graph', href: '/knowledge/graph', icon: Network },
      { name: 'Documents', href: '/documents', icon: Files },
      { name: 'Traditional Knowledge', href: '/knowledge/traditional', icon: BookOpen },
    ],
  },
  {
    group: 'Intellectual Property',
    items: [
      { name: 'Patent Intelligence', href: '/ip/patents', icon: Lightbulb },
      { name: 'Novelty Search', href: '/ip/novelty', icon: Sparkles },
      { name: 'Trademarks', href: '/ip/trademarks', icon: BadgeCheck },
      { name: 'Copyright & Designs', href: '/ip/copyright-designs', icon: Copyright },
      { name: 'Trade Secrets', href: '/ip/trade-secrets', icon: Lock },
      { name: 'Plant Varieties', href: '/ip/plant-varieties', icon: Leaf },
    ],
  },
  {
    group: 'Monitoring',
    items: [
      { name: 'TK Watch', href: '/knowledge/tk-watch', icon: Eye },
      { name: 'Alerts', href: '/monitoring/alerts', icon: Bell },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <aside className="w-64 h-full bg-white border-r border-[#161412]/10 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-[#161412]/10">
        <Link to="/" className="text-xl font-serif text-[#176B45] font-semibold tracking-wide flex items-center gap-2">
          <span>AyuGranth</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#176B45]"></span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
        {navigation.map((group) => (
          <div key={group.group}>
            <h3 className="text-xs font-semibold text-[#161412]/50 uppercase tracking-wider mb-2 px-3">
              {group.group}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                        isActive
                          ? 'bg-[#176B45]/10 text-[#176B45] font-semibold'
                          : 'text-[#161412]/70 hover:bg-[#161412]/5 hover:text-[#161412]'
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-[#176B45]" : "text-[#161412]/50 group-hover:text-[#161412]")} strokeWidth={isActive ? 2.5 : 2} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-[#161412]/10">
        <ul className="space-y-1">
          <li>
            <Link
              to="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[#161412]/70 hover:bg-[#161412]/5 hover:text-[#161412] transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </li>
          <li>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[#161412]/70 hover:bg-[#161412]/5 hover:text-[#161412] transition-colors">
              <User className="w-4 h-4" />
              Profile
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
