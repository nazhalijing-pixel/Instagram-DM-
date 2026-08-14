import React, { useState, useEffect } from 'react';
import { Zap, Sparkles, MessageSquare, Bot, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface IntroSplashProps {
  onComplete: () => void;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'logo' | 'features' | 'ready'>('logo');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Stage timer transitions
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    const stage1Timer = setTimeout(() => setStage('features'), 600);
    const stage2Timer = setTimeout(() => setStage('ready'), 1400);

    const autoFinishTimer = setTimeout(() => {
      handleFinish();
    }, 2800);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stage1Timer);
      clearTimeout(stage2Timer);
      clearTimeout(autoFinishTimer);
    };
  }, []);

  const handleFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-between p-6 sm:p-10 select-none transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Gradient Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between relative z-10 pt-2">
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800 text-xs text-slate-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>AutoReply.io v2.4 Engine</span>
        </div>

        <button
          onClick={handleFinish}
          className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 px-4 py-2 rounded-full border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <span>Skip Intro</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Hero Animation */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto my-auto space-y-6">
        
        {/* Animated Glowing Icon Badge */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-violet-500 flex items-center justify-center shadow-2xl border border-white/20">
            <Zap className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white transform transition-transform duration-700 hover:scale-110" />
            <div className="absolute -bottom-1 -right-1 bg-amber-400 p-1.5 rounded-xl text-slate-950 shadow-md">
              <Sparkles className="w-4 h-4 fill-slate-950" />
            </div>
          </div>
        </div>

        {/* Brand Name Typography */}
        <div className="space-y-2 pt-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>AutoReply</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
              .io
            </span>
          </h1>
          <p className="text-sm sm:text-base font-semibold text-slate-400 max-w-md">
            Instagram DM & Comment Automation SaaS Engine
          </p>
        </div>

        {/* Feature Highlights Pills */}
        <div
          className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 transition-all duration-500 ${
            stage === 'logo' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex items-center gap-1.5 bg-slate-900/90 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-800">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Comment DMs</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/90 text-purple-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-800">
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>Gemini AI Assistant</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/90 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-800">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>Story Reply Funnels</span>
          </div>
        </div>

        {/* Enter Dashboard Action Button */}
        {stage === 'ready' && (
          <div className="pt-2 animate-bounce">
            <button
              onClick={handleFinish}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-sm px-8 py-3.5 rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer border border-white/10"
            >
              <span>Launch AutoReply Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Progress Bar & Loading Indicator */}
      <div className="w-full max-w-md relative z-10 space-y-2 text-center pb-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Initializing Meta Graph API...</span>
          </span>
          <span className="font-bold text-white">{progress}%</span>
        </div>

        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800/80">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
