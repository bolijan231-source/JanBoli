import React, { useState } from 'react';
import { Search, MapPin, Tag, User, X, Film, Play } from 'lucide-react';
import { Video } from '../types';

interface SearchOverlayProps {
  videos: Video[];
  onSelectVideo: (videoId: string) => void;
  onClose: () => void;
  isLightMode?: boolean;
}

export default function SearchOverlay({ videos, onSelectVideo, onClose, isLightMode = false }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = [
    'Breaking News (ताजा समाचार)',
    'Politics (राजनीति)',
    'International News (अन्तर्राष्ट्रिय समाचार)',
    'Society (समाज)',
    'Environment (वातावरण)',
    'Sports (खेलकुद)',
    'Economy (अर्थतन्त्र)',
    'Technology (प्रविधि)',
    'Health (स्वास्थ्य)',
    'Entertainment (मनोरञ्जन)',
    'Local (स्थानीय)'
  ];

  const provinces = [
    'Koshi Province (कोशी प्रदेश)',
    'Madhesh Province (मधेस प्रदेश)',
    'Bagmati Province (बागमती प्रदेश)',
    'Gandaki Province (गण्डकी प्रदेश)',
    'Lumbini Province (लुम्बिनी प्रदेश)',
    'Karnali Province (कर्णाली प्रदेश)',
    'Sudurpashchim Province (सुदूरपश्चिम प्रदेश)'
  ];

  const qLower = query.trim().toLowerCase();

  const filteredVideos = videos.filter((video) => {
    const matchesQuery = qLower ? (
      video.title.toLowerCase().includes(qLower) ||
      video.description.toLowerCase().includes(qLower) ||
      video.reporterName.toLowerCase().includes(qLower) ||
      (video.reporterPhone && video.reporterPhone.toLowerCase().includes(qLower)) ||
      video.district.toLowerCase().includes(qLower) ||
      video.municipality.toLowerCase().includes(qLower) ||
      video.exactLocation.toLowerCase().includes(qLower) ||
      video.category.toLowerCase().includes(qLower)
    ) : true;

    const matchesProvince = selectedProvince ? video.province === selectedProvince : true;
    const matchesCategory = selectedCategory ? video.category === selectedCategory : true;

    return matchesQuery && matchesProvince && matchesCategory;
  });

  return (
    <div id="search_overlay" className={`fixed inset-0 z-50 flex flex-col p-4 transition-colors duration-300 ${
      isLightMode ? 'bg-slate-100' : 'bg-slate-950'
    }`}>
      {/* Search Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            id="search_query_input"
            type="text"
            placeholder="शीर्षक, जिल्ला, विधा वा प्रयोगकर्ता/पत्रकारको नामबाट खोज्नुहोस्..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`w-full border rounded-full py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all duration-300 ${
              isLightMode ? 'bg-white border-slate-200 text-slate-800 placeholder-slate-400' : 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
            }`}
            autoFocus
          />
          {query && (
            <button
              id="clear_search_query"
              onClick={() => setQuery('')}
              className={`absolute right-3.5 top-3 transition-colors ${
                isLightMode ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          id="close_search_overlay"
          onClick={onClose}
          className={`font-medium text-sm px-2 py-1 transition-colors ${
            isLightMode ? 'text-slate-600 hover:text-slate-900' : 'text-slate-300 hover:text-white'
          }`}
        >
          बन्द गर्नुहोस्
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        {/* Category Selector */}
        <select
          id="search_category_filter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={`border rounded-full py-1.5 px-3 text-xs focus:outline-none focus:border-red-600 shrink-0 transition-all duration-300 ${
            isLightMode ? 'bg-white text-slate-700 border-slate-200 shadow-sm' : 'bg-slate-900 text-slate-200 border-slate-800'
          }`}
        >
          <option value="">सबै विधाहरू (All Categories)</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat.split('(')[1]?.replace(')', '') || cat}</option>
          ))}
        </select>

        {/* Province Selector */}
        <select
          id="search_province_filter"
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
          className={`border rounded-full py-1.5 px-3 text-xs focus:outline-none focus:border-red-600 shrink-0 transition-all duration-300 ${
            isLightMode ? 'bg-white text-slate-700 border-slate-200 shadow-sm' : 'bg-slate-900 text-slate-200 border-slate-800'
          }`}
        >
          <option value="">सबै प्रदेशहरू (All Provinces)</option>
          {provinces.map((prov) => (
            <option key={prov} value={prov}>{prov.split('(')[1]?.replace(')', '') || prov}</option>
          ))}
        </select>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <h3 className={`text-xs font-semibold mb-3 transition-colors duration-300 ${
          isLightMode ? 'text-slate-700' : 'text-slate-400'
        }`}>खोज नतिजाहरू ({filteredVideos.length})</h3>

        {filteredVideos.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Film size={40} className={`mx-auto mb-3 ${isLightMode ? 'text-slate-300' : 'text-slate-700'}`} />
            <p className={`text-sm ${isLightMode ? 'text-slate-700' : 'text-slate-400'}`}>कुनै पनि समाचार भिडियो भेटिएन।</p>
            <p className={`text-xs mt-1 ${isLightMode ? 'text-slate-400' : 'text-slate-600'}`}>फरक खोज शव्दहरू प्रयोग गरी हेर्नुहोस्।</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => onSelectVideo(video.id)}
                className={`rounded-xl overflow-hidden border transition duration-300 flex flex-col cursor-pointer relative group ${
                  isLightMode ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Simulated Thumbnail */}
                <div className="aspect-[9/16] relative bg-slate-950 flex items-center justify-center overflow-hidden">
                  <video 
                    src={video.videoUrl} 
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />
                  
                  {/* Category badge */}
                  <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-semibold px-2 py-0.5 rounded">
                    {video.category.split('(')[1]?.replace(')', '') || video.category}
                  </span>

                  <span className="absolute top-2 right-2 bg-slate-900/80 text-blue-400 text-[9px] px-1.5 py-0.5 rounded border border-blue-500/20">
                    {video.district.split('(')[1]?.replace(')', '') || video.district}
                  </span>

                  {/* Play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                    <span className="bg-red-600 p-2.5 rounded-full text-white shadow-lg">
                      <Play size={16} fill="white" />
                    </span>
                  </div>

                  {/* Bottom info inside card */}
                  <div className="absolute bottom-2 left-2 right-2 text-left">
                    <p className="text-slate-100 text-[11px] font-semibold line-clamp-2 leading-tight drop-shadow">
                      {video.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <img
                        src={video.reporterAvatar}
                        alt={video.reporterName}
                        className="w-3.5 h-3.5 rounded-full object-cover border border-slate-700"
                      />
                      <span className="text-slate-300 text-[9px] truncate">@{video.reporterName}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
