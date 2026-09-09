'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Copy, Check, Bold, Italic, List, Hash, 
  Code, Sigma, Quote, Trash2, Send
} from 'lucide-react';

interface CozyStudyNotepadProps {
  isMatcha?: boolean;
  activeNoteTitle?: string;
  onSendToQuests?: (text: string) => void;
}

const DEFAULT_SCRATCHPAD = `# Photoelectric Effect Takeaways

• Light behaves as discrete packets of energy (photons: E = hf)
• Kinetic energy depends strictly on frequency, NOT intensity!
• Intensity only controls the rate/current of emitted electrons
• Threshold frequency v_0 = Phi / h represents the minimum cutoff

## Key Equation
E_k(max) = h * v - Phi
`;

const FORMULA_PRESETS = [
  {
    name: 'Photoelectric Equation',
    formula: 'E_k(max) = h\\nu - \\Phi',
    desc: 'Einstein photoelectric law (1905)',
  },
  {
    name: 'Photon Energy',
    formula: 'E = h\\nu = \\frac{hc}{\\lambda}',
    desc: 'Energy of an individual photon',
  },
  {
    name: 'Threshold Frequency',
    formula: '\\nu_0 = \\frac{\\Phi}{h}',
    desc: 'Cutoff frequency for electron emission',
  },
  {
    name: 'Stopping Potential',
    formula: 'e V_0 = E_k(max) = h\\nu - \\Phi',
    desc: 'Potential needed to halt fastest electrons',
  },
  {
    name: 'de Broglie Wavelength',
    formula: '\\lambda = \\frac{h}{p} = \\frac{h}{mv}',
    desc: 'Matter wave particle duality',
  },
  {
    name: 'Planck Constant',
    formula: 'h = 6.626 \\times 10^{-34} \\text{ J}\\cdot\\text{s}',
    desc: 'Fundamental quantum of action',
  },
];

export default function CozyStudyNotepad({
  isMatcha = false,
  activeNoteTitle,
  onSendToQuests,
}: CozyStudyNotepadProps) {
  const [activeTab, setActiveTab] = useState<'scratchpad' | 'formulas'>('scratchpad');
  const [content, setContent] = useState(DEFAULT_SCRATCHPAD);
  const [quickThought, setQuickThought] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bloub_study_notepad');
      if (saved) setContent(saved);
    } catch {}
  }, []);

  useEffect(() => {
    setIsSaved(false);
    const t = setTimeout(() => {
      try {
        localStorage.setItem('bloub_study_notepad', content);
        setIsSaved(true);
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [content]);

  const insertFormat = (prefix: string, suffix = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const next = content.substring(0, start) + replacement + content.substring(end);
    setContent(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 20);
  };

  const handleAddThought = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickThought.trim()) return;
    const appendText = `\n• ${quickThought.trim()}`;
    setContent(prev => prev + appendText);
    setQuickThought('');
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  const handleCopyFormula = (f: string) => {
    navigator.clipboard.writeText(f);
    setCopiedFormula(f);
    setTimeout(() => setCopiedFormula(null), 1500);
  };

  const handleInsertFormulaIntoNote = (f: string, name: string) => {
    const snippet = `\n\n### ${name}\n\`\`\`latex\n${f}\n\`\`\`\n`;
    setContent(prev => prev + snippet);
    setActiveTab('scratchpad');
  };

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className={`rounded-[28px] border transition-all duration-200 shadow-2xl flex flex-col h-full w-full overflow-hidden ${
      isMatcha
        ? 'bg-[#18211c] border-[#84a98c]/20'
        : 'bg-[#181412] border-[#29221d]'
    }`}>
      {/* Header */}
      <div className="p-5 pb-3 border-b border-stone-800/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#f5efe6] tracking-tight">
                Study Notepad
              </h3>
              <p className="text-[11px] text-stone-400">
                {activeNoteTitle || 'Physics Module 4'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900/80 border border-stone-800 text-[11px] font-mono text-emerald-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isSaved ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              {isSaved ? 'Saved' : 'Saving...'}
            </span>

            <button
              type="button"
              onClick={handleCopyAll}
              className="p-1.5 rounded-lg bg-stone-900/60 border border-stone-800 hover:text-white text-stone-400 transition-colors"
              title="Copy All to Clipboard"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 rounded-xl bg-[#110e0c] border border-stone-800/80 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('scratchpad')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
              activeTab === 'scratchpad'
                ? 'bg-amber-500 text-stone-950 shadow-md font-semibold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Scratchpad
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('formulas')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'formulas'
                ? 'bg-amber-500 text-stone-950 shadow-md font-semibold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <span>Formulas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'formulas' ? 'bg-stone-950/20 text-stone-950 font-bold' : 'bg-stone-800 text-stone-300'
            }`}>
              {FORMULA_PRESETS.length}
            </span>
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {activeTab === 'scratchpad' ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Formatting Toolbar */}
            <div className="px-4 py-2 bg-[#120f0d] border-b border-stone-800/60 flex items-center gap-1 overflow-x-auto select-none">
              <button
                type="button"
                onClick={() => insertFormat('**', '**')}
                className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-400 text-xs font-bold"
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormat('*', '*')}
                className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-400 text-xs italic"
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormat('### ')}
                className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-400 text-xs"
                title="Heading"
              >
                <Hash className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormat('\n• ')}
                className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-400 text-xs"
                title="Bullet list"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormat('`', '`')}
                className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-400 text-xs"
                title="Inline Code"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormat('\n> ')}
                className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-400 text-xs"
                title="Quote"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormat('$ ', ' $')}
                className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-400 text-xs"
                title="Formula"
              >
                <Sigma className="w-3.5 h-3.5" />
              </button>

              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setContent('')}
                  className="p-1.5 rounded hover:bg-rose-950/40 text-stone-500 hover:text-rose-400 text-xs"
                  title="Clear Notes"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Editor Viewport */}
            <div className="flex-1 p-4 overflow-y-auto">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write quick notes, formula derivations, key concepts..."
                className="w-full h-full bg-transparent resize-none outline-none font-mono text-xs sm:text-sm text-stone-200 placeholder:text-stone-600 leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Instant Thought Capture input */}
            <form 
              onSubmit={handleAddThought}
              className="p-3 bg-[#110e0c] border-t border-stone-800/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={quickThought}
                onChange={(e) => setQuickThought(e.target.value)}
                placeholder="Quick jot... (press Enter to append)"
                className="flex-1 bg-stone-900/60 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-600 outline-none focus:border-amber-500/50 transition-colors"
              />
              <button
                type="submit"
                disabled={!quickThought.trim()}
                className="p-1.5 rounded-xl bg-amber-500 text-stone-950 disabled:opacity-40 hover:bg-amber-400 transition-all cursor-pointer disabled:cursor-not-allowed"
                title="Append to note"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ) : (
          /* Formulas Tab */
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            <p className="text-xs text-stone-400 mb-2">
              Click <span className="text-amber-400 font-semibold">+ Insert</span> to paste formula into your active note, or copy to clipboard:
            </p>

            {FORMULA_PRESETS.map((item, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-2xl bg-[#110e0c] border border-stone-800 hover:border-amber-500/30 transition-all group flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-200">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyFormula(item.formula)}
                      className="p-1 text-stone-400 hover:text-white rounded transition-colors text-[11px]"
                      title="Copy LaTeX"
                    >
                      {copiedFormula === item.formula ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormulaIntoNote(item.formula, item.name)}
                      className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500 hover:text-stone-950 text-amber-400 font-medium text-[10px] transition-all"
                    >
                      + Insert
                    </button>
                  </div>
                </div>

                <div className="px-2.5 py-1.5 rounded-lg bg-stone-950/70 border border-stone-800/60 font-mono text-xs text-amber-400 select-all">
                  {item.formula}
                </div>

                <span className="text-[10px] text-stone-500">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-5 py-2.5 bg-[#100d0b] border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500 font-mono select-none">
        <span>{charCount} chars • {wordCount} words</span>
        <button
          type="button"
          onClick={handleCopyAll}
          className="hover:text-stone-300 transition-colors flex items-center gap-1"
        >
          <span>Quick Copy</span>
        </button>
      </div>
    </div>
  );
}