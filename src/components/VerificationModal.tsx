import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Award, Smartphone, ArrowRight, AlertCircle, Copy, Check } from 'lucide-react';
import { safeFetchJson } from '../lib/api';

interface VerificationModalProps {
  user: any;
  onClose: () => void;
  onSuccess: (updatedUser: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function VerificationModal({ user, onClose, onSuccess, showToast }: VerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [esewaTxnId, setEsewaTxnId] = useState('');
  const [esewaNumber, setEsewaNumber] = useState('');
  const [paymentStep, setPaymentStep] = useState<'info' | 'esewa_pay' | 'success'>('info');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const ESEWA_ID = "9763331056";
  const FEE = "रु. ५०";

  const handleCopyEsewa = () => {
    navigator.clipboard.writeText(ESEWA_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayEsewa = async (isQuickPay: boolean) => {
    if (!user) return;
    setError('');

    if (!isQuickPay && !esewaTxnId.trim()) {
      setError('कृपया eSewa ट्रान्ज्याक्सन आईडी (Transaction ID) वा सन्दर्भ नम्बर राख्नुहोस्।');
      return;
    }

    setLoading(true);

    try {
      const generatedTxnId = isQuickPay ? `ESEWA_PAY_50_${Date.now().toString().slice(-6)}` : esewaTxnId.trim();
      const { ok, data } = await safeFetchJson('/api/auth/verify-esewa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: user.phone || user.id,
          esewaTxnId: generatedTxnId,
          esewaNumber: esewaNumber.trim() || user.phone || '9800000000'
        })
      });

      if (ok && data?.user) {
        onSuccess(data.user);
        setPaymentStep('success');
        showToast("eSewa रु. ५० भुक्तानी सफल भयो! तपाईंको एकाउन्टमा ब्लु टिक थपिएको छ।", "success");
      } else {
        throw new Error(data?.error || "भुक्तानी प्रमाणीकरण गर्न सकिएन।");
      }
    } catch (err: any) {
      setError(err.message || 'त्रुटि भयो। कृपया पुनः प्रयास गर्नुहोस्।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative">
        {/* Header with eSewa Green branding */}
        <div className="bg-gradient-to-r from-[#60bb46] to-[#459e2c] p-5 text-slate-950 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-900/80 hover:text-slate-950 bg-black/10 hover:bg-black/20 rounded-full p-1.5 transition cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl p-2 shadow-md flex items-center justify-center shrink-0">
              <span className="font-extrabold text-[#60bb46] text-xl tracking-tighter">eSewa</span>
            </div>
            <div>
              <span className="bg-black/20 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full tracking-wider uppercase">
                आधिकारिक प्रमाणीकरण (Verified Badge)
              </span>
              <h2 className="text-xl font-extrabold tracking-tight mt-0.5">
                ब्लु टिक (Blue Tick) ब्याज रु. ५०
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {paymentStep === 'info' && (
            <div className="space-y-5">
              {/* Profile Preview */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#60bb46]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-100 text-sm truncate">{user.name}</span>
                    <CheckCircle2 size={16} className="text-sky-400 fill-sky-400 shrink-0" />
                  </div>
                  <span className="text-slate-400 text-xs truncate block">{user.phone}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">शुल्क</span>
                  <span className="text-lg font-black text-[#60bb46]">{FEE}</span>
                </div>
              </div>

              {/* Benefits list */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  ब्लु टिकका सुविधाहरू:
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-[#60bb46] shrink-0 mt-0.5" />
                    <span>तपाईंको प्रोफाइल र पोस्टहरूमा नीलो रङ्गको <b>Verified Badge (ब्लु टिक)</b> देखिनेछ।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Award size={15} className="text-[#60bb46] shrink-0 mt-0.5" />
                    <span>नागरिक पत्रकारको रूपमा आधिकारिक मान्यता र उच्च प्राथमिकता।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck size={15} className="text-[#60bb46] shrink-0 mt-0.5" />
                    <span>जनबोली समुदायमा समाचारहरूको आधिकारिकता र विश्वासनीयता वृद्धि।</span>
                  </div>
                </div>
              </div>

              {/* eSewa Primary Action Button */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handlePayEsewa(true)}
                  disabled={loading}
                  className="w-full bg-[#60bb46] hover:bg-[#52a63a] active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold py-3 px-4 rounded-xl transition shadow-lg hover:shadow-[#60bb46]/20 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Smartphone size={18} />
                  <span>{loading ? 'भुक्तानी हुँदैछ...' : 'eSewa मार्फत रु. ५० तुरुन्तै भुक्तानी गर्नुहोस्'}</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => setPaymentStep('esewa_pay')}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 px-4 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer border border-slate-700/60"
                >
                  <span>eSewa ID मा म्यानुअल रकम ट्रान्सफर गरी TXN ID राख्नुहोस्</span>
                </button>
              </div>
            </div>
          )}

          {paymentStep === 'esewa_pay' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-2">
                <span className="text-xs text-slate-400">eSewa Wallet ID:</span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl font-mono font-bold text-emerald-400">{ESEWA_ID}</span>
                  <button
                    onClick={handleCopyEsewa}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? 'कपि भयो' : 'कपि'}</span>
                  </button>
                </div>
                <p className="text-xxs text-slate-400 leading-relaxed">
                  माथिको eSewa ID मा <b>रु. ५०</b> पठाउनुहोस् र प्राप्त भएको <b>Transaction ID (Txn ID)</b> तल राख्नुहोस्:
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium mb-1 block">
                    eSewa ट्रान्ज्याक्सन आईडी (Txn ID) *
                  </label>
                  <input
                    type="text"
                    value={esewaTxnId}
                    onChange={(e) => setEsewaTxnId(e.target.value)}
                    placeholder="उदा: 000456789123"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#60bb46]"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium mb-1 block">
                    तपाईंको eSewa मोबाइल नम्बर (वैकल्पिक)
                  </label>
                  <input
                    type="text"
                    value={esewaNumber}
                    onChange={(e) => setEsewaNumber(e.target.value)}
                    placeholder="उदा: 98XXXXXXXX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#60bb46]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStep('info')}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl text-xs transition cursor-pointer"
                  >
                    पछाडि फर्किनुहोस्
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePayEsewa(false)}
                    disabled={loading}
                    className="flex-[2] bg-[#60bb46] hover:bg-[#52a63a] disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {loading ? 'पुष्टि हुँदैछ...' : 'रु. ५० भुक्तानी पुष्टि गर्नुहोस्'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="text-center py-6 space-y-4 animate-scale-up">
              <div className="w-16 h-16 bg-[#60bb46]/20 border-2 border-[#60bb46] rounded-full flex items-center justify-center mx-auto text-[#60bb46]">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">बधाई छ! भुक्तानी सफल भयो</h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                  eSewa मार्फत <b>रु. ५०</b> भुक्तानी सफलतापूर्वक प्राप्त भयो। तपाईंको खातामा <b>Verified Blue Tick</b> थपिएको छ।
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-[#60bb46] text-slate-950 font-bold py-3 rounded-xl text-sm transition hover:bg-[#52a63a] cursor-pointer"
              >
                धन्यवाद (सम्पन्न)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
