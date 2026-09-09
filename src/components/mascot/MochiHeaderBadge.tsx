'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface MochiHeaderBadgeProps {
  statusText?: string;
  dotColor?: string;
  themeType?: 'amber' | 'matcha';
  onClick?: () => void;
}

export default function MochiHeaderBadge({
  statusText = 'Bloub is studying',
  dotColor,
  themeType = 'amber',
  onClick,
}: MochiHeaderBadgeProps) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 5500);

    return () => clearInterval(blinkInterval);
  }, []);

  const isMatcha = themeType === 'matcha';
  const badgeDotColor = dotColor || (isMatcha ? '#84a98c' : '#f59e0b');
  const mochiFill = isMatcha ? '#e8f0eb' : '#fef3c7';
  const blushFill = isMatcha ? '#a3c4ab' : '#fca5a5';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative inline-flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-full border transition-all duration-200 cursor-pointer select-none ${
        isMatcha
          ? 'bg-[#18211c]/95 border-[#84a98c]/30 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:border-[#84a98c]/50'
          : 'bg-[#24201c]/95 border-amber-500/25 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:border-amber-500/40'
      }`}
    >
      {/* Glowing Status Dot */}
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: badgeDotColor }}
        />
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ backgroundColor: badgeDotColor }}
        />
      </span>

      {/* Status Typography */}
      <span className="text-xs sm:text-sm font-medium tracking-normal text-stone-200 whitespace-nowrap px-1">
        {statusText}
      </span>

      {/* Cute Mochi Mascot Avatar */}
      <motion.div
        animate={{
          y: [0, -1.5, 0],
          scale: [1, 1.03, 1],
        }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative flex items-center justify-center w-7 h-7 rounded-full overflow-hidden shadow-sm flex-shrink-0"
        style={{
          background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${mochiFill} 70%)`,
        }}
      >
        <svg
          viewBox="0 0 32 32"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Mochi Body Base */}
          <ellipse
            cx="16"
            cy="17"
            rx="12"
            ry="10.5"
            fill={mochiFill}
          />
          {/* Subtle 3D bottom shading */}
          <ellipse
            cx="16"
            cy="21.5"
            rx="9"
            ry="4.5"
            fill={isMatcha ? '#c6d8cc' : '#fde68a'}
            opacity="0.35"
          />

          {/* Rosy Cheeks */}
          <circle cx="9" cy="18.5" r="2.5" fill={blushFill} opacity="0.6" />
          <circle cx="23" cy="18.5" r="2.5" fill={blushFill} opacity="0.6" />

          {/* Eyes with Blinking State */}
          {isBlinking ? (
            <>
              {/* Closed happy curved lines */}
              <path
                d="M 10 16 Q 12 18 14 16"
                stroke="#451a03"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 18 16 Q 20 18 22 16"
                stroke="#451a03"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              {/* Cute wide curious eyes */}
              <ellipse cx="12" cy="15" rx="1.6" ry="2" fill="#291e14" />
              <ellipse cx="20" cy="15" rx="1.6" ry="2" fill="#291e14" />
              {/* Eye sparkle reflection */}
              <circle cx="12.5" cy="14.3" r="0.6" fill="#ffffff" />
              <circle cx="20.5" cy="14.3" r="0.6" fill="#ffffff" />
            </>
          )}

          {/* Happy Little Smile */}
          <path
            d="M 14.5 19 Q 16 21 17.5 19"
            stroke="#291e14"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </motion.div>
    </motion.button>
  );
}
