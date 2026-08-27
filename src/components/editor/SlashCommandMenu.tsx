'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  AlertCircle,
  Code,
  Minus,
  LucideIcon
} from 'lucide-react';
import { SLASH_COMMANDS, SlashCommandItem, filterSlashCommands } from './types';
export { filterSlashCommands };

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  AlertCircle,
  Code,
  Minus
};

interface SlashCommandMenuProps {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  position: { top: number; left: number };
  onSelect: (item: SlashCommandItem) => void;
  onClose: () => void;
  isDark?: boolean;
}

export default function SlashCommandMenu({
  isOpen,
  query,
  selectedIndex,
  position,
  onSelect,
  onClose,
  isDark = true
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useMemo(() => {
    return filterSlashCommands(query);
  }, [query]);

  // Group commands by category
  const categorized = useMemo(() => {
    const categories: Record<string, SlashCommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!categories[cmd.category]) {
        categories[cmd.category] = [];
      }
      categories[cmd.category].push(cmd);
    });
    return categories;
  }, [filteredCommands]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (menuRef.current && filteredCommands.length > 0) {
      const selectedElement = menuRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredCommands.length]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`
        }}
        className={`fixed z-50 w-72 max-h-80 overflow-y-auto custom-scrollbar rounded-2xl p-2 border shadow-2xl backdrop-blur-xl ${
          isDark
            ? 'bg-slate-900/95 border-slate-700/80 text-slate-200'
            : 'bg-white/95 border-gray-200 text-gray-800 shadow-purple-900/10'
        }`}
        data-testid="slash-command-menu"
      >
        <div className="px-2 py-1.5 mb-1 flex items-center justify-between border-b border-slate-700/40 text-[11px] font-semibold text-slate-400">
          <span>BASIC BLOCKS</span>
          {query && <span className="text-purple-400 font-mono">/{query}</span>}
        </div>

        {filteredCommands.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-slate-400">
            No matching blocks found
          </div>
        ) : (
          <div>
            {Object.entries(categorized).map(([category, items]) => (
              <div key={category} className="mb-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-400/80">
                  {category}
                </div>
                {items.map(item => {
                  const globalIdx = filteredCommands.indexOf(item);
                  const isSelected = globalIdx === selectedIndex;
                  const Icon = ICON_MAP[item.icon] || FileText;

                  return (
                    <button
                      key={item.id}
                      data-index={globalIdx}
                      type="button"
                      onClick={() => onSelect(item)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-purple-600/25 border border-purple-500/40 text-purple-200 shadow-sm'
                          : isDark
                            ? 'hover:bg-slate-800/80 border border-transparent text-slate-300'
                            : 'hover:bg-gray-100 border border-transparent text-gray-700'
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : isDark
                              ? 'bg-slate-800 text-purple-400'
                              : 'bg-gray-100 text-purple-600'
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate leading-tight flex items-center justify-between">
                          <span>{item.title}</span>
                          {item.keywords[0] && (
                            <span className="text-[10px] font-mono opacity-50 ml-1">
                              /{item.keywords[0]}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] opacity-70 truncate leading-tight mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
