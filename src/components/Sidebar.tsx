import React from 'react';
import {
  LayoutDashboard,
  Zap,
  Users,
  MessageSquare,
  Settings,
  Sparkles,
  LogOut,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    user,
    instagramAccount,
    inboxMessages,
    setIsRenewModalOpen,
    setIsSimulatorOpen,
    setIsConnectModalOpen,
  } = useApp();

  interface NavItem {
    id: 'home' | 'automations' | 'contacts' | 'inbox' | 'settings';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'automations', label: 'Automations', icon: Zap },
    { id: 'contacts', label: 'Contacts', icon: Users },
    {
      id: 'inbox',
      label: 'Inbox',
      icon: MessageSquare,
      badge: inboxMessages.filter((m) => m.direction === 'in').length,
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const isTrial = user.plan === 'trial' || user.plan === 'free';

  return (
    <aside className="w-[250px] bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      {/* Top Header & Logo */}
      <div>
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-slate-900 tracking-tight">AutoReply.io</span>
                <span className="text-[10px] uppercase tracking-wider bg-indigo-50 text-indigo-600 font-semibold px-1.5 py-0.5 rounded border border-indigo-100">
                  SaaS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Meta DM Automation</p>
            </div>
          </div>
        </div>

        {/* Channel Status Pill */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          {instagramAccount ? (
            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={instagramAccount.profile_pic_url}
                    alt={instagramAccount.username}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">@{instagramAccount.username}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    {instagramAccount.followers_count.toLocaleString()} followers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConnectModalOpen(true)}
                title="Switch or add account"
                className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-xs py-2 px-3 rounded-xl border border-indigo-200/60 flex items-center justify-center gap-2 transition-all"
            >
              <span>+ Connect Instagram</span>
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="p-2.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs md:text-sm transition-all ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#3B5BFF] font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#3B5BFF]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-[#3B5BFF] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Simulator CTA Box */}
        <div className="px-3 mt-2">
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium text-xs p-3 rounded-xl shadow-sm flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">Live Simulator</div>
                <div className="text-[10px] text-indigo-100">Test incoming DM/Comment</div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Bottom User Card & Plan Notice */}
      <div className="p-3 border-t border-slate-200/80 space-y-3">
        {/* Trial Upgrade Nudge if applicable */}
        {isTrial && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs">
            <div className="flex items-center gap-1.5 text-amber-800 font-semibold mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Trial Expires Soon</span>
            </div>
            <p className="text-[11px] text-amber-700 mb-2 leading-relaxed">
              Upgrade to Pro for unlimited DM replies & Meta Graph API sync.
            </p>
            <button
              onClick={() => setIsRenewModalOpen(true)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] transition-colors"
            >
              Upgrade Plan ($29/mo)
            </button>
          </div>
        )}

        {/* Profile Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover border border-slate-200"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="capitalize font-semibold text-emerald-700">{user.plan} Plan</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsRenewModalOpen(true)}
            title="Manage Plan"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
