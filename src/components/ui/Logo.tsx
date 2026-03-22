import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomLogo();
    
    // Listen for logo updates from settings
    const handleUpdate = () => fetchCustomLogo();
    window.addEventListener('logoUpdated', handleUpdate);
    return () => window.removeEventListener('logoUpdated', handleUpdate);
  }, []);

  const fetchCustomLogo = async () => {
    if (!db) return;
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'branding'));
      if (settingsDoc.exists()) {
        setCustomLogoUrl(settingsDoc.data().logoUrl || null);
      }
    } catch (error) {
      console.error("Error fetching custom logo:", error);
    }
  };

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32'
  };

  if (customLogoUrl) {
    return (
      <div className={`${className} flex flex-col items-center gap-2`}>
        <div className={`${sizes[size]} relative flex items-center justify-center overflow-hidden rounded-full bg-white shadow-xl border border-slate-100`}>
          <img src={customLogoUrl} alt="Organization Logo" className="w-full h-full object-contain p-1" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} flex flex-col items-center gap-2`}>
      <div className={`${sizes[size]} relative flex items-center justify-center overflow-hidden rounded-full bg-slate-900 shadow-xl`}>
        {/* Galaxy Background Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black opacity-80"></div>
        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        
        {/* Stylized 'N' */}
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full p-4 relative z-10"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Metallic N */}
          <defs>
            <linearGradient id="n-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
          </defs>
          
          <path 
            d="M25 75V25H42L58 58V25H75V75H58L42 42V75H25Z" 
            fill="url(#n-gradient)"
            filter="drop-shadow(0px 0px 2px rgba(255,255,255,0.5))"
          />
          
          {/* Golden Swoosh */}
          <path 
            d="M10 60C10 60 30 85 90 40" 
            stroke="url(#gold-gradient)" 
            strokeWidth="4" 
            strokeLinecap="round"
            className="opacity-90"
          />
          
          {/* Star Sparkle */}
          <circle cx="85" cy="35" r="3" fill="white" className="animate-pulse" />
          <path d="M85 25V45M75 35H95" stroke="white" strokeWidth="1" opacity="0.8" />
        </svg>
      </div>
    </div>
  );
}
