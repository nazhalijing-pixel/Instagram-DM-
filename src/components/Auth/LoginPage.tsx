import React, { useState, useEffect } from 'react';
import {
  Zap,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Check,
  Globe,
  ArrowRight,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import { TermsModal } from './TermsModal';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { setIsGuestMode, firebaseUser, setFirebaseUser, authLoading } = useApp();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [googleAuthMode, setGoogleAuthMode] = useState<'popup' | 'redirect'>('popup');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);

  const wasRedirectPending = (() => {
    try {
      return typeof window !== 'undefined' && sessionStorage.getItem('firebase_redirect_pending') === 'true';
    } catch {
      return false;
    }
  })();

  const [termsModalType, setTermsModalType] = useState<'terms' | 'privacy' | null>(null);

  // Helper to detect mobile browser environment (touch devices)
  const isMobileBrowser = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Immediate listener: if firebaseUser becomes available, proceed
  useEffect(() => {
    if (firebaseUser) {
      setIsGuestMode(false);
      try {
        sessionStorage.removeItem('firebase_redirect_pending');
      } catch {}
      if (onSuccess) onSuccess();
    }
  }, [firebaseUser, onSuccess]);

  // Clean up pending flag if authLoading finishes without an authenticated user
  useEffect(() => {
    if (!authLoading && !firebaseUser && wasRedirectPending) {
      try {
        sessionStorage.removeItem('firebase_redirect_pending');
      } catch {}
    }
  }, [authLoading, firebaseUser, wasRedirectPending]);

  // Copy current domain to clipboard
  const handleCopyDomain = () => {
    if (typeof window !== 'undefined' && window.location.hostname) {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  // 2. Google Sign-In Handler (High-Reliability Popup First, Graceful Fallback)
  const handleGoogleSignIn = async (forcedRedirect: boolean = false) => {
    if (!auth || !googleProvider) {
      setErrorMsg('Authentication service is not initialized. Please refresh and try again.');
      return;
    }

    setIsGoogleLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setUnauthorizedDomain(null);

    // If explicit redirect is requested
    if (forcedRedirect) {
      try {
        setGoogleAuthMode('redirect');
        try {
          sessionStorage.setItem('firebase_redirect_pending', 'true');
        } catch {}
        console.log('[GOOGLE_SIGNIN_REDIRECT_START] Launching signInWithRedirect...');
        await signInWithRedirect(auth, googleProvider);
        // Browser redirects away
        return;
      } catch (redirectErr: any) {
        try {
          sessionStorage.removeItem('firebase_redirect_pending');
        } catch {}
        console.error('[GOOGLE_REDIRECT_LAUNCH_ERR]', redirectErr);
        if (redirectErr?.code === 'auth/unauthorized-domain') {
          setUnauthorizedDomain(window.location.hostname);
          setErrorMsg(`Domain "${window.location.hostname}" is not authorized in Firebase Console.`);
        } else {
          setErrorMsg(redirectErr?.message || 'Could not initiate Google Sign-In redirect.');
        }
        setIsGoogleLoading(false);
        return;
      }
    }

    // Default & Recommended: signInWithPopup
    // Popup keeps the current SPA session alive in memory and eliminates redirect loops
    try {
      setGoogleAuthMode('popup');
      console.log('[GOOGLE_SIGNIN_POPUP_START] Launching signInWithPopup...');
      const result = await signInWithPopup(auth, googleProvider);

      if (result && result.user) {
        setFirebaseUser(result.user);
        setIsGuestMode(false);
        setSuccessMsg(`Signed in as ${result.user.displayName || result.user.email}`);
        console.log('[GOOGLE_SIGNIN_POPUP_SUCCESS]', result.user.email);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error('[GOOGLE_POPUP_ERROR]', err?.code, err?.message, err);

      // If popup blocked or unsupported on this device, fall back to redirect
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        console.warn('[GOOGLE_AUTH_FALLBACK] Popup blocked or not supported. Falling back to signInWithRedirect...');
        try {
          setGoogleAuthMode('redirect');
          try {
            sessionStorage.setItem('firebase_redirect_pending', 'true');
          } catch {}
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (rErr: any) {
          try {
            sessionStorage.removeItem('firebase_redirect_pending');
          } catch {}
          console.error('[GOOGLE_REDIRECT_FALLBACK_ERR]', rErr);
          if (rErr?.code === 'auth/unauthorized-domain') {
            setUnauthorizedDomain(window.location.hostname);
            setErrorMsg(`Domain "${window.location.hostname}" is not authorized in Firebase Console.`);
          } else {
            setErrorMsg('Popups are blocked by your browser. Click the "Use Full-Screen Redirect" link below to sign in.');
          }
        }
      } else if (err?.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(window.location.hostname);
        setErrorMsg(
          `Domain "${window.location.hostname}" is not authorized in Firebase Console -> Authentication -> Settings -> Authorized Domains.`
        );
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in popup was closed before completing. Click again to continue.');
      } else {
        setErrorMsg(err?.message || 'Could not sign in with Google. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 3. Email & Password Sign-In / Auto-Signup with Firebase Auth
  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (!auth) {
      setErrorMsg('Authentication service is not available.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // First attempt sign-in with email & password
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (cred.user) {
        setFirebaseUser(cred.user);
        setIsGuestMode(false);
        setSuccessMsg(`Welcome back, ${cred.user.email}!`);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.warn('[EMAIL_AUTH_ATTEMPT]', err?.code);

      // If user is not found or invalid credential on first try, auto-create account smoothly
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          if (newCred.user) {
            setFirebaseUser(newCred.user);
            setIsGuestMode(false);
            setSuccessMsg(`Account created! Welcome, ${newCred.user.email}!`);
            if (onSuccess) onSuccess();
            return;
          }
        } catch (createErr: any) {
          if (createErr?.code === 'auth/email-already-in-use') {
            setErrorMsg('Incorrect password for this email. Click "Forgot password?" to reset.');
          } else {
            setErrorMsg(createErr?.message || 'Authentication failed. Please verify your credentials.');
          }
        }
      } else if (err?.code === 'auth/wrong-password') {
        setErrorMsg('Incorrect password. Click "Forgot password?" to reset it.');
      } else if (err?.code === 'auth/invalid-email') {
        setErrorMsg('Please enter a valid email address format.');
      } else {
        setErrorMsg(err?.message || 'Sign in failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Forgot Password handler
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address in the field above first, then click "Forgot password?".');
      return;
    }

    if (!auth) {
      setErrorMsg('Authentication service is not available.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg(`Password reset instructions have been sent to ${email.trim()}.`);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not send password reset email.');
    }
  };

  // 5. Bypass for Authorized Primary Owner (Instant Fast-Pass if domain check blocks)
  const handleFastPassSignIn = (ownerEmail: string) => {
    setIsGuestMode(true);
    // Also trigger profile sync on backend
    fetch('/api/user/sync-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: 'owner_primary',
        email: ownerEmail,
        displayName: 'Dev Singh Parmar (Owner)',
        photoURL: '',
      }),
    }).catch(console.warn);

    if (onSuccess) onSuccess();
  };

  // 6. Continue as Guest / Demo Mode
  const handleContinueAsGuest = () => {
    setIsGuestMode(true);
    if (onSuccess) onSuccess();
  };

  // Loading state while checking redirect result on mount
  if (wasRedirectPending && authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Verifying Authentication</h3>
            <p className="text-xs text-slate-500 mt-1">Completing secure Google authentication handshake...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12 select-none">
      {/* Center Logo Section */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Zap className="w-5 h-5 fill-white stroke-[2.2]" />
        </div>
        <span className="text-2xl font-bold text-slate-900 tracking-tight">autoreply.io</span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/90 p-8 sm:p-10">
        {/* Heading & Subtext */}
        <h1 className="text-2xl font-bold text-slate-900 text-center tracking-tight">Welcome back</h1>
        <p className="text-xs text-slate-500 text-center mt-2 mb-6 leading-relaxed">
          Continue with Google or use your email and password
        </p>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="leading-snug block">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Authorized Domain Troubleshooting Helper Card */}
        {unauthorizedDomain && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Domain Authorization Required</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Google Sign-In requires your deployed domain to be added to Firebase Console:
            </p>
            <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-amber-200/80 font-mono text-[11px] text-slate-800">
              <span className="truncate">{unauthorizedDomain}</span>
              <button
                onClick={handleCopyDomain}
                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedDomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[10px] text-amber-600 leading-normal">
              Go to <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong> and add this domain.
            </p>
            <div className="pt-1">
              <button
                onClick={() => handleFastPassSignIn('devsinghparmar9589@gmail.com')}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Instant Login as Dev Singh (Owner)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* Primary Action: Continue with Google Button */}
        <button
          type="button"
          onClick={() => handleGoogleSignIn(false)}
          disabled={isLoading || isGoogleLoading}
          className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-3 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>
                {googleAuthMode === 'redirect' ? 'Redirecting to Google...' : 'Connecting to Google...'}
              </span>
            </>
          ) : (
            <>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-4 h-4 shrink-0"
                referrerPolicy="no-referrer"
              />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Mobile / Direct Redirect Mode Link */}
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => handleGoogleSignIn(true)}
            className="text-[11px] text-slate-400 hover:text-blue-600 font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <Smartphone className="w-3 h-3" />
            <span>On mobile or popup blocked? Use Full-Screen Redirect &rarr;</span>
          </button>
        </div>

        {/* Divider line with "Or continue with email" */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400 font-medium">Or continue with email</span>
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Continuing...</span>
              </>
            ) : (
              <span>Sign In / Continue</span>
            )}
          </button>
        </form>

        {/* Bottom Disclaimer */}
        <p className="mt-6 text-center text-xs text-slate-500 leading-relaxed">
          By continuing you agree to our{' '}
          <button
            type="button"
            onClick={() => setTermsModalType('terms')}
            className="text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Terms
          </button>{' '}
          and{' '}
          <button
            type="button"
            onClick={() => setTermsModalType('privacy')}
            className="text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Privacy Policy
          </button>
        </p>

        {/* Optional Demo Mode Bypass */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => handleFastPassSignIn('devsinghparmar9589@gmail.com')}
            className="text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer"
          >
            Login as Owner (Dev Singh) &rarr;
          </button>

          <button
            type="button"
            onClick={handleContinueAsGuest}
            className="text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
          >
            Guest Demo &rarr;
          </button>
        </div>
      </div>

      {/* Terms & Privacy Modal */}
      <TermsModal
        isOpen={termsModalType !== null}
        onClose={() => setTermsModalType(null)}
        type={termsModalType || 'terms'}
      />
    </div>
  );
};
