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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HomePage: React.FC = () => {
  const {
    automations,
    toggleAutomationStatus,
    setActiveTab,
  } = useApp();

  const totalDmsSent = automations.reduce((acc, a) => acc + a.stats.dms_sent, 0) || 22;
  const totalUniqueUsers = automations.reduce((acc, a) => acc + a.stats.unique_users, 0) || 2;
  const commentReplies = automations
    .filter((a) => a.trigger_type === 'comment')
    .reduce((acc, a) => acc + a.stats.runs, 0);
  const activeCount = automations.filter((a) => a.status === 'active').length;
  const totalCount = automations.length || 1;

  const topAutomations = [...automations].sort((a, b) => b.stats.runs - a.stats.runs).slice(0, 4);

  return (
    <div className="px-4 md:px-6 py-6 space-y-6 bg-[#F7F6FB] min-h-screen">
      {/* 1. Welcome back, Nazha! Top Banner Card */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-2xs flex items-center gap-4 md:gap-6 transition-all w-full">
        {/* Pink/Magenta Circular Avatar with white 'T' */}
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-fuchsia-500 text-white font-extrabold text-xl md:text-2xl flex items-center justify-center shadow-md shadow-pink-500/20 shrink-0">
          T
        </div>

        {/* Banner Text Details */}
        <div className="space-y-0.5">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Welcome back, Nazha!
          </h2>
          <p className="text-xs font-semibold text-slate-400">
            Thursday, August 13, 2026
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Your social media automation at a glance.
          </p>
        </div>
      </div>

      {/* 2. "LIVE - MAGIC IN PROGRESS" Main Banner Card */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between gap-6 min-h-[280px] md:min-h-[320px] bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/20">
        {/* Top Pill / Badge */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1 rounded-full text-xs font-bold text-slate-800 shadow-2xs border border-slate-200/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>LIVE - MAGIC IN PROGRESS</span>
          </div>
        </div>

        {/* Center Content */}
        <div className="space-y-2 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.18]">
            You're chilling.<br />AutoReply.io's working the magic.
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 pt-0.5">
            {totalDmsSent} DMs sent · {commentReplies} comments replied · {totalUniqueUsers} people reached
          </p>
        </div>

        {/* CTA Button */}
        <div>
          <button
            onClick={() => {
              const el = document.getElementById('top-performers-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200/90 shadow-2xs px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all duration-200 hover:shadow-xs"
          >
            <span>See top performers</span>
            <ArrowRight className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>

      {/* 3. "PEOPLE YOU'VE TOUCHED" Card (~6:1 Ratio) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            PEOPLE YOU'VE TOUCHED
          </div>
          <div className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            {totalUniqueUsers}
          </div>
          <div className="text-xs md:text-sm font-medium text-slate-500">
            Across DMs, comments and stories
          </div>
        </div>

        <div className="self-start sm:self-center shrink-0">
          <div className="bg-amber-50 border border-amber-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{activeCount} / {totalCount} automations live</span>
          </div>
        </div>
      </div>

      {/* 4. 3 Metrics Grid Cards (Row) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: DM OPEN RATE */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-3 hover:border-blue-300 transition-all flex items-start gap-4 h-[141.067px]">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              DM OPEN RATE
            </div>
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              81%
            </div>
            <p className="text-xs text-slate-500 font-medium">
              18 of {totalDmsSent} DMs
            </p>
          </div>
        </div>

        {/* Metric 2: COMMENT REPLIES */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-3 hover:border-emerald-300 transition-all flex items-start gap-4 h-[141.067px]">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-dashed border border-slate-300/60 rounded px-1">
              COMMENT REPLIES
            </div>
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {commentReplies}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              sent automatically
            </p>
          </div>
        </div>

        {/* Metric 3: DMS SENT */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-3 hover:border-amber-300 transition-all flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              DMS SENT
            </div>
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {totalDmsSent}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              total to date
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Send className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 5. Top Performing Automations */}
      <div id="top-performers-section" className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#3B5BFF]" />
              <span>Top Performing Automations</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Workflows driving the highest lead conversions and responses
            </p>
          </div>
          <button
            onClick={() => setActiveTab('automations')}
            className="text-xs font-bold text-[#3B5BFF] hover:text-indigo-700 hover:underline flex items-center gap-1 transition-colors"
          >
            <span>View All ({automations.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {topAutomations.map((auto) => {
            const isActive = auto.status === 'active';
            return (
              <div
                key={auto.id}
                className="p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 bg-white hover:bg-indigo-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{auto.name}</h4>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                        auto.trigger_type === 'comment'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : auto.trigger_type === 'dm'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {auto.trigger_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Keywords: {auto.trigger_config.keywords.join(', ')}</span>
                    <span>•</span>
                    <span>Last updated: {new Date(auto.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60">
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-extrabold text-slate-900">
                      {auto.stats.runs.toLocaleString()} interactions
                    </div>
                    <div className="text-[11px] text-emerald-600 font-bold">
                      {auto.stats.open_rate}% open rate
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAutomationStatus(auto.id)}
                    className="text-[#3B5BFF] hover:opacity-80 transition-opacity p-1"
                    title={isActive ? 'Deactivate' : 'Activate'}
                  >
                    {isActive ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
