import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

interface IntroSplashProps {
  onComplete?: () => void;
  statusText?: string;
  isStandalone?: boolean;
}

const LOADING_MESSAGES = [
  'Initializing AI...',
  'Preparing your workspace...',
  'Loading automations...',
  'Almost ready...',
];

export const IntroSplash: React.FC<IntroSplashProps> = ({
  onComplete,
  statusText,
  isStandalone = false,
}) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // If standalone (e.g. auth loading), loop messages gently
    if (isStandalone) {
      const msgInterval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1600);
      return () => clearInterval(msgInterval);
    }

    // Progression timer for intro splash
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 28);

    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => {
        if (prev < LOADING_MESSAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 550);

    const autoFinishTimer = setTimeout(() => {
      handleFinish();
    }, 2200);

    return () => {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
      clearTimeout(autoFinishTimer);
    };
  }, [isStandalone]);

  const handleFinish = () => {
    if (isFadingOut || !onComplete) return;
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  const currentMessage = statusText || LOADING_MESSAGES[messageIndex];

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#070B14] text-slate-100 flex flex-col items-center justify-between p-6 sm:p-10 select-none transition-opacity duration-500 overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Deep Cyber Ambient Lighting (Electric Blue & Cyan - NO Pink) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[540px] h-[340px] sm:h-[540px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] sm:w-[380px] h-[220px] sm:h-[380px] bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />

      {/* Top Telemetry Header */}
      <div className="w-full max-w-4xl flex items-center justify-between relative z-10 pt-2">
        <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-1.5 rounded-full border border-cyan-500/20 text-xs text-cyan-300 font-semibold shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="tracking-wide">AI Neural Core</span>
        </div>

        {onComplete && !isStandalone && (
          <button
            onClick={handleFinish}
            className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-4 py-2 rounded-full border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Skip</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        )}
      </div>

      {/* Central "AI Energy Core" Stage */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto w-full max-w-md">
        {/* Core & Rotating Rings Container */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mb-6 sm:mb-8">
          
          {/* Ring 3: Outer Precision Ring with Segmented Orbit */}
          <div className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-slate-800/80 animate-ring-cw-slow flex items-center justify-center">
            {/* Cardinal Tick Accents */}
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-cyan-500/60 rounded-full" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-cyan-500/60 rounded-full" />
            <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-0.5 h-2 bg-cyan-500/60 rounded-full" />
            <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-0.5 h-2 bg-cyan-500/60 rounded-full" />
          </div>

          {/* Ring 2: Middle Energy Ring with Cyan Node Pips (Rotates CCW) */}
          <div className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full border border-cyan-500/30 border-dashed animate-ring-ccw-mid flex items-center justify-center">
            <span className="absolute top-0 right-1/4 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <span className="absolute bottom-0 left-1/4 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
          </div>

          {/* Ring 1: Inner Fast Energy Ring with Gradient Arc (Rotates CW) */}
          <div className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full border-t border-r border-cyan-400/80 border-b-transparent border-l-transparent animate-ring-cw-fast" />

          {/* Orbiting Particle Micro-Nodes */}
          <div className="absolute w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9] animate-particle-1" />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-blue-300 shadow-[0_0_8px_#93c5fd] animate-particle-2" />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7] animate-particle-3" />

          {/* AI Energy Core Orb (Breathing Centerpiece) */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-900 p-0.5 shadow-2xl animate-ai-core flex items-center justify-center">
            
            {/* Core Nucleus */}
            <div className="w-full h-full rounded-full bg-[#070B14]/70 flex items-center justify-center border border-cyan-400/50 relative overflow-hidden">
              {/* Inner ambient bloom */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/40 via-blue-500/20 to-transparent animate-ai-nucleus" />
              
              {/* Central Futuristic Icon */}
              <div className="relative z-10 flex items-center justify-center">
                <Cpu className="w-8 h-8 sm:w-9 sm:h-9 text-cyan-300 stroke-[2.2] filter drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Status Text & Subtitle */}
        <div className="space-y-2 px-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-400/90 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Energy Core</span>
          </div>

          <h2
            key={currentMessage}
            className="text-lg sm:text-xl font-bold text-white tracking-tight animate-in fade-in duration-300 min-h-[28px]"
          >
            {currentMessage}
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Autonomous Instagram DM & Comment Automation Engine
          </p>
        </div>
      </div>

      {/* Bottom Progress & System State Indicator */}
      <div className="w-full max-w-sm relative z-10 space-y-2 text-center pb-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
          <span className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Neural Engine Sync</span>
          </span>
          {!isStandalone && <span className="font-bold text-cyan-300">{progress}%</span>}
        </div>

        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
          {isStandalone ? (
            <div className="h-full w-1/3 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" />
          ) : (
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
