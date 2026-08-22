'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';

export default function Mascot({ mood }: { mood: 'idle' | 'happy' | 'sad' | 'thinking' }) {
  const eyesRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    anime.remove(eyesRef.current);
    anime.remove(bodyRef.current);

    if (mood === 'idle') {
      anime({
        targets: bodyRef.current,
        translateY: [0, -10, 0],
        duration: 2000,
        loop: true,
        easing: 'easeInOutSine'
      });
      // Blink
      anime({
        targets: eyesRef.current,
        scaleY: [1, 0.1, 1],
        duration: 200,
        delay: 3000,
        loop: true,
        easing: 'easeInOutQuad'
      });
    } else if (mood === 'happy') {
      anime({
        targets: bodyRef.current,
        scaleY: [1, 1.2, 0.9, 1],
        scaleX: [1, 0.9, 1.1, 1],
        translateY: [0, -30, 0],
        duration: 1000,
        easing: 'easeOutElastic(1, .5)'
      });
      anime({
        targets: eyesRef.current,
        scaleY: [1, 0.2, 1],
        translateY: [0, -5, 0],
        duration: 400,
        easing: 'easeInOutQuad'
      });
    } else if (mood === 'sad') {
      anime({
        targets: bodyRef.current,
        scaleY: 0.85,
        scaleX: 1.15,
        translateY: 10,
        duration: 1000,
        easing: 'easeOutQuad'
      });
      anime({
        targets: eyesRef.current,
        translateY: 5,
        duration: 500,
        easing: 'easeOutQuad'
      });
    } else if (mood === 'thinking') {
      anime({
        targets: bodyRef.current,
        rotate: [0, 10, -5, 0],
        duration: 2000,
        loop: true,
        easing: 'easeInOutSine'
      });
      anime({
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
        <path
          ref={bodyRef}
          d="M50 5 C20 5 5 25 5 50 C5 75 25 95 50 95 C75 95 95 75 95 50 C95 25 80 5 50 5 Z"
          fill="#6366f1"
          style={{ transformOrigin: '50px 50px' }}
        />
        <g ref={eyesRef} style={{ transformOrigin: '50px 45px' }}>
          <ellipse cx="35" cy="45" rx="6" ry="12" fill="white" />
          <ellipse cx="65" cy="45" rx="6" ry="12" fill="white" />
        </g>
      </svg>
    </div>
  );
}
