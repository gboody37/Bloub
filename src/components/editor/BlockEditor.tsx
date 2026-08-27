'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Undo2,
  Redo2,
  Plus,
  FileText,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';
import type { Block, BlockEditorDocument, BlockType, SlashCommandItem, SlashMenuState } from './types';
import { markdownToBlocks, blocksToMarkdown, generateBlockId } from './serializer';
import SlashCommandMenu, { filterSlashCommands } from './SlashCommandMenu';
import BlockItem from './BlockItem';

interface BlockEditorProps {
  initialMarkdown?: string;
  isDark?: boolean;
  onChange?: (markdown: string) => void;
  onSave?: (markdown: string) => void;
  autoSaveDelay?: number; // ms, default 500
}

export default function BlockEditor({
  initialMarkdown = '',
  isDark = true,
  onChange,
  onSave,
  autoSaveDelay = 500
}: BlockEditorProps) {
  // Document state
  const [doc, setDoc] = useState<BlockEditorDocument>(() => markdownToBlocks(initialMarkdown));
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(() => doc.blocks[0]?.id || null);

  // Undo / Redo history
  const [history, setHistory] = useState<BlockEditorDocument[]>([markdownToBlocks(initialMarkdown)]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // Slash Command Menu state
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    isOpen: false,
    blockId: null,
    query: '',
    selectedIndex: 0,
    triggerPosition: 0,
    menuCoords: { top: 0, left: 0 }
  });

  const blockRefs = useRef<Record<string, HTMLElement | null>>({});
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInternalChangeRef = useRef(false);

  // Register element ref
  const handleRegisterRef = useCallback((blockId: string, el: HTMLElement | null) => {
    if (el) {
      blockRefs.current[blockId] = el;
    } else {
      delete blockRefs.current[blockId];
    }
  }, []);

  // Synchronize initialMarkdown if external note changes
  useEffect(() => {
    if (!isInternalChangeRef.current) {
      const parsed = markdownToBlocks(initialMarkdown);
      setDoc(parsed);
      setHistory([parsed]);
      setHistoryIdx(0);
      setFocusedBlockId(parsed.blocks[0]?.id || null);
    }
    isInternalChangeRef.current = false;
  }, [initialMarkdown]);

  // Debounced auto-save & onChange notification
  const notifyChanges = useCallback((newDoc: BlockEditorDocument) => {
    isInternalChangeRef.current = true;
    const md = blocksToMarkdown(newDoc);
    if (onChange) {
      onChange(md);
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (onSave) {
        onSave(md);
      }
    }, autoSaveDelay);
  }, [onChange, onSave, autoSaveDelay]);

  // Update doc and push to undo history
  const updateDocument = useCallback((updater: (prevDoc: BlockEditorDocument) => BlockEditorDocument) => {
    setDoc(prev => {
      const nextDoc = updater(prev);
      notifyChanges(nextDoc);

      setHistory(h => {
        const sliced = h.slice(0, historyIdx + 1);
        return [...sliced, nextDoc].slice(-50); // limit 50 steps
      });
      setHistoryIdx(prevIdx => Math.min(prevIdx + 1, 49));

      return nextDoc;
    });
  }, [historyIdx, notifyChanges]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      const nextIdx = historyIdx - 1;
      const targetDoc = history[nextIdx];
      setHistoryIdx(nextIdx);
      setDoc(targetDoc);
      notifyChanges(targetDoc);
    }
  }, [historyIdx, history, notifyChanges]);

  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      const targetDoc = history[nextIdx];
      setHistoryIdx(nextIdx);
      setDoc(targetDoc);
      notifyChanges(targetDoc);
    }
  }, [historyIdx, history, notifyChanges]);

  // Keyboard trap for Slash Menu navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!slashMenu.isOpen) return;

      const filtered = filterSlashCommands(slashMenu.query);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashMenu(prev => ({
          ...prev,
          selectedIndex: filtered.length > 0 ? (prev.selectedIndex + 1) % filtered.length : 0
        }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashMenu(prev => ({
          ...prev,
          selectedIndex: filtered.length > 0 ? (prev.selectedIndex - 1 + filtered.length) % filtered.length : 0
        }));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filtered.length > 0) {
          e.preventDefault();
          const selected = filtered[slashMenu.selectedIndex] || filtered[0];
          handleSelectSlashCommand(selected);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenu(prev => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [slashMenu]);

  // Execute Slash Command
  const handleSelectSlashCommand = useCallback((item: SlashCommandItem) => {
    if (!slashMenu.blockId) return;

    const targetId = slashMenu.blockId;
    updateDocument(prevDoc => {
      const blockIdx = prevDoc.blocks.findIndex(b => b.id === targetId);
      if (blockIdx === -1) return prevDoc;

      const currentBlock = prevDoc.blocks[blockIdx];
      // Strip trigger slash and query from content
      let newContent = currentBlock.content;
      if (slashMenu.triggerPosition >= 0) {
        newContent = currentBlock.content.slice(0, slashMenu.triggerPosition).trimEnd();
      }

      const updatedBlock: Block = {
        ...currentBlock,
        type: item.blockType,
        content: newContent,
        ...(item.defaultData || {})
      };

      const newBlocks = [...prevDoc.blocks];
      newBlocks[blockIdx] = updatedBlock;

      return { ...prevDoc, blocks: newBlocks };
    });

    setSlashMenu(prev => ({ ...prev, isOpen: false }));
    setFocusedBlockId(targetId);

    // Focus target element
    setTimeout(() => {
      const el = blockRefs.current[targetId];
      if (el && 'focus' in el) {
        (el as HTMLElement).focus();
      }
    }, 50);
  }, [slashMenu, updateDocument]);

  // Slash Trigger from BlockItem
  const handleSlashTrigger = useCallback((
    blockId: string,
    query: string,
    coords: { top: number; left: number },
    triggerIndex: number
  ) => {
    setSlashMenu({
      isOpen: true,
      blockId,
      query,
      selectedIndex: 0,
      triggerPosition: triggerIndex,
      menuCoords: coords
    });
  }, []);

  const handleSlashDismiss = useCallback(() => {
    setSlashMenu(prev => (prev.isOpen ? { ...prev, isOpen: false } : prev));
  }, []);

  // Block Updates
  const handleUpdateBlock = useCallback((blockId: string, updates: Partial<Block>) => {
    updateDocument(prevDoc => {
      const newBlocks = prevDoc.blocks.map(b => {
        if (b.id === blockId) {
          return { ...b, ...updates };
        }
        return b;
      });
      return { ...prevDoc, blocks: newBlocks };
    });
  }, [updateDocument]);

  // Block Enter Key (Split / New Block)
  const handleEnterBlock = useCallback((
    blockId: string,
    leftText: string,
    rightText: string,
    preserveType: boolean = false
  ) => {
    const newBlockId = generateBlockId();

    updateDocument(prevDoc => {
      const blockIdx = prevDoc.blocks.findIndex(b => b.id === blockId);
      if (blockIdx === -1) return prevDoc;

      const currentBlock = prevDoc.blocks[blockIdx];
      const updatedCurrent: Block = {
        ...currentBlock,
        content: leftText
      };

      const newBlock: Block = {
        id: newBlockId,
        type: preserveType ? currentBlock.type : 'paragraph',
        content: rightText,
        indent: preserveType ? currentBlock.indent : 0,
        ...(preserveType && currentBlock.type === 'todo' ? { checked: false } : {})
      };

      const newBlocks = [
        ...prevDoc.blocks.slice(0, blockIdx),
        updatedCurrent,
        newBlock,
        ...prevDoc.blocks.slice(blockIdx + 1)
      ];

      return { ...prevDoc, blocks: newBlocks };
    });

    setFocusedBlockId(newBlockId);
    setTimeout(() => {
      const el = blockRefs.current[newBlockId];
      if (el && 'focus' in el) {
        (el as HTMLElement).focus();
      }
    }, 50);
  }, [updateDocument]);

  // Block Backspace Key
  const handleBackspaceBlock = useCallback((
    blockId: string,
    cursorPos: number,
    currentText: string
  ) => {
    updateDocument(prevDoc => {
      const blockIdx = prevDoc.blocks.findIndex(b => b.id === blockId);
      if (blockIdx === -1) return prevDoc;

      const currentBlock = prevDoc.blocks[blockIdx];

      // 1. If non-paragraph block is empty: revert to paragraph
      if (currentBlock.type !== 'paragraph' && !currentBlock.content.trim()) {
        const newBlocks = [...prevDoc.blocks];
        newBlocks[blockIdx] = { ...currentBlock, type: 'paragraph', content: '' };
        return { ...prevDoc, blocks: newBlocks };
      }

      // 2. If empty paragraph and not the only block: delete it
      if (currentBlock.type === 'paragraph' && !currentBlock.content && prevDoc.blocks.length > 1) {
        const prevBlock = prevDoc.blocks[blockIdx - 1];
        const newBlocks = prevDoc.blocks.filter(b => b.id !== blockId);

        if (prevBlock) {
          setFocusedBlockId(prevBlock.id);
          setTimeout(() => {
            const el = blockRefs.current[prevBlock.id];
            if (el && 'focus' in el) {
              (el as HTMLElement).focus();
              if ('setSelectionRange' in el) {
                const len = (el as HTMLTextAreaElement).value.length;
                (el as HTMLTextAreaElement).setSelectionRange(len, len);
              }
            }
          }, 30);
        }

        return { ...prevDoc, blocks: newBlocks };
      }

      // 3. If cursor is at start (0) and there is a previous block: merge
      if (cursorPos === 0 && blockIdx > 0) {
        const prevBlock = prevDoc.blocks[blockIdx - 1];
        if (prevBlock.type !== 'divider') {
          const joinPos = prevBlock.content.length;
          const mergedBlock: Block = {
            ...prevBlock,
            content: prevBlock.content + currentBlock.content
          };

          const newBlocks = [
            ...prevDoc.blocks.slice(0, blockIdx - 1),
            mergedBlock,
            ...prevDoc.blocks.slice(blockIdx + 1)
          ];

          setFocusedBlockId(prevBlock.id);
          setTimeout(() => {
            const el = blockRefs.current[prevBlock.id];
            if (el && 'focus' in el) {
              (el as HTMLElement).focus();
              if ('setSelectionRange' in el) {
                (el as HTMLTextAreaElement).setSelectionRange(joinPos, joinPos);
              }
            }
          }, 30);

          return { ...prevDoc, blocks: newBlocks };
        }
      }

      return prevDoc;
    });
  }, [updateDocument]);

  // Indent / Outdent
  const handleIndentBlock = useCallback((blockId: string, delta: number) => {
    updateDocument(prevDoc => {
      const newBlocks = prevDoc.blocks.map(b => {
        if (b.id === blockId) {
          const currentIndent = b.indent || 0;
          const nextIndent = Math.max(0, Math.min(3, currentIndent + delta));
          return { ...b, indent: nextIndent };
        }
        return b;
      });
      return { ...prevDoc, blocks: newBlocks };
    });
  }, [updateDocument]);

  // Focus Navigation Up/Down
  const handleFocusPrevious = useCallback((blockId: string) => {
    const idx = doc.blocks.findIndex(b => b.id === blockId);
    if (idx > 0) {
      const prevBlock = doc.blocks[idx - 1];
      setFocusedBlockId(prevBlock.id);
      const el = blockRefs.current[prevBlock.id];
      if (el && 'focus' in el) {
        (el as HTMLElement).focus();
      }
    }
  }, [doc.blocks]);

  const handleFocusNext = useCallback((blockId: string) => {
    const idx = doc.blocks.findIndex(b => b.id === blockId);
    if (idx < doc.blocks.length - 1) {
      const nextBlock = doc.blocks[idx + 1];
      setFocusedBlockId(nextBlock.id);
      const el = blockRefs.current[nextBlock.id];
      if (el && 'focus' in el) {
        (el as HTMLElement).focus();
      }
    }
  }, [doc.blocks]);

  // Delete Block
  const handleDeleteBlock = useCallback((blockId: string) => {
    updateDocument(prevDoc => {
      if (prevDoc.blocks.length <= 1) {
        // Clear single block to paragraph
        return {
          ...prevDoc,
          blocks: [{ id: prevDoc.blocks[0].id, type: 'paragraph', content: '' }]
        };
      }
      return {
        ...prevDoc,
        blocks: prevDoc.blocks.filter(b => b.id !== blockId)
      };
    });
  }, [updateDocument]);

  // Add block at end
  const handleAddBlock = useCallback((type: BlockType = 'paragraph') => {
    const newId = generateBlockId();
    updateDocument(prevDoc => ({
      ...prevDoc,
      blocks: [...prevDoc.blocks, { id: newId, type, content: '' }]
    }));
    setFocusedBlockId(newId);
    setTimeout(() => {
      const el = blockRefs.current[newId];
      if (el && 'focus' in el) {
        (el as HTMLElement).focus();
      }
    }, 50);
  }, [updateDocument]);

  // Calculate sequential numbers for numbered lists
  const numberedListMap = useMemo(() => {
    const map: Record<string, number> = {};
    let currentNumber = 1;

    for (let i = 0; i < doc.blocks.length; i++) {
      const b = doc.blocks[i];
      if (b.type === 'numbered_list') {
        map[b.id] = currentNumber++;
      } else {
        currentNumber = 1;
      }
    }
    return map;
  }, [doc.blocks]);

  const totalWords = useMemo(() => {
    return doc.blocks.reduce((acc, b) => {
      const words = (b.content || '').trim().split(/\s+/).filter(Boolean).length;
      return acc + words;
    }, 0);
  }, [doc.blocks]);

  return (
    <div className="flex flex-col h-full w-full relative" data-testid="block-editor">
      {/* Editor Sub-Header Toolbar */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-2xl border mb-3 text-xs shadow-xs ${
          isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white border-gray-200 text-gray-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-semibold text-purple-400">
            <Sparkles size={13} />
            Notion Block Mode
          </span>
          <span className="opacity-40">•</span>
          <span className="opacity-75">{doc.blocks.length} blocks</span>
          <span className="opacity-40">•</span>
          <span className="opacity-75">{totalWords} words</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Undo Button */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIdx <= 0}
            className={`p-1.5 rounded-lg transition-colors ${
              historyIdx > 0
                ? isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                : 'opacity-30 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>

          {/* Redo Button */}
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            className={`p-1.5 rounded-lg transition-colors ${
              historyIdx < history.length - 1
                ? isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                : 'opacity-30 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={14} />
          </button>

          <span className="opacity-30 mx-1">|</span>

          {/* Shortcut hint */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] opacity-60 font-mono">
            <span>Type</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-purple-300">/</kbd>
            <span>for commands</span>
          </div>
        </div>
      </div>

      {/* Main Blocks List Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 py-2 space-y-0.5">
        {doc.blocks.map((block, idx) => (
          <BlockItem
            key={block.id}
            block={block}
            index={idx}
            listNumber={numberedListMap[block.id] || 1}
            isFocused={focusedBlockId === block.id}
            isDark={isDark}
            onUpdate={handleUpdateBlock}
            onEnter={handleEnterBlock}
            onBackspace={handleBackspaceBlock}
            onIndent={handleIndentBlock}
            onFocusPrevious={handleFocusPrevious}
            onFocusNext={handleFocusNext}
            onDelete={handleDeleteBlock}
            onSlashTrigger={handleSlashTrigger}
            onSlashDismiss={handleSlashDismiss}
            onRegisterRef={handleRegisterRef}
          />
        ))}

        {/* Bottom Append Area */}
        <div className="pt-4 pb-12">
          <button
            type="button"
            onClick={() => handleAddBlock('paragraph')}
            className={`w-full py-3 rounded-2xl border border-dashed flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
              isDark
                ? 'border-slate-800 hover:border-purple-500/40 bg-slate-900/20 hover:bg-purple-950/10 text-slate-400 hover:text-purple-300'
                : 'border-gray-200 hover:border-purple-400 bg-gray-50/50 hover:bg-purple-50 text-gray-500 hover:text-purple-600'
            }`}
          >
            <Plus size={14} />
            <span>Click to add a block or type &apos;/&apos;</span>
          </button>
        </div>
      </div>

      {/* Floating Slash Command Menu */}
      <SlashCommandMenu
        isOpen={slashMenu.isOpen}
        query={slashMenu.query}
        selectedIndex={slashMenu.selectedIndex}
        position={slashMenu.menuCoords}
        onSelect={handleSelectSlashCommand}
        onClose={handleSlashDismiss}
        isDark={isDark}
      />
    </div>
  );
}
