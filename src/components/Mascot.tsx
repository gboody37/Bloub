'use client';

import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';

const SHAPES = {
  squircle: "M50 0 C 10 0 0 10 0 50 C 0 90 10 100 50 100 C 90 100 100 90 100 50 C 100 10 90 0 50 0 Z",
  circle: "M50 0 C 22.38 0 0 22.38 0 50 C 0 77.61 22.38 100 50 100 C 77.61 100 100 77.61 100 50 C 100 22.38 77.61 0 50 0 Z",
  pebble: "M 50 5 C 20 5 5 30 10 60 C 15 90 30 95 60 90 C 90 85 95 60 90 30 C 85 0 80 5 50 5 Z",
  cloud: "M 35 30 C 20 30 10 45 10 60 C 10 80 25 90 45 90 L 75 90 C 90 90 95 75 95 60 C 95 45 85 30 70 30 C 65 10 45 15 35 30 Z"
};

export default function Mascot({ mood, shape = 'squircle' }: { mood: 'idle' | 'happy' | 'sad' | 'thinking', shape?: keyof typeof SHAPES }) {
  const eyesRef = useRef(null);
  const bodyRef = useRef(null);

  // Shape Morpher
  useEffect(() => {
    const animeFn = (anime as any).default || anime;
    animeFn({
      targets: bodyRef.current,
      d: SHAPES[shape],
      duration: 600,
      easing: 'easeOutElastic(1, .8)'
    });
  }, [shape]);

  useEffect(() => {
    const animeFn = (anime as any).default || anime;
    
    animeFn.remove(eyesRef.current);
    animeFn.remove(bodyRef.current);

    if (mood === 'idle') {
      animeFn({
        targets: bodyRef.current,
        translateY: [0, -10, 0],
        duration: 2000,
        loop: true,
        easing: 'easeInOutSine'
      });
      // Blink
      animeFn({
        targets: eyesRef.current,
        scaleY: [1, 0.1, 1],
        duration: 200,
        delay: 3000,
        loop: true,
        easing: 'easeInOutQuad'
      });
    } else if (mood === 'happy') {
      animeFn({
        targets: bodyRef.current,
        scaleY: [1, 1.2, 0.9, 1],
        scaleX: [1, 0.9, 1.1, 1],
        translateY: [0, -30, 0],
        duration: 1000,
        easing: 'easeOutElastic(1, .5)'
      });
      animeFn({
        targets: eyesRef.current,
        scaleY: [1, 0.2, 1],
        translateY: [0, -5, 0],
        duration: 400,
        easing: 'easeInOutQuad'
      });
    } else if (mood === 'sad') {
      animeFn({
        targets: bodyRef.current,
        scaleY: 0.85,
        scaleX: 1.15,
        translateY: 10,
        duration: 1000,
        easing: 'easeOutQuad'
      });
      animeFn({
        targets: eyesRef.current,
        translateY: 5,
        duration: 500,
        easing: 'easeOutQuad'
      });
    } else if (mood === 'thinking') {
      animeFn({
        targets: bodyRef.current,
        rotate: [0, 10, -5, 0],
        duration: 2000,
        loop: true,
        easing: 'easeInOutSine'
      });
      animeFn({
        targets: eyesRef.current,
        translateX: [-5, 5, -5],
        duration: 2000,
        loop: true,
        easing: 'easeInOutSine'
      });
    }
  }, [mood]);

  return (
    <div className="flex justify-center items-center w-32 h-32 relative mx-auto my-4">
      <svg width="120" height="120" viewBox="0 0 100 100" className="overflow-visible">
        {/* Mascot shape */}
        <path
          ref={bodyRef}
          d={SHAPES[shape]}
          fill="#111111"
          style={{ transformOrigin: '50px 50px' }}
        />
        {/* Cute tilted pill eyes */}
        <g ref={eyesRef} style={{ transformOrigin: '50px 45px' }}>
          <rect x="32" y="35" width="8" height="24" rx="4" fill="white" transform="rotate(15, 36, 47)" />
          <rect x="60" y="35" width="8" height="24" rx="4" fill="white" transform="rotate(15, 64, 47)" />
        </g>
      </svg>
    </div>
  );
}
