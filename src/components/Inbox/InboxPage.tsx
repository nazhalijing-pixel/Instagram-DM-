import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  CheckCircle2,
  Sparkles,
  Bot,
  BotOff,
  User,
  UserCheck,
  Clock,
  Instagram,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { InboxMessage } from '../../types';

export const InboxPage: React.FC = () => {
  const {
    inboxMessages,
    instagramAccount,
    sendManualReply,
    isAiPausedForUser,
    toggleAiForUser,
  } = useApp();
  const [activeUsername, setActiveUsername] = useState<string>('sarah_creator');
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');

  // Group messages by user
  const groupedUsers = Array.from(new Set(inboxMessages.map((m) => m.from_username)))
    .filter((uname): uname is string => Boolean(uname && uname !== instagramAccount?.username && uname !== 'alexrivera.design'))
    .filter((uname) => uname.toLowerCase().includes(search.toLowerCase()));

  // Active thread
  const currentThread = inboxMessages.filter(
    (m) =>
      m.from_username === activeUsername ||
      (m.direction === 'out' && activeUsername)
  );

  const isCurrentAiPaused = isAiPausedForUser(activeUsername);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && activeUsername) {
      sendManualReply(activeUsername, inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="p-8 bg-[#F7F6FB] min-h-screen">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden h-[80vh] flex flex-col md:flex-row">
        {/* Left Conversation List */}
        <div className="w-full md:w-80 border-r border-slate-200/80 flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Instagram Conversations</h3>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#3B5BFF] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {groupedUsers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">No inbox chats found.</div>
            ) : (
              groupedUsers.map((username) => {
                const userMsgs = inboxMessages.filter((m) => m.from_username === username);
                const lastMsg = userMsgs[0] || userMsgs[userMsgs.length - 1];
                const isActive = activeUsername === username;
                const isUserAiPaused = isAiPausedForUser(username);

                return (
                  <button
                    key={username}
                    onClick={() => setActiveUsername(username)}
                    className={`w-full p-3.5 text-left transition-all flex items-center justify-between gap-3 ${
                      isActive ? 'bg-white border-l-4 border-l-[#3B5BFF] shadow-2xs' : 'hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
                          alt={username}
                          className="w-9 h-9 rounded-full border border-slate-200 object-cover"
                        />
                        {isUserAiPaused && (
                          <span
                            title="Human Takeover Active"
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-[7px] text-white font-black"
                          >
                            👤
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">@{username}</span>
                          {isUserAiPaused ? (
                            <span className="px-1.5 py-0.25 rounded-md bg-amber-100 text-amber-800 text-[9px] font-black shrink-0">
                              Human
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.25 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black shrink-0">
                              AI ON
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {lastMsg ? lastMsg.message_text : 'Instagram Direct Message'}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Message Thread */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Thread Header */}
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeUsername}`}
                alt={activeUsername}
                className="w-9 h-9 rounded-full border border-slate-200"
              />
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>@{activeUsername}</span>
                  {isCurrentAiPaused ? (
                    <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-amber-700" />
                      <span>Human Interference (AI Paused)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>AI Conversion Active</span>
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-slate-500">Instagram DM Thread • Synced via Meta Webhook</p>
              </div>
            </div>

            {/* AI Auto-Reply Toggle Switch */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleAiForUser(activeUsername)}
                title={isCurrentAiPaused ? 'Click to Enable AI Auto-Reply' : 'Click to Disable AI (Human Takeover)'}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2.5 shadow-2xs cursor-pointer ${
                  isCurrentAiPaused
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isCurrentAiPaused ? (
                    <>
                      <BotOff className="w-4 h-4 text-amber-700" />
                      <span>AI Auto-Reply: <strong className="text-amber-800 uppercase">OFF</strong></span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 text-emerald-600" />
                      <span>AI Auto-Reply: <strong className="text-emerald-700 uppercase">ON</strong></span>
                    </>
                  )}
                </div>

                {/* Toggle Pill */}
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                    isCurrentAiPaused ? 'bg-amber-200 justify-start' : 'bg-emerald-600 justify-end'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                </div>
              </button>
            </div>
          </div>

          {/* Chat Bubbles Container */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30">
            {/* Human Interference Alert Banner if AI is Paused */}
            {isCurrentAiPaused && (
              <div className="bg-amber-50/95 border border-amber-200/90 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                    <BotOff className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <div className="font-extrabold text-amber-950 flex items-center gap-2">
                      <span>Human Interference Detected</span>
                      <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                        AI Responses Stopped
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      A human agent sent a manual message or paused AI for @{activeUsername}. AI will not auto-respond until re-enabled.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleAiForUser(activeUsername)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xs shrink-0 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>Turn AI Back ON</span>
                </button>
              </div>
            )}

            {currentThread.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Select a conversation on the left to view Instagram DMs.
              </div>
            ) : (
              currentThread.map((msg) => {
                const isOut = msg.direction === 'out';
                return (
                  <div key={msg.id} className={`flex flex-col ${isOut ? 'items-end' : 'items-start'} space-y-1`}>
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                        isOut
                          ? 'bg-[#3B5BFF] text-white rounded-br-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                      }`}
                    >
                      <p>{msg.message_text}</p>

                      {msg.is_automated ? (
                        <div className="mt-2 pt-2 border-t border-white/20 text-[10px] text-indigo-100 flex items-center gap-1 font-semibold">
                          <Bot className="w-3 h-3 text-amber-300" />
                          <span>Automated by AutoReply.io Engine</span>
                        </div>
                      ) : isOut ? (
                        <div className="mt-2 pt-2 border-t border-white/20 text-[10px] text-blue-100 flex items-center gap-1 font-semibold">
                          <UserCheck className="w-3 h-3 text-amber-200" />
                          <span>Human Agent Reply (AI Auto-Reply Paused)</span>
                        </div>
                      ) : null}
                    </div>

                    <span className="text-[10px] text-slate-400 px-1 font-medium">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-slate-200 bg-white space-y-2">
            <form onSubmit={handleSend} className="flex items-center gap-3">
              <input
                type="text"
                placeholder={`Send a manual DM reply to @${activeUsername}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#3B5BFF] focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-[#3B5BFF] hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send DM</span>
              </button>
            </form>

            <div className="text-[10px] text-slate-400 flex items-center justify-between px-1">
              <span>💡 Sending a manual message automatically turns AI auto-reply OFF for this contact.</span>
              {isCurrentAiPaused && (
                <button
                  type="button"
                  onClick={() => toggleAiForUser(activeUsername)}
                  className="text-amber-600 hover:underline font-bold"
                >
                  Turn AI ON
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
