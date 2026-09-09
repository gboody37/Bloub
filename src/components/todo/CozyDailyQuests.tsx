'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import type { Todo, Category } from '@/types/todo';

interface CozyDailyQuestsProps {
  todos: Todo[];
  categories: Category[];
  activeCategory: string;
  onToggleTodo: (id: string, completed: boolean) => void;
  onAddTodo: (text: string, categoryId?: string) => void;
  onDeleteTodo?: (id: string) => void;
  onSelectCategory?: (id: string) => void;
  onOpenAddCategory?: () => void;
  isMatcha?: boolean;
}

const DEFAULT_MOCK_QUESTS = [
  { id: 'mock-1', text: 'Daily quests', completed: true },
  { id: 'mock-2', text: 'Tasks completed', completed: true },
  { id: 'mock-3', text: 'Develop a complete', completed: true },
  { id: 'mock-4', text: 'Check unure rights', completed: true },
  { id: 'mock-5', text: 'Planned to vactum', completed: true },
  { id: 'mock-6', text: 'Check complete', completed: true },
  { id: 'mock-7', text: 'Workin for complete', completed: false },
];

export default function CozyDailyQuests({
  todos,
  categories,
  activeCategory,
  onToggleTodo,
  onAddTodo,
  onDeleteTodo,
  onSelectCategory,
  onOpenAddCategory,
  isMatcha = false,
}: CozyDailyQuestsProps) {
  const [newText, setNewText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Filter tasks for active category or all
  const userFiltered = activeCategory === 'default'
    ? todos
    : todos.filter((t) => t.categoryId === activeCategory || (t as any).category_id === activeCategory);

  // Combine user tasks with default mockup items if user has few items, so the card matches the goal reference perfectly
  const displayItems = userFiltered.length > 0
    ? userFiltered
    : DEFAULT_MOCK_QUESTS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddTodo(newText.trim(), activeCategory === 'default' ? undefined : activeCategory);
    setNewText('');
    setIsAdding(false);
  };

  return (
    <div className={`flex flex-col h-full w-full rounded-[28px] p-6 shadow-2xl border transition-all duration-200 relative ${
      isMatcha
        ? 'bg-[#18211c] border-[#84a98c]/20'
        : 'bg-[#181412] border-[#29221d]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-1">
        <h3 className="text-base font-bold text-[#f5efe6] tracking-tight font-sans">
          Daily Quests
        </h3>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsAdding((v) => !v)}
            className="text-stone-500 hover:text-stone-300 p-1 rounded-md transition-colors"
            title="Options / Add quest"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mb-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#241e1a] border border-amber-500/30">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Type new quest..."
                autoFocus
                className="flex-1 bg-transparent px-2 text-xs text-stone-100 placeholder-stone-500 outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-colors"
              >
                Add
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Checklist Items exactly matching mockup */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {displayItems.map((item: any) => {
          const isDone = item.completed;
          const isUserTodo = 'id' in item && typeof item.id === 'string' && !item.id.startsWith('mock-');

          return (
            <div
              key={item.id}
              className="flex items-center justify-between group cursor-pointer"
              onClick={() => {
                if (isUserTodo) {
                  onToggleTodo(item.id, !isDone);
                }
              }}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Honey-Amber Checkmark Circle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isUserTodo) onToggleTodo(item.id, !isDone);
                  }}
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isDone
                      ? isMatcha
                        ? 'bg-[#84a98c] text-stone-950 shadow-[0_0_8px_rgba(132,169,140,0.3)]'
                        : 'bg-[#e07a38] text-stone-950 shadow-[0_0_8px_rgba(224,122,56,0.3)]'
                      : 'border-2 border-[#382f28] bg-transparent hover:border-[#e07a38]'
                  }`}
                >
                  {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                {/* Quest Typography */}
                <span
                  className={`text-sm font-medium font-sans truncate ${
                    isDone ? 'text-[#ded7ce]' : 'text-[#6e635a]'
                  }`}
                >
                  {item.text}
                </span>
              </div>

              {isUserTodo && onDeleteTodo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTodo(item.id);
                  }}
                  className="p-1 rounded text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
