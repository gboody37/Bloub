'use client';

import React, { useEffect, useRef, useCallback, useId, useState } from 'react';
import { BotEngine } from '@/lib/bot/engine';
import { DEMI_VIEWBOX, RAYON } from '@/lib/bot/repere';
import { SHAPE_BY_ID, COLOR_BY_ID } from '@/lib/bot/skins';
import { EXPRESSION_BY_ID } from '@/lib/bot/expressions';
import { defaultCycle } from '@/lib/bot/cycles';
import { STATE_BY_ID, type StateId } from '@/lib/bot/states';
import type { ExpressionId } from '@/lib/bot/expressions';

export interface BloubMascotProps {
  size?: number;
  state?: StateId;
  color?: string;
  shape?: string;
  expression?: ExpressionId;
  gaze?: { yaw: number; pitch: number; roll?: number } | string;
  onInteract?: () => void;
  isStatic?: boolean;
}

export type Props = BloubMascotProps;

export const GAZE_PRESETS: Record<string, { yaw: number; pitch: number; roll: number }> = {
  center: { yaw: 0, pitch: 0, roll: 0 },
  left: { yaw: -28, pitch: 0, roll: 0 },
  right: { yaw: 28, pitch: 0, roll: 0 },
  up: { yaw: 0, pitch: 24, roll: 0 },
  down: { yaw: 0, pitch: -24, roll: 0 },
};

export function resolveGaze(g?: { yaw: number; pitch: number; roll?: number } | string | null): { yaw: number; pitch: number; roll: number } | null {
  if (!g) return null;
  if (typeof g === 'object') {
    return { yaw: g.yaw ?? 0, pitch: g.pitch ?? 0, roll: g.roll ?? 0 };
  }
  return GAZE_PRESETS[g] ?? null;
}

export const BloubMascot = React.memo(function BloubMascot({
  size = 160,
  state = 'idle',
  color = 'encre',
  shape = 'squircle',
  expression = 'neutre',
  gaze,
  onInteract,
  isStatic = false,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const maskId = `bot-mask-${uid}`;
  const VB = DEMI_VIEWBOX;
  const R = RAYON;
  const ink = COLOR_BY_ID.get(color)?.hex ?? (color.startsWith('#') ? color : '#0a0a0c');
  const isBaseBodyActive = STATE_BY_ID.get(state)?.baseBody ?? true;

  const svgRef = useRef<SVGSVGElement>(null);
  const engineRef = useRef<BotEngine | null>(null);
  const rafRef = useRef<number>(0);
  const clockRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const stateRef = useRef(state);
  const gazeRef = useRef(gaze);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    gazeRef.current = gaze;
  }, [gaze]);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  // Visibility Observer
  useEffect(() => {
    if (!svgRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
      if (entry.isIntersecting) {
        lastRef.current = 0; // Reset delta time to prevent physics explosions on wake
      }
    });
    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, []);

  // One-time init
  useEffect(() => {
    const shapeRadii = SHAPE_BY_ID.get(shape)?.radii ?? null;
    const expr = EXPRESSION_BY_ID.get(expression) ?? null;
    engineRef.current = new BotEngine(R, 'idle', shapeRadii, expr);
  }, []); // eslint-disable-line

  // React to `state` prop
  useEffect(() => {
    stateRef.current = state;
    if (engineRef.current) {
      engineRef.current.setState(state, clockRef.current);
      if (state === 'orbit') {
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
        animTimerRef.current = setTimeout(() => {
          if (engineRef.current && engineRef.current.state === 'orbit') {
            engineRef.current.setState('idle', clockRef.current);
            stateRef.current = 'idle';
          }
        }, 3400);
      }
    }
  }, [state]);

  // React to `expression` prop
  useEffect(() => {
    if (engineRef.current) {
      const expr = EXPRESSION_BY_ID.get(expression) ?? null;
      engineRef.current.setExpression(expr, clockRef.current, isStatic);
    }
  }, [expression, isStatic]);

  // React to `shape` prop
  useEffect(() => {
    if (engineRef.current) {
      const shapeRadii = SHAPE_BY_ID.get(shape)?.radii ?? null;
      engineRef.current.setShape(shapeRadii, clockRef.current, isStatic);
    }
  }, [shape, isStatic]);

  // Animation loop
  useEffect(() => {
    if (!isVisible) return;
    
    const tick = (ts: number) => {
      if (lastRef.current === 0) lastRef.current = ts;
      const dt = Math.min((ts - lastRef.current) / 1000, 0.1);
      lastRef.current = ts;
      clockRef.current += dt;
      const now = clockRef.current;

      if (!engineRef.current || !svgRef.current) {
        if (!isStatic) rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const frame = engineRef.current.sample(now);
      const svg = svgRef.current;

      // Body
      svg.querySelector('[data-body]')?.setAttribute('d', frame.bodyPath);
      svg.querySelector('[data-body]')?.setAttribute('fill', ink);
      svg.querySelector('[data-body]')?.setAttribute('opacity', String(frame.bodyAlpha));
      svg.querySelector('[data-mask-body]')?.setAttribute('d', frame.bodyPath);

      // Eyes (inside mask — they create holes)
      const maskEyes = svg.querySelector('[data-mask-eyes]');
      if (maskEyes) {
        maskEyes.innerHTML = '';
        for (const eye of frame.eyes) {
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          p.setAttribute('d', eye.d);
          p.setAttribute('transform', eye.matrix);
          p.setAttribute('opacity', String(eye.alpha));
          p.setAttribute('fill', '#000');
          maskEyes.appendChild(p);
        }
      }

      // Dots (behind body)
      const dotsBehind = svg.querySelector('[data-dots-behind]');
      const dotsAbove = svg.querySelector('[data-dots-above]');
      if (dotsBehind) dotsBehind.innerHTML = '';
      if (dotsAbove) dotsAbove.innerHTML = '';
      for (const dot of frame.dots) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(dot.x));
        circle.setAttribute('cy', String(dot.y));
        circle.setAttribute('r', String(dot.r));
        circle.setAttribute('opacity', String(dot.opacity));
        const dotColor = dot.color ?? ink;
        circle.setAttribute('fill', dotColor);
        const target = frame.dotsBehind ? dotsBehind : dotsAbove;
        target?.appendChild(circle);
      }

      // Arcs
      const arcs = svg.querySelector('[data-arcs]');
      if (arcs) {
        arcs.innerHTML = '';
        for (const arc of frame.arcs) {
          // Back portion (goes behind body, drawn before body)
          if (arc.back) {
            const pb = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pb.setAttribute('d', arc.back);
            pb.setAttribute('stroke', ink);
            pb.setAttribute('stroke-width', String(arc.width));
            pb.setAttribute('opacity', String(arc.opacity * 0.4));
            pb.setAttribute('fill', 'none');
            pb.setAttribute('stroke-linecap', 'round');
            arcs.appendChild(pb);
          }
          // Front portion
          if (arc.front) {
            const pf = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pf.setAttribute('d', arc.front);
            pf.setAttribute('stroke', ink);
            pf.setAttribute('stroke-width', String(arc.width));
            pf.setAttribute('opacity', String(arc.opacity));
            pf.setAttribute('fill', 'none');
            pf.setAttribute('stroke-linecap', 'round');
            arcs.appendChild(pf);
          }
        }
      }

      // Notification dot
      const notifEl = svg.querySelector('[data-notif]') as SVGCircleElement | null;
      if (notifEl) {
        if (frame.notif) {
          notifEl.setAttribute('cx', String(frame.notif.x));
          notifEl.setAttribute('cy', String(frame.notif.y));
          notifEl.setAttribute('r', String(frame.notif.r));
          notifEl.style.display = '';
        } else {
          notifEl.style.display = 'none';
        }
      }

      if (!isStatic) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    if (isStatic) {
      tick(performance.now());
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, shape, expression, isVisible, isStatic]);

  // Pointer follow (window-wide)
  useEffect(() => {
    if (isStatic) return;

    const handleMove = (e: PointerEvent) => {
      if (!engineRef.current) return;
      const hw = window.innerWidth / 2;
      const hh = window.innerHeight / 2;
      const yaw = ((e.clientX - hw) / hw) * 35;
      const pitch = -((e.clientY - hh) / hh) * 22;
      engineRef.current.setLook(
        { yaw, pitch, mix: 0.5, spin: 0, wander: 0.1 },
        clockRef.current,
        0.25
      );
    };

    const handleLeave = () => {
      engineRef.current?.setLook(null, clockRef.current, 0.6);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerdown', handleMove);
    window.addEventListener('pointerleave', handleLeave);
    window.addEventListener('pointercancel', handleLeave);
    
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerdown', handleMove);
      window.removeEventListener('pointerleave', handleLeave);
      window.removeEventListener('pointercancel', handleLeave);
    };
  }, [isStatic]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onInteract?.();
    if (engineRef.current) {
      engineRef.current.setState('orbit', clockRef.current);
      stateRef.current = 'idle';

      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => {
        if (engineRef.current && engineRef.current.state === 'orbit') {
          engineRef.current.setState('idle', clockRef.current);
          stateRef.current = 'idle';
          const target = resolveGaze(gazeRef.current);
          if (target) {
            engineRef.current.setLook(
              { yaw: target.yaw, pitch: target.pitch, mix: 0.7, spin: 0, wander: 0.15 },
              clockRef.current,
              0.3
            );
          }
        }
      }, 3600);
    }
  }, [onInteract]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
      onClick={handleClick}
      style={{ cursor: 'pointer', overflow: 'visible' }}
      role="img"
      aria-label="Mascot"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-VB} y={-VB} width={VB * 2} height={VB * 2}>
          {/* White body shape — fills the mask */}
          <path data-mask-body="" fill="#fff" />
          {/* Black eye holes — cut through the body */}
          <g data-mask-eyes="" />
        </mask>
      </defs>

      {/* Dots rendered BEHIND body */}
      <g data-dots-behind="" />

      {/* Body with eye holes punched via mask */}
      <path data-body="" mask={`url(#${maskId})`} />

      {/* Cheese holes rendered on top of the body so they look indented, not like eyes */}
      {shape === 'fromage' && isBaseBodyActive && (
        <g fill="#000" opacity="0.14" style={{ pointerEvents: 'none' }}>
          <circle cx="-35" cy="-25" r="10" />
          <circle cx="45" cy="20" r="8" />
          <circle cx="-15" cy="40" r="7" />
          <circle cx="30" cy="-35" r="11" />
        </g>
      )}

      {/* Sprout leaf on top left */}
      {shape === 'fromage' && isBaseBodyActive && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Stem - brown color from the design palette, placed as a prominent topper */}
          <path d="M -10,-53 Q -15,-80 -5,-95" stroke="#8b5e3c" strokeWidth="6" fill="none" strokeLinecap="round" />
          {/* Two-tone leaf sprout (much larger topper) */}
          <path d="M -5,-95 C -25,-105 -20,-125 10,-115 Z" fill="#15803d" />
          <path d="M -5,-95 C 5,-85 20,-95 10,-115 Z" fill="#4ade80" />
        </g>
      )}

      {/* Book bookmark ribbon */}
      {shape === 'livre' && isBaseBodyActive && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Bookmark Ribbon hanging from bottom center */}
          <path d="M -5,40 L -8,68 L 4,65 L 2,40 Z" fill="#ef4444" />
        </g>
      )}

      {/* Arcs (rings, comet trails, swoosh) */}
      <g data-arcs="" />

      {/* Dots rendered ABOVE body */}
      <g data-dots-above="" />

      {/* Notification dot */}
      <circle data-notif="" fill="#2496e8" style={{ display: 'none' }} />
    </svg>
  );
});

export default BloubMascot;
