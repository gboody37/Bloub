'use client';

import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { ParsedObsidianNote } from '@/types/obsidian';

interface CozyParchmentReaderProps {
  note?: ParsedObsidianNote | null;
  onOpenVault?: () => void;
  isMatcha?: boolean;
}

export default function CozyParchmentReader({
  note,
  onOpenVault,
  isMatcha = false,
}: CozyParchmentReaderProps) {
  return (
    <div className={`relative flex flex-col h-full w-full rounded-[28px] p-6 shadow-2xl border transition-all duration-200 overflow-hidden ${
      isMatcha
        ? 'bg-[#18211c] border-[#84a98c]/20'
        : 'bg-[#181412] border-[#29221d]'
    }`}>
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 mb-1">
        <h3 className="text-base font-bold text-[#f5efe6] tracking-tight font-sans">
          Study Session
        </h3>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenVault}
            className="text-stone-500 hover:text-stone-300 p-1 rounded-md transition-colors"
            title="Options / Open Vault"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cozy Parchment Sheet */}
      <div className="relative flex-1 overflow-y-auto rounded-2xl bg-[#faf3e1] p-6 text-stone-900 shadow-lg select-text border border-[#ded2bd] custom-scrollbar">
        {/* Top bar inside parchment: Title & amber tag */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-300/60">
          <div className="flex items-center gap-2">
            <span className="font-bold font-sans text-base text-stone-900 tracking-tight">
              {note?.title || 'Chapter 4: Optics & Quantum Waves'}
            </span>
          </div>
          <button 
            type="button" 
            onClick={onOpenVault} 
            className="px-2.5 py-1 rounded-full bg-[#f2a85a] hover:bg-[#e09340] text-[10px] font-bold text-stone-950 transition-colors"
            title="Browse notes and books"
          >
            {note ? 'Change Book' : 'Study Notes'}
          </button>
        </div>

        {note ? (
          /* Dynamic Active Note View */
          <div className="space-y-4 font-serif text-xs leading-relaxed text-stone-800">
            {note.frontmatter?.tags && note.frontmatter.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 font-sans mb-3">
                {note.frontmatter.tags.map((t: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-950 text-[10px] font-semibold">
                    #{t}
                  </span>
                ))}
              </div>
            )}
            <div className="whitespace-pre-wrap font-sans text-xs text-stone-800 leading-relaxed">
              {note.bodyContent || note.rawContent}
            </div>
          </div>
        ) : (
          /* Real Tawjihi Physics Study Chapter with Highlights */
          <div className="space-y-4 font-serif text-xs leading-relaxed text-stone-800">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h5 className="font-bold text-xs text-stone-900 font-sans uppercase tracking-wider text-[11px]">
                  Wave-Particle Duality
                </h5>
                <span className="text-[10px] font-sans font-medium text-stone-500">Tawjihi 2024</span>
              </div>
              <div className="space-y-1.5">
                <p>
                  <mark className="bg-[#f29881]/70 text-stone-950 px-1 py-0.5 rounded font-serif">
                    Light exhibits both wave and particulate aspects. When radiation interacts
                  </mark>{' '}
                  with matter on microscopic atomic scales.
                </p>
                <p>
                  <mark className="bg-[#f5be53]/70 text-stone-950 px-1 py-0.5 rounded font-serif">
                    it behaves as discrete localized packets of energy termed photons
                  </mark>
                  , each possessing an energy proportional to its oscillatory frequency.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <h5 className="font-bold text-xs text-stone-900 mb-1 font-sans uppercase tracking-wider text-[11px]">
                Photoelectric Quantization
              </h5>
              <div className="space-y-1.5">
                <p>
                  In classical electromagnetism, James Clerk Maxwell’s electrodynamics{' '}
                  <mark className="bg-[#f29881]/70 text-stone-950 px-1 py-0.5 rounded font-serif">
                    posited continuous spherical wave propagation.
                  </mark>
                </p>
                <p>
                  <mark className="bg-[#f5be53]/70 text-stone-950 px-1 py-0.5 rounded font-serif">
                    However, Heinrich Hertz’s experimental observation
                  </mark>{' '}
                  of the photoelectric effect (1887) contradicted classical wave theory.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <h5 className="font-bold text-xs text-stone-900 mb-1 font-sans uppercase tracking-wider text-[11px]">
                Einstein Photoelectric Law
              </h5>
              <div className="space-y-1.5">
                <p>
                  <mark className="bg-[#f29881]/70 text-stone-950 px-1 py-0.5 rounded font-serif">
                    Albert Einstein formalized the photoelectric equation in 1905:
                  </mark>
                </p>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 font-mono text-center text-xs font-bold text-amber-950 my-1">
                  E_k(max) = hν - Φ
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-700 font-sans">
                  <li>Threshold cutoff frequency ν₀ determines immediate photoelectron emission.</li>
                  <li>Material work function Φ represents minimum required binding energy.</li>
                  <li>Kinetic energy varies linearly with incident radiation frequency.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
