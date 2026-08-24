'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
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
  Download,
  FileText, 
  ArrowLeft, 
  Folder, 
  CheckCircle2, 
  AlertCircle, 
  Code, 
  Layers, 
  Maximize2, 
  Minimize2,
  Image as ImageIcon, 
  Loader2 
} from 'lucide-react';
import type { ParsedObsidianNote } from '@/types/obsidian';
import dynamic from 'next/dynamic';

const PdfNotebookViewer = dynamic(() => import('./PdfNotebookViewer'), { ssr: false });

interface NoteViewerProps {
  note: ParsedObsidianNote | null;
  isLoading?: boolean;
  onClose?: () => void;
  onWikilinkClick?: (target: string) => void;
  onStartQuiz?: (note: ParsedObsidianNote) => void;
  onUpdateNote?: (updatedContent: string) => void;
  isDark?: boolean;
  hideTopHeader?: boolean; // For dual-pane embedding
}

export default function NoteViewer({
  note,
  isLoading = false,
  onClose,
  onWikilinkClick,
  onStartQuiz,
  onUpdateNote,
  isDark = true,
  hideTopHeader = false
}: NoteViewerProps) {
  const [showOutline, setShowOutline] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCodeBlockIdx, setCopiedCodeBlockIdx] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchContent, setScratchContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const [pdfViewMode, setPdfViewMode] = useState<'pdf' | 'reader'>('pdf');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    setEditContent(note?.bodyContent || '');
    setIsEditing(false);
    setPdfViewMode('pdf');
    setIsPdfFullscreen(false);
    
    if (note) {
      setScratchContent(localStorage.getItem(`scratch_${note.id}`) || '');
    }
  }, [note?.id, note?.bodyContent]);

  const handleScratchChange = (val: string) => {
    setScratchContent(val);
    if (note) localStorage.setItem(`scratch_${note.id}`, val);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data, error } = await supabase.storage.from('media').upload(fileName, file);

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
      
      const markdownImage = `\n![${file.name}](${publicUrl})\n`;
      setEditContent(prev => prev + markdownImage);
      if (onUpdateNote) onUpdateNote(editContent + markdownImage);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please check your connection.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  const copyDocumentUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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

      if (line.trim().startsWith('```')) {
        flushList();
        if (inCodeBlock) {
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
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

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

      if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
        flushList();
        elements.push(
          <hr key={`hr-${i}`} className={`my-5 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'}`} />
        );
        continue;
      }

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

      const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        inList = true;
        listBuffer.push(listMatch[3]);
        continue;
      } else {
        flushList();
      }

      if (!line.trim()) continue;

      elements.push(
        <p key={`p-${i}`} className={`my-2 text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          {renderInlineFormattedText(line)}
        </p>
      );
    }

    flushList();
    return elements;
  };

  const renderInlineFormattedText = (text: string) => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const wikiMatch = remaining.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      const codeMatch = remaining.match(/`([^`]+)`/);
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const tagMatch = remaining.match(/(?:^|[\s,;:(])#([a-zA-Z0-9_\-\u0600-\u06FF]+)/);

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
          <code key={`code-${keyIdx++}`} className="px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] sm:text-xs bg-slate-800 text-purple-300 border border-slate-700/80">
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
          <span key={`tag-${keyIdx++}`} className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded-md font-medium text-[10px] sm:text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
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

  const pdfUrl = note.frontmatter?.pdf_url;

  return (
    <div className="flex flex-col h-full w-full relative font-sans" data-spatial-container="study-viewer">
      {/* Top Floating Action Bar */}
      {!hideTopHeader && (
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

            {/* Edit / Save Action */}
            {onUpdateNote && !pdfUrl && (
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    onUpdateNote(editContent);
                    setIsEditing(false);
                  } else {
                    setIsEditing(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  isEditing 
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-md shadow-green-600/30' 
                    : isDark 
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isEditing ? <Check size={14} /> : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>}
                <span>{isEditing ? 'Save Note' : 'Edit Note'}</span>
              </button>
            )}

            {/* Scratchpad Toggle */}
            <button
              type="button"
              onClick={() => setShowScratchpad(!showScratchpad)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                showScratchpad 
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' 
                  : isDark 
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
              <span className="hidden sm:inline">Scratchpad</span>
            </button>

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
      )}

      {/* Note Header Info: Title & Frontmatter Badges */}
      {!hideTopHeader && (
        <div className={`p-5 rounded-3xl mb-5 border shadow-sm ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 mb-3">
            {note.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'
            }`}>
              <Clock size={12} className="text-purple-400" />
              {note.wordCount} words (~{readingTime} min read)
            </span>

            {pdfUrl && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                <FileText size={12} />
                PDF Document
              </span>
            )}

            {note.frontmatter?.status && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-semibold bg-green-500/15 text-green-400 border border-green-500/20">
                <CheckCircle2 size={12} />
                {note.frontmatter.status}
              </span>
            )}

            {note.frontmatter?.created && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
              }`}>
                <Calendar size={12} />
                {note.frontmatter.created}
              </span>
            )}
          </div>

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
        </div>
      )}

      {/* Main Document & Outline Body */}
      <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-0">
        {/* Scratchpad Panel */}
        {showScratchpad && (
          <div className={`w-full md:w-1/3 flex-shrink-0 flex flex-col p-4 rounded-3xl border transition-all ${isDark ? 'bg-amber-950/20 border-amber-500/30 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 opacity-70">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
              Scratchpad
            </h4>
            <textarea
              dir="auto"
              placeholder="Jot down rough notes, translations, or ideas here..."
              value={scratchContent}
              onChange={(e) => handleScratchChange(e.target.value)}
              className="flex-1 w-full bg-transparent resize-none outline-none text-sm leading-relaxed custom-scrollbar"
            />
          </div>
        )}

        {/* Visual Document / Markdown Container */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden" dir="auto">
          {isEditing ? (
            <textarea
              dir="auto"
              className={`w-full min-h-[500px] h-full resize-none bg-transparent outline-none p-4 rounded-2xl border ${isDark ? 'border-slate-700 text-slate-200' : 'border-gray-300 text-gray-800'}`}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Start typing markdown..."
              spellCheck={false}
            />
          ) : pdfUrl ? (
            <div className={`flex flex-col w-full h-full space-y-3 ${isPdfFullscreen ? 'fixed inset-0 z-50 p-6 bg-slate-950/95 backdrop-blur-xl' : ''}`}>
              {/* PDF Toolbar Header */}
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border shadow-sm ${
                isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white border-gray-200 text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-purple-400 flex-shrink-0" />
                  <span className="text-xs font-bold truncate max-w-[200px] sm:max-w-xs">{note.title}</span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  {/* View Mode Toggle: Visual PDF vs Extracted Text */}
                  <button
                    type="button"
                    onClick={() => setPdfViewMode(pdfViewMode === 'pdf' ? 'reader' : 'pdf')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      pdfViewMode === 'reader'
                        ? 'bg-purple-600 text-white'
                        : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title="Toggle Reader Mode"
                  >
                    {pdfViewMode === 'pdf' ? <BookOpen size={13} /> : <FileText size={13} />}
                    <span className="hidden sm:inline">{pdfViewMode === 'pdf' ? 'Reader View' : 'PDF View'}</span>
                  </button>

                  {/* Copy Link */}
                  <button
                    type="button"
                    onClick={() => copyDocumentUrl(pdfUrl)}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title="Copy Document URL"
                  >
                    {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>

                  {/* Open in New Tab */}
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title="Open in new window"
                  >
                    <ExternalLink size={13} />
                    <span className="hidden sm:inline">New Tab</span>
                  </a>

                  {/* Direct Download */}
                  <a
                    href={pdfUrl}
                    download={note.title || 'document.pdf'}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title="Download PDF"
                  >
                    <Download size={14} />
                  </a>

                  {/* Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title={isPdfFullscreen ? "Exit Fullscreen" : "Fullscreen Viewer"}
                  >
                    {isPdfFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
              </div>

              {/* Main Visual Frame or Reader Mode */}
              {pdfViewMode === 'pdf' ? (
                <PdfNotebookViewer 
                  pdfUrl={pdfUrl} 
                  noteId={note.id} 
                  initialNotesStr={note.frontmatter?.pdf_notes} 
                  isDark={isDark} 
                />
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-200">
                  {renderMarkdownContent(editContent)}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {renderMarkdownContent(editContent)}
            </div>
          )}

          {/* Bidirectional Wikilinks Footer */}
          {note.wikilinks && note.wikilinks.length > 0 && !pdfUrl && (
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

        {/* Outline Table of Contents Drawer */}
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
