'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  GripVertical,
  Check,
  Copy,
  Code,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
  Trash2,
  ChevronDown
} from 'lucide-react';
import type { Block, BlockType, CalloutType } from './types';

interface BlockItemProps {
  block: Block;
  index: number;
  listNumber?: number;
  isFocused: boolean;
  isDark?: boolean;
  onUpdate: (blockId: string, updates: Partial<Block>) => void;
  onEnter: (blockId: string, leftText: string, rightText: string, preserveType?: boolean) => void;
  onBackspace: (blockId: string, cursorPosition: number, currentText: string) => void;
  onIndent: (blockId: string, delta: number) => void;
  onFocusPrevious: (blockId: string) => void;
  onFocusNext: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onSlashTrigger: (blockId: string, query: string, coords: { top: number; left: number }, triggerIndex: number) => void;
  onSlashDismiss: () => void;
  onRegisterRef: (blockId: string, el: HTMLElement | null) => void;
}

const CALLOUT_ICONS: Record<CalloutType, React.ReactNode> = {
  note: <Info size={14} className="text-purple-400" />,
  tip: <Sparkles size={14} className="text-emerald-400" />,
  warning: <AlertTriangle size={14} className="text-amber-400" />,
  caution: <AlertCircle size={14} className="text-rose-400" />,
  success: <CheckCircle2 size={14} className="text-emerald-400" />
};

const CODE_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'sql',
  'json',
  'markdown',
  'html',
  'css',
  'bash',
  'rust',
  'cpp',
  'go',
  'text'
];

export default function BlockItem({
  block,
  index,
  listNumber = 1,
  isFocused,
  isDark = true,
  onUpdate,
  onEnter,
  onBackspace,
  onIndent,
  onFocusPrevious,
  onFocusNext,
  onDelete,
  onSlashTrigger,
  onSlashDismiss,
  onRegisterRef
}: BlockItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCalloutPicker, setShowCalloutPicker] = useState(false);

  // Register ref with parent
  useEffect(() => {
    onRegisterRef(block.id, textareaRef.current || containerRef.current);
    return () => {
      onRegisterRef(block.id, null);
    };
  }, [block.id, onRegisterRef]);

  // Adjust textarea height on content change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [block.content, block.type]);

  // Auto-focus if requested
  useEffect(() => {
    if (isFocused && textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFocused]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(block.content || '');
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const selectionStart = e.target.selectionStart;

    // Check for inline markdown shortcuts at the beginning of the block
    if (selectionStart <= 5) {
      if (val === '# ' || val.startsWith('# ')) {
        onUpdate(block.id, { type: 'heading1', content: val.slice(2) });
        return;
      }
      if (val === '## ' || val.startsWith('## ')) {
        onUpdate(block.id, { type: 'heading2', content: val.slice(3) });
        return;
      }
      if (val === '### ' || val.startsWith('### ')) {
        onUpdate(block.id, { type: 'heading3', content: val.slice(4) });
        return;
      }
      if (val === '- ' || val === '* ') {
        onUpdate(block.id, { type: 'bullet_list', content: '' });
        return;
      }
      if (val.startsWith('- ') || val.startsWith('* ')) {
        onUpdate(block.id, { type: 'bullet_list', content: val.slice(2) });
        return;
      }
      if (val === '1. ' || /^\d+\.\s/.test(val)) {
        const rest = val.replace(/^\d+\.\s/, '');
        onUpdate(block.id, { type: 'numbered_list', content: rest });
        return;
      }
      if (val === '[] ' || val === '[ ] ') {
        onUpdate(block.id, { type: 'todo', checked: false, content: '' });
        return;
      }
      if (val.startsWith('[] ') || val.startsWith('[ ] ')) {
        onUpdate(block.id, { type: 'todo', checked: false, content: val.slice(val.indexOf('] ') + 2) });
        return;
      }
      if (val.startsWith('[x] ') || val.startsWith('[X] ')) {
        onUpdate(block.id, { type: 'todo', checked: true, content: val.slice(4) });
        return;
      }
      if (val === '> ' || val.startsWith('> ')) {
        onUpdate(block.id, { type: 'quote', content: val.slice(2) });
        return;
      }
      if (val === '```' || val.startsWith('```')) {
        const lang = val.slice(3).trim();
        onUpdate(block.id, { type: 'code_block', content: '', language: lang || 'typescript' });
        return;
      }
      if (val === '---' || val === '***') {
        onUpdate(block.id, { type: 'divider', content: '' });
        return;
      }
    }

    onUpdate(block.id, { content: val });

    // Check for Slash Command trigger '/'
    const textBeforeCursor = val.slice(0, selectionStart);
    const slashIdx = textBeforeCursor.lastIndexOf('/');

    if (slashIdx !== -1) {
      const charBeforeSlash = slashIdx > 0 ? textBeforeCursor[slashIdx - 1] : ' ';
      // Ensure slash is at line start or preceded by whitespace
      if (charBeforeSlash === ' ' || charBeforeSlash === '\n' || slashIdx === 0) {
        const query = textBeforeCursor.slice(slashIdx + 1);
        if (!query.includes(' ') && !query.includes('\n')) {
          if (textareaRef.current) {
            const rect = textareaRef.current.getBoundingClientRect();
            onSlashTrigger(
              block.id,
              query,
              {
                top: rect.bottom + window.scrollY + 4,
                left: Math.max(16, rect.left + window.scrollX)
              },
              slashIdx
            );
            return;
          }
        }
      }
    }

    onSlashDismiss();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    // Tab / Shift+Tab Indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      if (block.type === 'code_block') {
        // Insert 2 spaces
        const newVal = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
        onUpdate(block.id, { content: newVal });
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + 2;
          }
        }, 0);
        return;
      }

      if (['bullet_list', 'numbered_list', 'todo'].includes(block.type)) {
        onIndent(block.id, e.shiftKey ? -1 : 1);
        return;
      }
      return;
    }

    // Enter Key
    if (e.key === 'Enter') {
      if (block.type === 'code_block') {
        if (e.shiftKey) {
          // Break out of code block into new paragraph below
          e.preventDefault();
          onEnter(block.id, value, '', false);
        }
        // Normal enter in code block inserts newline
        return;
      }

      e.preventDefault();
      const left = value.substring(0, selectionStart);
      const right = value.substring(selectionEnd);

      const isList = ['bullet_list', 'numbered_list', 'todo'].includes(block.type);
      if (isList && !value.trim()) {
        // Empty list item: revert to paragraph
        onUpdate(block.id, { type: 'paragraph', content: '' });
        return;
      }

      onEnter(block.id, left, right, isList);
      return;
    }

    // Backspace Key
    if (e.key === 'Backspace') {
      if (selectionStart === 0 && selectionEnd === 0) {
        e.preventDefault();
        onBackspace(block.id, selectionStart, value);
        return;
      }
    }

    // Arrow Navigation between blocks
    if (e.key === 'ArrowUp') {
      if (selectionStart === 0) {
        e.preventDefault();
        onFocusPrevious(block.id);
      }
    }

    if (e.key === 'ArrowDown') {
      if (selectionStart === value.length) {
        e.preventDefault();
        onFocusNext(block.id);
      }
    }
  };

  const indentPadding = `${(block.indent || 0) * 1.5}rem`;

  return (
    <div
      ref={containerRef}
      style={{ paddingLeft: indentPadding }}
      className="group relative flex items-start gap-1.5 py-1 px-1 rounded-xl transition-colors hover:bg-purple-500/[0.03]"
      data-block-id={block.id}
      data-block-type={block.type}
    >
      {/* 6-dot Drag Handle / Action Trigger */}
      <div className="flex items-center gap-0.5 pt-1.5 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity select-none cursor-grab">
        <GripVertical size={14} className="text-slate-400" />
      </div>

      {/* Block Type UI Renderers */}
      <div className="flex-1 min-w-0" dir="auto">
        {/* 1. Divider */}
        {block.type === 'divider' ? (
          <div className="py-2.5 cursor-pointer" onClick={() => onEnter(block.id, '', '', false)}>
            <hr className={`border-t-2 ${isDark ? 'border-slate-800' : 'border-gray-200'}`} />
          </div>
        ) : block.type === 'todo' ? (
          /* 2. To-Do Item */
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={() => onUpdate(block.id, { checked: !block.checked })}
              className={`mt-1 w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                block.checked
                  ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-600/30'
                  : isDark
                    ? 'border-slate-600 bg-slate-800/60 hover:border-purple-400'
                    : 'border-gray-300 bg-white hover:border-purple-500'
              }`}
            >
              {block.checked && <Check size={11} strokeWidth={3} />}
            </button>
            <textarea
              ref={textareaRef}
              dir="auto"
              value={block.content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="To-do task..."
              rows={1}
              className={`flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed ${
                block.checked
                  ? 'line-through opacity-50 text-slate-400'
                  : isDark
                    ? 'text-slate-200'
                    : 'text-gray-800'
              }`}
            />
          </div>
        ) : block.type === 'bullet_list' ? (
          /* 3. Bullet List */
          <div className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
            <textarea
              ref={textareaRef}
              dir="auto"
              value={block.content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="List item..."
              rows={1}
              className={`flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed ${
                isDark ? 'text-slate-200' : 'text-gray-800'
              }`}
            />
          </div>
        ) : block.type === 'numbered_list' ? (
          /* 4. Numbered List */
          <div className="flex items-start gap-2">
            <span className="text-xs font-mono font-bold text-purple-400 flex-shrink-0 mt-0.5 select-none">
              {listNumber}.
            </span>
            <textarea
              ref={textareaRef}
              dir="auto"
              value={block.content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="List item..."
              rows={1}
              className={`flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed ${
                isDark ? 'text-slate-200' : 'text-gray-800'
              }`}
            />
          </div>
        ) : block.type === 'heading1' ? (
          /* 5. Heading 1 */
          <textarea
            ref={textareaRef}
            dir="auto"
            value={block.content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Heading 1"
            rows={1}
            className="w-full bg-transparent resize-none outline-none text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 py-1"
          />
        ) : block.type === 'heading2' ? (
          /* 6. Heading 2 */
          <textarea
            ref={textareaRef}
            dir="auto"
            value={block.content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Heading 2"
            rows={1}
            className={`w-full bg-transparent resize-none outline-none text-xl sm:text-2xl font-bold tracking-tight py-1 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          />
        ) : block.type === 'heading3' ? (
          /* 7. Heading 3 */
          <textarea
            ref={textareaRef}
            dir="auto"
            value={block.content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Heading 3"
            rows={1}
            className="w-full bg-transparent resize-none outline-none text-lg sm:text-xl font-semibold text-purple-300 py-0.5"
          />
        ) : block.type === 'quote' ? (
          /* 8. Quote */
          <div className="border-l-4 border-purple-500 pl-3 py-1 my-1 bg-purple-950/10 rounded-r-xl">
            <textarea
              ref={textareaRef}
              dir="auto"
              value={block.content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Empty quote..."
              rows={1}
              className={`w-full bg-transparent resize-none outline-none italic text-sm leading-relaxed ${
                isDark ? 'text-slate-200' : 'text-gray-700'
              }`}
            />
          </div>
        ) : block.type === 'callout' ? (
          /* 9. Callout / Highlight Box */
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              block.calloutType === 'warning' || block.calloutType === 'caution'
                ? 'bg-amber-950/25 border-amber-500/40 text-amber-200'
                : block.calloutType === 'tip' || block.calloutType === 'success'
                  ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200'
                  : 'bg-purple-950/25 border-purple-500/40 text-purple-200'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                {CALLOUT_ICONS[block.calloutType || 'note']}
                <span>{block.calloutType || 'note'}</span>
              </div>
              <div className="flex items-center gap-1">
                {(['note', 'tip', 'warning', 'success'] as CalloutType[]).map(ct => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => onUpdate(block.id, { calloutType: ct })}
                    className={`px-1.5 py-0.5 text-[10px] rounded uppercase font-semibold transition-all ${
                      block.calloutType === ct ? 'bg-white/20 text-white shadow-xs' : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    {ct}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              ref={textareaRef}
              dir="auto"
              value={block.content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Type callout content..."
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-xs sm:text-sm leading-relaxed"
            />
          </div>
        ) : block.type === 'code_block' ? (
          /* 10. Code Block */
          <div className="my-2 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/90 shadow-xl">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-1.5">
                <Code size={13} className="text-purple-400" />
                <select
                  value={block.language || 'typescript'}
                  onChange={e => onUpdate(block.id, { language: e.target.value })}
                  className="bg-slate-800 text-purple-300 font-semibold px-2 py-0.5 rounded-lg border border-slate-700 outline-none text-xs cursor-pointer"
                >
                  {CODE_LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
              >
                {copiedCode ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={block.content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="// Write code here..."
              rows={3}
              spellCheck={false}
              className="w-full p-3 font-mono text-xs sm:text-sm bg-transparent text-slate-200 resize-none outline-none custom-scrollbar"
            />
          </div>
        ) : (
          /* 11. Paragraph (Default) */
          <textarea
            ref={textareaRef}
            dir="auto"
            value={block.content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type '/' for commands..."
            rows={1}
            className={`w-full bg-transparent resize-none outline-none text-sm leading-relaxed placeholder:opacity-40 ${
              isDark ? 'text-slate-200' : 'text-gray-800'
            }`}
          />
        )}
      </div>

      {/* Delete Block Quick Icon */}
      <button
        type="button"
        onClick={() => onDelete(block.id)}
        className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 self-start mt-1"
        title="Delete Block"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
