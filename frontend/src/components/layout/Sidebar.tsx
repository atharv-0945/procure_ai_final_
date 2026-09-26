import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ListCheck,
  Building2,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  Network,
  Columns3,
  Download,
  ShieldCheck,
  Bot,
} from 'lucide-react';

interface SidebarProps {
  currentTenderId?: string | number;
  onOpenChat?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTenderId, onOpenChat }) => {
  const tenderParam = currentTenderId ? `?tenderId=${currentTenderId}` : '';

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
        { to: '/tenders', label: 'Tender Registry', icon: FileText },
        { to: `/requirements${tenderParam}`, label: 'Requirements Matrix', icon: ListCheck },
      ],
    },
    {
      label: 'Evaluation',
      items: [
        { to: `/bidders${tenderParam}`, label: 'Bidder Dossiers', icon: Building2 },
        { to: `/verification${tenderParam}`, label: 'Document & Evidence OCR', icon: FileSearch },
        { to: `/compliance${tenderParam}`, label: 'Compliance Audit', icon: CheckCircle2 },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { to: `/risk-signals${tenderParam}`, label: 'Vigilance & Risks', icon: AlertTriangle },
        { to: `/risk-graph${tenderParam}`, label: 'Entity Network Graph', icon: Network },
        { to: `/comparison${tenderParam}`, label: 'Bidder Comparison', icon: Columns3 },
        { to: `/export${tenderParam}`, label: 'Audit Reports & Export', icon: Download },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#0b0f19] border-r border-[#1e293b] h-screen sticky top-0 flex flex-col flex-shrink-0 overflow-hidden">
      {/* App Logo & Header */}
      <div className="px-4 py-4 border-b border-[#1e293b] flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg bg-[#6366f1] flex items-center justify-center shadow-lg shadow-indigo-600/30 flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-slate-100 text-sm tracking-tight font-display leading-tight">ProcureAI</h1>
          <p className="text-[10px] text-[#6366f1] font-mono font-semibold tracking-widest uppercase">Enterprise Intelligence</p>
        </div>
      </div>

      {/* Navigation — fills remaining space, scrollable if needed */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-2 pb-2 text-[9px] font-extrabold text-slate-600 uppercase tracking-[0.18em] font-mono border-b border-[#1e293b] mb-1.5">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-[#6366f1]/15 text-[#c0c1ff] font-semibold border border-[#6366f1]/30 shadow-sm'
                          : 'text-slate-400 hover:bg-[#111827] hover:text-slate-200 border border-transparent'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate leading-tight">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Dock: Grok AI button only */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-[#1e293b]">
        {onOpenChat && (
          <button
            onClick={onOpenChat}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gradient-to-r from-[#6366f1]/10 to-[#4f46e5]/10 border border-[#6366f1]/30 hover:border-[#6366f1]/60 hover:from-[#6366f1]/20 hover:to-[#4f46e5]/20 text-slate-200 text-xs font-medium transition-all group"
          >
            <span className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-[#6366f1] group-hover:scale-110 transition-transform" />
              <span className="text-[#c0c1ff] font-semibold">Grok Assistant</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#6366f1]/25 text-[#c0c1ff] font-mono uppercase font-bold border border-[#6366f1]/30 tracking-widest">AI</span>
          </button>
        )}
      </div>
    </aside>
  );
};
