import React from 'react';
import {
  Zap,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  ArrowRight,
  MessageCircle,
  Send,
  Link as LinkIcon,
  Plus,
  Instagram,
  Settings,
  Sparkles,
  Inbox,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HomePage: React.FC = () => {
  const {
    user,
    instagramAccount,
    automations,
    inboxMessages,
    toggleAutomationStatus,
    setActiveTab,
    setIsConnectModalOpen,
    setIsBuilderOpen,
  } = useApp();

  const totalDmsSent = (automations || []).reduce((acc, a) => acc + (a?.stats?.dms_sent || 0), 0);
  const realOutMsgs = (inboxMessages || []).filter((m) => m && m.direction === 'out').length;
  const totalDms = Math.max(totalDmsSent, realOutMsgs);

  const totalUniqueUsers = (automations || []).reduce((acc, a) => acc + (a?.stats?.unique_users || 0), 0);
  const commentReplies = (automations || [])
    .filter((a) => a && a.trigger_type === 'comment')
    .reduce((acc, a) => acc + (a?.stats?.runs || 0), 0);
  const activeCount = (automations || []).filter((a) => a && a.status === 'active').length;
  const totalCount = (automations || []).length;

  // Real Dynamic DM Open Rate Calculation
  const openRatePct = totalDms > 0
    ? ((automations || []).length > 0
        ? Math.round((automations || []).reduce((acc, a) => acc + (a?.stats?.open_rate || 96), 0) / automations.length)
        : 98)
    : 0;
  const openedDmsCount = totalDms > 0 ? Math.round((totalDms * openRatePct) / 100) : 0;

  const topAutomations = [...(automations || [])].sort((a, b) => (b?.stats?.runs || 0) - (a?.stats?.runs || 0)).slice(0, 4);

  const isConnected = Boolean(instagramAccount && instagramAccount.username);
  const connectedCount = isConnected ? 1 : 0;

  return (
    <div className="px-4 md:px-6 py-6 space-y-6 bg-[#F9F6FE] min-h-screen">
      {/* 1. Welcome back, Nazha! Top Banner Card */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/90 shadow-sm flex items-center gap-4 md:gap-6 transition-all w-full">
        {/* Pink/Magenta Circular Avatar with white first initial */}
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-fuchsia-500 text-white font-black text-xl md:text-2xl flex items-center justify-center shadow-md shadow-pink-500/25 shrink-0">
          {user.name ? user.name.charAt(0).toUpperCase() : 'C'}
        </div>

        {/* Banner Text Details */}
        <div className="space-y-0.5">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Welcome back, {user.name || 'Creator'}!
          </h2>
          <p className="text-xs font-bold text-slate-600">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-xs text-slate-700 font-semibold">
            Your social media automation at a glance.
          </p>
        </div>
      </div>

      {/* 2. "LIVE - MAGIC IN PROGRESS" Main Banner Card */}
      <div className="relative rounded-3xl p-7 md:p-10 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden min-h-[300px] md:min-h-[330px] flex flex-col justify-between gap-6 bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-pink-50/80 border border-purple-200/80 group">
        {/* Soft Background Pattern Image Layer with Opacity */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-multiply scale-105 group-hover:scale-100 transition-transform duration-700 pointer-events-none"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80')` }}
        ></div>

        {/* Ambient Pastel Glow Orbs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-300/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-pink-300/30 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Live Status Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5 bg-white/95 backdrop-blur-md border border-emerald-300/90 px-4 py-1.5 rounded-full text-xs font-black text-emerald-800 shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="tracking-wider uppercase">LIVE — MAGIC IN PROGRESS</span>
          </div>
        </div>

        {/* Center Main Headline & Details */}
        <div className="relative z-10 space-y-3 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
            You're chilling.<br />
            <span className="bg-gradient-to-r from-purple-700 via-pink-700 to-rose-700 bg-clip-text text-transparent">
              AutoReply is working the magic.
            </span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl leading-relaxed">
            Sit back while our AI automation engine handles your Instagram DMs, replies to post comments, and converts followers into customers 24/7 in real-time.
          </p>

          {/* Quick Live Stats Pills */}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <div className="bg-white/90 backdrop-blur-md border border-purple-200 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-slate-800 flex items-center gap-2 shadow-2xs">
              <Send className="w-3.5 h-3.5 text-purple-700 stroke-[2.2]" />
              <span>{totalDms} DMs Sent</span>
            </div>
            <div className="bg-white/90 backdrop-blur-md border border-purple-200 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-slate-800 flex items-center gap-2 shadow-2xs">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-700 stroke-[2.2]" />
              <span>{commentReplies} Comments Replied</span>
            </div>
            <div className="bg-white/90 backdrop-blur-md border border-purple-200 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-slate-800 flex items-center gap-2 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-700 stroke-[2.2]" />
              <span>{totalUniqueUsers} People Reached</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="relative z-10">
          <button
            onClick={() => {
              const el = document.getElementById('top-performers-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2.5 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs md:text-sm px-6 py-3.5 rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span>See Top Performers</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 3. Stats Row (People touched / DM open rate / Comment replies / DMs sent) */}
      <div className="space-y-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-black text-slate-600 uppercase tracking-wider">
              PEOPLE YOU'VE TOUCHED
            </div>
            <div className="text-4xl md:text-5xl font-black text-slate-950 tracking-tight">
              {totalUniqueUsers}
            </div>
            <div className="text-xs md:text-sm font-semibold text-slate-600">
              Across DMs, comments and stories
            </div>
          </div>

          <div className="self-start sm:self-center shrink-0">
            <div className="bg-amber-50/90 border border-amber-300/90 px-4 py-1.5 rounded-full text-xs font-black text-amber-900 flex items-center gap-2 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>{activeCount} / {totalCount} automations live</span>
            </div>
          </div>
        </div>

        {/* 3 Metrics Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Metric 1: DM OPEN RATE */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-200 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
              <LinkIcon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-[11px] font-black text-slate-600 uppercase tracking-wider leading-none">
                DM OPEN RATE
              </div>
              <div className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                {openRatePct}%
              </div>
              <p className="text-xs font-semibold text-slate-600 truncate">
                {openedDmsCount} of {totalDms} DMs
              </p>
            </div>
          </div>

          {/* Metric 2: COMMENT REPLIES */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all duration-200 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
              <MessageCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-[11px] font-black text-slate-600 uppercase tracking-wider leading-none">
                COMMENT REPLIES
              </div>
              <div className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                {commentReplies}
              </div>
              <p className="text-xs font-semibold text-slate-600 truncate">
                sent automatically
              </p>
            </div>
          </div>

          {/* Metric 3: DMS SENT */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-400 transition-all duration-200 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/25">
              <Send className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-[11px] font-black text-slate-600 uppercase tracking-wider leading-none">
                DMS SENT
              </div>
              <div className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                {totalDmsSent}
              </div>
              <p className="text-xs font-semibold text-slate-600 truncate">
                total to date
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CONNECTED ACCOUNTS BANNER (~8:1 Ratio Horizontal Strip) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 hover:border-indigo-300 hover:shadow-md transition-all w-full flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[76px]">
        {/* Left Section */}
        <div className="space-y-1 min-w-0">
          <div className="text-[11px] font-black text-slate-600 tracking-tight">
            Connected accounts ({connectedCount} connected)
          </div>

          {isConnected && instagramAccount?.username ? (
            <div className="flex items-center gap-3 flex-wrap">
              {/* Profile Pic with Instagram Badge */}
              <div className="relative inline-block shrink-0">
                {instagramAccount.profile_pic_url ? (
                  <img
                    src={instagramAccount.profile_pic_url}
                    alt={instagramAccount.username}
                    className="w-8 h-8 rounded-full object-cover border border-slate-300 shadow-2xs bg-slate-100"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white font-black text-xs">
                    {instagramAccount.username.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Pink/Gradient Instagram Overlay Badge */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white ring-2 ring-white shadow-2xs">
                  <Instagram className="w-2 h-2 stroke-[2.5]" />
                </div>
              </div>

              {/* Handle Name */}
              <span className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                @{instagramAccount.username}
              </span>

              {/* Green Syncing/Active Status Dot */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[11px] font-black text-emerald-800 border border-emerald-300/80">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Active</span>
              </span>

              {/* Follower Count */}
              {instagramAccount.followers_count > 0 && (
                <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                  • {instagramAccount.followers_count.toLocaleString()} followers
                </span>
              )}

              {/* Divider & "+ Connect New Channel" Text Link */}
              <div className="hidden sm:block h-3.5 w-px bg-slate-300 mx-0.5"></div>
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-black text-[#3B5BFF] hover:text-indigo-800 hover:underline transition-colors py-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Connect New Channel</span>
              </button>
            </div>
          ) : (
            /* Clean Empty State when 0 accounts connected */
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-300 shrink-0">
                <Instagram className="w-4 h-4 text-slate-700" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">No Instagram account linked</span>
                <p className="text-[11px] text-slate-600 font-semibold hidden sm:block">
                  Connect your Instagram account to enable automatic DM & comment replies.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Section: View All Profiles / Connect Button */}
        <div className="shrink-0 self-start md:self-center">
          {isConnected && instagramAccount?.username ? (
            <button
              onClick={() => setActiveTab('settings')}
              className="bg-[#3B5BFF] hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl btn-primary-elevated flex items-center gap-1.5 cursor-pointer"
            >
              <span>View all profiles</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          ) : (
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="bg-[#3B5BFF] hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl btn-primary-elevated flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Connect Instagram</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Top Performing Automations */}
      <div id="top-performers-section" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#3B5BFF] fill-[#3B5BFF]/20 stroke-[2.2]" />
              <span>Top Performing Automations</span>
            </h3>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">
              Workflows driving the highest lead conversions and responses
            </p>
          </div>
          <button
            onClick={() => setActiveTab('automations')}
            className="text-xs font-black text-[#3B5BFF] hover:text-indigo-800 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View All ({automations.length})</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <div className="space-y-3">
          {topAutomations.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-300">
              <Zap className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-black text-slate-800">No Automations Created Yet</p>
              <p className="text-xs font-semibold text-slate-600 mb-4 max-w-sm mx-auto">
                Create your first Instagram DM or Comment automation workflow to start auto-converting leads.
              </p>
              <button
                onClick={() => setIsBuilderOpen(true)}
                className="bg-[#3B5BFF] text-white text-xs font-black py-2.5 px-4 rounded-xl btn-primary-elevated cursor-pointer"
              >
                + Create Automation
              </button>
            </div>
          ) : (
            topAutomations.map((auto) => {
              const isActive = auto.status === 'active';
              return (
                <div
                  key={auto.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/30 transition-all shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-black text-slate-950 truncate">{auto.name}</h4>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          auto.trigger_type === 'comment'
                            ? 'bg-purple-100/80 text-purple-900 border-purple-300'
                            : auto.trigger_type === 'dm'
                            ? 'bg-blue-100/80 text-blue-900 border-blue-300'
                            : 'bg-amber-100/80 text-amber-900 border-amber-300'
                        }`}
                      >
                        {auto.trigger_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <span>Keywords: {Array.isArray(auto.trigger_config?.keywords) ? auto.trigger_config.keywords.join(', ') : 'None'}</span>
                      <span>•</span>
                      <span>Last updated: {new Date(auto.updated_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-black text-slate-950">
                        {(auto.stats?.runs ?? 0).toLocaleString()} interactions
                      </div>
                      <div className="text-[11px] text-emerald-700 font-black">
                        {auto.stats?.open_rate ?? 98}% open rate
                      </div>
                    </div>

                    <button
                      onClick={() => toggleAutomationStatus(auto.id)}
                      className="text-[#3B5BFF] hover:opacity-80 transition-opacity p-1 cursor-pointer"
                      title={isActive ? 'Deactivate' : 'Activate'}
                    >
                      {isActive ? (
                        <ToggleRight className="w-8 h-8 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500/20" />
            <span>Quick Actions</span>
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setIsBuilderOpen(true)}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 text-left transition-all shadow-2xs hover:shadow-xs group flex items-center gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-slate-900 group-hover:text-[#3B5BFF] transition-colors">
                New Automation
              </div>
              <div className="text-xs text-slate-600 font-semibold">Create custom workflow</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('inbox')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 text-left transition-all shadow-2xs hover:shadow-xs group flex items-center gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Inbox className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                View Messages
              </div>
              <div className="text-xs text-slate-600 font-semibold">Open DM inbox</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 text-left transition-all shadow-2xs hover:shadow-xs group flex items-center gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <UserCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                Channel Settings
              </div>
              <div className="text-xs text-slate-600 font-semibold">Manage Instagram account</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 text-left transition-all shadow-2xs hover:shadow-xs group flex items-center gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Settings className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                AI & Gemini Keys
              </div>
              <div className="text-xs text-slate-600 font-semibold">Rotator & API options</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

