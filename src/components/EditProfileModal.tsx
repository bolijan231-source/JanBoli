import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, MapPin, Check, Loader2, Sparkles, Lock, Info } from 'lucide-react';
import { safeFetchJson } from '../lib/api';

interface EditProfileModalProps {
  user: any;
  onClose: () => void;
  onSuccess: (updatedUser: any) => void;
  isLightMode: boolean;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const PROVINCES = [
  'Koshi Province (कोशी प्रदेश)',
  'Madhesh Province (मधेस प्रदेश)',
  'Bagmati Province (बागमती प्रदेश)',
  'Gandaki Province (गण्डकी प्रदेश)',
  'Lumbini Province (लुम्बिनी प्रदेश)',
  'Karnali Province (कर्णाली प्रदेश)',
  'Sudurpashchim Province (सुदूरपश्चिम प्रदेश)'
];

const DISTRICTS_MAP: { [key: string]: string[] } = {
  'Koshi Province (कोशी प्रदेश)': ['Jhapa (झापा)', 'Morang (मोरङ)', 'Sunsari (सुनसरी)', 'Ilam (इलाम)', 'Dhankuta (धनकुटा)', 'Sankhuwasabha (संखुवासभा)'],
  'Madhesh Province (मधेस प्रदेश)': ['Dhanusha (धनुषा)', 'Sarlahi (सर्लाही)', 'Saptari (सप्तरी)', 'Siraha (सिराहा)', 'Parsa (पर्सा)', 'Bara (बारा)'],
  'Bagmati Province (बागमती प्रदेश)': ['Kathmandu (काठमाडौं)', 'Lalitpur (ललितपुर)', 'Bhaktapur (भक्तपुर)', 'Chitwan (चितवन)', 'Kavre (काभ्रे)', 'Sindhupalchok (सिन्धुपाल्चोक)'],
  'Gandaki Province (गण्डकी प्रदेश)': ['Kaski (कास्की)', 'Tanahun (तनहुँ)', 'Syangja (स्याङ्जा)', 'Gorkha (गोरखा)', 'Baglung (बागलुङ)', 'Mustang (मुस्ताङ)'],
  'Lumbini Province (लुम्बिनी प्रदेश)': ['Rupandehi (रुपन्देही)', 'Kapilvastu (कपिलवस्तु)', 'Dang (दाङ)', 'Banke (बाँके)', 'Palpa (पाल्पा)', 'Bardiya (बर्दिया)'],
  'Karnali Province (कर्णाली प्रदेश)': ['Surkhet (सुर्खेत)', 'Dailekh (दैलेख)', 'Jumla (जुम्ला)', 'Salyan (सल्यान)', 'Kalikot (कालिकोट)', 'Humla (हुम्ला)'],
  'Sudurpashchim Province (सुदूरपश्चिम प्रदेश)': ['Kailali (कैलाली)', 'Kanchanpur (कञ्चनपुर)', 'Doti (डोटी)', 'Dadeldhura (डडेल्धुरा)', 'Baitadi (बैतडी)', 'Darchula (दार्चुला)']
};

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop'
];

export default function EditProfileModal({ user, onClose, onSuccess, isLightMode, showToast }: EditProfileModalProps) {
  const [name, setName] = useState(user.name || '');
  const defaultUserHandle = user.userId || (user.phone ? `user_${user.phone.replace(/[^a-zA-Z0-9]/g, '').slice(-6)}` : 'janboli_user');
  const [userId, setUserId] = useState((defaultUserHandle || '').replace(/^@/, ''));
  const [province, setProvince] = useState(user.province || PROVINCES[2]);
  const [district, setDistrict] = useState(user.district || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || DEFAULT_AVATARS[0]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 90-day cooldown check for User ID edits
  const lastUpdated = user.userIdLastUpdated ? new Date(user.userIdLastUpdated) : null;
  const now = new Date();
  const daysPassed = lastUpdated ? Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const canEditUserId = !lastUpdated || daysPassed >= 90;
  const daysRemaining = Math.max(1, 90 - daysPassed);

  // Sync district options based on selected province
  useEffect(() => {
    const districts = DISTRICTS_MAP[province] || [];
    if (!districts.includes(district)) {
      setDistrict(districts[0] || '');
    }
  }, [province]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('कृपया केवल फोटो फाइलहरू मात्र चयन गर्नुहोस्।', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('फोटो धेरै ठूलो भयो। कृपया ५ एमबी भन्दा सानो फोटो अपलोड गर्नुहोस्।', 'error');
      return;
    }

    setUploading(true);
    setError('');

    // Convert file to base64 and upload
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      try {
        const { ok, data } = await safeFetchJson('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            base64: base64Data
          })
        });

        if (!ok) {
          throw new Error(data?.error || 'फोटो अपलोड असफल भयो।');
        }

        setAvatarUrl(data.url);
        showToast('प्रोफाइल फोटो सफलतापूर्वक परिवर्तन भयो!', 'success');
      } catch (err: any) {
        setError(err.message || 'फोटो अपलोड असफल भयो।');
        showToast(err.message || 'फोटो अपलोड असफल भयो।', 'error');
      } finally {
        setUploading(false);
      }
    };

    reader.onerror = () => {
      setUploading(false);
      setError('फाइल पढ्न सकिएन।');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('पूरा नाम आवश्यक छ।');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { ok, data } = await safeFetchJson('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: user.phone,
          name: name.trim(),
          userId: userId.trim().replace(/^@/, ''),
          district,
          province,
          avatar: avatarUrl
        })
      });

      if (!ok) {
        throw new Error(data?.error || 'प्रोफाइल अद्यावधिक असफल भयो।');
      }

      // Save updated user to localstorage
      localStorage.setItem('janboli_session', JSON.stringify(data.user));
      onSuccess(data.user);
      showToast('तपाईंको प्रोफाइल सफलतापूर्वक अद्यावधिक गरियो!', 'success');
      onClose();
    } catch (err: any) {
      setError(err.message || 'त्रुटि देखा पर्यो।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 150 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 150 }}
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
        className={`w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border transition-colors duration-300 ${
          isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-900 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between transition-colors duration-300 ${
          isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-900'
        }`}>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#fe2c55]/10 text-[#fe2c55]">
              <Sparkles size={16} />
            </span>
            <h2 className="text-sm font-black font-display tracking-tight">प्रोफाइल सम्पादन गर्नुहोस्</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition ${
              isLightMode ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-5 no-scrollbar">
          
          {/* Avatar Edit Zone */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-800 relative shadow-xl">
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                />
                
                {/* Overlay on hover or when uploading */}
                <div className={`absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white transition-opacity duration-200 ${
                  uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  {uploading ? (
                    <Loader2 size={22} className="animate-spin text-[#fe2c55]" />
                  ) : (
                    <>
                      <Camera size={18} className="mb-0.5" />
                      <span className="text-[9px] font-bold text-center">फोटो फेर्नुहोस्</span>
                    </>
                  )}
                </div>
              </div>

              {/* Verified Badge or Camera Icon Overlay */}
              <div className="absolute bottom-1 right-1 bg-[#fe2c55] text-white p-1.5 rounded-full shadow-lg border-2 border-slate-950">
                <Camera size={12} />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center">
              माथिको फोटोमा क्लिक गरेर नयाँ प्रोफाइल तस्वीर अपलोड गर्नुहोस्।
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading || saving}
            />

            {/* Quick Select Predefined Avatars */}
            <div className="w-full pt-1">
              <span className="text-[10px] text-slate-400 font-bold block mb-2 text-center uppercase tracking-wider">अथवा पूर्वनिर्धारित रोज्नुहोस्:</span>
              <div className="flex justify-center gap-2 overflow-x-auto py-1">
                {DEFAULT_AVATARS.map((av, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => {
                      if (!uploading && !saving) setAvatarUrl(av);
                    }}
                    className={`w-9 h-9 rounded-full overflow-hidden border-2 transition ${
                      avatarUrl === av ? 'border-[#fe2c55] scale-110 shadow-md shadow-[#fe2c55]/20' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={av} alt="Avatar option" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className={isLightMode ? 'border-slate-150' : 'border-slate-900'} />

          {/* Form fields */}
          <div className="space-y-4">
            
            {/* User ID (Unique Handle with 90-day edit constraint) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  युजर आईडी (User ID) *
                </label>
                {!canEditUserId && (
                  <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <Lock size={11} /> लक गरिएको (बाँकी {daysRemaining} दिन)
                  </span>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-xs font-bold select-none">@</span>
                <input
                  type="text"
                  disabled={!canEditUserId}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  placeholder="उदा. janboli_user"
                  className={`w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border font-mono transition ${
                    !canEditUserId
                      ? isLightMode 
                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed select-none' 
                        : 'bg-slate-900/60 border-slate-900 text-slate-500 cursor-not-allowed select-none'
                      : isLightMode 
                        ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#fe2c55] focus:ring-1 focus:ring-[#fe2c55]/20' 
                        : 'bg-slate-900/40 border-slate-800 text-white focus:border-[#fe2c55] focus:ring-1 focus:ring-[#fe2c55]/20'
                  }`}
                />
              </div>

              {canEditUserId ? (
                <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <Info size={12} className="text-sky-400 shrink-0" />
                  <span>युजर आईडी परिवर्तन गरेपछि ९० दिनसम्म पुनः सम्पादन गर्न पाइने छैन।</span>
                </p>
              ) : (
                <p className="text-[10px] text-amber-400/90 mt-1.5 flex items-center gap-1 font-medium">
                  <Lock size={12} className="shrink-0 text-amber-500" />
                  <span>युजर आईडी हालै अद्यावधिक गरिएको छ। पुनः सम्पादन गर्न ९० दिन पर्खनुपर्नेछ।</span>
                </p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                पूरा नाम (Full Name) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="तपाईंको पूरा नाम लेख्नुहोस्"
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition ${
                  isLightMode 
                    ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#fe2c55] focus:ring-[#fe2c55]/20' 
                    : 'bg-slate-900/40 border-slate-800 text-white focus:border-[#fe2c55] focus:ring-[#fe2c55]/20'
                }`}
              />
            </div>

            {/* Province Select */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                प्रदेश (Province) *
              </label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition appearance-none cursor-pointer ${
                  isLightMode 
                    ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#fe2c55] focus:ring-[#fe2c55]/20' 
                    : 'bg-slate-900/40 border-slate-800 text-white focus:border-[#fe2c55] focus:ring-[#fe2c55]/20'
                }`}
              >
                {PROVINCES.map((prov) => (
                  <option key={prov} value={prov} className={isLightMode ? 'bg-white' : 'bg-slate-950'}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            {/* District Select */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                जिल्ला (District) *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition appearance-none cursor-pointer ${
                  isLightMode 
                    ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#fe2c55] focus:ring-[#fe2c55]/20' 
                    : 'bg-slate-900/40 border-slate-800 text-white focus:border-[#fe2c55] focus:ring-[#fe2c55]/20'
                }`}
              >
                {(DISTRICTS_MAP[province] || []).map((dist) => (
                  <option key={dist} value={dist} className={isLightMode ? 'bg-white' : 'bg-slate-950'}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {error && (
            <p className="text-red-500 text-xxs font-semibold bg-red-600/10 border border-red-500/10 rounded-lg p-2.5 text-center">
              ⚠️ {error}
            </p>
          )}

          {/* Action Row */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition duration-300 ${
                isLightMode 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
              }`}
            >
              रद्द गर्नुहोस्
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 bg-[#fe2c55] hover:bg-[#e12246] text-white py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-[#fe2c55]/25 flex items-center justify-center gap-1.5 transition duration-300 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>सुरक्षित गरिँदै...</span>
                </>
              ) : (
                <>
                  <Check size={13} className="stroke-[3]" />
                  <span>सुरक्षित गर्नुहोस्</span>
                </>
              )}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
