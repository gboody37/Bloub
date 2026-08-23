'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Sparkles, 
  Tag, 
  Calendar, 
  Clock, 
  ListTree, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  ArrowLeft, 
  Folder, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Code,
  Layers,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { ParsedObsidianNote, ObsidianHeading, ObsidianWikilink } from '@/types/obsidian';

interface NoteViewerProps {
  note: ParsedObsidianNote | null;
  isLoading?: boolean;
  onClose?: () => void;
  onWikilinkClick?: (target: string) => void;
  onStartQuiz?: (note: ParsedObsidianNote) => void;
  isDark?: boolean;
}

export default function NoteViewer({
  note,
  isLoading = false,
  onClose,
  onWikilinkClick,
  onStartQuiz,
  isDark = true
}: NoteViewerProps) {
  const [showOutline, setShowOutline] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCodeBlockIdx, setCopiedCodeBlockIdx] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const copyMarkdown = async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(note.bodyContent || note.rawContent || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const copyCode = async (codeStr: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(codeStr);
      setCopiedCodeBlockIdx(idx);
      setTimeout(() => setCopiedCodeBlockIdx(null), 2000);
    } catch {
      // ignore
    }
  };

  const scrollToHeading = (slug: string) => {
    const el = document.getElementById(slug);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Estimate reading time in minutes
  const readingTime = useMemo(() => {
    if (!note || !note.wordCount) return 1;
    return Math.max(1, Math.ceil(note.wordCount / 200));
  }, [note]);

  // Clean Markdown Renderer helper
  const renderMarkdownContent = (markdownText: string) => {
    if (!markdownText) return null;

    const lines = markdownText.split(/\r?\n/);
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];
    let codeBlockCount = 0;
    let listBuffer: string[] = [];
    let inList = false;

    const flushList = () => {
      if (inList && listBuffer.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-3 space-y-1.5 list-disc list-inside pl-2 text-sm leading-relaxed">
            {listBuffer.map((item, idx) => (
              <li key={idx} className={isDark ? 'text-slate-200' : 'text-gray-800'}>
                {renderInlineFormattedText(item)}
              </li>
            ))}
          </ul>
        );
        listBuffer = [];
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block Boundary
      if (line.trim().startsWith('```')) {
        flushList();
        if (inCodeBlock) {
          // Closing code block
          const blockCode = codeBuffer.join('\n');
          const blockIdx = codeBlockCount++;
          const lang = codeLanguage;
          elements.push(
            <div key={`code-${blockIdx}`} className="my-4 rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950/80 shadow-lg">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 uppercase font-bold text-purple-400">
                  <Code size={12} /> {lang || 'text'}
                </span>
                <button
                  type="button"
                  onClick={() => copyCode(blockCode, blockIdx)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {copiedCodeBlockIdx === blockIdx ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  <span>{copiedCodeBlockIdx === blockIdx ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto custom-scrollbar">
                <code>{blockCode}</code>
              </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
          codeLanguage = '';
        } else {
          // Opening code block
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Headings (H1 to H6)
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushList();
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const slug = text
          .toLowerCase()
          .replace(/[^\w\s\u0600-\u06FF-]/g, '')
          .replace(/\s+/g, '-');

        const headingClasses = {
          1: 'text-2xl sm:text-3xl font-extrabold mt-6 mb-3 tracking-tight text-purple-400 dark:text-purple-300 border-b border-purple-500/20 pb-2',
          2: 'text-xl sm:text-2xl font-bold mt-5 mb-2.5 tracking-tight text-white dark:text-slate-100',
          3: 'text-lg sm:text-xl font-semibold mt-4 mb-2 text-purple-300 dark:text-purple-200',
          4: 'text-base sm:text-lg font-semibold mt-3.5 mb-1.5 text-slate-200',
          5: 'text-sm font-semibold mt-3 mb-1 text-slate-300',
          6: 'text-xs font-semibold mt-2.5 mb-1 text-slate-400'
        }[level] || 'text-base font-bold mt-3 mb-1';

        elements.push(
          <div key={`heading-${i}`} id={slug} className="scroll-mt-6">
            {React.createElement(
              `h${level}`,
              { className: headingClasses },
              renderInlineFormattedText(text)
            )}
          </div>
        );
        continue;
      }

      // Horizontal Rule (---, ***, ___)
      if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
        flushList();
        elements.push(
          <hr key={`hr-${i}`} className={`my-5 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'}`} />
        );
        continue;
      }

      // Callout / Blockquote (> [!NOTE] ...)
      if (line.trim().startsWith('>')) {
        flushList();
        const calloutText = line.trim().replace(/^>\s?/, '');
        const isAdmonition = calloutText.startsWith('[!');

        let admonitionType = 'NOTE';
        let bodyText = calloutText;
        if (isAdmonition) {
          const match = calloutText.match(/^\[!([A-Z]+)\]\s?(.*)$/i);
          if (match) {
            admonitionType = match[1].toUpperCase();
            bodyText = match[2];
          }
        }

        elements.push(
          <div
            key={`quote-${i}`}
            className={`my-3.5 p-4 rounded-2xl border-l-4 shadow-sm ${
              admonitionType === 'WARNING' || admonitionType === 'CAUTION'
                ? 'bg-amber-950/20 border-amber-500 text-amber-200'
                : admonitionType === 'TIP' || admonitionType === 'SUCCESS'
                  ? 'bg-emerald-950/20 border-emerald-500 text-emerald-200'
                  : 'bg-purple-950/20 border-purple-500 text-purple-200'
            }`}
          >
            {isAdmonition && (
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider mb-1">
                <AlertCircle size={14} />
                <span>{admonitionType}</span>
              </div>
            )}
            <div className="text-xs sm:text-sm leading-relaxed">
              {renderInlineFormattedText(bodyText || calloutText)}
            </div>
          </div>
        );
        continue;
      }

      // Unordered or Ordered List items (- , * , 1. )
      const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        inList = true;
        listBuffer.push(listMatch[3]);
        continue;
      } else {
        flushList();
      }

      // Empty line / paragraph break
      if (!line.trim()) {
        continue;
      }

      // Normal Paragraph
      elements.push(
        <p
          key={`p-${i}`}
          className={`my-2 text-xs sm:text-sm leading-relaxed ${
            isDark ? 'text-slate-300' : 'text-gray-700'
          }`}
        >
          {renderInlineFormattedText(line)}
        </p>
      );
    }

    flushList();
    return elements;
  };

  // Helper for inline wikilinks [[...]], bold **...**, italic *...*, inline code `...`, hashtags #tag
  const renderInlineFormattedText = (text: string) => {
    if (!text) return null;

    // Pattern to capture [[wikilinks]], `code`, **bold**, *italic*, #hashtags
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // 1. Wikilink [[Target|Alias]]
      const wikiMatch = remaining.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      // 2. Inline code `code`
      const codeMatch = remaining.match(/`([^`]+)`/);
      // 3. Bold **bold**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      // 4. Hashtag #tag
      const tagMatch = remaining.match(/(?:^|[\s,;:(])#([a-zA-Z0-9_\-\u0600-\u06FF]+)/);

      // Find the earliest match
      const matches = [
        wikiMatch ? { type: 'wiki', match: wikiMatch, index: wikiMatch.index! } : null,
        codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
        boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
        tagMatch ? { type: 'tag', match: tagMatch, index: tagMatch.index! } : null,
      ].filter(Boolean) as { type: string; match: RegExpMatchArray; index: number }[];

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      matches.sort((a, b) => a.index - b.index);
      const first = matches[0];

      // Add text before match
      if (first.index > 0) {
        parts.push(remaining.slice(0, first.index));
      }

      const matchStr = first.match[0];
      const matchLen = matchStr.length;

      if (first.type === 'wiki') {
        const target = first.match[1].trim();
        const alias = first.match[2]?.trim() || target;
        parts.push(
          <button
            key={`wiki-${keyIdx++}`}
            type="button"
            onClick={() => onWikilinkClick && onWikilinkClick(target)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 transition-all text-[11px] sm:text-xs"
            title={`Navigate to note: ${target}`}
          >
            <BookOpen size={10} className="text-purple-400 flex-shrink-0" />
            <span>{alias}</span>
          </button>
        );
      } else if (first.type === 'code') {
        parts.push(
          <code
            key={`code-${keyIdx++}`}
            className="px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] sm:text-xs bg-slate-800 text-purple-300 border border-slate-700/80"
          >
            {first.match[1]}
          </code>
        );
      } else if (first.type === 'bold') {
        parts.push(
          <strong key={`bold-${keyIdx++}`} className="font-bold text-white dark:text-slate-100">
            {first.match[1]}
          </strong>
        );
      } else if (first.type === 'tag') {
        const tagText = first.match[1];
        parts.push(
          <span
            key={`tag-${keyIdx++}`}
            className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded-md font-medium text-[10px] sm:text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20"
          >
            #{tagText}
          </span>
        );
      }

      remaining = remaining.slice(first.index + matchLen);
    }

    return parts;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400 animate-pulse">Loading note content...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className={`p-10 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center ${
        isDark ? 'border-slate-800 bg-slate-900/30 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-500'
      }`}>
        <BookOpen size={40} className="opacity-30 mb-3 text-purple-400" />
        <h3 className="text-base font-bold mb-1">Select a Note to Read</h3>
        <p className="text-xs max-w-xs opacity-75">
          Choose any note from the Explorer on the left to read its markdown content, tags, outline, and launch AI study quizzes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative font-sans" data-spatial-container="study-viewer">
      {/* Top Floating Action Bar */}
      <div className={`flex items-center justify-between pb-4 mb-4 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all active:scale-95 ${
                isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold truncate max-w-[200px] sm:max-w-xs">
            <Folder size={13} className="flex-shrink-0" />
            <span className="truncate">{note.folder || 'Vault'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Outline Toggle */}
          {note.headings && note.headings.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOutline(!showOutline)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                showOutline
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
              title="Table of contents outline"
            >
              <ListTree size={14} />
              <span className="hidden sm:inline">Outline</span>
            </button>
          )}

          {/* Copy Markdown */}
          <button
            type="button"
            onClick={copyMarkdown}
            className={`p-2 rounded-xl transition-all active:scale-95 ${
              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Copy Note Markdown"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>

          {/* Start Quiz Action */}
          {onStartQuiz && (
            <button
              type="button"
              onClick={() => onStartQuiz(note)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all active:scale-95"
            >
              <Sparkles size={14} />
              <span>AI Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* Note Header Info: Title & Frontmatter Chips */}
      <div className={`p-5 rounded-3xl mb-5 border shadow-sm ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 mb-3">
          {note.title}
        </h1>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Word Count */}
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium ${
            isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'
          }`}>
            <Clock size={12} className="text-purple-400" />
            {note.wordCount} words (~{readingTime} min read)
          </span>

          {/* Frontmatter Status */}
          {note.frontmatter?.status && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-semibold bg-green-500/15 text-green-400 border border-green-500/20">
              <CheckCircle2 size={12} />
              {note.frontmatter.status}
            </span>
          )}

          {/* Frontmatter Created Date */}
          {note.frontmatter?.created && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium ${
              isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
            }`}>
              <Calendar size={12} />
              {note.frontmatter.created}
            </span>
          )}
        </div>

        {/* Frontmatter Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-dashed border-slate-800 dark:border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Tag size={11} /> Tags:
            </span>
            {note.tags.map(t => (
              <span
                key={t}
                className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Frontmatter Aliases */}
        {note.frontmatter?.aliases && Array.isArray(note.frontmatter.aliases) && note.frontmatter.aliases.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-slate-400">
            <span className="font-semibold">Aliases:</span>
            {note.frontmatter.aliases.map((a: string) => (
              <span key={a} className="italic text-slate-300">
                "{a}"
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Body + Outline Drawer Grid */}
      <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-0">
        {/* Rendered Markdown Body */}
        <div className={`flex-1 p-6 rounded-3xl border overflow-y-auto custom-scrollbar shadow-sm ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-gray-200'
        }`}>
          {renderMarkdownContent(note.bodyContent)}

          {/* Bidirectional Wikilinks Footer Section */}
          {note.wikilinks && note.wikilinks.length > 0 && (
            <div className="mt-8 pt-5 border-t border-dashed border-purple-500/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1.5">
                <Layers size={13} /> Connected Knowledge Nodes ({note.wikilinks.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {note.wikilinks.map((link, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onWikilinkClick && onWikilinkClick(link.target)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all active:scale-95"
                  >
                    <BookOpen size={12} className="text-purple-400" />
                    <span>{link.alias || link.target}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Outline Table of Contents Pane */}
        <AnimatePresence>
          {showOutline && note.headings && note.headings.length > 0 && (
            <motion.aside
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 240 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className={`p-4 rounded-3xl border overflow-y-auto custom-scrollbar flex-shrink-0 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                  <ListTree size={13} /> Outline (H1-H6)
                </h4>
                <button
                  type="button"
                  onClick={() => setShowOutline(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <nav className="space-y-1.5">
                {note.headings.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToHeading(h.slug)}
                    style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
                    className={`w-full text-left py-1 text-xs rounded-lg transition-colors truncate block ${
                      h.level === 1
                        ? 'font-bold text-purple-300 hover:text-white hover:bg-purple-500/20'
                        : isDark
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
