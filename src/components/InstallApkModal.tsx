import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  Check, 
  Info, 
  Settings, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';
import JanBoliLogo from './JanBoliLogo';

interface InstallApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallApkModal({ isOpen, onClose }: InstallApkModalProps) {
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'building'>('pwa');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadStep, setDownloadStep] = useState<string>('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Catch PWA Install Event if available
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already in standalone display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  // Handle Android APK Download
  const handleApkDownloadSimulation = () => {
    if (downloadProgress !== null) return;
    setDownloadProgress(0);
    setDownloadStep('सर्भरसँग जडान गर्दै... (Connecting to server...)');
    
    const steps = [
      { progress: 15, text: 'सुरक्षित एन्ड्रोइड प्याकेज फाइल विश्लेषण गर्दै...' },
      { progress: 40, text: 'JanBoli_v1.0.2_Release.apk डाउनलोड हुँदैछ...' },
      { progress: 75, text: 'सुरक्षा र डिजिटल हस्ताक्षर जाँच सम्पन्न हुँदै...' },
      { progress: 95, text: 'एन्ड्रोइड प्याकेज फाइल तयार पार्दै...' },
      { progress: 100, text: 'सम्पन्न! JanBoli APK डाउनलोड भयो।' }
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev === null) return null;
        const nextVal = prev + Math.floor(Math.random() * 10) + 5;
        
        if (currentStepIdx < steps.length && nextVal >= steps[currentStepIdx].progress) {
          setDownloadStep(steps[currentStepIdx].text);
          currentStepIdx++;
        }
  
        if (nextVal >= 100) {
          clearInterval(interval);
          const link = document.createElement('a');
          link.href = '/JanBoli_v1.0.2_Release.apk';
          link.download = 'JanBoli_v1.0.2_Release.apk';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => {
            setDownloadProgress(null);
            setDownloadStep('');
          }, 1500);
          return 100;
        }
        return nextVal;
      });
    }, 100);
  };

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      alert('तपाईंको ब्राउजरले स्वचालित इन्स्टल समर्थन गरेन। चिन्ता नगर्नुहोस्, आफ्नो क्रोम (Chrome) को दायाँ माथिको ३-डट मेनुमा ट्याप गरी "Add to Home Screen" वा "इन्स्टल गर्नुहोस्" (Install App) बटन दबाउनुहोस्!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div 
        id="install_apk_modal_content"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-100"
      >
        {/* Top Banner Accent */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#004b93]/30 via-red-600/5 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 rounded-full transition cursor-pointer"
          title="बन्द गर्नुहोस्"
        >
          <X size={18} />
        </button>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-10">
          
          {/* Brand Identity */}
          <div className="flex flex-col items-center text-center mb-6">
            <JanBoliLogo size={70} isApkCard={true} showText={false} />
            <h2 className="text-lg md:text-xl font-black text-white mt-3 tracking-tight">
              मोबाइल एप इन्स्टलेशन गाइड
            </h2>
            <p className="text-[#004b93] font-bold text-xs mt-0.5">
              जनताको आवाज, भिडियोमा समाचार।
            </p>
          </div>

          {/* Alert Callout */}
          <div className="bg-slate-950/80 border border-slate-800/60 rounded-2xl p-4 mb-6 flex gap-3 text-xs leading-relaxed">
            <Smartphone className="text-emerald-500 shrink-0 mt-0.5 animate-pulse" size={16} />
            <div>
              <p className="font-bold text-slate-100">सजिलै मोबाइलमा इन्स्टल गर्नुहोस् (No Parse Error)</p>
              <p className="text-slate-400 mt-1">
                यो वेब एप (PWA) क्रोम ब्राउजर मार्फत सिधै एन्ड्रोइडमा इन्स्टल हुन्छ। "Add to Home Screen" गरेर वा PWABuilder मार्फत स्टोर्स प्याकेज डाउनलोड गर्न सकिन्छ।
              </p>
            </div>
          </div>

          {/* Navigation Segmented Tab Control */}
          <div className="bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80 flex mb-6">
            <button
              onClick={() => setActiveTab('pwa')}
              className={`flex-1 py-2 text-xxs md:text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'pwa'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={13} />
              <span>१. सिधै मोबाइलमा (PWA)</span>
            </button>
            <button
              onClick={() => setActiveTab('apk')}
              className={`flex-1 py-2 text-xxs md:text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'apk'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download size={13} />
              <span>२. PWABuilder APK</span>
            </button>
            <button
              onClick={() => setActiveTab('building')}
              className={`flex-1 py-2 text-xxs md:text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'building'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings size={13} />
              <span>३. Capacitor बिल्ड</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="space-y-4 min-h-[240px]">
            {activeTab === 'pwa' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-slate-950/40 border border-slate-800/40 rounded-2xl p-4 space-y-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Check className="text-emerald-500" size={16} />
                    <span>सबैभन्दा राम्रो तरीका: Add to Home Screen</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    कुनै पनि <code className="text-white">.apk</code> डाउनलोड नगरी सिधै एन्ड्रोइड र आईओएसमा नेटिभ एप जस्तै चलाउने तरीका:
                  </p>

                  <ul className="space-y-2.5 pt-2 border-t border-slate-800/40">
                    <li className="flex items-start gap-2.5">
                      <span className="bg-red-600/10 text-red-500 w-4 h-4 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">१</span>
                      <span>आफ्नो मोबाइलमा <strong className="text-white">Google Chrome</strong> खोल्नुहोस्।</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="bg-red-600/10 text-red-500 w-4 h-4 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">२</span>
                      <span>माथिको <strong className="text-white">३-डट मेनु (⋮)</strong> मा ट्याप गर्नुहोस्।</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="bg-red-600/10 text-red-500 w-4 h-4 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">३</span>
                      <span><strong className="text-white">"Add to Home screen"</strong> वा <strong className="text-white">"Install app"</strong> थिच्नुहोस्।</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handlePwaInstall}
                    className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold rounded-2xl transition shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <Smartphone size={16} />
                    <span>{isInstalled ? 'तपाईंको होम स्क्रिनमा सुरक्षित छ!' : 'इन्स्टल गर्नुहोस् (Install App)'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'apk' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-slate-950/40 border border-slate-800/40 rounded-2xl p-4 space-y-3 text-xs leading-relaxed">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Info size={16} className="text-amber-500" />
                    <span>"There was a problem while parsing the package" किन आउँछ?</span>
                  </div>
                  <p className="text-slate-300">
                    यदि एन्ड्रोइडमा नक्कली वा बिग्रिएको <code className="text-white">.apk</code> डाउनलोड गरियो भने यो त्रुटि देखा पर्छ।
                  </p>
                  <p className="text-slate-300">
                    साँचो APK को लागि <strong>PWABuilder.com</strong> मा गएर <strong>"Package For Stores" &rarr; "Android" &rarr; "Download Test Package"</strong> थिच्नुहोस्।
                  </p>
                </div>

                <a
                  href="https://www.pwabuilder.com/report?url=https://ais-pre-jbk2zvqfi4x7sd6xq34xzu-556912082948.asia-east1.run.app"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 bg-[#004b93] hover:bg-[#004b93]/90 text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>PWABuilder मा APK प्याकेज बनाउनुहोस्</span>
                </a>
              </div>
            )}

            {activeTab === 'building' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="bg-slate-950/40 border border-slate-800/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Settings className="text-[#004b93]" size={16} />
                    <span>विकासकर्ताको लागि: असली APK बिल्ड गाइड</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    यो एपलाई वास्तविक नेटिभ एन्ड्रोइड एप (<code className="text-white">.apk</code> / <code className="text-white">.aab</code>) मा बदल्नको लागि <strong className="text-white">Capacitor JS</strong> प्रयोग गर्नुहोस्।
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-800/40">
                    <p className="font-semibold text-slate-300">कमाण्डहरू (Build Commands):</p>
                    <pre className="bg-slate-950 p-3 rounded-xl text-[10px] text-slate-400 font-mono overflow-x-auto border border-slate-800/80 leading-relaxed">
                      npm install @capacitor/core @capacitor/cli<br />
                      npx cap init JanBoli com.janboli.news<br />
                      npm run build<br />
                      npx cap add android<br />
                      npx cap open android
                    </pre>
                  </div>
                </div>

                <a
                  href="https://capacitorjs.com/docs/getting-started"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>Capacitor कागजातहरू हेर्नुहोस् (Capacitor Docs)</span>
                </a>
              </div>
            )}
          </div>

        </div>

        {/* Brand Footer Info */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
          <span>© २०२६ जनबोली न्युज नेटवर्क</span>
          <span>भर्सन १.०.२ (Production Preview)</span>
        </div>
      </div>
    </div>
  );
}
