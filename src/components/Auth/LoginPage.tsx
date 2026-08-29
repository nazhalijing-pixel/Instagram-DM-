import React, { useState } from 'react';
import {
  Zap,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from '../../lib/firebase';
import { AuthDebugPanel, FirebaseErrorDetails } from './AuthDebugPanel';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<FirebaseErrorDetails | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const getCleanErrorMessage = (err: any): string => {
    const code = err?.code || '';
    const msg = err?.message || String(err);

    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was closed before completion.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network error. Please check your internet connection.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    return msg.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)/, '').trim();
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      const errMsg = 'Firebase authentication service is currently initializing. Please try again.';
      setError(errMsg);
      setDebugError({
        code: 'auth/not-initialized',
        message: errMsg,
        timestamp: new Date().toLocaleTimeString(),
        attemptType: isSignUp ? 'email_signup' : 'email_login',
      });
      return;
    }
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (fullName.trim() && userCredential.user) {
          try {
            await updateProfile(userCredential.user, {
              displayName: fullName.trim(),
              photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName.trim())}`,
            });
          } catch (pErr) {
            console.warn('Profile update warning:', pErr);
          }
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('[FIREBASE_EMAIL_AUTH_ERROR]', err);
      setDebugError({
        code: err?.code,
        message: err?.message || String(err),
        name: err?.name,
        customData: err?.customData,
        stack: err?.stack,
        timestamp: new Date().toLocaleTimeString(),
        attemptType: isSignUp ? 'email_signup' : 'email_login',
      });
      setError(getCleanErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) {
      const errMsg = 'Firebase authentication service is currently initializing. Please try again.';
      setError(errMsg);
      setDebugError({
        code: 'auth/provider-or-auth-null',
        message: errMsg,
        timestamp: new Date().toLocaleTimeString(),
        attemptType: 'google',
      });
      return;
    }

    setGoogleLoading(true);
    setError(null);

    try {
      console.log('[FIREBASE_GOOGLE_AUTH_START] Initiating signInWithPopup...');
      const userCredential = await signInWithPopup(auth, googleProvider);
      console.log('[FIREBASE_GOOGLE_AUTH_SUCCESS]', userCredential.user?.email);
      setDebugError(null);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('[FIREBASE_GOOGLE_AUTH_ERROR]', err);
      setDebugError({
        code: err?.code,
        message: err?.message || String(err),
        name: err?.name,
        customData: err?.customData,
        stack: err?.stack,
        timestamp: new Date().toLocaleTimeString(),
        attemptType: 'google',
      });
      setError(getCleanErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    if (!email) {
      setError('Please enter your email address to receive password reset instructions.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err: any) {
      console.error('[FIREBASE_RESET_PASSWORD_ERROR]', err);
      setDebugError({
        code: err?.code,
        message: err?.message || String(err),
        name: err?.name,
        customData: err?.customData,
        timestamp: new Date().toLocaleTimeString(),
        attemptType: 'password_reset',
      });
      setError(getCleanErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6FE] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-200/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-200/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 -right-24 w-72 h-72 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10">
        {/* App Logo & Name Centered */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white shadow-lg shadow-indigo-500/25 mb-3">
            <Zap className="w-7 h-7 fill-white stroke-[2.5]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">AutoReply.io</h1>
            <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-500 text-white px-2 py-0.5 rounded-full shadow-2xs">
              PRO
            </span>
          </div>
          <p className="text-xs text-slate-600 font-bold mt-1">Smart Instagram DM & Comment Automation</p>
        </div>

        {/* Clean White Card with Elevation */}
        <div className="bg-white rounded-3xl p-8 sm:p-9 border border-slate-200/90 shadow-xl shadow-slate-200/50 space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              {isForgotPassword
                ? 'Reset Password'
                : isSignUp
                ? 'Create Your Account'
                : 'Welcome back'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {isForgotPassword
                ? 'Enter your registered email to receive a recovery link'
                : 'Continue with Google or use your email and password'}
            </p>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Reset Password Sent Notice */}
          {resetSent && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-emerald-950 mb-0.5">Password Reset Link Sent!</p>
                <p className="text-emerald-800 font-normal leading-relaxed">
                  We have dispatched a reset link to <span className="font-bold">{email}</span>. Please check your inbox and spam folder.
                </p>
              </div>
            </div>
          )}

          {isForgotPassword ? (
            /* Forgot Password View */
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-[#3B5BFF] focus:ring-4 focus:ring-[#3B5BFF]/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-500/25 transition-colors duration-200 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetSent(false);
                    setError(null);
                  }}
                  className="text-xs font-black text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            /* Standard Sign In / Sign Up View */
            <div className="space-y-5">
              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-sm rounded-2xl shadow-sm transition-colors duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              {/* Or continue with Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider relative">
                  Or continue with
                </span>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required={isSignUp}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-[#3B5BFF] focus:ring-4 focus:ring-[#3B5BFF]/10 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-[#3B5BFF] focus:ring-4 focus:ring-[#3B5BFF]/10 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                      Password
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError(null);
                        }}
                        className="text-xs font-bold text-[#3B5BFF] hover:text-indigo-700 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-[#3B5BFF] focus:ring-4 focus:ring-[#3B5BFF]/10 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Continue Solid Color Full-Width Button */}
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:via-indigo-700 hover:to-pink-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-500/25 transition-colors duration-200 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{isSignUp ? 'Create Account & Continue' : 'Continue'}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>

              {/* Toggle Sign In / Sign Up */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-600 font-semibold">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                      setResetSent(false);
                    }}
                    className="font-black text-[#3B5BFF] hover:text-indigo-700 hover:underline cursor-pointer ml-1"
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up Free'}
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Bottom Agreement Text */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              By continuing you agree to our{' '}
              <a href="#" onClick={(e) => e.preventDefault()} className="text-slate-700 hover:underline font-bold">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" onClick={(e) => e.preventDefault()} className="text-slate-700 hover:underline font-bold">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Temporary Dedicated Auth Debugging Panel */}
        <AuthDebugPanel
          lastError={debugError}
          isLoading={googleLoading}
          onRetryGoogle={handleGoogleSignIn}
          onClearError={() => {
            setDebugError(null);
            setError(null);
          }}
        />

        {/* Feature Highlights Badges */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-600 font-bold">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>AI Fast Replies</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official Meta Graph API</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Multi-Tenant Isolated</span>
          </div>
        </div>
      </div>
    </div>
  );
};
