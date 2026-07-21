import React, { useState } from 'react';
import { 
  X, Copy, Check, Share2, Facebook, Twitter, Send, 
  MessageSquare, ExternalLink, Globe, Laptop, Award, Play 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Video } from '../types';

interface SharePreviewModalProps {
  video: Video;
  onClose: () => void;
  isLightMode?: boolean;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type Platform = 'facebook' | 'twitter' | 'whatsapp' | 'viber';

export default function SharePreviewModal({ 
  video, 
  onClose, 
  isLightMode = false,
  showToast 
}: SharePreviewModalProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>('facebook');
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/video/${video.id}`;
  const nepaliShareMessage = `जनबोली समाचार (JanBoli News) 🇳🇵\n\nशीर्षक: ${video.title}\nस्थान: ${video.district.split('(')[1]?.replace(')', '') || video.district}\n\nयो भिडियो रिपोर्ट हेर्न तलको लिङ्कमा क्लिक गर्नुहोस्:\n${shareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    if (showToast) {
      showToast("समाचारको लिङ्क क्लिपबोर्डमा कपी गरियो!", "success");
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFullText = () => {
    navigator.clipboard.writeText(nepaliShareMessage);
    if (showToast) {
      showToast("सम्पूर्ण विवरण र लिङ्क कपी गरियो!", "success");
    }
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: shareUrl,
      }).catch(err => console.log(err));
    } else {
      handleCopyLink();
    }
  };

  return (
    <div 
      id="share_preview_modal_overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm transition-opacity duration-300"
      onClick={onClose}
    >
      <motion.div
        id="share_preview_modal_content"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border transition-all duration-300 ${
          isLightMode 
            ? 'bg-slate-100 border-slate-200 text-slate-800' 
            : 'bg-slate-900 border-slate-800 text-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-4 flex items-center justify-between border-b ${
          isLightMode ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/90'
        }`}>
          <div className="flex items-center gap-2">
            <Share2 className="text-red-500" size={18} />
            <h2 className="text-sm font-bold font-display">साझा पूर्वावलोकन (Share Preview)</h2>
          </div>
          <button 
            id="close_share_preview" 
            onClick={onClose} 
            className={`p-1.5 rounded-full transition ${
              isLightMode ? 'text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200' : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          <p className={`text-[11px] leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
            यो समाचार लिङ्क विभिन्न सामाजिक सञ्जालमा साझा गर्दा देखिने आकर्षक र आधिकारिक पूर्वावलोकन तल हेर्नुहोस्।
          </p>

          {/* Platform tabs */}
          <div className={`flex gap-1 p-1 rounded-xl border ${
            isLightMode ? 'bg-white border-slate-200/80' : 'bg-slate-950/60 border-slate-800'
          }`}>
            {(['facebook', 'twitter', 'whatsapp', 'viber'] as Platform[]).map((plat) => (
              <button
                key={plat}
                id={`share_tab_${plat}`}
                onClick={() => setActivePlatform(plat)}
                className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition ${
                  activePlatform === plat
                    ? (isLightMode ? 'bg-slate-200 text-slate-900 shadow-sm' : 'bg-slate-800 text-white shadow')
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                {plat === 'facebook' && 'Facebook'}
                {plat === 'twitter' && 'X / Twitter'}
                {plat === 'whatsapp' && 'WhatsApp'}
                {plat === 'viber' && 'Viber'}
              </button>
            ))}
          </div>

          {/* Social Card Mockups container */}
          <div className={`p-4 rounded-xl border ${
            isLightMode ? 'bg-white border-slate-200/80' : 'bg-slate-950/40 border-slate-800'
          }`}>
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-mono font-bold block mb-3 text-center">
              {activePlatform} PREVIEW MOCKUP
            </span>

            {/* --- FACEBOOK PREVIEW MOCKUP --- */}
            {activePlatform === 'facebook' && (
              <div className="space-y-2 text-left">
                {/* Facebook publisher info */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-extrabold text-[11px] shadow border border-red-500">
                    JB
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-blue-500 hover:underline cursor-pointer">जनबोली (JanBoli News)</span>
                      <Award size={12} className="text-blue-500" fill="currentColor" />
                    </div>
                    <span className="text-[9px] text-slate-500">Just now • Shared Link 🌐</span>
                  </div>
                </div>

                {/* Facebook post comment text */}
                <p className={`text-xs ${isLightMode ? 'text-slate-800' : 'text-slate-300'}`}>
                  {video.district.split('(')[1]?.replace(')', '') || video.district} बाट विशेष समाचार अपडेट! जनबोली राष्ट्रिय रिपोर्टर नेटवर्क। 👇 #JanBoli #NewsNepal
                </p>

                {/* Facebook Link Card */}
                <div className={`border rounded overflow-hidden transition-colors ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  {/* Thumbnail / Video */}
                  <div className="aspect-[16/9] relative bg-slate-950 flex items-center justify-center overflow-hidden">
                    <video src={video.videoUrl} className="absolute inset-0 w-full h-full object-cover opacity-75" muted playsInline />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    
                    {/* CUSTOM JANBOLI BRANDING OVERLAY (Required Feature) */}
                    <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-r from-red-600/90 to-blue-700/90 text-white text-[9px] font-extrabold py-1 px-2.5 rounded-md border border-white/10 shadow-lg flex items-center justify-between z-10 backdrop-blur-xs">
                      <div className="flex items-center gap-1">
                        <span className="bg-white text-red-600 px-1 rounded text-[8px] font-black">जनबोली</span>
                        <span>JANBOLI NEWS • राष्ट्रिय आवाज 🇳🇵</span>
                      </div>
                      <span className="text-[8px] tracking-wide uppercase">LIVE UPDATES</span>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg border border-red-500">
                        <Play size={16} fill="white" className="ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Facebook Link details */}
                  <div className="p-2.5 space-y-1 bg-slate-900/10">
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">JANBOLI.NEWS</span>
                    <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                      {video.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1">
                      {video.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* --- TWITTER (X) PREVIEW MOCKUP --- */}
            {activePlatform === 'twitter' && (
              <div className="space-y-2 text-left">
                {/* Twitter publisher info */}
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center text-white font-extrabold text-[11px] shadow border border-slate-800">
                    𝕏
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5">
                      <span className={`text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>JanBoli Nepal</span>
                      <Award size={11} className="text-blue-400" fill="currentColor" />
                      <span className="text-[10px] text-slate-500 ml-1">@JanBoliOfficial • Now</span>
                    </div>
                    <span className="text-[9px] text-slate-500">Breaking News from the ground 🇳🇵</span>
                  </div>
                </div>

                {/* Twitter Tweet text */}
                <p className={`text-xs leading-relaxed ${isLightMode ? 'text-slate-800' : 'text-slate-300'}`}>
                  राष्ट्रिय समाचार अपडेट: {video.title}
                  <span className="text-blue-500 hover:underline block cursor-pointer mt-0.5">{shareUrl}</span>
                </p>

                {/* Twitter Large Summary Card */}
                <div className={`border rounded-xl overflow-hidden transition-colors ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  {/* Thumbnail / Video */}
                  <div className="aspect-[1.91/1] relative bg-slate-950 flex items-center justify-center overflow-hidden">
                    <video src={video.videoUrl} className="absolute inset-0 w-full h-full object-cover opacity-75" muted playsInline />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    
                    {/* CUSTOM JANBOLI BRANDING OVERLAY (Required Feature) */}
                    <div className="absolute bottom-2 left-2 right-2 bg-red-600/95 text-white text-[8px] font-black py-0.5 px-2 rounded border border-white/20 shadow-md flex items-center justify-between z-10">
                      <span>JANBOLI (जनबोली) NEWS • 🇳🇵 NATIONAL NETWORK</span>
                      <span className="text-yellow-400 text-[7px] tracking-widest animate-pulse">BREAKING</span>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg border border-blue-500">
                        <Play size={14} fill="white" className="ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Twitter card details */}
                  <div className="p-2.5 space-y-0.5">
                    <span className="text-[9px] text-slate-500 font-mono block">janboli.news</span>
                    <h4 className={`text-xs font-bold leading-snug line-clamp-1 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                      {video.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1">
                      {video.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* --- WHATSAPP PREVIEW MOCKUP --- */}
            {activePlatform === 'whatsapp' && (
              <div className="space-y-1.5 text-left">
                {/* Whatsapp chat bubble background */}
                <div className={`p-2.5 rounded-2xl max-w-[90%] shadow border transition-colors ${
                  isLightMode ? 'bg-emerald-50 border-emerald-100 text-slate-800' : 'bg-teal-950/30 border-teal-800/30 text-white'
                }`}>
                  {/* WhatsApp link preview block */}
                  <div className={`p-2 rounded-lg border-l-4 border-emerald-500 flex gap-2.5 mb-1.5 transition-colors ${
                    isLightMode ? 'bg-emerald-100/40' : 'bg-black/20'
                  }`}>
                    {/* Small preview thumbnail */}
                    <div className="w-12 h-12 bg-slate-950 rounded relative shrink-0 overflow-hidden flex items-center justify-center">
                      <video src={video.videoUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" muted />
                      
                      {/* CUSTOM JANBOLI BRANDING OVERLAY (Required Feature) */}
                      <div className="absolute bottom-0 inset-x-0 bg-red-600 text-white text-[5px] font-bold text-center py-0.5 z-10">
                        जनबोली
                      </div>
                      <Play size={10} fill="white" className="text-white z-10 opacity-80" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h4 className={`text-[10px] font-bold truncate ${isLightMode ? 'text-emerald-900' : 'text-emerald-400'}`}>
                        जनबोली (JanBoli News)
                      </h4>
                      <p className={`text-[10px] font-medium leading-tight line-clamp-1 ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
                        {video.title}
                      </p>
                      <p className="text-[8px] text-slate-500 truncate">
                        {video.description}
                      </p>
                    </div>
                  </div>

                  {/* Share link and timestamp inside bubble */}
                  <div className="flex items-end justify-between gap-4">
                    <span className="text-xs text-blue-500 hover:underline break-all font-mono">
                      {shareUrl}
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono shrink-0">12:34 PM ✓✓</span>
                  </div>
                </div>
              </div>
            )}

            {/* --- VIBER PREVIEW MOCKUP --- */}
            {activePlatform === 'viber' && (
              <div className="space-y-1.5 text-left">
                {/* Viber chat bubble background */}
                <div className={`p-2.5 rounded-2xl max-w-[90%] shadow border transition-colors ${
                  isLightMode ? 'bg-indigo-50 border-indigo-100 text-slate-800' : 'bg-indigo-950/30 border-indigo-900/30 text-white'
                }`}>
                  
                  {/* Viber Shared Link layout */}
                  <div className={`rounded-xl border overflow-hidden transition-colors ${
                    isLightMode ? 'bg-white border-slate-200/60' : 'bg-slate-950 border-slate-800'
                  }`}>
                    {/* Card Banner */}
                    <div className="aspect-[2/1] relative bg-slate-950 overflow-hidden flex items-center justify-center">
                      <video src={video.videoUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" muted />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      
                      {/* CUSTOM JANBOLI BRANDING OVERLAY (Required Feature) */}
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded border border-white/10 z-10">
                        JANBOLI NEWS 🇳🇵
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play size={16} fill="white" className="text-white opacity-80" />
                      </div>

                      <span className="absolute bottom-1.5 right-2 text-[8px] bg-black/60 text-white px-1 rounded font-mono">
                        {video.category.split('(')[1]?.replace(')', '') || video.category}
                      </span>
                    </div>

                    {/* Viber link text content */}
                    <div className="p-2 space-y-0.5">
                      <h4 className={`text-[10px] font-bold line-clamp-1 ${isLightMode ? 'text-indigo-900' : 'text-indigo-300'}`}>
                        जनबोली: {video.title}
                      </h4>
                      <p className="text-[9px] text-slate-500 line-clamp-2">
                        {video.description}
                      </p>
                      <span className="text-[8px] text-slate-400 block font-mono">JANBOLI.NEWS</span>
                    </div>
                  </div>

                  <span className="text-xs text-indigo-500 hover:underline block break-all font-mono mt-1">
                    {shareUrl}
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Quick Platform Share Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id="share_direct_facebook"
              onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')}
              className="flex items-center justify-center gap-1.5 bg-[#1877F2] hover:bg-[#1565C0] text-white text-[10px] font-bold py-2 rounded-xl transition shadow"
            >
              <Facebook size={12} fill="currentColor" />
              <span>Facebook मा साझा</span>
            </button>
            <button
              id="share_direct_twitter"
              onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(video.title)}`, '_blank')}
              className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-bold py-2 rounded-xl transition border border-slate-800 shadow"
            >
              <Twitter size={12} fill="currentColor" />
              <span>Twitter (X) मा साझा</span>
            </button>
          </div>

          {/* Core Action Buttons */}
          <div className={`p-3.5 rounded-xl space-y-2 border ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}>
            <div className="flex gap-2">
              <button
                id="share_copy_link_btn"
                onClick={handleCopyLink}
                className={`flex-1 flex items-center justify-center gap-1.5 font-bold py-2 px-3 rounded-xl text-[10px] transition duration-200 border shadow-sm ${
                  copied 
                    ? 'bg-green-600 border-green-500 text-white' 
                    : (isLightMode ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800')
                }`}
              >
                {copied ? <Check size={12} className="animate-bounce" /> : <Copy size={12} />}
                <span>{copied ? 'लिङ्क कपी भयो!' : 'लिङ्क मात्र कपी गर्नुहोस् (Copy Link)'}</span>
              </button>

              <button
                id="share_full_text_btn"
                onClick={handleCopyFullText}
                title="विवरणसहित कपी गर्नुहोस्"
                className={`flex items-center justify-center p-2 rounded-xl border transition ${
                  isLightMode 
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <Send size={12} />
              </button>
            </div>

            <button
              id="share_native_sys_btn"
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-600 to-blue-600 hover:opacity-95 text-white font-bold py-2 rounded-xl text-[10px] transition shadow"
            >
              <Share2 size={12} />
              <span>सिस्टम सेयर विन्डो खोल्नुहोस् (Open System Share)</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
