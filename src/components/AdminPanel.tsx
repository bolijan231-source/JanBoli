import React, { useState, useEffect } from 'react';
import { 
  Users, Film, AlertTriangle, Bell, Check, X, ShieldAlert, Trash2, 
  UserMinus, UserCheck, TrendingUp, Info, Radio, Award, AlertCircle
} from 'lucide-react';
import { safeFetchJson } from '../lib/api';

interface AdminPanelProps {
  onClose: () => void;
  currentUser: any;
  onAdminLoginSuccess?: (adminUser: any) => void;
}

export default function AdminPanel({ onClose, currentUser, onAdminLoginSuccess }: AdminPanelProps) {
  const [adminUser, setAdminUser] = useState<any>(currentUser?.role === 'admin' ? currentUser : null);
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'videos' | 'users' | 'reports' | 'notifications'>('dashboard');
  const [videos, setVideos] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync if prop changes
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      setAdminUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (adminUser?.role === 'admin') {
      fetchAdminData();
    }
  }, [adminUser]);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId || !password) {
      setLoginError('कृपया एडमिन ID र पासवर्ड प्रविष्ट गर्नुहोस्।');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const { ok, data } = await safeFetchJson('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, password })
      });

      if (ok && data?.success) {
        setAdminUser(data.user);
        localStorage.setItem('janboli_session', JSON.stringify(data.user));
        if (onAdminLoginSuccess) {
          onAdminLoginSuccess(data.user);
        }
      } else {
        setLoginError(data?.error || 'गलत एडमिन ID वा पासवर्ड!');
      }
    } catch (err) {
      setLoginError('सर्भरसँग सम्पर्क हुन सकेन। कृपया पुनः प्रयास गर्नुहोस्।');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Render Login Form if not logged in as Admin
  if (!adminUser || adminUser.role !== 'admin') {
    return (
      <div id="admin_login_overlay" className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
          <button 
            id="close_admin_login_btn"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition cursor-pointer"
            title="रद्द गर्नुहोस्"
          >
            <X size={18} />
          </button>

          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 bg-red-600/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
              <ShieldAlert size={28} />
            </div>
            <h2 className="text-xl font-bold font-display text-white">जनबोली एडमिन लगइन</h2>
            <p className="text-slate-400 text-xs">मुख्य नियन्त्रण कक्ष प्रवेशका लागि गोप्य एडमिन लगइन ID र पासवर्ड राख्नुहोस्</p>
          </div>

          {loginError && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">एडमिन ID (Email / Username)*</label>
              <input
                id="admin_id_input"
                type="text"
                placeholder="उदा. admin@janboli.com"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-3.5 text-xs text-white focus:outline-none focus:border-red-600 transition"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">एडमिन पासवर्ड (Password)*</label>
              <input
                id="admin_password_input"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-3.5 text-xs text-white focus:outline-none focus:border-red-600 transition"
                required
              />
            </div>

            <button
              id="submit_admin_login_btn"
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold py-3.5 rounded-xl text-xs transition duration-200 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>प्रमाणित गर्दैछ...</span>
                </>
              ) : (
                <span>एडमिन प्यानल खोल्नुहोस्</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-slate-500 text-[11px] font-mono">
              JanBoli Admin Control Suite v2.0 • Direct Link Security
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Custom Push Notification state
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushTarget, setPushTarget] = useState('all');
  const [pushSuccess, setPushSuccess] = useState('');
  
  // Custom moderation input state
  const [modReason, setModReason] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [resV, resU] = await Promise.all([
        safeFetchJson('/api/admin/videos'),
        safeFetchJson('/api/admin/users')
      ]);
      
      setVideos(resV.data?.videos || []);
      setUsers(resU.data?.users || []);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoAction = async (id: string, action: string, extraReason?: string) => {
    try {
      const reason = extraReason || modReason[id] || '';
      const { ok, data } = await safeFetchJson(`/api/admin/videos/${id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      });
      if (ok && data?.videos) {
        setVideos(data.videos || []);
        // Reset reason for this item
        setModReason(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
      }
    } catch (err) {
      console.error("Error applying video moderation action:", err);
    }
  };

  const handleUserAction = async (phone: string, action: string, role?: string) => {
    try {
      const { ok, data } = await safeFetchJson(`/api/admin/users/${phone}/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, role })
      });
      if (ok && data?.users) {
        setUsers(data.users || []);
        // Also refresh videos to sync verified state
        const resV = await safeFetchJson('/api/admin/videos');
        setVideos(resV.data?.videos || []);
      }
    } catch (err) {
      console.error("Error managing user:", err);
    }
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushBody) return;
    try {
      const res = await fetch('/api/admin/push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pushTitle,
          body: pushBody,
          targetPhone: pushTarget,
          type: 'breaking'
        })
      });
      if (res.ok) {
        setPushSuccess('पुश सूचना सफलतापूर्वक पठाइयो!');
        setPushTitle('');
        setPushBody('');
        setTimeout(() => setPushSuccess(''), 3000);
      }
    } catch (err) {
      console.error("Error dispatching push notification:", err);
    }
  };

  // Helper Stats Calcs
  const stats = {
    totalVideos: videos.length,
    approved: videos.filter((v: any) => v.status === 'approved').length,
    pending: videos.filter((v: any) => v.status === 'pending').length,
    rejected: videos.filter((v: any) => v.status === 'rejected').length,
    totalUsers: users.length,
    reporters: users.filter((u: any) => u.role === 'reporter' || u.verified).length,
    reports: videos.reduce((acc: number, v: any) => acc + (v.reports?.length || 0), 0)
  };

  // Reported videos list
  const reportedVideos = videos.filter((v: any) => v.reports && v.reports.length > 0);

  return (
    <div id="admin_panel_page" className="fixed inset-0 z-50 bg-slate-950 flex flex-col md:flex-row text-white overflow-hidden font-sans">
      
      {/* Sidebar navigation */}
      <div className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-red-600 px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase">ADMIN</span>
              <h1 className="text-md font-bold font-display">जनबोली नियन्त्रण कक्ष</h1>
            </div>
            <button 
              id="admin_close_btn_mobile"
              onClick={onClose} 
              className="md:hidden text-slate-400 hover:text-white text-lg bg-slate-800 p-1 px-2 rounded-lg"
            >
              ×
            </button>
          </div>

          <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 no-scrollbar">
            <button
              id="admin_tab_dash"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${
                activeTab === 'dashboard' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp size={14} />
              <span>ड्यासबोर्ड (Stats)</span>
            </button>

            <button
              id="admin_tab_vids"
              onClick={() => setActiveTab('videos')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition relative ${
                activeTab === 'videos' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Film size={14} />
              <span>भिडियो मोडेरेसन</span>
              {stats.pending > 0 && (
                <span className="absolute right-2 bg-yellow-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded-full animate-bounce">
                  {stats.pending}
                </span>
              )}
            </button>

            <button
              id="admin_tab_users"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${
                activeTab === 'users' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users size={14} />
              <span>प्रयोगकर्ता व्यवस्थापन</span>
            </button>

            <button
              id="admin_tab_reports"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition relative ${
                activeTab === 'reports' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <AlertTriangle size={14} />
              <span>उजुरीहरू (Reports)</span>
              {stats.reports > 0 && (
                <span className="absolute right-2 bg-red-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                  {stats.reports}
                </span>
              )}
            </button>

            <button
              id="admin_tab_push"
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${
                activeTab === 'notifications' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bell size={14} />
              <span>पुश नोटिफिकेशन पठाउनुहोस्</span>
            </button>
          </div>
        </div>

        <button
          id="admin_exit_panel_btn"
          onClick={onClose}
          className="hidden md:block w-full bg-slate-800 hover:bg-red-700 text-white font-semibold py-2 rounded-xl text-xs transition"
        >
          एडमिन प्यानल बन्द गर्नुहोस्
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs">विवरण लोड हुँदैछ...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-white">ड्यासबोर्ड रिपोर्ट</h2>
                  <p className="text-slate-400 text-xs mt-1">एपको समग्र गतिविधि र तथ्याङ्कहरू</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-slate-400 text-xxs font-semibold">कुल भिडियोहरू</span>
                    <div className="flex items-end justify-between mt-4">
                      <span className="text-2xl font-bold font-mono text-white">{stats.totalVideos}</span>
                      <div className="bg-slate-800 p-2 rounded-xl text-slate-300">
                        <Film size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-slate-400 text-xxs font-semibold">प्रक्रियामा (Pending)</span>
                    <div className="flex items-end justify-between mt-4">
                      <span className="text-2xl font-bold font-mono text-yellow-500">{stats.pending}</span>
                      <div className="bg-yellow-500/10 p-2 rounded-xl text-yellow-500 border border-yellow-500/10">
                        <Info size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-slate-400 text-xxs font-semibold">कुल प्रयोगकर्ताहरू</span>
                    <div className="flex items-end justify-between mt-4">
                      <span className="text-2xl font-bold font-mono text-white">{stats.totalUsers}</span>
                      <div className="bg-slate-800 p-2 rounded-xl text-slate-300">
                        <Users size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-slate-400 text-xxs font-semibold">दर्ता भएका उजुरीहरू</span>
                    <div className="flex items-end justify-between mt-4">
                      <span className="text-2xl font-bold font-mono text-red-500">{stats.reports}</span>
                      <div className="bg-red-500/10 p-2 rounded-xl text-red-500 border border-red-500/10">
                        <AlertTriangle size={18} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
                  <div className="bg-blue-600/15 text-blue-400 p-3 rounded-2xl border border-blue-500/10 shrink-0">
                    <Radio size={24} className="animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">एआई मोडेरेसन इन्जिन सक्रिय छ</h3>
                    <p className="text-slate-400 text-xxs leading-relaxed">
                      अहिले सम्म अपलोड भएका भिडियोहरू स्वचालित रूपमा एआईद्वारा विश्लेषण गरिएका छन्। ९०% भन्दा माथिको कन्फिडेन्स स्कोर भएका भिडियो स्वतः स्वीकृत हुन्छन्, ७०%-९०% पेन्डिङमा र ७०% भन्दा कम स्कोर भएका भिडियो तत्काल अस्वीकृत हुन्छन्।
                    </p>
                  </div>
                </div>

                {/* Recent Pending Videos snippet */}
                <div className="space-y-3">
                  <h3 className="text-slate-300 text-xs font-semibold">हालै प्राप्त पेन्डिङ भिडियोहरू</h3>
                  {videos.filter((v: any) => v.status === 'pending').length === 0 ? (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-xs">
                      समीक्षा गर्नुपर्ने नयाँ समाचार भिडियोहरू छैनन्।
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {videos.filter((v: any) => v.status === 'pending').slice(0, 2).map((vid) => (
                        <div key={vid.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4">
                          <video src={vid.videoUrl} className="w-16 h-28 object-cover rounded-lg bg-black" muted />
                          <div className="flex-1 flex flex-col justify-between">
                            <div className="space-y-1">
                              <span className="bg-yellow-500/10 border border-yellow-500/10 text-yellow-500 text-[9px] px-2 py-0.5 rounded">
                                {vid.category}
                              </span>
                              <h4 className="text-xs font-bold text-white line-clamp-1">{vid.title}</h4>
                              <p className="text-slate-400 text-[10px] line-clamp-2 leading-relaxed">{vid.description}</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                id={`quick_approve_${vid.id}`}
                                onClick={() => handleVideoAction(vid.id, 'approve', 'म्यानुअल रूपमा स्वीकृत।')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xxs px-2.5 py-1 rounded-lg font-bold"
                              >
                                स्वीकृत गर्नुहोस्
                              </button>
                              <button 
                                id={`quick_reject_${vid.id}`}
                                onClick={() => handleVideoAction(vid.id, 'reject', 'समाचारको मापदण्ड पूरा नगरेको।')}
                                className="bg-red-600 hover:bg-red-700 text-white text-xxs px-2.5 py-1 rounded-lg font-bold"
                              >
                                अस्वीकार गर्नुहोस्
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: VIDEOS MODERATION QUEUE */}
            {activeTab === 'videos' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-white">भिडियो समीक्षा र मोडेरेसन</h2>
                  <p className="text-slate-400 text-xs mt-1">अपलोड भएका सबै समाचार भिडियोहरूको सूची र स्थिति</p>
                </div>

                <div className="space-y-4">
                  {videos.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
                      कुनै पनि भिडियो फेला परेन।
                    </div>
                  ) : (
                    videos.map((vid) => (
                      <div key={vid.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-5">
                        
                        {/* Video player thumbnail */}
                        <div className="w-full md:w-36 shrink-0 aspect-[9/16] md:h-64 rounded-xl overflow-hidden bg-black relative">
                          <video src={vid.videoUrl} className="w-full h-full object-cover" controls muted />
                        </div>

                        {/* Video Details & Mod Actions */}
                        <div className="flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded">
                                {vid.category}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                vid.status === 'approved' 
                                  ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20' 
                                  : vid.status === 'pending'
                                    ? 'bg-yellow-950/20 text-yellow-400 border-yellow-500/20 animate-pulse'
                                    : 'bg-red-950/20 text-red-400 border-red-500/20'
                              }`}>
                                {vid.status === 'approved' ? 'स्वीकृत (Approved)' : vid.status === 'pending' ? 'प्रतीक्षामा (Pending)' : 'अस्वीकृत (Rejected)'}
                              </span>
                              <span className="bg-slate-800 text-slate-300 text-[9px] px-2 py-0.5 rounded">
                                {vid.province.split('(')[1]?.replace(')', '') || vid.province} • {vid.district.split('(')[1]?.replace(')', '') || vid.district}
                              </span>
                              {vid.isBreaking && (
                                <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded animate-pulse">
                                  🚨 ब्रेकिङ समाचार
                                </span>
                              )}
                            </div>

                            <h3 className="text-md font-bold text-white leading-snug">{vid.title}</h3>
                            <p className="text-slate-300 text-xs leading-relaxed">{vid.description}</p>
                            
                            <div className="text-slate-400 text-xxs bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                              <div>स्थान: <strong className="text-slate-200">{vid.municipality}, {vid.exactLocation}</strong></div>
                              <div>अपलोडर: <strong className="text-slate-200">@{vid.reporterName} ({vid.reporterPhone})</strong></div>
                              <div>एआई स्कोर: <strong className="text-yellow-500">{vid.confidenceScore}%</strong></div>
                              {vid.moderationReason && (
                                <div className="border-t border-slate-900 mt-1.5 pt-1.5 italic text-slate-300">
                                  एआई विश्लेषण: "{vid.moderationReason}"
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                              <input
                                id={`mod_reason_input_${vid.id}`}
                                type="text"
                                placeholder="स्वीकृत/अस्वीकृत गर्नुको कारण लेख्नुहोस्..."
                                value={modReason[vid.id] || ''}
                                onChange={(e) => setModReason(prev => ({ ...prev, [vid.id]: e.target.value }))}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xxs text-white focus:outline-none focus:border-red-600"
                              />
                            </div>
                            
                            <div className="flex gap-2 shrink-0">
                              {vid.status !== 'approved' && (
                                <button
                                  id={`moderate_approve_btn_${vid.id}`}
                                  onClick={() => handleVideoAction(vid.id, 'approve')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xxs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1"
                                >
                                  <Check size={12} /> स्वीकृत
                                </button>
                              )}
                              
                              {vid.status !== 'rejected' && (
                                <button
                                  id={`moderate_reject_btn_${vid.id}`}
                                  onClick={() => handleVideoAction(vid.id, 'reject')}
                                  className="bg-red-600 hover:bg-red-700 text-white text-xxs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1"
                                >
                                  <X size={12} /> अस्वीकृत
                                </button>
                              )}

                              <button
                                id={`moderate_breaking_btn_${vid.id}`}
                                onClick={() => {
                                  // Call API to toggle breaking
                                  fetch(`/api/admin/videos/${vid.id}/moderate`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'toggle-breaking' })
                                  }).then(res => res.json()).then(data => {
                                    setVideos(data.videos || []);
                                  });
                                }}
                                className="bg-slate-800 hover:bg-yellow-600 hover:text-slate-950 text-slate-300 text-xxs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1"
                              >
                                <Radio size={12} /> ब्रेकिङ
                              </button>

                              <button
                                id={`moderate_delete_btn_${vid.id}`}
                                onClick={() => handleVideoAction(vid.id, 'remove')}
                                className="bg-slate-800 hover:bg-red-950 text-red-500 hover:text-red-400 text-xxs font-bold p-2 rounded-xl transition"
                                title="भिडियो हटाउनुहोस्"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: USER MANAGEMENT */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-white">प्रयोगकर्ता व्यवस्थापन</h2>
                  <p className="text-slate-400 text-xs mt-1">सबै दर्ता भएका प्रयोगकर्ताहरू, रिपोर्टरहरू र तिनीहरूको स्थिति</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-xxs tracking-wider bg-slate-950/50">
                          <th className="p-4">प्रयोगकर्ता विवरण</th>
                          <th className="p-4">जिल्ला / प्रदेश</th>
                          <th className="p-4">भूमिका (Role)</th>
                          <th className="p-4">स्थिति (Status)</th>
                          <th className="p-4 text-right">कार्यहरू (Actions)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {users.map((user) => (
                          <tr key={user.phone} className="hover:bg-slate-850/30 transition">
                            <td className="p-4 flex items-center gap-3">
                              <img
                                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'}
                                alt={user.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-800 shrink-0"
                              />
                              <div>
                                <div className="font-semibold text-white flex items-center gap-1">
                                  {user.name}
                                  {user.verified && (
                                    <span className="text-blue-500" title="प्रमाणित पत्रकार">
                                      <Award size={13} fill="currentColor" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500 font-mono text-xxs mt-0.5">{user.phone}</div>
                              </div>
                            </td>
                            <td className="p-4 text-slate-300">
                              <div>{user.district.split('(')[1]?.replace(')', '') || user.district}</div>
                              <div className="text-slate-500 text-[10px] mt-0.5">{user.province.split('(')[1]?.replace(')', '') || user.province}</div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                user.role === 'admin' 
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/10' 
                                  : user.role === 'reporter'
                                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/10'
                                    : 'bg-slate-800 text-slate-400'
                              }`}>
                                {user.role === 'admin' ? 'एडमिन' : user.role === 'reporter' ? 'रिपोर्टर' : 'साधारण प्रयोगकर्ता'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                                user.banned ? 'text-red-500' : 'text-emerald-500'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${user.banned ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                {user.banned ? 'प्रतिबन्धित (Banned)' : 'सक्रिय (Active)'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="inline-flex gap-1.5">
                                {user.phone !== currentUser?.phone && (
                                  <>
                                    {/* Ban/Unban */}
                                    {user.banned ? (
                                      <button
                                        id={`unban_user_${user.phone}`}
                                        onClick={() => handleUserAction(user.phone, 'unban')}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1.5 rounded transition text-xxs flex items-center gap-1"
                                        title="प्रतिबन्ध हटाउनुहोस्"
                                      >
                                        <UserCheck size={12} />
                                      </button>
                                    ) : (
                                      <button
                                        id={`ban_user_${user.phone}`}
                                        onClick={() => handleUserAction(user.phone, 'ban')}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold p-1.5 rounded transition text-xxs flex items-center gap-1"
                                        title="प्रतिबन्ध लगाउनुहोस्"
                                      >
                                        <UserMinus size={12} />
                                      </button>
                                    )}

                                    {/* Toggle Reporter Verified badge */}
                                    {user.verified ? (
                                      <button
                                        id={`unverify_user_${user.phone}`}
                                        onClick={() => handleUserAction(user.phone, 'unverify')}
                                        className="bg-slate-800 hover:bg-slate-700 text-yellow-500 font-bold p-1.5 rounded transition text-xxs"
                                        title="पत्रकार प्रमाणिकरण हटाउनुहोस्"
                                      >
                                        <Award size={12} fill="currentColor" />
                                      </button>
                                    ) : (
                                      <button
                                        id={`verify_user_${user.phone}`}
                                        onClick={() => {
                                          handleUserAction(user.phone, 'verify');
                                          handleUserAction(user.phone, 'change-role', 'reporter');
                                        }}
                                        className="bg-slate-800 hover:bg-slate-700 text-blue-500 font-bold p-1.5 rounded transition text-xxs"
                                        title="पत्रकार प्रमाणित गर्नुहोस्"
                                      >
                                        <Award size={12} />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: REPORTS QUEUE */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-white">दर्ता भएका उजुरीहरू (Reported Videos)</h2>
                  <p className="text-slate-400 text-xs mt-1">प्रयोगकर्ताहरूले झूटो वा हानिकारक समाचार भनी रिपोर्ट गरेका सामग्रीहरू</p>
                </div>

                <div className="space-y-4">
                  {reportedVideos.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500 text-xs">
                      कुनै पनि भिडियो विरुद्ध उजुरी दर्ता भएको छैन।
                    </div>
                  ) : (
                    reportedVideos.map((vid) => (
                      <div key={vid.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-5">
                        
                        {/* Video thumbnail */}
                        <div className="w-full md:w-32 shrink-0 aspect-[9/16] md:h-52 rounded-xl overflow-hidden bg-black relative">
                          <video src={vid.videoUrl} className="w-full h-full object-cover" muted controls />
                        </div>

                        {/* Details and reports queue */}
                        <div className="flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <div>
                              <span className="bg-red-600/10 border border-red-500/10 text-red-500 text-[9px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                {vid.reports?.length || 0} उजुरीहरू (Reports)
                              </span>
                              <h3 className="text-md font-bold text-white mt-1.5 leading-snug">{vid.title}</h3>
                              <p className="text-slate-400 text-xxs mt-0.5">लेखक: @{vid.reporterName} ({vid.reporterPhone})</p>
                            </div>

                            {/* Reports List */}
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-32 overflow-y-auto space-y-2.5 no-scrollbar">
                              {vid.reports?.map((rep: any, idx: number) => (
                                <div key={idx} className="text-xxs flex items-start gap-2 border-b border-slate-900 last:border-b-0 pb-2 last:pb-0">
                                  <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                                  <div>
                                    <div className="text-slate-300 font-semibold">उजुरीकर्ता: {rep.reporterPhone}</div>
                                    <div className="text-slate-400 mt-0.5">कारण: "{rep.reason}"</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Quick Moderator Action */}
                          <div className="flex gap-2 justify-end">
                            <button
                              id={`report_dismiss_btn_${vid.id}`}
                              onClick={() => {
                                // Clear reports via mock update on server
                                fetch(`/api/admin/videos/${vid.id}/moderate`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'approve', reason: 'एडमिनद्वारा उजुरीहरू खारेज गरी स्वीकृत गरिएको।' })
                                }).then(res => res.json()).then(data => {
                                  setVideos(data.videos || []);
                                });
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xxs font-bold px-3 py-1.5 rounded-lg transition"
                            >
                              उजुरी खारेज गर्नुहोस्
                            </button>
                            
                            <button
                              id={`report_reject_btn_${vid.id}`}
                              onClick={() => handleVideoAction(vid.id, 'reject', 'प्रयोगकर्ताको गम्भीर उजुरीको आधारमा अस्वीकृत।')}
                              className="bg-red-600 hover:bg-red-700 text-white text-xxs font-bold px-3 py-1.5 rounded-lg transition"
                            >
                              समाचार हटाउनुहोस् (Reject)
                            </button>
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: DISPATCH PUSH NOTIFICATION */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h2 className="text-xl font-bold font-display text-white">पुश नोटिफिकेशन पठाउनुहोस्</h2>
                  <p className="text-slate-400 text-xs mt-1">सबै वा निश्चित प्रयोगकर्ताहरूलाई तत्कालै ब्रेकिङ न्यूज र सन्देशहरू पठाउनुहोस्</p>
                </div>

                {pushSuccess && (
                  <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-xl flex items-center gap-2">
                    <Check size={16} />
                    <span>{pushSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleSendPush} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-2">लक्षित प्रयोगकर्ता (Target Audience)</label>
                    <select
                      id="push_target_select"
                      value={pushTarget}
                      onChange={(e) => setPushTarget(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-red-600"
                    >
                      <option value="all">सबै प्रयोगकर्ताहरू (Broadcast to All)</option>
                      {users.map((u) => (
                        <option key={u.phone} value={u.phone}>{u.name} ({u.phone})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-2">सूचनाको शीर्षक (Notification Title)*</label>
                    <input
                      id="push_title_input"
                      type="text"
                      placeholder="उदा. 🚨 ब्रेकिङ: कोशी नदीमा पानीको बहाव खतराको स्तर पार!"
                      value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-red-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-2">मुख्य सन्देश (Body / Message)*</label>
                    <textarea
                      id="push_body_input"
                      placeholder="नदी किनारका बासिन्दाहरूलाई सुरक्षित स्थानमा जान आग्रह गरिएको छ। विस्तृत समाचार पढ्न क्लिक गर्नुहोस्।"
                      rows={4}
                      value={pushBody}
                      onChange={(e) => setPushBody(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-red-600 leading-relaxed"
                      required
                    />
                  </div>

                  <button
                    id="submit_push_btn"
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-xs transition"
                  >
                    सूचना तुरुन्तै पठाउनुहोस् (Send Push Notification)
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
