import React, { useState } from 'react';
import {
  Instagram,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  User,
  LogOut,
  Mail,
  ShieldCheck,
  Calendar,
  Lock,
  Zap,
  Copy,
  Check,
  Webhook,
  Activity,
  Clock,
  Send,
  Cpu,
  Server,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsPage: React.FC = () => {
  const {
    user,
    firebaseUser,
    logout,
    instagramAccount,
    reauthorizeChannel,
    disconnectChannel,
    setIsConnectModalOpen,
    triggerWebhookSimulation,
    logs,
  } = useApp();

  const [subscribing, setSubscribing] = useState(false);
  const [subStatus, setSubStatus] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [testSimulating, setTestSimulating] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhook` : '/api/webhook';
  const verifyToken = 'autoreply_meta_verify_secret_token_2026';

  const copyText = (txt: string, fieldName: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRunQuickTest = async () => {
    setTestSimulating(true);
    setTestResult(null);
    try {
      await triggerWebhookSimulation({
        trigger_type: 'dm',
        username: 'webhook_test_user',
        text: 'Hello, this is a test webhook message to verify delivery.',
      });
      setTestResult('✅ Test webhook processed successfully! Check your Inbox tab to see the incoming message & auto-reply.');
    } catch (err: any) {
      setTestResult(`❌ Test webhook failed: ${err?.message || err}`);
    } finally {
      setTestSimulating(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out of your AutoReply.io account?')) {
      setIsLoggingOut(true);
      try {
        await logout();
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    setSubStatus(null);
    try {
      const res = await fetch('/api/instagram/subscribe', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubStatus({ success: true, msg: 'Meta Subscribed Apps API executed successfully! Webhooks active.' });
      } else {
        setSubStatus({ success: false, msg: data.error || 'Subscription call returned warnings or requires live token.' });
      }
    } catch (err: any) {
      setSubStatus({ success: false, msg: err?.message || 'Failed to trigger subscription endpoint.' });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#F9F6FE] min-h-screen max-w-5xl mx-auto">
      {/* 1. Account & Authentication Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-black text-slate-950 text-base">Account & Security</h3>
            <p className="text-xs text-slate-600 font-semibold">
              Manage your signed-in profile and authentication session
            </p>
          </div>
          <span className="text-xs font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Isolated Session</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-slate-950">{user.name}</h4>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  {user.plan} Plan
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{firebaseUser?.email || user.email || 'No email attached'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full sm:w-auto bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs py-2.5 px-4 rounded-xl border border-rose-200 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Connected Instagram Channels Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-black text-slate-950 text-base">Connected Instagram Channels</h3>
            <p className="text-xs text-slate-600 font-semibold">Manage Meta OAuth authorization tokens and channel access</p>
          </div>
          {instagramAccount && (
            <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Account Connected</span>
            </span>
          )}
        </div>

        {instagramAccount ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <img
                src={instagramAccount.profile_pic_url}
                alt={instagramAccount.username}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-slate-950">@{instagramAccount.username}</h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Live Channel
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-bold mt-0.5">
                  {instagramAccount.followers_count?.toLocaleString()} Followers • Connected on{' '}
                  {new Date(instagramAccount.connected_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => setIsConnectModalOpen(true)}
                title="Switch or update channel"
                className="bg-indigo-50 hover:bg-indigo-100 text-[#3B5BFF] font-black text-xs py-2 px-3.5 rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Switch / Update</span>
              </button>

              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                title="Test Meta Subscribed Apps Webhook"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs py-2 px-3.5 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{subscribing ? 'Testing...' : 'Test Webhooks'}</span>
              </button>

              <button
                onClick={disconnectChannel}
                className="bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs py-2 px-3.5 rounded-xl border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Profile</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white mx-auto shadow-md shadow-rose-500/20">
              <Instagram className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-base">No Instagram Account Linked</h4>
              <p className="text-xs text-slate-600 font-semibold mt-1 max-w-sm mx-auto">
                Connect your Instagram account to enable automatic DM replies, comment triggers, and contact sync.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:from-purple-500 hover:via-pink-500 hover:to-rose-400 text-white font-black text-xs py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Instagram className="w-4 h-4 stroke-[2.2]" />
                <span>Connect Instagram Channel</span>
              </button>
            </div>
          </div>
        )}

        {subStatus && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              subStatus.success
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
          >
            {subStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{subStatus.msg}</span>
          </div>
        )}
      </div>

      {/* 3. Meta Developer Webhook Configuration Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-black text-slate-950 text-base flex items-center gap-2">
              <Webhook className="w-5 h-5 text-indigo-600" />
              <span>Meta Webhook Integration</span>
            </h3>
            <p className="text-xs text-slate-600 font-semibold">
              Configure your Meta Developer App to route live Instagram DMs and comments directly into this app
            </p>
          </div>
          <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Webhook Ready</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Callback URL */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Webhook Callback URL</span>
              <button
                onClick={() => copyText(webhookUrl, 'url')}
                className="text-xs text-[#3B5BFF] hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                {copiedField === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'url' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200 break-all select-all font-semibold">
              {webhookUrl}
            </div>
            <p className="text-[11px] text-slate-500">Paste into Meta App Dashboard &gt; Webhooks &gt; Callback URL</p>
          </div>

          {/* Verify Token */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Verify Token</span>
              <button
                onClick={() => copyText(verifyToken, 'token')}
                className="text-xs text-[#3B5BFF] hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                {copiedField === 'token' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'token' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200 break-all select-all font-semibold">
              {verifyToken}
            </div>
            <p className="text-[11px] text-slate-500">Paste into Meta App Dashboard &gt; Webhooks &gt; Verify Token</p>
          </div>
        </div>

        {/* Subscribed Fields Guide */}
        <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-700" />
            <h4 className="text-xs font-black text-indigo-950">Required Meta Webhook Fields:</h4>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {['messages', 'messaging_postbacks', 'message_deliveries', 'message_reads', 'comments'].map((field) => (
              <span key={field} className="font-mono text-[11px] font-bold bg-white text-indigo-900 px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                {field}
              </span>
            ))}
          </div>
        </div>

        {/* Quick Test Webhook Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black text-slate-900">Test Webhook Processing Engine</div>
            <p className="text-[11px] text-slate-500">Sends a test event through the webhook engine to verify end-to-end delivery</p>
          </div>
          <button
            onClick={handleRunQuickTest}
            disabled={testSimulating}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>{testSimulating ? 'Testing...' : 'Send Test Webhook'}</span>
          </button>
        </div>

        {testResult && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
            {testResult}
          </div>
        )}
      </div>

      {/* 4. Live DM Latency & Webhook Diagnostics Telemetry */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-black text-slate-950 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <span>Real-Time Latency & Delivery Diagnostics</span>
            </h3>
            <p className="text-xs text-slate-600 font-semibold">
              Live millisecond timestamp audit of incoming Meta requests and Instagram Graph API dispatch
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Server className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instance Warm (minInstances: 1)</span>
            </span>
          </div>
        </div>

        {/* Telemetry Guide / Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Cold-Start Status</div>
            <div className="text-sm font-black text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>0ms Cold Start (Warm)</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">Instance permanently active in memory with in-RAM token caching</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Target Latency</div>
            <div className="text-sm font-black text-indigo-700 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-600" />
              <span>&lt; 1,000ms End-to-End</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">Fast-path reply sent prior to background DB logging</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">AI Generation Mode</div>
            <div className="text-sm font-black text-purple-700 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-600" />
              <span>gemini-1.5-flash (Fast)</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">Max 120 tokens, last 2 msgs context; static rules bypass AI completely</p>
          </div>
        </div>

        {/* Live Logs Table with Exact Measured Timestamps */}
        <div className="space-y-3">
          <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
            <span>Recent Webhook Events & Timestamp Traces ({logs.length})</span>
            <span className="text-[11px] font-bold text-slate-500 lowercase">live synchronized</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs font-bold text-slate-600">
              No webhook events received yet. Send a test message on Instagram or click "Send Test Webhook" above to generate a trace.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {logs.slice(0, 10).map((log) => {
                const receivedAt = log.webhook_received_at || log.timestamp;
                const replyStart = log.reply_api_call_start;
                const replyEnd = log.reply_api_call_end;
                const igDuration = log.ig_api_duration_ms ?? log.api_response?.ig_api_duration_ms ?? null;
                const transitDelay = log.meta_transit_delay_ms ?? log.api_response?.meta_transit_delay_ms ?? null;
                const totalDuration = log.total_processing_duration_ms ?? log.api_response?.response_time_ms ?? null;

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${log.status === 'triggered' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        <span className="text-xs font-black text-slate-950">@{log.from_username || 'user'}</span>
                        <span className="text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 uppercase">
                          {log.trigger_type}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {log.matched_automation_name || 'Direct Message'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {totalDuration !== null && (
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                            totalDuration < 1500
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            ⚡ Total: {totalDuration}ms
                          </span>
                        )}
                        {igDuration !== null && (
                          <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                            IG API: {igDuration}ms
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <div className="text-[10px] font-black text-slate-500 uppercase">Incoming Message:</div>
                        <div className="text-slate-900 font-bold truncate">"{log.incoming_text}"</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase pt-1">Automated Reply:</div>
                        <div className="text-indigo-900 font-bold truncate">"{log.response_sent}"</div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1 text-[11px] text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-500">1. Webhook Ingress:</span>
                          <span className="font-bold text-slate-900">{receivedAt ? new Date(receivedAt).toLocaleTimeString() : 'N/A'}</span>
                        </div>
                        {transitDelay !== null && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">2. Meta Transit Delay:</span>
                            <span className="font-bold text-amber-700">{transitDelay}ms</span>
                          </div>
                        )}
                        {log.timing_breakdown?.cache_lookup_duration_ms !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">3. RAM Cache Lookup:</span>
                            <span className="font-bold text-emerald-700">{log.timing_breakdown.cache_lookup_duration_ms}ms</span>
                          </div>
                        )}
                        {log.timing_breakdown?.rule_matching_duration_ms !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">4. Rule Matching:</span>
                            <span className="font-bold text-slate-900">{log.timing_breakdown.rule_matching_duration_ms}ms</span>
                          </div>
                        )}
                        {log.timing_breakdown?.ai_gen_duration_ms !== undefined && log.timing_breakdown.ai_gen_duration_ms > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">5. Gemini AI Generation:</span>
                            <span className="font-bold text-purple-700">{log.timing_breakdown.ai_gen_duration_ms}ms</span>
                          </div>
                        )}
                        {replyStart && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">6. IG API Call Start:</span>
                            <span className="font-bold text-slate-900">{new Date(replyStart).toLocaleTimeString()}</span>
                          </div>
                        )}
                        {replyEnd && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">7. IG API Call End:</span>
                            <span className="font-bold text-slate-900">{new Date(replyEnd).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
