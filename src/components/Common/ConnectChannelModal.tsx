import React, { useState } from 'react';
import { X, Instagram, CheckCircle2, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ConnectChannelModal: React.FC = () => {
  const { isConnectModalOpen, setIsConnectModalOpen, connectChannel, metaConfig } = useApp();
  const [handle, setHandle] = useState('');

  if (!isConnectModalOpen) return null;

  const handleOAuthRedirect = () => {
    // Initiate Meta Instagram OAuth flow
    window.location.href = '/api/auth/instagram';
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handle.trim()) {
      connectChannel(handle.trim());
      setHandle('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={() => setIsConnectModalOpen(false)}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-3 shadow-md">
            <Instagram className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Connect Instagram Account</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Link your Instagram Professional / Creator account to automate DMs & comments.
          </p>
        </div>

        {/* OAuth Connect Button */}
        <div className="space-y-4 mb-6">
          <button
            onClick={handleOAuthRedirect}
            className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:opacity-95 text-white font-bold py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2.5 transition-all"
          >
            <Instagram className="w-5 h-5" />
            <span>Connect via Meta OAuth</span>
            <ExternalLink className="w-4 h-4 text-white/80" />
          </button>
          
          <div className="relative text-center my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-3 text-[11px] text-slate-400 font-semibold uppercase">
              Or Quick Sandbox Test
            </span>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instagram Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">@</span>
                <input
                  type="text"
                  placeholder="yourbrand.official"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#3B5BFF] focus:outline-hidden"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!handle.trim()}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Connect Sandbox Handle</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Official Meta Graph API Permissions Required:</span>
          </div>
          <p className="pl-5 text-slate-500">
            • <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">instagram_manage_messages</code>
          </p>
          <p className="pl-5 text-slate-500">
            • <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">instagram_manage_comments</code>
          </p>
        </div>
      </div>
    </div>
  );
};
