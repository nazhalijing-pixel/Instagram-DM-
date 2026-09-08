import React from 'react';
import {
  Zap,
  Bot,
  Layers,
  Webhook,
  Inbox,
  Users,
  ShieldAlert,
  Gauge,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Send,
  MessageCircle,
  Clock,
  Cpu,
  Lock,
  Workflow,
  ExternalLink,
  Instagram,
  Settings,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AboutUsPage: React.FC = () => {
  const { setActiveTab, setIsBuilderOpen, setIsConnectModalOpen } = useApp();

  const realOfferings = [
    {
      id: 'dm-automation',
      title: 'Instagram DM & Comment Automation',
      description:
        'Instant trigger matching on direct messages, comments, and story replies. Deliver rich media links, personalized discount codes, and multi-step interactive button flows automatically.',
      icon: Send,
      badge: 'Core Engine',
      gradient: 'from-blue-600 to-indigo-600',
      bgGlow: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'ai-chatbot',
      title: 'AI-Powered Chatbot Intelligence',
      description:
        'Powered by Google Gemini 3.1 Flash Lite with intelligent key rotation. Accurately understands follower context, answers product inquiries, and provides an instant one-click Human Takeover switch.',
      icon: Bot,
      badge: 'Gemini 3.1 AI',
      gradient: 'from-purple-600 to-pink-600',
      bgGlow: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      id: 'templates-library',
      title: '16+ Business Type Templates',
      description:
        'Pre-engineered, high-converting workflows tailored for E-commerce, Creators, Real Estate, Fitness, Agency, Coaching, Hospitality, and SaaS businesses to launch campaigns in seconds.',
      icon: Layers,
      badge: '16+ Industries',
      gradient: 'from-emerald-600 to-teal-600',
      bgGlow: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'realtime-webhooks',
      title: 'Real-Time Webhook Engine',
      description:
        'High-concurrency streaming webhook ingestion connected directly with the official Meta Graph API. Built-in live diagnostics, timing breakdown logs, and payload telemetry.',
      icon: Webhook,
      badge: 'Meta Graph API v21',
      gradient: 'from-amber-600 to-orange-600',
      bgGlow: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: 'inbox-contacts',
      title: 'Unified Inbox & Contacts CRM',
      description:
        'Manage all direct conversations from a centralized live inbox. Automatically tag leads, track engagement history across posts and stories, and send manual replies seamlessly.',
      icon: Inbox,
      badge: 'CRM & Inbox',
      gradient: 'from-cyan-600 to-blue-600',
      bgGlow: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
    {
      id: 'subsecond-engine',
      title: 'Sub-Second Fast Response Engine',
      description:
        'Optimized in-memory RAM caching and HTTP keep-alive connection pooling deliver lightning-fast auto-replies in under 1 second, ensuring your followers receive immediate responses.',
      icon: Gauge,
      badge: '< 1s Latency',
      gradient: 'from-rose-600 to-red-600',
      bgGlow: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      id: 'spam-toxic-detection',
      title: 'Toxic & Spam Message Detection',
      description:
        'Automated sentiment and safety filters detect profanity, phishing links, and hostile messages in incoming DMs and comments to protect your brand integrity and account standing.',
      icon: ShieldAlert,
      badge: 'Brand Safety',
      gradient: 'from-amber-600 to-yellow-600',
      bgGlow: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: 'multitenant-security',
      title: 'Multi-User & Enterprise Security',
      description:
        'Secure multi-tenant workspace isolation powered by Firebase Authentication and Firestore database. Encrypted credential storage and isolated per-workspace webhook verification tokens.',
      icon: Users,
      badge: 'Isolated Sessions',
      gradient: 'from-slate-700 to-slate-900',
      bgGlow: 'bg-slate-100 text-slate-800 border-slate-300',
    },
  ];

  const systemCapabilities = [
    {
      label: 'Average Response Time',
      value: '< 850ms',
      detail: 'In-memory early-exit routing',
    },
    {
      label: 'Average DM Open Rate',
      value: '98%',
      detail: 'Compared to 21% email open rate',
    },
    {
      label: 'Meta API Compatibility',
      value: '100% Compliant',
      detail: 'Official Instagram Graph API v21.0',
    },
    {
      label: 'AI Model Integration',
      value: 'Gemini 3.1 Flash',
      detail: 'Sub-second conversational intelligence',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F9F6FE] flex flex-col justify-between">
      {/* Top Main Container */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-12 w-full">
        
        {/* 1. Hero Section */}
        <section className="relative bg-white rounded-3xl p-8 md:p-12 border border-slate-200 shadow-sm overflow-hidden text-center space-y-6">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-4 py-1.5 rounded-full text-xs font-black text-indigo-700 uppercase tracking-wider shadow-2xs">
            <Zap className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" />
            <span>About AutoReply.io</span>
          </div>

          {/* Headline */}
          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight leading-[1.15]">
              The Next-Generation Instagram DM & Comment Automation Engine
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-semibold leading-relaxed">
              <strong className="text-slate-900 font-bold">AutoReply.io</strong> is a full-stack social automation platform engineered to help creators, brands, and agencies capture leads, automate customer support, and convert followers into customers 24/7 in real-time.
            </p>
          </div>

          {/* Primary CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="bg-[#3B5BFF] hover:bg-indigo-700 text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl btn-primary-elevated flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20"
            >
              <Workflow className="w-4 h-4" />
              <span>Create Automation Workflow</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className="bg-white hover:bg-slate-50 text-slate-800 font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl border border-slate-300 flex items-center gap-2 cursor-pointer shadow-2xs transition-colors"
            >
              <Inbox className="w-4 h-4 text-purple-600" />
              <span>Open Live Inbox</span>
            </button>
          </div>
        </section>

        {/* 2. Platform Architecture Stats Bar */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {systemCapabilities.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-1 text-center"
            >
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                {stat.label}
              </div>
              <div className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">
                {stat.value}
              </div>
              <div className="text-xs font-semibold text-slate-600">
                {stat.detail}
              </div>
            </div>
          ))}
        </section>

        {/* 3. "What We Offer" Section (Real, Concrete Features) */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">
              What AutoReply.io Offers
            </h2>
            <p className="text-sm font-semibold text-slate-600">
              Built on production-grade cloud infrastructure, designed strictly for high-throughput social automation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {realOfferings.map((offering) => {
              const Icon = offering.icon;
              return (
                <div
                  key={offering.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-300 transition-all duration-200 shadow-2xs hover:shadow-sm flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${offering.gradient} flex items-center justify-center text-white shadow-md`}>
                        <Icon className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${offering.bgGlow}`}>
                        {offering.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1">
                        {offering.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                        {offering.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-indigo-600">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Production Ready</span>
                    </span>
                    <span className="text-slate-400 font-medium">Instant Live Execution</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Real Technology Architecture */}
        <section className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl md:text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
              <Cpu className="w-6 h-6 text-indigo-600" />
              <span>Technology & Infrastructure Standards</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">
              Engineered with zero compromises on security, latency, and official platform compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Meta API Compliance</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                AutoReply.io communicates exclusively via official Meta Graph API v21.0 endpoints. No unofficial scrapers, headless browsers, or brittle reverse-engineered APIs.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Gemini Key Rotator</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Server-side intelligent API key rotation pool prevents rate limit bottlenecks and provides automatic fallback mechanisms for uninterruptible AI conversations.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>Secure Multi-Tenancy</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Complete data isolation across individual user accounts using Google Cloud Firestore and secure Firebase Auth credentials with strict tenant security rules.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Quick Navigation CTAs */}
        <section className="bg-gradient-to-r from-indigo-900 via-blue-900 to-purple-900 rounded-3xl p-8 md:p-10 text-white shadow-lg space-y-6">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Ready to automate your Instagram growth?
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 font-medium leading-relaxed">
              Connect your account in 30 seconds or test out your first keyword automation workflow directly inside AutoReply.io.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="bg-white hover:bg-slate-100 text-indigo-950 font-black text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-colors"
            >
              <Instagram className="w-4 h-4 text-pink-600" />
              <span>Connect Instagram Account</span>
            </button>
            <button
              onClick={() => setActiveTab('automations')}
              className="bg-indigo-800/80 hover:bg-indigo-800 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-xl border border-indigo-600/60 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Explore Automation Templates</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="bg-indigo-800/80 hover:bg-indigo-800 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-xl border border-indigo-600/60 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>System Settings & Webhooks</span>
            </button>
          </div>
        </section>
      </div>

      {/* 6. Professional Consistent Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
              <Zap className="w-4 h-4 fill-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-1.5">
                <span className="font-black text-base text-slate-950 tracking-tight">AutoReply.io</span>
                <span className="text-[10px] uppercase tracking-wider bg-indigo-100 text-indigo-800 font-black px-1.5 py-0.5 rounded border border-indigo-200">
                  Platform
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold">
                Autonomous Instagram DM & Comment Automation
              </p>
            </div>
          </div>

          {/* Quick Page Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('home')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('automations')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Automations
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Contacts
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Inbox
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className="text-indigo-600 font-black"
            >
              About Us
            </button>
          </div>

          {/* Copyright & Meta Disclaimer */}
          <div className="text-xs text-slate-500 space-y-0.5 md:text-right font-medium">
            <p className="font-bold text-slate-800">
              &copy; 2026 AutoReply.io. All rights reserved.
            </p>
            <p className="text-[11px] text-slate-500">
              Official Meta Graph API Compliant Social Automation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
