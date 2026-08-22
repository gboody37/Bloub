'use client';

import { useEffect, useRef, useCallback, useId } from 'react';
import { BotEngine } from '@/lib/bot/engine';
import { DEMI_VIEWBOX, RAYON } from '@/lib/bot/repere';
import { SHAPE_BY_ID, COLOR_BY_ID } from '@/lib/bot/skins';
import { EXPRESSION_BY_ID } from '@/lib/bot/expressions';
import { defaultCycle } from '@/lib/bot/cycles';
import { STATE_BY_ID, type StateId } from '@/lib/bot/states';
import type { ExpressionId } from '@/lib/bot/expressions';

interface Props {
  size?: number;
  state?: StateId;
  color?: string;
  shape?: string;
  expression?: ExpressionId;
  onInteract?: () => void;
}

export default function BloubMascot({
  size = 160,
  state = 'idle',
  color = 'encre',
  shape = 'squircle',
  expression = 'neutre',
  onInteract,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const maskId = `bot-mask-${uid}`;
  const VB = DEMI_VIEWBOX;
  const R = RAYON;
  const ink = COLOR_BY_ID.get(color)?.hex ?? '#0a0a0c';
  const isBaseBodyActive = STATE_BY_ID.get(state)?.baseBody ?? true;

  const svgRef = useRef<SVGSVGElement>(null);
  const engineRef = useRef<BotEngine | null>(null);
  const rafRef = useRef<number>(0);
  const clockRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const stateRef = useRef(state);

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
    }
  }, [state]);

  // React to `expression` prop
  useEffect(() => {
    if (engineRef.current) {
      const expr = EXPRESSION_BY_ID.get(expression) ?? null;
      engineRef.current.setExpression(expr, clockRef.current);
    }
  }, [expression]);

  // React to `shape` prop
  useEffect(() => {
    if (engineRef.current) {
      const shapeRadii = SHAPE_BY_ID.get(shape)?.radii ?? null;
      engineRef.current.setShape(shapeRadii, clockRef.current);
    }
  }, [shape]);

  // Animation loop
  useEffect(() => {
    const tick = (ts: number) => {
      if (lastRef.current === 0) lastRef.current = ts;
      const dt = Math.min((ts - lastRef.current) / 1000, 0.1);
      lastRef.current = ts;
      clockRef.current += dt;
      const now = clockRef.current;

      if (!engineRef.current || !svgRef.current) {
        rafRef.current = requestAnimationFrame(tick);
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

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color]);

  // Pointer follow (window-wide)
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!engineRef.current) return;
      const hw = window.innerWidth / 2;
      const hh = window.innerHeight / 2;
      const yaw = ((e.clientX - hw) / hw) * 55;
      const pitch = -((e.clientY - hh) / hh) * 35;
      engineRef.current.setLook(
        { yaw, pitch, mix: 0.65, spin: 0, wander: 0 },
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
  }, []);

  const handleClick = useCallback(() => {
    onInteract?.();
    if (engineRef.current) {
      engineRef.current.setState('orbit', clockRef.current);
      stateRef.current = 'idle';
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
          {/* Stem - matches body color for seamless integration */}
          <path d="M -44,-45 Q -52,-58 -48,-68" stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Two-tone leaf sprout */}
          <path d="M -48,-68 C -58,-76 -54,-85 -42,-76 Z" fill="#15803d" />
          <path d="M -48,-68 C -42,-64 -38,-68 -42,-76 Z" fill="#4ade80" />
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
}
