import React from 'react';
import { X, Check, Zap, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PlanRenewModal: React.FC = () => {
  const { isRenewModalOpen, setIsRenewModalOpen, user, renewPlan } = useApp();

  if (!isRenewModalOpen) return null;

  const plans = [
    {
      id: 'starter',
      name: 'Starter Plan',
      price: '$19',
      period: '/month',
      dms: '2,500 DMs/mo',
      accounts: '1 Instagram Account',
      features: ['Automated Comment to DM', 'Basic Keyword Triggers', 'Instagram Inbox Sync'],
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      price: '$49',
      period: '/month',
      dms: '15,000 DMs/mo',
      accounts: '3 Instagram Accounts',
      features: [
        'Everything in Starter',
        'Story Reply Automations',
        'Advanced Flow Builder',
        'Live Webhook Integration',
        'Priority DM Rate Limits',
      ],
      popular: true,
    },
    {
      id: 'agency',
      name: 'Agency Pro',
      price: '$129',
      period: '/month',
      dms: '100,000 DMs/mo',
      accounts: '10 Instagram Accounts',
      features: [
        'Everything in Pro',
        'Multi-client Team Workspace',
        'Custom Webhooks & API Access',
        'Dedicated IP & Meta Support',
      ],
      popular: false,
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={() => setIsRenewModalOpen(false)}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="w-12 h-12 bg-indigo-50 text-[#3B5BFF] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 fill-[#3B5BFF]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Upgrade Your AutoReply.io Plan</h2>
          <p className="text-sm text-slate-500 mt-1">
            Unlock uninterrupted Instagram DM automation, high-speed comment replies, and lead capture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl p-5 border relative flex flex-col justify-between transition-all ${
                p.popular
                  ? 'border-[#3B5BFF] bg-gradient-to-b from-indigo-50/40 to-white shadow-lg ring-2 ring-[#3B5BFF]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3B5BFF] text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-4">
                  <span className="text-3xl font-extrabold text-slate-900">{p.price}</span>
                  <span className="text-xs font-semibold text-slate-500">{p.period}</span>
                </div>

                <div className="space-y-2 mb-6 pb-6 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <Check className="w-4 h-4 text-[#22C55E]" />
                    <span>{p.dms}</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <Check className="w-4 h-4 text-[#22C55E]" />
                    <span>{p.accounts}</span>
                  </div>
                  {p.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-600">
                      <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={renewPlan}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
                  p.popular
                    ? 'bg-[#3B5BFF] hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                Activate {p.name}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Meta API Compliant. Cancel or downgrade anytime without lock-in contracts.</span>
        </p>
      </div>
    </div>
  );
};
