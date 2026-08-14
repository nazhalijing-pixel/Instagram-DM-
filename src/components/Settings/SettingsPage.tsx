import React from 'react';
import {
  Instagram,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsPage: React.FC = () => {
  const {
    instagramAccount,
    reauthorizeChannel,
    disconnectChannel,
    setIsConnectModalOpen,
  } = useApp();

  return (
    <div className="p-8 space-y-8 bg-[#F7F6FB] min-h-screen">
      {/* 1. Connected Instagram Channels Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Connected Instagram Channels</h3>
            <p className="text-xs text-slate-500">Manage Meta OAuth authorization tokens and channel access</p>
          </div>
          {instagramAccount && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Account Connected</span>
            </span>
          )}
        </div>

        {instagramAccount ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <img
                src={instagramAccount.profile_pic_url}
                alt={instagramAccount.username}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
              />
              <div>
                <h4 className="font-bold text-sm text-slate-900">@{instagramAccount.username}</h4>
                <p className="text-xs text-slate-500">
                  {instagramAccount.followers_count.toLocaleString()} Followers • Connected on{' '}
                  {new Date(instagramAccount.connected_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={reauthorizeChannel}
                className="bg-indigo-50 hover:bg-indigo-100 text-[#3B5BFF] font-bold text-xs py-2 px-3.5 rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reauthorize Channel</span>
              </button>

              <button
                onClick={disconnectChannel}
                className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-2 px-3.5 rounded-xl border border-red-200 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Profile</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4">
            <Instagram className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Instagram Account Linked</h4>
            <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
              Link your Instagram Professional account using Meta OAuth to enable automatic comment replies & DMs.
            </p>
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="bg-[#3B5BFF] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md"
            >
              + Connect Instagram Channel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
