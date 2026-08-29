import React, { useState } from 'react';
import {
  X,
  Instagram,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Key,
  AtSign,
  Users,
  ShieldCheck,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ConnectChannelModal: React.FC = () => {
  const {
    isConnectModalOpen,
    setIsConnectModalOpen,
    instagramAccount,
    connectChannel,
    disconnectChannel,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'quick' | 'token' | 'oauth'>('quick');
  
  // Quick Connect State
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [followersInput, setFollowersInput] = useState<string>('2450');
  const [displayNameInput, setDisplayNameInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Graph API Token State
  const [apiToken, setApiToken] = useState<string>('');
  const [igUserId, setIgUserId] = useState<string>('');
  const [tokenUsername, setTokenUsername] = useState<string>('');

  if (!isConnectModalOpen) return null;

  const handleQuickConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanHandle = usernameInput.replace(/^@/, '').trim();
    if (!cleanHandle) {
      setFeedback({ type: 'error', message: 'Please enter a valid Instagram username or handle.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const followersNum = parseInt(followersInput, 10) || 1200;
      await connectChannel({
        username: cleanHandle,
        followers_count: followersNum,
        profile_pic_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanHandle}`,
        status: 'connected',
      });
      setFeedback({ type: 'success', message: `@${cleanHandle} successfully connected!` });
      setTimeout(() => {
        setIsConnectModalOpen(false);
      }, 700);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to connect Instagram account.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTokenConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = apiToken.trim();
    const cleanHandle = tokenUsername.replace(/^@/, '').trim() || (igUserId ? `creator_${igUserId.slice(-5)}` : 'instagram_creator');
    if (!cleanToken) {
      setFeedback({ type: 'error', message: 'Please provide a Meta Graph API Access Token.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await connectChannel({
        username: cleanHandle,
        ig_user_id: igUserId.trim() || `ig_user_${cleanHandle}`,
        access_token: cleanToken,
        followers_count: 5200,
        profile_pic_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanHandle}`,
        status: 'connected',
      });
      setFeedback({ type: 'success', message: `Meta Graph API token saved and @${cleanHandle} connected!` });
      setTimeout(() => {
        setIsConnectModalOpen(false);
      }, 800);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to verify and save Graph API credentials.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthLaunch = () => {
    const popupUrl = '/api/auth/instagram';
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      popupUrl,
      'MetaInstagramOAuth',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // If popup blocked, fallback to direct location
      window.location.href = popupUrl;
    }
  };

  const presetHandles = ['dev_creator', 'growth_guru', 'creativestudio', 'fashion_daily'];

  return (
    <div className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={() => setIsConnectModalOpen(false)}
          aria-label="Close modal"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-rose-500/20 ring-2 ring-rose-500/20">
            <Instagram className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950 tracking-tight">Connect Instagram Account</h2>
            <p className="text-xs font-semibold text-slate-500">
              Link your Instagram profile for automated DMs & comments
            </p>
          </div>
        </div>

        {/* If account is already connected, show active account card with switch option */}
        {instagramAccount && (
          <div className="mb-5 p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={instagramAccount.profile_pic_url}
                alt={instagramAccount.username}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-950 truncate">@{instagramAccount.username}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full border border-emerald-300">
                    Active
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-600 truncate">
                  {instagramAccount.followers_count?.toLocaleString()} followers
                </p>
              </div>
            </div>
            <button
              onClick={() => disconnectChannel()}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              Disconnect
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl mb-5 border border-slate-200/80">
          <button
            type="button"
            onClick={() => { setActiveTab('quick'); setFeedback(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'quick'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200/60 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AtSign className="w-3.5 h-3.5 text-indigo-600" />
            <span>Direct</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('token'); setFeedback(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'token'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200/60 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span>Access Token</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('oauth'); setFeedback(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200/60 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-pink-600" />
            <span>Meta OAuth</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mb-4 p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{feedback.message}</span>
          </div>
        )}

        {/* Tab 1: Direct Username Quick Connect */}
        {activeTab === 'quick' && (
          <form onSubmit={handleQuickConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1.5">
                Instagram Username / Handle <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                  @
                </span>
                <input
                  type="text"
                  placeholder="your_handle (e.g. devsinghparmar)"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Follower Count
                </label>
                <input
                  type="number"
                  placeholder="2450"
                  value={followersInput}
                  onChange={(e) => setFollowersInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Account Type
                </label>
                <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-indigo-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Creator / Business</span>
                </div>
              </div>
            </div>

            {/* Quick Preset Handles */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                Or quick test with sample handles:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presetHandles.map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    onClick={() => {
                      setUsernameInput(handle);
                      setFollowersInput('4800');
                    }}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    @{handle}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:from-purple-500 hover:via-pink-500 hover:to-rose-400 text-white font-black py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Instagram className="w-4 h-4 stroke-[2.5]" />
                  <span>Connect Instagram Account</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Direct Meta Access Token */}
        {activeTab === 'token' && (
          <form onSubmit={handleTokenConnect} className="space-y-3.5">
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                Instagram User / Page ID
              </label>
              <input
                type="text"
                placeholder="e.g. 17841400000000000"
                value={igUserId}
                onChange={(e) => setIgUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                Instagram Handle / Username
              </label>
              <input
                type="text"
                placeholder="e.g. @your_brand_name"
                value={tokenUsername}
                onChange={(e) => setTokenUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                Meta Graph API Access Token <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="IGAA... or EAAB... (Long-lived User/Page token)"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-indigo-500 outline-none resize-none"
              />
              <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                Token is securely stored and used to subscribe to Instagram webhooks & reply to messages.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#3B5BFF] hover:bg-indigo-700 text-white font-black py-3 px-4 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating & Saving Token...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Save Token & Link Profile</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 3: Official Meta OAuth 2.0 */}
        {activeTab === 'oauth' && (
          <div className="space-y-4 text-center py-2">
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Authenticate directly with Facebook / Meta Instagram Business Login to authorize automatic DM and Comment permissions.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span>Requested Scopes:</span>
                <span className="text-emerald-700 font-black">4 Scopes</span>
              </div>
              <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5 font-medium">
                <li>instagram_business_manage_messages</li>
                <li>instagram_business_manage_comments</li>
                <li>instagram_business_basic</li>
                <li>instagram_business_content_publish</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleOAuthLaunch}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:from-purple-500 hover:via-pink-500 hover:to-rose-400 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              <Instagram className="w-4 h-4 stroke-[2.5]" />
              <span>Launch Meta OAuth Window</span>
              <ExternalLink className="w-3.5 h-3.5 text-white/80" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
