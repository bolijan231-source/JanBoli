import React, { useState } from 'react';
import { AlertCircle, FileVideo, Shield, Check, Info, Server, Cpu, ShieldAlert, Sparkles } from 'lucide-react';
import { safeFetchJson } from '../lib/api';

interface UploadModalProps {
  user: any;
  onSuccess: (video: any) => void;
  onClose: () => void;
}

export default function UploadModal({ user, onSuccess, onClose }: UploadModalProps) {
  const [step, setStep] = useState(1); // 1 = Guide/Rules, 2 = Form, 3 = AI Moderation, 4 = Final Result
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Breaking News (ताजा समाचार)');
  const [province, setProvince] = useState('Bagmati Province (बागमती प्रदेश)');
  const [district, setDistrict] = useState('Kathmandu (काठमाडौं)');
  const [municipality, setMunicipality] = useState('');
  const [exactLocation, setExactLocation] = useState('');
  const [isSensitiveContent, setIsSensitiveContent] = useState(false);
  const [contentWarningText, setContentWarningText] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Real Local File Attachment State
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // For AI scanning step
  const [scanStatus, setScanStatus] = useState('भिडियो फाइल स्क्यान गर्दै...');
  const [moderationResult, setModerationResult] = useState<any>(null);

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

  const districtsOfProvince: { [key: string]: string[] } = {
    'Koshi Province (कोशी प्रदेश)': ['Jhapa (झापा)', 'Morang (मोरङ)', 'Sunsari (सुनसरी)', 'Ilam (इलाम)', 'Dhankuta (धनकुटा)', 'Sankhuwasabha (संखुवासभा)'],
    'Madhesh Province (मधेस प्रदेश)': ['Dhanusha (धनुषा)', 'Sarlahi (सर्लाही)', 'Saptari (सप्तरी)', 'Siraha (सिराहा)', 'Parsa (पर्सा)', 'Bara (बारा)'],
    'Bagmati Province (बागमती प्रदेश)': ['Kathmandu (काठमाडौं)', 'Lalitpur (ललितपुर)', 'Bhaktapur (भक्तपुर)', 'Chitwan (चितवन)', 'Kavre (काभ्रे)', 'Sindhupalchok (सिन्धुपाल्चोक)'],
    'Gandaki Province (गण्डकी प्रदेश)': ['Kaski (कास्की)', 'Tanahun (तनहुँ)', 'Syangja (स्याङ्जा)', 'Gorkha (गोरखा)', 'Baglung (बागलुङ)', 'Mustang (मुस्ताङ)'],
    'Lumbini Province (लुम्बिनी प्रदेश)': ['Rupandehi (रुपन्देही)', 'Kapilvastu (कपिलवस्तु)', 'Dang (दाङ)', 'Banke (बाँके)', 'Palpa (पाल्पा)', 'Bardiya (बर्दिया)'],
    'Karnali Province (कर्णाली प्रदेश)': ['Surkhet (सुर्खेत)', 'Dailekh (दैलेख)', 'Jumla (जुम्ला)', 'Salyan (सल्यान)', 'Kalikot (कालिकोट)', 'Humla (हुम्ला)'],
    'Sudurpashchim Province (सुदूरपश्चिम प्रदेश)': ['Kailali (कैलाली)', 'Kanchanpur (कञ्चनपुर)', 'Doti (डोटी)', 'Dadeldhura (डडेल्धुरा)', 'Baitadi (बैतडी)', 'Darchula (दार्चुला)']
  };



  const handleNextStep = () => {
    setStep(2);
  };

  const runScanningSimulation = async (videoData: any) => {
    setStep(3);
    setScanStatus('भिडियो फाइलको विश्लेषण हुँदैछ...');
    await new Promise(r => setTimeout(r, 1000));
    setScanStatus('समाचार शीर्षक र विधा प्रमाणीकरण गरिँदैछ...');
    await new Promise(r => setTimeout(r, 1000));
    setScanStatus('एआई एल्गोरिदमद्वारा सत्यता र मोडेरेसन स्कोर गणना गरिँदैछ...');
    
    try {
      const { ok, data } = await safeFetchJson('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoData)
      });
      if (!ok) throw new Error(data?.error || 'मोडेरेसन प्रक्रिया असफल भयो।');

      setModerationResult({
        video: data.video,
        status: data.moderation.status,
        confidenceScore: data.moderation.confidenceScore,
        reason: data.moderation.reason
      });

      setStep(4);
    } catch (err: any) {
      setError(err.message);
      setStep(2);
    }
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('कृपया केवल भिडियो फाइल मात्र चयन गर्नुहोस्। (Please select only video files)');
      return;
    }
    // Limit to 45MB to stay safe within the 50mb express json body limit
    if (file.size > 45 * 1024 * 1024) {
      setError('भिडियो फाइल धेरै ठूलो भयो। कृपया ४५ एमबी भन्दा सानो फाइल रोज्नुहोस्। (File is too large, please select under 45MB)');
      return;
    }
    setError('');
    setAttachedFile(file);
    const localUrl = URL.createObjectURL(file);
    setFilePreviewUrl(localUrl);
    // Auto-fill title or template if empty
    if (!title) {
      const cleanedName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(cleanedName.substring(0, 80));
    }
  };

  const uploadAttachedFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
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
            throw new Error(data?.error || 'फाइल अपलोड असफल भयो।');
          }
          resolve(data.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('फाइल पढ्ने क्रममा त्रुटि भयो।'));
      reader.readAsDataURL(file);
    });
  };

  const isInternational = category.includes('International') || category.includes('अन्तर्राष्ट्रिय');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setError('कृपया आवश्यक विवरणहरू पूरा गर्नुहोस्।');
      return;
    }
    if (!isInternational && (!province || !district)) {
      setError('कृपया प्रदेश र जिल्ला छनोट गर्नुहोस्।');
      return;
    }
    setError('');
    setLoading(true);

    try {
      let finalVideoUrl = '';

      if (attachedFile) {
        setStep(3); // transition to scanning so the loading spinner appears
        setScanStatus('भिडियो फाइल सर्भरमा सुरक्षित गरिँदैछ... (Uploading video to server...)');
        finalVideoUrl = await uploadAttachedFile(attachedFile);
      } else {
        setError('कृपया एउटा भिडियो फाइल अट्याच गर्नुहोस्। (Please attach a video file)');
        setLoading(false);
        return;
      }

      const payload = {
        title,
        description,
        category,
        province: isInternational ? 'International (अन्तर्राष्ट्रिय)' : province,
        district: isInternational ? (exactLocation || municipality || 'International (अन्तर्राष्ट्रिय)') : district,
        municipality: municipality || 'खुलाइएको छैन',
        exactLocation: exactLocation || 'खुलाइएको छैन',
        videoUrl: finalVideoUrl,
        reporterPhone: user.phone,
        isSensitiveContent,
        contentWarningText: isSensitiveContent ? contentWarningText : ''
      };

      runScanningSimulation(payload);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || 'फाइल अपलोड वा प्रसोधनमा समस्या आयो।');
      setLoading(false);
      setStep(2); // Go back to the form
    }
  };

  return (
    <div id="upload_modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl relative my-8">
        
        {step !== 3 && (
          <button 
            id="close_upload_modal"
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full transition z-10"
          >
            ×
          </button>
        )}

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-900 flex items-center gap-3">
          <div className="bg-red-600/10 text-red-500 p-2.5 rounded-xl border border-red-500/10">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-display">नयाँ समाचार भिडियो अपलोड</h1>
            <p className="text-slate-400 text-xs">जनबोली पत्रकारिता नीति तथा एआई सुरक्षा गाइड</p>
          </div>
        </div>

        {/* STEP 1: RULES & WARNINGS */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <h3 className="text-amber-400 text-xs font-bold uppercase tracking-wider">महत्वपूर्ण सूचना (Strict Guidelines)</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  जनबोलीमा <strong>केवल वास्तविक समाचार भिडियोहरू</strong> मात्र स्वीकार गरिन्छ। अन्य सामग्री अपलोड गर्ने प्रयोगकर्ताको खाता तुरुन्तै प्रतिबन्धित गरिनेछ।
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-950/10 border border-emerald-500/20 p-4 rounded-xl">
                <h4 className="text-emerald-400 text-xs font-bold mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> स्वीकृत सामग्रीहरू (ALLOWED):
                </h4>
                <ul className="text-slate-300 text-xxs space-y-2 leading-relaxed list-disc list-inside">
                  <li>वास्तविक जनसरोकारका मुद्दा</li>
                  <li>मौसम, बाढी, र प्राकृतिक प्रकोप अपडेट</li>
                  <li>स्थानीय विकास, बाटो, र पूर्वाधार</li>
                  <li>राजनीतिक तथा सामाजिक कार्यक्रम</li>
                  <li>खेलकुद र आर्थिक समाचारहरू</li>
                </ul>
              </div>

              <div className="bg-red-950/10 border border-red-500/20 p-4 rounded-xl">
                <h4 className="text-red-400 text-xs font-bold mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> निषेधित सामग्रीहरू (FORBIDDEN):
                </h4>
                <ul className="text-slate-300 text-xxs space-y-2 leading-relaxed list-disc list-inside">
                  <li>फोटोहरू, रिल, र व्यक्तिगत भ्लगहरू</li>
                  <li>गीत, संगीत, वा टिकटक मनोरञ्जन</li>
                  <li>हास्यव्यङ्ग्य र मनोरञ्जनात्मक प्र्याङ्कहरू</li>
                  <li>गेमिंग र चलचित्रका टुक्राहरू</li>
                  <li>गलत वा अफवाह फैलाउने सामग्री</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
              <Info className="text-blue-500 shrink-0" size={16} />
              <p className="text-slate-400 text-xxs leading-normal">
                तपाईंको भिडियो एडमिन वा एआई प्रणालीद्वारा प्रमाणीकरण नहुन्जेल "Pending Review" मा रहनेछ। स्वीकृत भएपछि मात्र भिडियो सार्वजनिक फिडमा देखिनेछ।
              </p>
            </div>

            <button
              id="accept_rules_btn"
              onClick={handleNextStep}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl transition text-xs font-display tracking-wider font-semibold"
            >
              मैले नियमहरू बुझें, अगाडि बढ्नुहोस्
            </button>
          </div>
        )}

        {/* STEP 2: FORM */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
            {error && (
              <div className="bg-red-950/30 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Real File Attachment Section (Drag-and-Drop / Tap to Select) */}
            <div className="space-y-2">
              <label className="block text-slate-300 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <FileVideo size={14} className="text-red-500" />
                समाचार भिडियो अट्याच गर्नुहोस् (Attach News Video)*
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => {
                  document.getElementById('real_video_file_input')?.click();
                }}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden group ${
                  isDragging
                    ? 'border-red-500 bg-red-500/10'
                    : filePreviewUrl
                    ? 'border-emerald-600 bg-emerald-950/20'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950/90'
                }`}
              >
                <input
                  id="real_video_file_input"
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {filePreviewUrl ? (
                  <div className="w-full space-y-3 flex flex-col items-center">
                    <div className="relative w-40 h-24 rounded-xl overflow-hidden border border-emerald-500/30 bg-black">
                      <video
                        src={filePreviewUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Check className="text-emerald-400" size={24} />
                      </div>
                    </div>
                    <div className="text-center px-2">
                      <p className="text-xs text-white font-semibold truncate max-w-[280px]" title={attachedFile?.name}>
                        {attachedFile?.name}
                      </p>
                      <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                        फाइल अट्याच भयो ({attachedFile ? (attachedFile.size / (1024 * 1024)).toFixed(2) : 0} MB)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachedFile(null);
                        setFilePreviewUrl('');
                      }}
                      className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      भिडियो हटाउनुहोस् (Remove File)
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-red-600/10 text-red-500 p-2.5 rounded-full mb-2 group-hover:scale-110 transition duration-300">
                      <FileVideo size={22} />
                    </div>
                    <p className="text-xs font-bold text-slate-200">
                      भिडियो ड्र्याग गर्नुहोस् वा यहाँ ट्याप गर्नुहोस्
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[320px] leading-relaxed">
                      आफ्नो मोबाइल ग्यालेरी वा क्यामेराबाट भिडियो रेकर्ड गरी अपलोड गर्नुहोस् (Max 45MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5">समाचारको मुख्य शीर्षक (News Title)*</label>
              <input
                id="news_title_input"
                type="text"
                placeholder="उदा. काठमाडौंमा बढ्दो वायु प्रदुषण र स्थानीयको विरोध"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-red-600"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5">समाचारको विस्तृत विवरण (Description)*</label>
              <textarea
                id="news_desc_input"
                placeholder="यस समाचार भिडियोले समेटेको घटना, मिति र सरोकारवालाहरूका बारेमा जानकारी लेख्नुहोस्..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-red-600 leading-relaxed"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5 font-display">विधा (Category)*</label>
              <select
                id="news_category_select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-red-600"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Geographical Hierarchy or International Note */}
            {!isInternational ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">प्रदेश (Province)*</label>
                    <select
                      id="news_province_select"
                      value={province}
                      onChange={(e) => {
                        setProvince(e.target.value);
                        setDistrict(districtsOfProvince[e.target.value][0]);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-red-600"
                    >
                      {provinces.map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">जिल्ला (District)*</label>
                    <select
                      id="news_district_select"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-red-600"
                    >
                      {districtsOfProvince[province]?.map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">नगरपालिका / गाउँपालिका (Municipality)</label>
                    <input
                      id="news_municipality_input"
                      type="text"
                      placeholder="उदा. पोखरा महानगरपालिका"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">स्थान (Exact Location)</label>
                    <input
                      id="news_exact_loc_input"
                      type="text"
                      placeholder="उदा. सृजना चोक, वडा नं. ८"
                      value={exactLocation}
                      onChange={(e) => setExactLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
                  <Info size={16} />
                  <span>अन्तर्राष्ट्रिय समाचार (International News)</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  अन्तर्राष्ट्रिय समाचारका लागि नेपालको प्रदेश र जिल्ला छनोट गर्नुपर्दैन। यदि चाहनुहुन्छ भने देश वा सहरको नाम लेख्न सक्नुहुन्छ:
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1">देश (Country)</label>
                    <input
                      type="text"
                      placeholder="उदा. अमेरिका, भारत, युएई"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1">सहर / स्थान (City/Location)</label>
                    <input
                      type="text"
                      placeholder="उदा. वासिङ्टन डीसी, नयाँ दिल्ली"
                      value={exactLocation}
                      onChange={(e) => setExactLocation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sensitive Content Toggles */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <label className="block text-slate-200 text-xs font-bold">संवेदनशील सामग्री (Sensitive Content)?</label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      यो भिडियोमा बाढी-पहिरो, दुर्घटना, वा अन्य विचलित पार्ने दृश्यहरू छन्?
                    </p>
                  </div>
                </div>
                <button
                  id="sensitive_toggle_btn"
                  type="button"
                  onClick={() => setIsSensitiveContent(!isSensitiveContent)}
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none flex items-center relative ${
                    isSensitiveContent ? 'bg-amber-600 justify-end' : 'bg-slate-800 justify-start'
                  }`}
                >
                  <span className="w-4.5 h-4.5 rounded-full bg-white shadow-md block" />
                </button>
              </div>

              {isSensitiveContent && (
                <div className="space-y-1.5 duration-300 transition-all">
                  <label className="block text-slate-300 text-[11px] font-bold">चेतावनी सन्देश (Content Warning Text)*</label>
                  <input
                    id="content_warning_text_input"
                    type="text"
                    placeholder="उदा. यस भिडियोमा प्राकृतिक प्रकोपका विचलित पार्ने दृश्यहरू हुन सक्छन्।"
                    value={contentWarningText}
                    onChange={(e) => setContentWarningText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                    required={isSensitiveContent}
                  />
                </div>
              )}
            </div>

            <button
              id="submit_moderation_btn"
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl transition text-xs font-display tracking-wider font-semibold"
            >
              एआई मोडरेसन र पुष्टि गर्न बुझाउनुहोस् (Submit to AI Moderation)
            </button>
          </form>
        )}

        {/* STEP 3: SCANNING ANIMATION */}
        {step === 3 && (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-6 bg-slate-950">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-600/10 blur-xl animate-pulse"></div>
              <div className="w-20 h-20 rounded-full border-4 border-red-600/20 border-t-red-600 animate-spin flex items-center justify-center">
                <Cpu size={32} className="text-red-500 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white font-display">एआई भिडियो मोडेरेसन सक्रिय छ...</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
                हाम्रो अत्याधुनिक एआई मोडेलले तपाईंको भिडियो सामग्री र शीर्षकलाई जनबोलीका कडा पत्रकारिता दिशानिर्देशहरूसँग मेल खान्छ कि गर्दैन भनी जाँच गरिरहेको छ।
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl font-mono text-xxs text-red-400 inline-flex items-center gap-2">
              <Server size={12} />
              <span>{scanStatus}</span>
            </div>
          </div>
        )}

        {/* STEP 4: FINAL MODERATION RESULTS */}
        {step === 4 && moderationResult && (
          <div className="p-8 text-center space-y-6 bg-slate-950">
            
            {/* Approved View */}
            {moderationResult.status === 'approved' && (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-500">
                  <Check size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white font-display">स्वचालित एआई स्वीकृति (Auto Approved) ✅</h2>
                  <p className="text-slate-400 text-xs">
                    तपाईंको भिडियो पूर्ण रूपमा स्वीकृत भएको छ र जनबोलीको गृहपृष्ठ फिडमा थपिएको छ!
                  </p>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left space-y-2 max-w-md mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xxs">प्रणाली सत्यता स्कोर (Confidence Score):</span>
                    <span className="text-emerald-400 font-bold font-mono text-xs">{moderationResult.confidenceScore}%</span>
                  </div>
                  <p className="text-slate-300 text-xxs leading-relaxed font-sans italic border-t border-slate-800/80 pt-2">
                    " {moderationResult.reason} "
                  </p>
                </div>

                <button
                  id="approval_done_btn"
                  onClick={() => onSuccess(moderationResult.video)}
                  className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition text-xs"
                >
                  फिडमा जानुहोस्
                </button>
              </>
            )}

            {/* Pending View */}
            {moderationResult.status === 'pending' && (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-600/10 border border-yellow-500/20 text-yellow-500 animate-pulse">
                  <Sparkles size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white font-display">समीक्षा बाँकी (Pending Manual Review) ⏳</h2>
                  <p className="text-slate-400 text-xs">
                    तपाईंको भिडियो एडमिनको समीक्षाको लागि पेन्डिङमा छ।
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left space-y-2 max-w-md mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xxs">प्रणाली सत्यता स्कोर (Confidence Score):</span>
                    <span className="text-yellow-500 font-bold font-mono text-xs">{moderationResult.confidenceScore}%</span>
                  </div>
                  <p className="text-slate-300 text-xxs leading-relaxed font-sans italic border-t border-slate-800/80 pt-2">
                    " {moderationResult.reason} "
                  </p>
                </div>

                <button
                  id="pending_done_btn"
                  onClick={() => onSuccess(moderationResult.video)}
                  className="w-full max-w-xs bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2.5 rounded-xl transition text-xs"
                >
                  ठीक छ, प्रोफाइलमा जानुहोस्
                </button>
              </>
            )}

            {/* Rejected View */}
            {moderationResult.status === 'rejected' && (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-600/10 border border-red-500/20 text-red-500">
                  <ShieldAlert size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white font-display">भिडियो अस्वीकृत (Auto Rejected) ❌</h2>
                  <p className="text-slate-400 text-xs">
                    यो भिडियो हाम्रो जनबोली नीतिको विपरित पाइएकाले अस्वीकृत गरिएको छ।
                  </p>
                </div>

                <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-xl text-left space-y-2 max-w-md mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 font-bold text-xxs uppercase tracking-wider">अस्वीकृत हुनुको मुख्य कारण:</span>
                    <span className="text-red-400 font-bold font-mono text-xs">{moderationResult.confidenceScore}% Score</span>
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed font-semibold">
                    {moderationResult.reason}
                  </p>
                </div>

                <div className="flex gap-3 justify-center max-w-sm mx-auto">
                  <button
                    id="reject_back_btn"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    सच्याएर पुन: प्रयास गर्नुहोस्
                  </button>
                  <button
                    id="reject_close_btn"
                    onClick={onClose}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition text-xs"
                  >
                    बन्द गर्नुहोस्
                  </button>
                </div>
              </>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
