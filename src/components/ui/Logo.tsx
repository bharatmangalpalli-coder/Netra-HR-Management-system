import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`${sizes[size]} ${className} relative flex items-center justify-center overflow-hidden rounded-xl bg-[#C5A267]`}>
      {/* Stylized 'N' matching the provided logo */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full p-2"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M25 80V20H40L60 60V20H75V80H60L40 40V80H25Z" 
          fill="#2D2D2D" 
        />
        {/* The diagonal slash cut effect */}
        <path 
          d="M0 65L100 35L100 45L0 75Z" 
          fill="#C5A267" 
          className="opacity-90"
        />
        <path 
          d="M0 65L100 35" 
          stroke="white" 
          strokeWidth="1"
        />
        <path 
          d="M0 75L100 45" 
          stroke="white" 
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
