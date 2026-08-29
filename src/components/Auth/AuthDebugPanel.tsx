import React, { useState } from 'react';
import {
  Bug,
  Copy,
  Check,
  AlertTriangle,
  Terminal,
  RefreshCw,
  Globe,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import firebaseConfig from '../../../firebase-applet-config.json';

export interface FirebaseErrorDetails {
  code?: string;
  message?: string;
  name?: string;
  customData?: any;
  stack?: string;
  timestamp: string;
  attemptType: 'google' | 'email_login' | 'email_signup' | 'password_reset';
}

interface AuthDebugPanelProps {
  lastError: FirebaseErrorDetails | null;
  onRetryGoogle?: () => void;
  onClearError?: () => void;
  isLoading?: boolean;
}

export const AuthDebugPanel: React.FC<AuthDebugPanelProps> = ({
  lastError,
  onRetryGoogle,
  onClearError,
  isLoading = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isInIframe = typeof window !== 'undefined' ? window.self !== window.top : false;

  const handleCopy = () => {
    const debugData = {
      firebaseError: lastError,
      environment: {
        currentOrigin,
        currentHostname,
        isInIframe,
        firebaseProjectId: firebaseConfig.projectId,
        firebaseAuthDomain: firebaseConfig.authDomain,
        firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      },
    };

    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine specific diagnostic hint
  const getDiagnosticHint = (code?: string) => {
    if (!code) return null;

    if (code === 'auth/unauthorized-domain') {
      return {
        severity: 'critical',
        title: 'Unauthorized Domain Detected',
        description: `Firebase blocked Google Sign-In because this domain (${currentHostname}) is not authorized.`,
        action: `Go to Firebase Console → Authentication → Settings → Authorized domains, and add "${currentHostname}".`,
      };
    }
    if (code === 'auth/popup-blocked') {
      return {
        severity: 'warning',
        title: 'Browser / iFrame Popup Blocked',
        description: 'The browser blocked the Google authentication popup window.',
        action: isInIframe
          ? 'The app is running inside an iframe. Try opening the app in a new tab to complete Google Sign-In.'
          : 'Please allow popups for this site in your browser address bar settings.',
      };
    }
    if (code === 'auth/operation-not-allowed') {
      return {
        severity: 'critical',
        title: 'Google Sign-In Provider Disabled',
        description: 'Google authentication is not enabled in your Firebase Project.',
        action: 'Go to Firebase Console → Authentication → Sign-in method, and enable "Google".',
      };
    }
    if (code === 'auth/popup-closed-by-user') {
      return {
        severity: 'info',
        title: 'Popup Closed',
        description: 'The Google Sign-In window was closed before completing the sign-in flow.',
        action: 'Click "Continue with Google" again and select an account in the popup.',
      };
    }
    if (code === 'auth/network-request-failed') {
      return {
        severity: 'warning',
        title: 'Network Request Failed',
        description: 'Could not reach Firebase Authentication servers.',
        action: 'Check your internet connection or any ad-blockers blocking Firebase domains.',
      };
    }
    return {
      severity: 'info',
      title: 'Firebase Auth Error Details',
      description: 'See raw error code and message below to troubleshoot.',
      action: 'Check the Firebase Console logs and configuration.',
    };
  };

  const hint = lastError ? getDiagnosticHint(lastError.code) : null;

  return (
    <div
      id="auth-debug-box"
      className="mt-6 rounded-2xl border-2 border-amber-300/80 bg-amber-50/60 overflow-hidden shadow-xs transition-all"
    >
      {/* Header Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-amber-100/90 border-b border-amber-200/90 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500 text-white">
            <Bug className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Auth Debugging Console
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                TEMPORARY
              </span>
              {lastError && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                  {lastError.code || 'Error'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-amber-800 font-medium mt-0.5">
              Live inspection of Firebase error.code, error.message & domain settings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 text-amber-800 hover:text-amber-950 rounded-lg hover:bg-amber-200/60 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 text-xs">
          {/* Active Error Section */}
          {lastError ? (
            <div className="space-y-3">
              {/* Error Code & Message Callout */}
              <div className="p-3.5 rounded-xl bg-white border border-rose-300 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-rose-100 pb-2">
                  <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Captured Firebase Error</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {lastError.timestamp}
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 select-none">error.code: </span>
                    <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      {lastError.code || '(undefined / not provided)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 select-none">error.message: </span>
                    <span className="text-slate-900 font-semibold break-all">
                      {lastError.message || '(empty message)'}
                    </span>
                  </div>

                  {lastError.name && (
                    <div>
                      <span className="text-slate-500 select-none">error.name: </span>
                      <span className="text-slate-700">{lastError.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actionable Diagnostic Card */}
              {hint && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    hint.severity === 'critical'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : hint.severity === 'warning'
                      ? 'bg-amber-100/70 border-amber-300 text-amber-950'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-950'
                  }`}
                >
                  {hint.severity === 'critical' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : hint.severity === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="font-bold text-xs">{hint.title}</div>
                    <div className="text-[11px] leading-relaxed opacity-90">{hint.description}</div>
                    <div className="text-[11px] font-bold mt-1 bg-white/70 p-2 rounded-lg border border-black/5">
                      <span className="font-black text-slate-800">Action: </span>
                      <span className="font-mono text-slate-900">{hint.action}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No Error State */
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200/80 flex items-center gap-2.5 text-amber-900">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="text-[11px] leading-relaxed">
                No error recorded yet. Click <span className="font-bold">"Continue with Google"</span> above or use the test button below to trace the exact Firebase error payload.
              </div>
            </div>
          )}

          {/* Environment & Config Inspection */}
          <div className="p-3 rounded-xl bg-slate-900 text-slate-200 space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1 text-slate-300 font-bold">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>Runtime Environment & Domain Info</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold">
                {isInIframe ? 'iFrame Environment' : 'Top Window'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="text-slate-400">Current Origin:</span>
                <span className="text-amber-300 font-bold break-all">{currentOrigin}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="text-slate-400">Current Hostname:</span>
                <span className="text-emerald-300 font-bold">{currentHostname}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="text-slate-400">Firebase Auth Domain:</span>
                <span className="text-cyan-300 font-semibold">{firebaseConfig.authDomain}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="text-slate-400">Project ID:</span>
                <span className="text-slate-200">{firebaseConfig.projectId}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {onRetryGoogle && (
                <button
                  type="button"
                  onClick={onRetryGoogle}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Test Google Auth</span>
                </button>
              )}
              {lastError && onClearError && (
                <button
                  type="button"
                  onClick={onClearError}
                  className="px-2.5 py-1.5 bg-white hover:bg-amber-100/80 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Clear Log
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-300"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-700" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Debug Payload</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
