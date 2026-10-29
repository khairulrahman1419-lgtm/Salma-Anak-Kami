import React from 'react';

interface ClothespinProps {
  variant?: 'wood' | 'mint' | 'coral';
  className?: string;
}

export const Clothespin: React.FC<ClothespinProps> = ({
  variant = 'wood',
  className = '',
}) => {
  const palette =
    variant === 'mint'
      ? { left: '#34D399', right: '#10B981', spring: '#475569', shadow: '#059669' }
      : variant === 'coral'
      ? { left: '#FB7185', right: '#F43F5E', spring: '#475569', shadow: '#E11D48' }
      : { left: '#E6B980', right: '#D49E5D', spring: '#64748B', shadow: '#B88040' };

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none z-20 ${className}`}
    >
      <svg
        width="24"
        height="34"
        viewBox="0 0 24 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-xs"
      >
        {/* Left prong */}
        <rect x="5" y="1" width="6" height="31" rx="2.5" fill={palette.left} />
        {/* Right prong */}
        <rect x="13" y="1" width="6" height="31" rx="2.5" fill={palette.right} />
        {/* Bottom inner notch shadow */}
        <rect x="11" y="20" width="2" height="10" rx="1" fill={palette.shadow} opacity="0.35" />
        {/* Metal spring band */}
        <rect x="3.5" y="12" width="17" height="4.5" rx="2" fill={palette.spring} />
        <circle cx="12" cy="14.25" r="1.4" fill="#E2E8F0" />
      </svg>
    </div>
  );
};
