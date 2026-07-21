import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, ShieldCheck, Smartphone, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import JanBoliLogo from './JanBoliLogo';
import { safeFetchJson } from '../lib/api';

interface LoginModalProps {
  onSuccess: (user: any) => void;
  onClose?: () => void;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

export default function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'google' | 'phone'>('google');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [userName, setUserName] = useState('');

  // Set up window postMessage listener for secure popup-based OAuth login completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.user) {
        onSuccess(event.data.user);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess]);

  const handleGoogleConnect = async (forceRedirect = false) => {
    setError('');
    setLoading(true);

    try {
      // Fetch secure URL from backend
      const endpoint = '/api/auth/google/url';
      const { ok, data } = await safeFetchJson(endpoint);
      if (!ok || !data?.url) throw new Error(data?.error || 'गुगल लगइन लिङ्क प्राप्त गर्न असमर्थ।');

      if (forceRedirect) {
        window.location.href = data.url;
        return;
      }

      // Try opening pop-up
      const popupWidth = 520;
      const popupHeight = 680;
      const left = window.screen.width / 2 - popupWidth / 2;
      const top = window.screen.height / 2 - popupHeight / 2;

      const authWindow = window.open(
        data.url,
        'google_oauth_popup',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      // Fallback to direct window redirect if popup is blocked (common in AppsGeyser/WebView)
      if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
        console.warn('Popup blocked, falling back to direct window redirect');
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'गुगल लगइन गर्न समस्या भयो।');
      setLoading(false);
    }
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOrEmail.trim()) {
      setError('कृपया मोबाइल नम्बर, इमेल वा युजर आईडी राख्नुहोस्।');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { ok, data } = await safeFetchJson('/api/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: phoneOrEmail.trim(),
          name: userName.trim()
        })
      });

      if (!ok || !data?.user) {
        throw new Error(data?.error || 'लगइन गर्न सकिएन।');
      }

      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'लगइन असफल भयो।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login_modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800/80 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative">
        
        {onClose && (
          <button 
            id="close_login"
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/50 p-1.5 rounded-full transition z-10"
          >
            <X size={18} />
          </button>
        )}

        {/* Brand Header */}
        <div className="p-6 flex flex-col items-center justify-center border-b border-slate-800/60 bg-slate-950/20">
          <JanBoliLogo size={130} isApkCard={true} showText={true} showTagline={true} />
        </div>

        {/* Interaction Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-xl p-3 flex items-start gap-2 animate-shake">
              <ShieldAlert size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-800/80 rounded-xl text-xs font-semibold">
            <button
              onClick={() => { setLoginMethod('google'); setError(''); }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                loginMethod === 'google' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GoogleIcon />
              <span>गुगल लगइन</span>
            </button>
            <button
              onClick={() => { setLoginMethod('phone'); setError(''); }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                loginMethod === 'phone' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone size={15} className="text-emerald-400" />
              <span>नम्बर / आईडी लगइन</span>
            </button>
          </div>

          {loginMethod === 'google' ? (
            <div className="space-y-4">
              <div className="space-y-1 text-center">
                <h3 className="text-white text-base font-extrabold tracking-tight">गुगल एकाउन्ट मार्फत प्रवेश</h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                  जनबोली समाचार पोर्टलमा सुरक्षित लगइन गरी समाचार र भिडियोहरू पोस्ट गर्नुहोस्।
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  id="google_login_trigger"
                  onClick={() => handleGoogleConnect(false)}
                  disabled={loading}
                  className="w-full bg-white hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50 text-slate-900 font-semibold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-3 text-sm border border-slate-200 cursor-pointer"
                >
                  <GoogleIcon />
                  <span>{loading ? 'प्रमाणीकरण हुँदैछ...' : 'गुगल (Google) मार्फत लगइन गर्नुहोस्'}</span>
                </button>

                {/* Direct redirect link for AppsGeyser / WebView users */}
                <button
                  onClick={() => handleGoogleConnect(true)}
                  disabled={loading}
                  className="w-full text-center text-xs text-sky-400 hover:text-sky-300 py-1 transition flex items-center justify-center gap-1 cursor-pointer underline"
                >
                  <span>एप्सगिजर वा मोबाइल वेबमा सिधै खोलि लगइन (Direct Redirect)</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleQuickLogin} className="space-y-3.5">
              <div className="space-y-1 text-center">
                <h3 className="text-white text-base font-extrabold tracking-tight">नम्बर वा युजर आईडी लगइन</h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                  आफ्नो मोबाइल नम्बर, इमेल वा युजर आईडी राखेर तुरुन्तै लगइन वा नयाँ खाता सुरु गर्नुहोस्।
                </p>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">मोबाइल नम्बर / इमेल / युजर आईडी *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. 9800000000 वा my_username"
                  value={phoneOrEmail}
                  onChange={(e) => setPhoneOrEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-red-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">तपाईंको नाम (ऐच्छिक / Optional)</label>
                <input
                  type="text"
                  placeholder="उदा. राम शर्मा"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                <span>{loading ? 'लगइन हुँदैछ...' : 'खाता खोलि प्रवेश गर्नुहोस्'}</span>
              </button>
            </form>
          )}

          {/* Secure compliance banner */}
          <div className="pt-3 border-t border-slate-800/40 text-center">
            <p className="text-slate-500 text-xxs flex items-center justify-center gap-1.5 leading-relaxed">
              <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
              सुरक्षित र प्रमाणीकृत प्रणाली | AppsGeyser, WebView र सञ्चार अनुकूल।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

