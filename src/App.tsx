import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, MessageCircle, Share2, Bookmark, Plus, Home, Bell, User, 
  Search, Award, ShieldAlert, Volume2, VolumeX, Play, Pause, Shield,
  LogOut, Compass, ArrowLeft, Radio, Send, CheckCircle2, Sun, Moon,
  Copy, Link, Flag, Smartphone, Filter, SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Comment, Notification } from './types';
import LoginModal from './components/LoginModal';
import CommentsDrawer from './components/CommentsDrawer';
import SearchOverlay from './components/SearchOverlay';
import AdminPanel from './components/AdminPanel';
import UploadModal from './components/UploadModal';
import SharePreviewModal from './components/SharePreviewModal';
import JanBoliLogo from './components/JanBoliLogo';
import InstallApkModal from './components/InstallApkModal';
import EditProfileModal from './components/EditProfileModal';
import VerificationModal from './components/VerificationModal';

const FILTER_CATEGORIES = [
  { id: 'all', nameNe: 'सबै', nameEn: 'All' },
  { id: 'politics', nameNe: 'राजनीति', nameEn: 'Political' },
  { id: 'international', nameNe: 'अन्तर्राष्ट्रिय', nameEn: 'International' },
  { id: 'sports', nameNe: 'खेलकुद', nameEn: 'Sports' },
  { id: 'entertainment', nameNe: 'मनोरञ्जन', nameEn: 'Entertainment' },
  { id: 'local', nameNe: 'स्थानीय', nameEn: 'Local' },
  { id: 'society', nameNe: 'समाज', nameEn: 'Society' },
  { id: 'environment', nameNe: 'वातावरण', nameEn: 'Environment' },
  { id: 'economy', nameNe: 'अर्थतन्त्र', nameEn: 'Economy' },
  { id: 'technology', nameNe: 'प्रविधि', nameEn: 'Technology' },
  { id: 'health', nameNe: 'स्वास्थ्य', nameEn: 'Health' }
];

import { safeFetchJson } from './lib/api';

export default function App() {

  // Navigation & Overlays
  const [activeTab, setActiveTab] = useState<'home' | 'notifications' | 'profile'>('home');
  const [activeFeedTab, setActiveFeedTab] = useState<'foryou' | 'following'>('foryou');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSearch, setShowSearch] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null); // videoId
  
  // Dynamic Global High-Contrast Theme state
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    return localStorage.getItem('janboli_theme') === 'light';
  });

  useEffect(() => {
    localStorage.setItem('janboli_theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);
  
  // App States
  const [videos, setVideos] = useState<Video[]>([]);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Video Playback Controls
  const [muted, setMuted] = useState(true);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  
  // References
  const feedRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const lastTapRef = useRef<number>(0);
  const longPressTimers = useRef<{ [key: string]: any }>({});
  const isLongPressActive = useRef<{ [key: string]: boolean }>({});
  
  // Custom message/toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Sensitive content warnings dismissed
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([]);

  // Share preview state
  const [sharingVideo, setSharingVideo] = useState<Video | null>(null);

  // Active floating share menu inside feed card
  const [activeShareMenu, setActiveShareMenu] = useState<string | null>(null);

  // APK Mobile install modal trigger
  const [showInstallApk, setShowInstallApk] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // Dynamic video durations cache
  const [videoDurations, setVideoDurations] = useState<{ [key: string]: string }>({});

  // Helper to generate a realistic fallback duration based on video id
  const getFallbackDuration = (id: string) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const totalSeconds = 25 + (hash % 40); // realistic duration between 25 and 64 seconds
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const syncUserSession = async (currentUser: any) => {
    if (!currentUser) return;
    const identifier = currentUser.phone || currentUser.email || currentUser.userId || currentUser.id;
    if (!identifier) return;

    try {
      const { ok, data } = await safeFetchJson(`/api/auth/me?phone=${encodeURIComponent(identifier)}&email=${encodeURIComponent(currentUser.email || '')}`);
      if (ok && data?.user) {
        setUser(data.user);
        localStorage.setItem('janboli_session', JSON.stringify(data.user));
      } else if (data?.error?.includes('प्रतिबन्धित')) {
        setUser(null);
        localStorage.removeItem('janboli_session');
        showToast('तपाईंको खाता प्रतिबन्धित गरिएको छ।', 'error');
      }
    } catch (err) {
      console.error('Failed to sync user session:', err);
    }
  };

  // Load User & Videos on init
  useEffect(() => {
    // Check local storage for session
    const savedUser = localStorage.getItem('janboli_session');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Sync latest user state (Blue tick, user ID, district) from database
        syncUserSession(parsed);
      } catch (e) {}
    }

    // Auto open Admin Panel if URL contains ?admin=true or /admin
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true' || window.location.pathname.startsWith('/admin')) {
      setShowAdmin(true);
    }

    fetchVideos();

    // Re-sync session when window/app regains focus
    const handleFocus = () => {
      const current = localStorage.getItem('janboli_session');
      if (current) {
        try {
          syncUserSession(JSON.parse(current));
        } catch (e) {}
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Scroll to shared video on initial load
  useEffect(() => {
    if (!loading && videos.length > 0 && currentVideoIndex > 0 && feedRef.current) {
      const timer = setTimeout(() => {
        if (feedRef.current) {
          const card = feedRef.current.children[currentVideoIndex] as HTMLElement;
          if (card) {
            card.scrollIntoView({ behavior: 'auto' });
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, videos, currentVideoIndex]);

  // Fetch Notifications when user changes or activeTab changes
  useEffect(() => {
    if (user?.phone) {
      fetchNotifications();
    }
  }, [user?.phone, activeTab]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchVideos = async () => {
    try {
      const { ok, data } = await safeFetchJson('/api/videos');
      if (ok && data?.videos) {
        setVideos(data.videos || []);
        if (data.videos && data.videos.length > 0) {
          // Parse video ID from query parameter (?video=...) or path (/video/...)
          const urlParams = new URLSearchParams(window.location.search);
          let sharedVideoId = urlParams.get('video');
          
          const pathParts = window.location.pathname.split('/');
          if (!sharedVideoId && pathParts[1] === 'video' && pathParts[2]) {
            sharedVideoId = pathParts[2];
          }

          let startIndex = 0;
          if (sharedVideoId) {
            const index = data.videos.findIndex((v: any) => v.id === sharedVideoId);
            if (index !== -1) {
              startIndex = index;
            }
          }

          setPlayingVideoId(data.videos[startIndex].id);
          setCurrentVideoIndex(startIndex);
        }
      }
    } catch (err) {
      console.error("Error loading videos:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { ok, data } = await safeFetchJson(`/api/notifications?phone=${user?.phone || ''}`);
      if (ok && data?.notifications) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  };

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    localStorage.setItem('janboli_session', JSON.stringify(userData));
    setShowLogin(false);
    showToast(`स्वागत छ, ${userData.name}!`, "success");
    fetchVideos();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('janboli_session');
    setShowAdmin(false);
    showToast("लगआउट सफल भयो।", "info");
  };

  const handleRequestVerification = () => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    setShowVerificationModal(true);
  };

  // Video Intersection / Playback trigger
  useEffect(() => {
    const handleScroll = () => {
      if (!feedRef.current) return;
      const container = feedRef.current;
      const height = container.clientHeight;
      const scrollTop = container.scrollTop;
      const index = Math.round(scrollTop / height);
      
      if (index !== currentVideoIndex && index >= 0 && index < filteredVideos.length) {
        setCurrentVideoIndex(index);
        const newVidId = filteredVideos[index].id;
        setPlayingVideoId(newVidId);
      }
    };

    const container = feedRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [currentVideoIndex, videos, activeFeedTab, selectedCategory]);

  // Handle play/pause of videos
  useEffect(() => {
    // Pause all videos except playingVideoId
    Object.keys(videoRefs.current).forEach((id) => {
      const video = videoRefs.current[id];
      if (video) {
        if (id === playingVideoId && activeTab === 'home' && !showUpload && !showLogin && !showAdmin && !showComments) {
          video.play().catch((e) => console.log("Autoplay blocked:", e));
        } else {
          video.pause();
        }
      }
    });
  }, [playingVideoId, activeTab, showUpload, showLogin, showAdmin, showComments, videos]);

  const togglePlayPause = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (video) {
      if (video.paused) {
        video.play().catch(e => console.log(e));
      } else {
        video.pause();
      }
    }
  };

  // Video action triggers (like, save, comment, report, follow)
  const triggerVideoAction = async (videoId: string, action: 'like' | 'save' | 'comment' | 'report' | 'follow', payloadExtra?: any) => {
    if (!user) {
      setShowLogin(true);
      return;
    }

    try {
      const { ok, data } = await safeFetchJson(`/api/videos/${videoId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userPhone: user.phone,
          ...payloadExtra
        })
      });
      if (ok && data?.video) {
        // Update local videos state
        setVideos(prev => prev.map(vid => vid.id === videoId ? data.video : vid));
        if (action === 'follow' && data.user) {
          setUser(data.user);
          localStorage.setItem('janboli_session', JSON.stringify(data.user));
          showToast(`पत्रकार @${data.video.reporterName} लाई फलो गरियो।`, "success");
        }
      }
    } catch (err) {
      console.error(`Error applying action ${action}:`, err);
    }
  };

  const handleDoubleTap = (e: React.MouseEvent, video: Video) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newHeart = { id: Date.now(), x, y };
    setHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 800);

    // If not liked already, trigger like
    if (!video.likes.includes(user?.phone)) {
      triggerVideoAction(video.id, 'like');
    }
  };

  const handleVideoCardTap = (e: React.MouseEvent, videoId: string, video: Video) => {
    if (isLongPressActive.current[videoId]) {
      isLongPressActive.current[videoId] = false;
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 250) {
      handleDoubleTap(e, video);
    } else {
      togglePlayPause(videoId);
    }
    lastTapRef.current = now;
  };

  const handlePointerDown = (e: React.PointerEvent, video: Video) => {
    const videoId = video.id;
    isLongPressActive.current[videoId] = false;

    if (longPressTimers.current[videoId]) {
      clearTimeout(longPressTimers.current[videoId]);
    }

    longPressTimers.current[videoId] = setTimeout(() => {
      isLongPressActive.current[videoId] = true;
      
      // Trigger 'quick-save' action
      triggerVideoAction(videoId, 'save');

      // Provide haptic feedback if supported
      if (navigator.vibrate) {
        try {
          navigator.vibrate(100);
        } catch (err) {
          console.log("Haptic feedback vibration not supported or blocked:", err);
        }
      }

      const hasSaved = video.savedBy.includes(user?.phone);
      showToast(
        hasSaved 
          ? "समाचार संग्रहबाट हटाइयो (Quick-Removed) 📍" 
          : "समाचार संग्रहमा सफलतापूर्वक थपियो (Quick-Saved) 📌", 
        "success"
      );

      longPressTimers.current[videoId] = null;
    }, 600);
  };

  const handlePointerUp = (videoId: string) => {
    if (longPressTimers.current[videoId]) {
      clearTimeout(longPressTimers.current[videoId]);
      longPressTimers.current[videoId] = null;
    }
  };

  const handlePointerMove = (videoId: string) => {
    if (longPressTimers.current[videoId]) {
      clearTimeout(longPressTimers.current[videoId]);
      longPressTimers.current[videoId] = null;
    }
  };

  const handlePointerCancel = (videoId: string) => {
    if (longPressTimers.current[videoId]) {
      clearTimeout(longPressTimers.current[videoId]);
      longPressTimers.current[videoId] = null;
    }
  };

  const handleShare = (video: Video) => {
    const shareUrl = `${window.location.origin}/video/${video.id}`;
    const formattedDistrict = video.district.includes('(') 
      ? (video.district.split('(')[1]?.replace(')', '') || video.district)
      : video.district;
    
    const preFormattedMessage = `जनबोली समाचार (JanBoli News) 🇳🇵\n\nशीर्षक: ${video.title}\nस्थान: ${formattedDistrict}\n\nयो भिडियो रिपोर्ट हेर्न तलको लिङ्कमा क्लिक गर्नुहोस्:`;

    if (navigator.share) {
      navigator.share({
        title: `JanBoli News - ${video.title}`,
        text: preFormattedMessage,
        url: shareUrl,
      })
      .then(() => {
        showToast("समाचार सफलतापूर्वक सेयर गरियो!", "success");
      })
      .catch((err) => {
        console.log("Native share error or cancelled:", err);
        if (err.name !== 'AbortError') {
          setSharingVideo(video);
        }
      });
    } else {
      setSharingVideo(video);
    }
  };

  const handleReportSubmit = (videoId: string) => {
    const reason = prompt("यस समाचार विरुद्ध उजुरीको कारण लेख्नुहोस् (उदा. झूटो समाचार, अभद्र भाषा, आदि):");
    if (!reason) return;
    triggerVideoAction(videoId, 'report', { reason });
    showToast("तपाईंको उजुरी दर्ता गरियो। एडमिनद्वारा चाँडै समीक्षा हुनेछ।", "info");
  };

  const handleUploadSuccess = (newVideo: any) => {
    setShowUpload(false);
    fetchVideos();
    if (newVideo.status === 'approved') {
      showToast("समाचार भिडियो स्वीकृत भई सार्वजनिक गरिएको छ!", "success");
    } else {
      showToast("समाचार समीक्षाको लागि पठाइयो। स्वीकृत भएपछि फिडमा देखिनेछ।", "info");
    }
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setCurrentVideoIndex(0);
    
    const newFiltered = videos.filter(vid => {
      if (activeFeedTab === 'following' && (!user || !user.following?.includes(vid.reporterPhone))) {
        return false;
      }
      if (catId !== 'all') {
        const catLower = vid.category.toLowerCase();
        if (catId === 'politics') {
          return catLower.includes('politics') || catLower.includes('राजनीति') || catLower.includes('political');
        }
        if (catId === 'international') {
          return catLower.includes('international') || catLower.includes('अन्तर्राष्ट्रिय');
        }
        if (catId === 'sports') {
          return catLower.includes('sports') || catLower.includes('खेलकुद');
        }
        if (catId === 'entertainment') {
          return catLower.includes('entertainment') || catLower.includes('मनोरञ्जन');
        }
        if (catId === 'local') {
          return catLower.includes('local') || catLower.includes('स्थानीय');
        }
        if (catId === 'society') {
          return catLower.includes('society') || catLower.includes('समाज');
        }
        if (catId === 'environment') {
          return catLower.includes('environment') || catLower.includes('वातावरण');
        }
        if (catId === 'economy') {
          return catLower.includes('economy') || catLower.includes('अर्थतन्त्र');
        }
        if (catId === 'technology') {
          return catLower.includes('technology') || catLower.includes('प्रविधि');
        }
        if (catId === 'health') {
          return catLower.includes('health') || catLower.includes('स्वास्थ्य');
        }
      }
      return true;
    });

    if (newFiltered.length > 0) {
      setPlayingVideoId(newFiltered[0].id);
    } else {
      setPlayingVideoId(null);
    }
  };

  // Filter videos based on Top Tabs & Category Filter
  const filteredVideos = videos.filter(vid => {
    // 1. Filter by feed tab
    if (activeFeedTab === 'following' && (!user || !user.following?.includes(vid.reporterPhone))) {
      return false;
    }
    
    // 2. Filter by category selection
    if (selectedCategory !== 'all') {
      const catLower = vid.category.toLowerCase();
      if (selectedCategory === 'politics') {
        return catLower.includes('politics') || catLower.includes('राजनीति') || catLower.includes('political');
      }
      if (selectedCategory === 'international') {
        return catLower.includes('international') || catLower.includes('अन्तर्राष्ट्रिय');
      }
      if (selectedCategory === 'sports') {
        return catLower.includes('sports') || catLower.includes('खेलकुद');
      }
      if (selectedCategory === 'entertainment') {
        return catLower.includes('entertainment') || catLower.includes('मनोरञ्जन');
      }
      if (selectedCategory === 'local') {
        return catLower.includes('local') || catLower.includes('स्थानीय');
      }
      if (selectedCategory === 'society') {
        return catLower.includes('society') || catLower.includes('समाज');
      }
      if (selectedCategory === 'environment') {
        return catLower.includes('environment') || catLower.includes('वातावरण');
      }
      if (selectedCategory === 'economy') {
        return catLower.includes('economy') || catLower.includes('अर्थतन्त्र');
      }
      if (selectedCategory === 'technology') {
        return catLower.includes('technology') || catLower.includes('प्रविधि');
      }
      if (selectedCategory === 'health') {
        return catLower.includes('health') || catLower.includes('स्वास्थ्य');
      }
    }
    return true;
  });

  // Active breaking news list for scrolling marquee
  const breakingNewsTitles = videos.filter(v => v.isBreaking).map(v => v.title);

  return (
    <div id="janboli_app_root" className={`w-full h-full max-w-md mx-auto flex flex-col relative select-none font-sans overflow-hidden border-x shadow-2xl transition-all duration-300 ${
      isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-900 text-slate-100'
    }`}>
      
      {/* Dynamic Toast Alerts */}
      {toast && (
        <div id="app_toast" className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-xxs font-semibold shadow-2xl flex items-center gap-2 border animate-bounce ${
          toast.type === 'success' ? (isLightMode ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-emerald-950 border-emerald-500 text-emerald-400') :
          toast.type === 'error' ? (isLightMode ? 'bg-red-50 border-red-300 text-red-700' : 'bg-red-950 border-red-500 text-red-400') : 
          (isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200')
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* --- TOP HEADER (With search & Top Tabs) --- */}
      {activeTab === 'home' && (
        <div id="feed_header" className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-slate-950/90 to-transparent p-4 flex items-center justify-between pointer-events-auto pt-safe pb-8">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <JanBoliLogo size={24} layout="horizontal" showTagline={false} isLightMode={false} />
          </div>

          {/* Feed Switcher Tabs (फलोइङ & तपाईंको लागि - TikTok Centered Layout) */}
          <div className="flex gap-4">
            <button
              id="feed_tab_following"
              onClick={() => {
                setActiveFeedTab('following');
                setSelectedCategory('all');
                setCurrentVideoIndex(0);
                const followingVids = videos.filter(v => user?.following?.includes(v.reporterPhone));
                if (followingVids[0]) {
                  setPlayingVideoId(followingVids[0].id);
                } else {
                  setPlayingVideoId(null);
                }
              }}
              className={`text-[13px] font-bold pb-1.5 transition duration-300 relative ${
                activeFeedTab === 'following' ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              फलोइङ
              {activeFeedTab === 'following' && (
                <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#fe2c55] rounded-full" />
              )}
            </button>
            <button
              id="feed_tab_foryou"
              onClick={() => {
                setActiveFeedTab('foryou');
                setSelectedCategory('all');
                setCurrentVideoIndex(0);
                if (videos[0]) setPlayingVideoId(videos[0].id);
              }}
              className={`text-[13px] font-bold pb-1.5 transition duration-300 relative ${
                activeFeedTab === 'foryou' ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              तपाईंको लागि
              {activeFeedTab === 'foryou' && (
                <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#fe2c55] rounded-full" />
              )}
            </button>
          </div>

          {/* Action Buttons: Search, Categories & Mobile APK */}
          <div className="flex items-center gap-2">
            {/* Category Toggle Button */}
            <button
              id="toggle_categories_btn"
              onClick={() => setShowCategories(!showCategories)}
              className={`p-2 rounded-full border transition cursor-pointer flex items-center justify-center relative ${
                showCategories 
                  ? 'bg-[#fe2c55] border-[#fe2c55] text-white' 
                  : 'bg-black/55 hover:bg-slate-900/65 border-slate-800/40 text-slate-300 hover:text-white'
              }`}
              title="विधाहरू फिल्टर गर्नुहोस् (Filter Categories)"
            >
              <SlidersHorizontal size={14} />
              {selectedCategory !== 'all' && !showCategories && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#fe2c55] rounded-full ring-1 ring-black" />
              )}
            </button>

            {/* Search Button */}
            <button
              id="open_search_btn"
              onClick={() => setShowSearch(true)}
              className="p-2 bg-black/55 hover:bg-slate-900/65 rounded-full border border-slate-800/40 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
              title="समाचार खोज्नुहोस्"
            >
              <Search size={14} />
            </button>

            {/* Mobile App Download Button */}
            <button
              id="install_app_header_btn"
              onClick={() => setShowInstallApk(true)}
              className="p-2 bg-black/55 hover:bg-slate-900/65 rounded-full border border-slate-800/40 text-slate-300 hover:text-white transition flex items-center justify-center relative cursor-pointer"
              title="मोबाईल एप डाउनलोड गर्नुहोस् (Download App)"
            >
              <Smartphone size={14} />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
            </button>
          </div>
        </div>
      )}

      {/* --- TAB 1: NEWS FEED (TIKTOK STYLE SNAP) --- */}
      {activeTab === 'home' && (
        <div id="home_feed_container" className="flex-1 w-full h-full relative">
          
          {/* Collapsible Category Filter Chips Container */}
          <AnimatePresence>
            {showCategories && (
              <motion.div 
                id="category_filter_chips_container"
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="absolute top-[64px] left-0 right-0 z-30 px-4 py-2.5 overflow-x-auto no-scrollbar pointer-events-auto flex gap-2 bg-slate-950/90 backdrop-blur-md border-b border-slate-900 shadow-xl"
              >
                {FILTER_CATEGORIES.map(cat => (
                  <button
                    id={`category_chip_${cat.id}`}
                    key={cat.id}
                    onClick={() => {
                      handleCategorySelect(cat.id);
                      // Don't close immediately to let users see selection, or close on selected
                    }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold shrink-0 border transition duration-300 flex items-center gap-1 ${
                      selectedCategory === cat.id
                        ? 'bg-[#fe2c55] border-[#fe2c55] text-white font-extrabold scale-105 shadow-md shadow-[#fe2c55]/20'
                        : 'bg-slate-900/60 border-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <span>{cat.nameNe}</span>
                    <span className="text-[8px] opacity-60 font-medium">({cat.nameEn})</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs font-medium">समाचार लोड हुँदैछ...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-950">
              {activeFeedTab === 'following' ? (
                <>
                  <div className="w-16 h-16 bg-[#fe2c55]/10 rounded-full flex items-center justify-center text-[#fe2c55] border border-[#fe2c55]/20">
                    <User size={28} className="stroke-[2.5]" />
                  </div>
                  {!user ? (
                    <>
                      <h3 className="text-sm font-bold text-white">रिपोर्टरहरू फलो गर्नुहोस्</h3>
                      <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                        तपाईंले फलो गर्नुभएका प्रमाणित पत्रकार तथा रिपोर्टरहरूको ताजा भिडियो रिपोर्टहरू यहाँ हेर्न सक्नुहुन्छ। कृपया पहिले लगइन गर्नुहोस्।
                      </p>
                      <button
                        id="empty_following_login_btn"
                        onClick={() => setShowLogin(true)}
                        className="bg-[#fe2c55] hover:bg-[#e12246] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition"
                      >
                        लगइन गर्नुहोस्
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold text-white">हाल कुनै भिडियो छैन</h3>
                      <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                        तपाईंले अहिलेसम्म कुनै रिपोर्टरलाई फलो गर्नुभएको छैन, वा तपाईंले फलो गरेका रिपोर्टरहरूले भिडियो पोस्ट गरेका छैनन्।
                      </p>
                      <button
                        id="empty_following_foryou_btn"
                        onClick={() => setActiveFeedTab('foryou')}
                        className="bg-[#fe2c55] hover:bg-[#e12246] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition"
                      >
                        तपाईंको लागि (For You) मा जानुहोस्
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Compass size={44} className="text-slate-700 animate-spin" />
                  <p className="text-slate-400 text-xs">यस विधामा हाल कुनै पनि स्वीकृत भिडियोहरू छैनन्।</p>
                  <button
                    id="feed_reload_btn"
                    onClick={fetchVideos}
                    className="bg-red-600 hover:bg-red-700 text-white text-xxs font-bold px-4 py-2 rounded-xl transition"
                  >
                    रिफ्रेस गर्नुहोस्
                  </button>
                </>
              )}
            </div>
          ) : (
            <div
              id="feed_snap_wrapper"
              ref={feedRef}
              className="w-full h-full overflow-y-scroll snap-y-mandatory no-scrollbar"
            >
              {filteredVideos.map((video, idx) => {
                const isPlaying = video.id === playingVideoId;
                const hasLiked = video.likes.includes(user?.phone);
                const hasSaved = video.savedBy.includes(user?.phone);
                const isReporterFollowed = user?.following?.includes(video.reporterPhone);

                return (
                  <div
                    id={`feed_card_${video.id}`}
                    key={video.id}
                    className="w-full h-full snap-start relative bg-slate-950 flex flex-col justify-end select-none overflow-hidden"
                  >
                    {/* VIDEO STREAM CONTAINER with gentle scale and fade entry */}
                    <motion.div
                      id={`video_player_box_${video.id}`}
                      key={`video_player_${video.id}_${isPlaying}`}
                      initial={{ opacity: 0.85, scale: 1.03 }}
                      animate={isPlaying ? { opacity: 1, scale: 1 } : { opacity: 0.85, scale: 1.03 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      onClick={(e) => handleVideoCardTap(e, video.id, video)}
                      onPointerDown={(e) => handlePointerDown(e, video)}
                      onPointerUp={() => handlePointerUp(video.id)}
                      onPointerMove={() => handlePointerMove(video.id)}
                      onPointerCancel={() => handlePointerCancel(video.id)}
                      onContextMenu={(e) => e.preventDefault()}
                      className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center"
                    >
                      <video
                        ref={(el) => { videoRefs.current[video.id] = el; }}
                        src={video.videoUrl}
                        className="w-full h-full object-cover"
                        loop
                        playsInline
                        muted={muted}
                        onLoadedMetadata={(e) => {
                          const duration = (e.target as HTMLVideoElement).duration;
                          if (!isNaN(duration) && duration > 0) {
                            const minutes = Math.floor(duration / 60);
                            const seconds = Math.floor(duration % 60);
                            const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                            setVideoDurations(prev => ({ ...prev, [video.id]: formatted }));
                          }
                        }}
                      />

                      {/* Video Duration Pill in the bottom-right corner of the video overlay */}
                      <div
                        id={`video_duration_pill_${video.id}`}
                        className="absolute bottom-6 right-16 z-20 bg-black/55 backdrop-blur-md border border-slate-800/40 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1.5 pointer-events-none"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span>{videoDurations[video.id] || getFallbackDuration(video.id)}</span>
                      </div>

                      {/* Video Gradient Overlays */}
                      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                      {/* Double Tap Floating Heart Generators */}
                      {hearts.map((h) => (
                        <div
                          key={h.id}
                          className="absolute pointer-events-none animate-float-heart"
                          style={{ left: h.x - 30, top: h.y - 30 }}
                        >
                          <Heart size={60} fill="#DC2626" className="text-red-600 drop-shadow-2xl" />
                        </div>
                      ))}

                      {/* Play/Pause overlay icon on toggle */}
                      {!isPlaying && (
                        <div className="absolute bg-black/40 p-4 rounded-full text-white pointer-events-none animate-ping">
                          <Play size={24} fill="white" />
                        </div>
                      )}

                      {/* Sensitive Content Warning Overlay */}
                      {video.isSensitiveContent && !dismissedWarnings.includes(video.id) && (
                        <div
                          id={`sensitive_overlay_${video.id}`}
                          className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-4 rounded-full mb-4 animate-pulse">
                            <ShieldAlert size={36} />
                          </div>
                          
                          <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
                            संवेदनशील सामग्री चेतावनी (Content Warning)
                          </h3>
                          
                          <p className="text-white text-xs max-w-xs leading-relaxed mb-6 font-medium">
                            {video.contentWarningText || 'यस समाचार भिडियोमा केही दर्शकका लागि संवेदनशील वा विचलित पार्ने दृश्यहरू हुन सक्छन्।'}
                          </p>
                          
                          <button
                            id={`dismiss_warning_btn_${video.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDismissedWarnings([...dismissedWarnings, video.id]);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-[10px] px-4 py-2 rounded-xl shadow-lg shadow-amber-600/20 transition duration-300"
                          >
                            समाचार भिडियो हेर्नुहोस् (View Video)
                          </button>
                        </div>
                      )}
                    </motion.div>

                    {/* --- BOTTOM INFORMATION ZONE with slide-in from bottom-left --- */}
                    <motion.div
                      key={`bottom_info_${video.id}_${isPlaying}`}
                      initial={{ opacity: 0, x: -16, y: 15 }}
                      animate={isPlaying ? { opacity: 1, x: 0, y: 0 } : { opacity: 0 }}
                      transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.1 }}
                      className="absolute bottom-6 left-4 right-16 z-20 text-left pointer-events-auto flex flex-col gap-2.5"
                    >
                      
                      {/* Geographical location details */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-blue-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                          {video.category.split('(')[1]?.replace(')', '') || video.category}
                        </span>
                        <span className="bg-slate-900/80 text-blue-400 text-[9px] px-2 py-0.5 rounded border border-blue-500/20 backdrop-blur-sm">
                          📍 {video.district.split('(')[1]?.replace(')', '') || video.district} • {video.municipality}
                        </span>
                      </div>

                      {/* Reporter Info row */}
                      <div className="flex items-center gap-2">
                        <img
                          src={video.reporterAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'}
                          alt={video.reporterName}
                          className="w-8 h-8 rounded-full border border-slate-800 object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-white tracking-wide">@{video.reporterName}</span>
                            {video.reporterVerified && (
                              <span className="text-blue-500 flex items-center" title="प्रमाणित रिपोर्टर">
                                <span className="bg-blue-500 text-white rounded-full p-0.5 text-[8px] leading-none flex items-center justify-center w-3 h-3">✓</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Title and description */}
                      <h3 className="text-sm font-bold text-white leading-snug drop-shadow-lg">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed drop-shadow-md font-medium">
                          {video.description}
                        </p>
                      )}

                      {/* TikTok Style Music Ticker */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-100 overflow-hidden w-full max-w-[200px] bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800/40">
                        <span className="animate-pulse">🎵</span>
                        <div className="overflow-hidden relative w-full h-3">
                          <p className="absolute whitespace-nowrap animate-marquee font-bold">
                            मूल आवाज - @{video.reporterName} (Original Sound) • जनबोली समाचार (JanBoli News)
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* --- RIGHT ACTION BAR with slide-in from right --- */}
                    <motion.div
                      key={`action_bar_${video.id}_${isPlaying}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={isPlaying ? { opacity: 1, x: 0 } : { opacity: 0 }}
                      transition={{ type: "spring", stiffness: 110, damping: 14, delay: 0.15 }}
                      className="absolute right-3.5 bottom-16 z-20 flex flex-col items-center gap-4 pointer-events-auto"
                    >
                      {/* Reporter Profile Avatar with Floating Red Follow "+" Button */}
                      <div className="relative mb-2.5 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full border-[1.5px] border-white bg-slate-900 overflow-hidden shadow-lg relative flex items-center justify-center">
                          <img
                            src={video.reporterAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'}
                            alt={video.reporterName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {user?.phone !== video.reporterPhone && !isReporterFollowed && (
                          <button
                            id={`follow_plus_${video.id}`}
                            onClick={() => triggerVideoAction(video.id, 'follow')}
                            className="absolute -bottom-1.5 bg-[#fe2c55] text-white rounded-full w-[17px] h-[17px] flex items-center justify-center hover:scale-110 active:scale-95 transition shadow-lg border-2 border-slate-950 z-10 cursor-pointer"
                            title="फलो गर्नुहोस्"
                          >
                            <Plus size={10} className="stroke-[4]" />
                          </button>
                        )}
                      </div>

                      {/* Like button */}
                      <div className="flex flex-col items-center">
                        <button
                          id={`like_btn_${video.id}`}
                          onClick={() => triggerVideoAction(video.id, 'like')}
                          className={`p-1 transition-transform duration-200 active:scale-75 focus:outline-none filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] cursor-pointer ${
                            hasLiked ? 'text-[#fe2c55]' : 'text-white'
                          }`}
                        >
                          <Heart size={26} fill={hasLiked ? "#fe2c55" : "none"} className={hasLiked ? "animate-pulse" : ""} />
                        </button>
                        <span className="text-white text-[11px] font-black mt-0.5 filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] select-none tracking-tight">
                          {video.likes.length}
                        </span>
                      </div>

                      {/* Comment button */}
                      <div className="flex flex-col items-center">
                        <button
                          id={`comment_btn_${video.id}`}
                          onClick={() => setShowComments(video.id)}
                          className="p-1 text-white transition-transform duration-200 active:scale-75 focus:outline-none filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] cursor-pointer"
                        >
                          <MessageCircle size={26} fill="none" />
                        </button>
                        <span className="text-white text-[11px] font-black mt-0.5 filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] select-none tracking-tight">
                          {video.comments.length}
                        </span>
                      </div>

                      {/* Save/Bookmark button */}
                      <div className="flex flex-col items-center">
                        <button
                          id={`save_btn_${video.id}`}
                          onClick={() => {
                            triggerVideoAction(video.id, 'save');
                            showToast(hasSaved ? "समाचार संग्रहबाट हटाइयो" : "समाचार सफलतापूर्वक संग्रह गरियो", "success");
                          }}
                          className={`p-1 transition-transform duration-200 active:scale-75 focus:outline-none filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] cursor-pointer ${
                            hasSaved ? 'text-yellow-400' : 'text-white'
                          }`}
                        >
                          <Bookmark size={26} fill={hasSaved ? "#eab308" : "none"} />
                        </button>
                        <span className="text-white text-[11px] font-black mt-0.5 filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] select-none tracking-tight">
                          {video.savedBy.length}
                        </span>
                      </div>

                      {/* Mute/Audio toggle button */}
                      <div className="flex flex-col items-center">
                        <button
                          id={`mute_toggle_sidebar_${video.id}`}
                          onClick={() => setMuted(!muted)}
                          className={`p-1 transition-transform duration-200 active:scale-75 focus:outline-none filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] cursor-pointer ${
                            muted ? 'text-slate-400' : 'text-emerald-400'
                          }`}
                          title={muted ? "आवाज अन गर्नुहोस् (Unmute)" : "आवाज बन्द गर्नुहोस् (Mute)"}
                        >
                          {muted ? <VolumeX size={26} /> : <Volume2 size={26} />}
                        </button>
                        <span className="text-white text-[8px] font-black mt-0.5 filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] tracking-wider select-none">
                          {muted ? "MUTED" : "VOLUME"}
                        </span>
                      </div>

                      {/* Report/Flag button */}
                      <div className="flex flex-col items-center">
                        <button
                          id={`flag_report_sidebar_${video.id}`}
                          onClick={() => handleReportSubmit(video.id)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors duration-200 active:scale-75 focus:outline-none filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] cursor-pointer"
                          title="उजुरी गर्नुहोस् (Report)"
                        >
                          <Flag size={22} />
                        </button>
                        <span className="text-white text-[8px] font-black mt-0.5 filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] tracking-wider select-none">
                          REPORT
                        </span>
                      </div>

                      {/* Share button */}
                      <div className="flex flex-col items-center relative">
                        <button
                          id={`share_btn_${video.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveShareMenu(activeShareMenu === video.id ? null : video.id);
                          }}
                          className={`p-1 transition-transform duration-200 active:scale-75 focus:outline-none filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] cursor-pointer ${
                            activeShareMenu === video.id ? 'text-[#00f2fe]' : 'text-white'
                          }`}
                        >
                          <Share2 size={26} fill="none" />
                        </button>
                        <span className="text-slate-200 text-[8px] font-black mt-0.5 filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] tracking-wider select-none">
                          SHARE
                        </span>

                        {/* Dropdown Popup Menu */}
                        <AnimatePresence>
                          {activeShareMenu === video.id && (
                            <motion.div
                              id="share_menu"
                              initial={{ opacity: 0, scale: 0.82, x: 12, y: 8 }}
                              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                              exit={{ opacity: 0, scale: 0.82, x: 12, y: 8 }}
                              transition={{ type: "spring", stiffness: 380, damping: 26 }}
                              style={{ transformOrigin: "bottom right" }}
                              className="absolute right-14 bottom-0 z-30 bg-slate-950/95 border border-slate-800/80 backdrop-blur-md rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[145px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Copy Link Button */}
                              <button
                                id={`copy_link_btn_${video.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const shareUrl = `${window.location.origin}/video/${video.id}`;
                                  navigator.clipboard.writeText(shareUrl);
                                  showToast("समाचारको लिङ्क क्लिपबोर्डमा कपी गरियो!", "success");
                                  setActiveShareMenu(null);
                                }}
                                className="flex items-center gap-2 hover:bg-slate-900 text-slate-200 hover:text-white px-2.5 py-2 rounded-lg text-left text-[10px] font-semibold transition"
                              >
                                <Copy size={13} className="text-blue-400 shrink-0" />
                                <span>लिङ्क कपी (Copy Link)</span>
                              </button>

                              {/* WhatsApp Share Button */}
                              <button
                                id={`whatsapp_share_btn_${video.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const shareUrl = `${window.location.origin}/video/${video.id}`;
                                  const whatsappMessage = `जनबोली समाचार (JanBoli News) 🇳🇵\n\nशीर्षक: ${video.title}\n\nयो भिडियो रिपोर्ट हेर्न तलको लिङ्कमा क्लिक गर्नुहोस्:\n${shareUrl}`;
                                  window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
                                  setActiveShareMenu(null);
                                }}
                                className="flex items-center gap-2 hover:bg-slate-900 text-slate-200 hover:text-white px-2.5 py-2 rounded-lg text-left text-[10px] font-semibold transition border-t border-slate-900"
                              >
                                <MessageCircle size={13} className="text-emerald-400 shrink-0" fill="currentColor" />
                                <span>WhatsApp मा पठाउनुहोस्</span>
                              </button>

                              {/* Native/Social Share Button */}
                              <button
                                id={`more_share_btn_${video.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveShareMenu(null);
                                  handleShare(video);
                                }}
                                className="flex items-center gap-2 hover:bg-slate-900 text-slate-200 hover:text-white px-2.5 py-2 rounded-lg text-left text-[10px] font-semibold transition border-t border-slate-900"
                              >
                                <Share2 size={13} className="text-[#fe2c55] shrink-0" />
                                <span>अरू विकल्प (Share)</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Spinning Sound Disc (Vinyl Record) with Musical Notes */}
                      <div className="relative w-11 h-11 mt-1 flex items-center justify-center">
                        {isPlaying && (
                          <>
                            <div className="absolute text-slate-200 text-[10px] select-none animate-float-note-1 pointer-events-none">🎵</div>
                            <div className="absolute text-slate-300 text-[12px] select-none animate-float-note-2 pointer-events-none">🎶</div>
                          </>
                        )}
                        <div className={`w-10 h-10 rounded-full bg-slate-950 border-4 border-slate-900 flex items-center justify-center shadow-2xl overflow-hidden relative ${isPlaying ? 'animate-spin-vinyl' : ''}`}>
                          {/* Inner groove lines */}
                          <div className="absolute inset-1 rounded-full border border-slate-800/40 opacity-30" />
                          <div className="absolute inset-2 rounded-full border border-slate-800/60 opacity-30" />
                          {/* Reporter Avatar Center */}
                          <img
                            src={video.reporterAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'}
                            alt="disc-center"
                            className="w-4.5 h-4.5 rounded-full object-cover border border-slate-950"
                          />
                        </div>
                      </div>

                      {/* Report/Alert button */}
                      <div className="flex flex-col items-center pt-2">
                        <button
                          id={`report_feed_btn_${video.id}`}
                          onClick={() => handleReportSubmit(video.id)}
                          className="w-9 h-9 rounded-full bg-red-950/20 hover:bg-red-900 text-[#fe2c55] flex items-center justify-center transition shadow-lg border border-red-500/10"
                          title="उजुरी दर्ता गर्नुहोस्"
                        >
                          <ShieldAlert size={16} />
                        </button>
                        <span className="text-slate-500 text-[8px] font-bold mt-1 uppercase tracking-wider">उजुरी</span>
                      </div>
                    </motion.div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: NOTIFICATIONS TAB --- */}
      {activeTab === 'notifications' && (
        <div id="notifications_page" className={`flex-1 w-full flex flex-col p-4 pt-safe overflow-y-auto no-scrollbar transition-colors duration-300 ${
          isLightMode ? 'bg-slate-50' : 'bg-slate-950'
        }`}>
          <div className={`border-b pb-4 mb-4 ${isLightMode ? 'border-slate-200' : 'border-slate-900'}`}>
            <h1 className={`text-lg font-bold font-display ${isLightMode ? 'text-slate-900' : 'text-white'}`}>सूचनाहरू (Notifications)</h1>
            <p className={`text-xs mt-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>तपाईंलाई प्राप्त सम्पूर्ण गतिविधिहरूको इतिहास</p>
          </div>

          {!user ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-20">
              <Bell size={40} className={isLightMode ? 'text-slate-300' : 'text-slate-800'} />
              <p className={`text-xs text-center max-w-xs leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-500'}`}>
                सूचनाहरू हेर्न कृपया पहिले आफ्नो मोबाइल नम्बर मार्फत लगइन गर्नुहोस्।
              </p>
              <button
                id="noti_login_btn"
                onClick={() => setShowLogin(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-md"
              >
                लगइन गर्नुहोस्
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-20 text-slate-500 space-y-2">
              <Bell size={32} className={`mx-auto ${isLightMode ? 'text-slate-300' : 'text-slate-800'}`} />
              <p className="text-xs">अहिलेसम्म कुनै सूचनाहरू प्राप्त भएका छैनन्।</p>
            </div>
          ) : (
            <div id="notifications_list" className="space-y-3">
              {notifications.map((not) => (
                <div
                  id={`noti_item_${not.id}`}
                  key={not.id}
                  className={`p-3.5 rounded-xl border flex gap-3.5 items-start transition-all duration-300 ${
                    not.type === 'breaking' 
                      ? (isLightMode ? 'bg-red-50/85 border-red-200 text-slate-900' : 'bg-red-950/20 border-red-500/20 text-slate-200') 
                      : (isLightMode ? 'bg-white border-slate-200 shadow-sm text-slate-800 hover:shadow' : 'bg-slate-900 border-slate-800/80 text-slate-300')
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${
                    not.type === 'breaking' ? 'bg-red-600/10 text-red-500' :
                    not.type === 'like' ? 'bg-pink-600/10 text-pink-500' :
                    not.type === 'comment' ? 'bg-blue-600/10 text-blue-500' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {not.type === 'breaking' ? <Radio size={16} className="animate-pulse" /> : <Bell size={16} />}
                  </div>

                  <div className="space-y-1 flex-1 text-left">
                    <h4 className={`text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>{not.title}</h4>
                    <p className={`text-xxs leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>{not.body}</p>
                    <span className="text-[9px] text-slate-500 block">
                      {new Date(not.createdAt).toLocaleDateString('ne-NP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: USER PROFILE TAB --- */}
      {activeTab === 'profile' && (
        <div id="profile_page" className={`flex-1 w-full flex flex-col p-4 pt-safe overflow-y-auto no-scrollbar transition-colors duration-300 ${
          isLightMode ? 'bg-slate-100' : 'bg-slate-950'
        }`}>
          {!user ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-5 py-12">
              <JanBoliLogo size={145} isApkCard={true} showText={true} showTagline={true} />
              <p className={`text-xs text-center max-w-xs leading-relaxed px-4 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                आफ्नो प्रोफाइल र अपलोड गरिएका समाचारहरू व्यवस्थापन गर्न लगइन गर्नुहोस्।
              </p>
              <button
                id="prof_login_btn"
                onClick={() => setShowLogin(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                लगइन गर्नुहोस्
              </button>
            </div>
          ) : (
            <div id="user_profile_box" className="space-y-6">
              
              {/* Profile Top Info Card */}
              <div className={`border rounded-2xl p-5 relative overflow-hidden flex flex-col items-center text-center transition-all duration-300 ${
                isLightMode ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800'
              }`}>
                
                {/* Admin badge link */}
                {user.role === 'admin' && (
                  <button
                    id="open_admin_panel_btn"
                    onClick={() => setShowAdmin(true)}
                    className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow transition"
                  >
                    एडमिन प्यानल
                  </button>
                )}

                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'}
                  alt={user.name}
                  className={`w-16 h-16 rounded-full object-cover border-2 shadow-md mb-3 transition-colors duration-300 ${
                    isLightMode ? 'border-slate-100' : 'border-slate-800'
                  }`}
                />

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <h2 className={`text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{user.name}</h2>
                    {user.verified && (
                      <span className="text-blue-500" title="प्रमाणित पत्रकार">
                        <Award size={15} fill="currentColor" />
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] font-mono font-semibold ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>@{user.userId || user.phone}</p>
                  <p className="text-xxs text-slate-500 mt-1 flex items-center gap-1 justify-center">
                    <span>📍 {user.district.split('(')[1]?.replace(')', '') || user.district}</span>
                    <span>•</span>
                    <span>{user.province.split('(')[1]?.replace(')', '') || user.province}</span>
                  </p>
                </div>

                {/* Follow counts row */}
                <div className={`flex gap-6 mt-4 pt-4 border-t w-full justify-center text-xxs transition-colors duration-300 ${
                  isLightMode ? 'border-slate-100 text-slate-500' : 'border-slate-800/60 text-slate-400'
                }`}>
                  <div>
                    <strong className={`block text-xs font-mono ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>{user.followers?.length || 0}</strong>
                    फलोअर
                  </div>
                  <div>
                    <strong className={`block text-xs font-mono ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>{user.following?.length || 0}</strong>
                    फलोइङ
                  </div>
                  <div>
                    <span className="bg-red-600/10 text-red-400 px-2.5 py-0.5 rounded-full text-[9px] border border-red-500/10 font-medium capitalize">
                      {user.role === 'admin' ? 'एडमिन' : user.role === 'reporter' ? 'रिपोर्टर' : 'साधारण प्रयोगकर्ता'}
                    </span>
                  </div>
                </div>

                {/* Edit Profile Button (TikTok Style) */}
                <button
                  id="edit_profile_trigger_btn"
                  onClick={() => setShowEditProfile(true)}
                  className={`mt-4 w-full border font-bold py-2 rounded-xl text-xxs transition flex items-center justify-center gap-1.5 duration-300 ${
                    isLightMode 
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm' 
                      : 'bg-slate-950 hover:bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <User size={12} className="text-[#fe2c55]" />
                  <span>प्रोफाइल सम्पादन गर्नुहोस् (Edit Profile)</span>
                </button>

                {/* Verification trigger banner for non-reporters */}
                {!user.verified && (
                  <button
                    id="req_verify_reporter_badge"
                    onClick={handleRequestVerification}
                    className={`mt-4 w-full border font-bold py-2 rounded-xl text-xxs transition flex items-center justify-center gap-1.5 duration-300 ${
                      isLightMode 
                        ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' 
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Award size={12} />
                    <span>पत्रकार प्रमाणिकरण अनुरोध गर्नुहोस् (Get Verified Reporter Badge)</span>
                  </button>
                )}

                {/* Dynamic Theme Toggle Row (Requested Feature) */}
                <div className={`flex items-center justify-between w-full mt-4 pt-3.5 border-t transition-colors duration-300 ${
                  isLightMode ? 'border-slate-100' : 'border-slate-800/60'
                }`}>
                  <div className="flex items-center gap-2">
                    {isLightMode ? (
                      <Sun size={15} className="text-amber-500" />
                    ) : (
                      <Moon size={15} className="text-indigo-400" />
                    )}
                    <span className={`text-[10px] font-bold ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {isLightMode ? 'लाइट मोड (Light Mode)' : 'डार्क मोड (Dark Mode)'}
                    </span>
                  </div>
                  <button
                    id="theme_toggle_switch"
                    onClick={() => setIsLightMode(!isLightMode)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none flex items-center relative ${
                      isLightMode ? 'bg-red-500 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                  >
                    <motion.div
                      layout
                      className={`w-5 h-5 rounded-full shadow-md transition-colors duration-300 ${
                        isLightMode ? 'bg-white' : 'bg-slate-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Admin Control Suite Button if logged in as Admin */}
                {user.role === 'admin' && (
                  <button
                    id="open_admin_panel_profile_btn"
                    onClick={() => setShowAdmin(true)}
                    className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xxs transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
                  >
                    <ShieldAlert size={14} />
                    <span>एडमिन नियन्त्रण कक्ष (Admin Control Suite)</span>
                  </button>
                )}

                <button
                  id="profile_logout_btn"
                  onClick={handleLogout}
                  className="mt-4 text-red-500 hover:text-red-400 text-xxs font-semibold flex items-center gap-1 animate-none"
                >
                  <LogOut size={11} /> लगआउट गर्नुहोस्
                </button>
              </div>

              {/* User Videos Grid & Saved Videos Grid */}
              <div className="space-y-4">
                <h3 className={`text-xs font-bold text-left transition-colors duration-300 ${isLightMode ? 'text-slate-800' : 'text-slate-300'}`}>तपाईंले अपलोड गरेका समाचार भिडियोहरू</h3>
                
                {/* Find my uploads */}
                {videos.filter((v: any) => v.reporterPhone === user.phone).length === 0 ? (
                  <div className={`border rounded-2xl p-8 text-center text-slate-500 text-xs leading-relaxed transition-colors duration-300 ${
                    isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                  }`}>
                    तपाईंले अझै कुनै समाचार भिडियोहरू अपलोड गर्नुभएको छैन। समाचार रिपोर्ट बुझाउन तलको <strong>"+"</strong> बटन थिच्नुहोस्।
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {videos.filter((v: any) => v.reporterPhone === user.phone).map((vid) => (
                      <div
                        id={`profile_vid_grid_${vid.id}`}
                        key={vid.id}
                        onClick={() => {
                          if (vid.status === 'approved') {
                            setActiveTab('home');
                            setActiveFeedTab('foryou');
                            const targetIdx = filteredVideos.findIndex(v => v.id === vid.id);
                            if (targetIdx !== -1) {
                              setCurrentVideoIndex(targetIdx);
                              setPlayingVideoId(vid.id);
                            }
                          } else {
                            showToast(`यो भिडियो हाल ${vid.status === 'pending' ? 'समीक्षाको क्रममा' : 'अस्वीकृत'} छ।`, "info");
                          }
                        }}
                        className={`rounded-xl overflow-hidden relative group cursor-pointer border transition-all duration-300 ${
                          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="aspect-[9/16] relative bg-slate-950 flex items-center justify-center">
                          <video src={vid.videoUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" muted />
                          
                          {/* Approval status banner overlay */}
                          <span className={`absolute top-2 left-2 text-[8px] font-extrabold px-1.5 py-0.5 rounded border shadow ${
                            vid.status === 'approved' ? 'bg-emerald-600 text-white border-emerald-500' :
                            vid.status === 'pending' ? 'bg-yellow-500 text-slate-950 border-yellow-400 animate-pulse' :
                            'bg-red-600 text-white border-red-500'
                          }`}>
                            {vid.status === 'approved' ? 'APPROVED ✅' : vid.status === 'pending' ? 'PENDING ⏳' : 'REJECTED ❌'}
                          </span>

                          {vid.isSensitiveContent && (
                            <span className="absolute top-2 right-2 text-[8px] font-extrabold px-1.5 py-0.5 rounded border shadow bg-amber-600 text-white border-amber-500 z-10">
                              ⚠️ SENSITIVE
                            </span>
                          )}

                          <div className="absolute bottom-2 left-2 right-2 text-left">
                            <p className="text-white text-[10px] font-bold line-clamp-2 leading-tight drop-shadow">
                              {vid.title}
                            </p>
                            <span className="text-slate-400 text-[8px] block mt-1">एआई स्कोर: {vid.confidenceScore}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Saved Videos Grid */}
              <div className={`space-y-4 pt-4 border-t transition-colors duration-300 ${isLightMode ? 'border-slate-200' : 'border-slate-900'}`}>
                <h3 className={`text-xs font-bold text-left transition-colors duration-300 ${isLightMode ? 'text-slate-800' : 'text-slate-300'}`}>संग्रह गरिएका समाचारहरू (Saved News)</h3>
                
                {/* Find saved uploads */}
                {videos.filter((v: any) => v.savedBy.includes(user.phone)).length === 0 ? (
                  <div className={`border rounded-2xl p-6 text-center text-slate-500 text-xs leading-relaxed transition-colors duration-300 ${
                    isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                  }`}>
                    संग्रह गरिएको कुनै पनि समाचार सामग्री छैन।
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {videos.filter((v: any) => v.savedBy.includes(user.phone)).map((vid) => (
                      <div
                        id={`profile_saved_grid_${vid.id}`}
                        key={vid.id}
                        onClick={() => {
                          setActiveTab('home');
                          setActiveFeedTab('foryou');
                          const targetIdx = filteredVideos.findIndex(v => v.id === vid.id);
                          if (targetIdx !== -1) {
                            setCurrentVideoIndex(targetIdx);
                            setPlayingVideoId(vid.id);
                          }
                        }}
                        className={`rounded-xl overflow-hidden relative cursor-pointer border transition-all duration-300 ${
                          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="aspect-[9/16] relative bg-slate-950 flex items-center justify-center">
                          <video src={vid.videoUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" muted />
                          {vid.isSensitiveContent && (
                            <span className="absolute top-2 right-2 text-[8px] font-extrabold px-1.5 py-0.5 rounded border shadow bg-amber-600 text-white border-amber-500 z-10">
                              ⚠️ SENSITIVE
                            </span>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 text-left">
                            <p className="text-white text-[10px] font-bold line-clamp-2 leading-tight drop-shadow">
                              {vid.title}
                            </p>
                            <span className="text-slate-400 text-[8px] block mt-1">@{vid.reporterName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <div id="bottom_navbar" className={`px-6 py-2.5 flex items-center justify-between z-30 pb-safe transition-colors duration-300 border-t ${
        activeTab === 'home' 
          ? 'bg-black border-slate-900/40 text-white' 
          : (isLightMode ? 'bg-white border-slate-200/80 shadow-xl' : 'bg-slate-950 border-slate-900')
      }`}>
        
        {/* Home Button */}
        <button
          id="nav_btn_home"
          onClick={() => {
            setActiveTab('home');
            fetchVideos();
          }}
          className={`flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === 'home' 
              ? 'text-white font-bold' 
              : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white')
          }`}
        >
          <Home size={18} className={activeTab === 'home' ? 'stroke-[2.5]' : ''} />
          <span className="text-[9px] font-medium font-display">गृहपृष्ठ</span>
        </button>

        {/* Upload Button (Authentic TikTok design) */}
        <div className="flex items-center justify-center">
          <button
            id="nav_btn_upload"
            onClick={() => {
              if (!user) {
                setShowLogin(true);
              } else if (user.banned) {
                showToast("तपाईंको खाता प्रतिबन्धित छ, भिडियो अपलोड गर्न मिल्दैन।", "error");
              } else {
                setShowUpload(true);
              }
            }}
            className="tiktok-plus-btn cursor-pointer mx-2"
            title="समाचार अपलोड गर्नुहोस्"
          >
            <Plus size={16} className="stroke-[3.5] text-black" />
          </button>
        </div>

        {/* Notifications Button */}
        <button
          id="nav_btn_notifications"
          onClick={() => setActiveTab('notifications')}
          className={`flex flex-col items-center justify-center gap-0.5 transition relative ${
            activeTab === 'notifications' 
              ? (isLightMode ? 'text-slate-950 font-bold' : 'text-white font-bold')
              : (activeTab === 'home' ? 'text-slate-400 hover:text-white' : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'))
          }`}
        >
          <Bell size={18} className={activeTab === 'notifications' ? 'stroke-[2.5]' : ''} />
          {user && notifications.length > 0 && (
            <span className={`absolute top-0 right-1 bg-[#fe2c55] text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center scale-95 border ${
              activeTab === 'home' ? 'border-black' : (isLightMode ? 'border-white' : 'border-slate-950')
            }`}>
              {notifications.length}
            </span>
          )}
          <span className="text-[9px] font-medium font-display">सूचनाहरू</span>
        </button>

        {/* Profile Button */}
        <button
          id="nav_btn_profile"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === 'profile' 
              ? (isLightMode ? 'text-slate-950 font-bold' : 'text-white font-bold')
              : (activeTab === 'home' ? 'text-slate-400 hover:text-white' : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'))
          }`}
        >
          {user ? (
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'}
              alt={user.name}
              className={`w-5 h-5 rounded-full object-cover border ${
                activeTab === 'profile' ? 'border-white scale-105' : 'border-transparent'
              }`}
            />
          ) : (
            <User size={18} className={activeTab === 'profile' ? 'stroke-[2.5]' : ''} />
          )}
          <span className="text-[9px] font-medium font-display">प्रोफाइल</span>
        </button>
      </div>

      {/* --- OVERLAYS & DRAWER MODALS --- */}
      
      {/* Login Modal Overlay */}
      {showLogin && (
        <LoginModal
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLogin(false)}
        />
      )}

      {/* Upload Modal Overlay */}
      {showUpload && (
        <UploadModal
          user={user}
          onSuccess={handleUploadSuccess}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Search Overlay Screen */}
      {showSearch && (
        <SearchOverlay
          videos={videos}
          isLightMode={isLightMode}
          onSelectVideo={(videoId) => {
            setShowSearch(false);
            setActiveTab('home');
            setActiveFeedTab('foryou');
            const targetIdx = filteredVideos.findIndex(v => v.id === videoId);
            if (targetIdx !== -1) {
              setCurrentVideoIndex(targetIdx);
              setPlayingVideoId(videoId);
            }
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Admin Panel Screen */}
      {showAdmin && (
        <AdminPanel
          currentUser={user}
          onAdminLoginSuccess={(adminUser) => {
            setUser(adminUser);
            showToast("एडमिन लगइन सफल भयो! नियन्त्रण कक्ष खुला छ।", "success");
          }}
          onClose={() => {
            setShowAdmin(false);
            fetchVideos();
          }}
        />
      )}

      {/* Comments Drawer overlay */}
      {showComments && (
        <CommentsDrawer
          videoId={showComments}
          comments={videos.find(v => v.id === showComments)?.comments || []}
          user={user}
          isLightMode={isLightMode}
          onAddComment={(text) => triggerVideoAction(showComments, 'comment', { text })}
          onClose={() => setShowComments(null)}
        />
      )}

      {/* Share Preview Modal */}
      {sharingVideo && (
        <SharePreviewModal
          video={sharingVideo}
          isLightMode={isLightMode}
          showToast={showToast}
          onClose={() => setSharingVideo(null)}
        />
      )}

      {/* Edit Profile Modal Overlay */}
      <AnimatePresence>
        {showEditProfile && (
          <EditProfileModal
            user={user}
            isLightMode={isLightMode}
            showToast={showToast}
            onSuccess={(updatedUser) => {
              setUser(updatedUser);
              fetchVideos(); // Refresh video list to sync updated reporter details instantly
            }}
            onClose={() => setShowEditProfile(false)}
          />
        )}
      </AnimatePresence>

      {/* Verification Modal Overlay (eSewa Rs 50) */}
      {showVerificationModal && user && (
        <VerificationModal
          user={user}
          showToast={showToast}
          onSuccess={(updatedUser) => {
            setUser(updatedUser);
            localStorage.setItem('janboli_session', JSON.stringify(updatedUser));
            fetchVideos();
          }}
          onClose={() => setShowVerificationModal(false)}
        />
      )}

      {/* APK Mobile Download Modal Overlay */}
      <InstallApkModal
        isOpen={showInstallApk}
        onClose={() => setShowInstallApk(false)}
      />

    </div>
  );
}
