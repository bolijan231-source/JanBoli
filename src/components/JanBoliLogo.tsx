import React from 'react';

interface JanBoliLogoProps {
  className?: string;
  size?: number; // Size for icon-only or APK card
  showText?: boolean;
  showTagline?: boolean;
  layout?: 'horizontal' | 'vertical' | 'icon-only';
  isApkCard?: boolean; // Centered inside a white rounded-3xl card like the APK icon image
  isLightMode?: boolean;
}

export default function JanBoliLogo({
  className = '',
  size = 120,
  showText = true,
  showTagline = true,
  layout = 'vertical',
  isApkCard = false,
  isLightMode = false,
}: JanBoliLogoProps) {

  // SVG Logo Symbol
  const renderLogoSvg = (logoSize: number) => {
    return (
      <svg
        width={logoSize}
        height={logoSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible select-none pointer-events-none"
      >
        {/* Deep Blue Bold J Letter */}
        <path
          d="M38.5 28.5V64.5 C38.5 73.5 31.0 80.5 21.0 80.5 C12.0 80.5 5.5 74.0 5.5 65.5 C5.5 64.0 6.5 62.5 8.0 62.5 C9.5 62.5 11.0 63.5 11.5 65.0 C12.5 68.5 16.0 72.0 21.0 72.0 C26.5 72.0 30.5 68.0 30.5 62.0 V28.5 C30.5 27.0 31.5 26.0 33.0 26.0 C34.5 26.0 38.5 27.0 38.5 28.5 Z"
          fill="#004b93"
          stroke="#004b93"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Play Button Shape (Triangle outline) in Deep Blue */}
        <path
          d="M42.0 29.0 L83.0 53.0 L42.0 78.0 Z"
          stroke="#004b93"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Nepal Map Silhouette in Red, placed perfectly inside the play button */}
        <path
          d="M 46.5,50.0 
             Q 48.0,47.0 52.0,48.5 
             T 56.5,46.0 
             T 60.5,49.0 
             T 64.5,47.0 
             T 67.5,52.0 
             T 70.0,49.5 
             L 71.0,51.5 
             Q 69.5,54.5 66.5,53.0 
             T 61.5,55.0 
             T 56.5,53.5 
             T 51.5,54.5 
             T 47.0,52.0 Z"
          fill="#cc1f20"
          stroke="#cc1f20"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Nepal Map Border highlight for polish */}
        <path
          d="M 46.5,50.0 
             Q 48.0,47.0 52.0,48.5 
             T 56.5,46.0 
             T 60.5,49.0 
             T 64.5,47.0 
             T 67.5,52.0 
             T 70.0,49.5 
             L 71.0,51.5 
             Q 69.5,54.5 66.5,53.0 
             T 61.5,55.0 
             T 56.5,53.5 
             T 51.5,54.5 
             T 47.0,52.0 Z"
          stroke="#ffffff"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />

        {/* Red Broadcast Waves (Wifi signals) above the play button */}
        {/* Inner Wave */}
        <path
          d="M 59.5,23.5 C 62.0,20.0 65.5,18.0 69.0,18.0 C 72.5,18.0 76.0,20.0 78.5,23.5"
          stroke="#cc1f20"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Middle Wave */}
        <path
          d="M 55.5,18.5 C 59.5,13.5 64.5,11.0 69.0,11.0 C 73.5,11.0 78.5,13.5 82.5,18.5"
          stroke="#cc1f20"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Outer Wave */}
        <path
          d="M 51.5,13.5 C 56.5,7.0 62.5,4.0 69.0,4.0 C 75.5,4.0 81.5,7.0 86.5,13.5"
          stroke="#cc1f20"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Small Red Dot Source */}
        <circle cx="69" cy="24" r="3" fill="#cc1f20" />
      </svg>
    );
  };

  // 1. APK Card Style (Rounded square white card, exact clone of the user's uploaded icon)
  if (isApkCard) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-white rounded-3xl p-6 shadow-xl border border-slate-100 ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="transform scale-[1.05] flex items-center justify-center">
          {renderLogoSvg(size * 0.5)}
        </div>
        
        {showText && (
          <div className="mt-4 text-center">
            <h1 className="text-xl font-bold font-display text-[#004b93] tracking-tight select-none">
              JanBoli
            </h1>
            {showTagline && (
              <p className="text-[9px] text-[#004b93] font-medium mt-0.5 whitespace-nowrap tracking-wide select-none">
                जनताको आवाज, भिडियोमा समाचार।
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // 2. Icon-Only Mode
  if (layout === 'icon-only') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {renderLogoSvg(size)}
      </div>
    );
  }

  // 3. Horizontal Layout (Logo + Text side by side)
  if (layout === 'horizontal') {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <div className="shrink-0 flex items-center justify-center">
          {renderLogoSvg(size)}
        </div>
        {showText && (
          <div className="flex flex-col text-left leading-tight">
            <span className={`text-base font-extrabold tracking-tight font-display ${isLightMode ? 'text-[#004b93]' : 'text-white'}`}>
              JanBoli
            </span>
            {showTagline && (
              <span className={`text-[8px] font-semibold tracking-wide ${isLightMode ? 'text-[#004b93]/80' : 'text-slate-300'}`}>
                जनताको आवाज, भिडियोमा समाचार।
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // 4. Default Vertical Layout
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      <div className="flex items-center justify-center">
        {renderLogoSvg(size)}
      </div>
      {showText && (
        <div className="mt-3">
          <h1 className={`text-2xl font-bold tracking-tight font-display ${isLightMode ? 'text-[#004b93]' : 'text-white'}`}>
            JanBoli
          </h1>
          {showTagline && (
            <p className={`text-xs font-semibold mt-1 ${isLightMode ? 'text-[#004b93]/85' : 'text-slate-300'}`}>
              जनताको आवाज, भिडियोमा समाचार।
            </p>
          )}
        </div>
      )}
    </div>
  );
}
