import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  MessageSquare,
  Instagram,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowRight,
  Bot,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TriggerType, WebhookLogEvent } from '../../types';

export const WebhookSimulatorModal: React.FC = () => {
  const { isSimulatorOpen, setIsSimulatorOpen, simulateWebhookEvent, automations } = useApp();

  const [triggerType, setTriggerType] = useState<TriggerType>('comment');
  const [username, setUsername] = useState('sarah_creator');
  const [incomingText, setIncomingText] = useState('LINK');
  const [simResult, setSimResult] = useState<WebhookLogEvent | null>(null);
  const [isFiring, setIsFiring] = useState(false);

  if (!isSimulatorOpen) return null;

  const handleFireWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !incomingText.trim()) return;

    setIsFiring(true);
    setSimResult(null);

    // Call server endpoint
    try {
      await fetch('/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger_type: triggerType,
          username,
          text: incomingText,
        }),
      });
    } catch (err) {
      console.log('Server test webhook executed locally');
    }

    // Execute state engine simulation
    try {
      const result = await simulateWebhookEvent(triggerType, username, incomingText);
      setSimResult(result);
    } catch (err) {
      console.error('Webhook simulation failed:', err);
    } finally {
      setIsFiring(false);
    }
  };

  const presetKeywords = ['LINK', 'PRICE', 'VIP', 'GUIDE', 'DISCOUNT'];

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={() => {
            setIsSimulatorOpen(false);
            setSimResult(null);
          }}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Meta Webhook Event Simulator</h2>
            <p className="text-xs text-slate-500">Test how AutoReply.io processes incoming Instagram comments & DMs live</p>
          </div>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleFireWebhook} className="space-y-4 mb-6">
          {/* Trigger Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Simulated Meta Event Type:</label>
            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTriggerType('comment')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                  triggerType === 'comment'
                    ? 'bg-[#3B5BFF] text-white border-[#3B5BFF] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Reel Comment</span>
              </button>

              <button
                type="button"
                onClick={() => setTriggerType('dm')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                  triggerType === 'dm'
                    ? 'bg-[#3B5BFF] text-white border-[#3B5BFF] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Direct DM</span>
              </button>

              <button
                type="button"
                onClick={() => setTriggerType('story_reply')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                  triggerType === 'story_reply'
                    ? 'bg-[#3B5BFF] text-white border-[#3B5BFF] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Instagram className="w-4 h-4" />
                <span>Story Reply</span>
              </button>
            </div>
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Simulated User Instagram Handle:</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="sarah_creator"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#3B5BFF] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Incoming Text & Preset Chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Incoming Message / Comment Text:</label>
              <div className="flex gap-1">
                {presetKeywords.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setIncomingText(kw)}
                    className="text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-[#3B5BFF] px-2 py-0.5 rounded border border-slate-200"
                  >
                    "{kw}"
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={incomingText}
              onChange={(e) => setIncomingText(e.target.value)}
              placeholder="e.g. Send me the LINK please!"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#3B5BFF] focus:outline-hidden"
            />
          </div>

          {/* Fire CTA Button */}
          <button
            type="submit"
            disabled={isFiring || !incomingText.trim()}
            className="w-full bg-[#3B5BFF] hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isFiring ? 'Firing Webhook Payload...' : 'Fire Webhook Event Now'}</span>
          </button>
        </form>

        {/* Live Simulation Output Card */}
        {simResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 animate-fadeIn ${
              simResult.status === 'triggered'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between font-bold border-b border-black/10 pb-2">
              <div className="flex items-center gap-1.5">
                {simResult.status === 'triggered' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
                <span>
                  {simResult.status === 'triggered'
                    ? 'Automation Triggered Successfully!'
                    : 'Ignored: No active automation keyword match'}
                </span>
              </div>
              <span className="text-[10px] opacity-70">Just now</span>
            </div>

            {simResult.matched_automation_name && (
              <p className="font-semibold">
                Matched Flow: <span className="text-[#3B5BFF] font-bold">{simResult.matched_automation_name}</span>
              </p>
            )}

            <p className="leading-relaxed opacity-90">
              <strong>Execution Output:</strong> {simResult.response_sent}
            </p>

            <div className="pt-2 text-[10px] font-semibold text-slate-500 border-t border-black/10 flex items-center justify-between">
              <span>View live updates in Inbox & Contacts tabs</span>
              <Bot className="w-3.5 h-3.5 text-[#3B5BFF]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
