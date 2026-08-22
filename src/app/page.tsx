'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BloubMascot from '@/components/BloubMascot';
import { CheckCircle2, Circle, Trash2, Plus, Settings, X, ChevronDown, ChevronRight, Flag } from 'lucide-react';
import type { StateId } from '@/lib/bot/states';
import type { ExpressionId } from '@/lib/bot/expressions';

interface Subtask { id: string; text: string; completed: boolean; }
interface Todo {
  id: string; text: string; completed: boolean; categoryId: string;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  subtasks?: Subtask[];
}
interface Category { id: string; name: string; }

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('default');
  const [inputText, setInputText] = useState('');
  const [newCatText, setNewCatText] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Mascot
  const [mascotState, setMascotState] = useState<StateId>('idle');
  const [mascotExpression, setMascotExpression] = useState<ExpressionId>('timide');
  const [mascotShape, setMascotShape] = useState('squircle');
  const [mascotColor, setMascotColor] = useState('encre');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetToIdle = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setMascotState('idle');
      setMascotExpression('neutre');
    }, 2000);
  }, []);

  const triggerMascot = useCallback((state: StateId, expr: ExpressionId) => {
    setMascotState(state);
    setMascotExpression(expr);
    resetToIdle();
  }, [resetToIdle]);

  // Idle timer → sleep
  useEffect(() => {
    const sleepTimer = setTimeout(() => {
      setMascotState('sleep');
      setMascotExpression('somnolent');
    }, 5 * 60 * 1000);
    return () => clearTimeout(sleepTimer);
  }, [todos]);

  // Fetch data
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(d => {
      setTodos(d.todos ?? []);
      setCategories(d.categories ?? [{ id: 'default', name: 'General' }]);
      // Expression based on initial state
      const hasOverdue = (d.todos ?? []).some((t: Todo) =>
        !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
      );
      if (d.todos?.length === 0) {
        setMascotExpression('timide');
        setMascotState('egg');
      } else if (hasOverdue) {
        setMascotExpression('colere');
      } else {
        setMascotExpression('attentif');
      }
    });
  }, []);

  const mutate = async (payload: any) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    setTodos(d.todos);
    setCategories(d.categories);
    return d;
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      triggerMascot('idle', 'mefiant');
      return;
    }
    triggerMascot('alert', 'excite');
    await mutate({ type: 'ADD_TODO', text: inputText, categoryId: activeCategory });
    setInputText('');
    setTimeout(() => triggerMascot('idle', 'heureux'), 800);
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatText.trim()) return;
    triggerMascot('hexagon', 'curieux');
    await mutate({ type: 'ADD_CATEGORY', name: newCatText });
    setNewCatText('');
    resetToIdle();
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    const newCompleted = !completed;
    const updatedTodos = todos.map(t => t.id === id ? { ...t, completed: newCompleted } : t);
    setTodos(updatedTodos);

    if (newCompleted) {
      const allDone = updatedTodos.filter(t => t.categoryId === activeCategory).every(t => t.completed);
      if (allDone) {
        triggerMascot('orbit', 'fier');
        setTimeout(() => triggerMascot('idle', 'blase'), 3500);
      } else {
        triggerMascot('wink', 'heureux');
        resetToIdle();
      }
    } else {
      triggerMascot('idle', 'neutre');
    }

    await mutate({ type: 'TOGGLE_TODO', id, completed: newCompleted });
  };

  const deleteTodo = async (id: string) => {
    triggerMascot('comet', 'triste');
    await mutate({ type: 'DELETE_TODO', id });
    setTimeout(() => triggerMascot('idle', 'neutre'), 2500);
  };

  const deleteCategory = async (id: string) => {
    if (id === 'default') return;
    triggerMascot('comet', 'triste');
    await mutate({ type: 'DELETE_CATEGORY', id });
    if (activeCategory === id) setActiveCategory('default');
    setTimeout(() => triggerMascot('idle', 'neutre'), 2500);
  };

  const filteredTodos = todos.filter(t => t.categoryId === activeCategory);
  const completedCount = filteredTodos.filter(t => t.completed).length;
  const totalCount = filteredTodos.length;

  return (
    <main className="min-h-screen bg-[#f5f5f5] font-sans select-none relative">
      {/* Settings button */}
      <button
        onClick={() => { setShowSettings(true); triggerMascot('swirl', 'curieux'); }}
        className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-800 hover:bg-white/70 transition-all"
      >
        <Settings size={20} />
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-6"
          onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Customize</h2>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Shape</p>
              <div className="grid grid-cols-4 gap-2">
                {(['squircle', 'cercle', 'nuage', 'goutte', 'galet', 'capsule', 'triangle', 'hexagone'] as const).map(s => (
                  <button key={s} onClick={() => setMascotShape(s)}
                    className={`p-2 rounded-xl text-xs font-medium capitalize transition-all border ${
                      mascotShape === s ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}>
                    {s === 'cercle' ? 'circle' : s === 'nuage' ? 'cloud' : s === 'goutte' ? 'drop' : s === 'galet' ? 'pebble' : s === 'hexagone' ? 'hex' : s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Color</p>
              <div className="flex flex-wrap gap-2">
                {['encre', 'rouge', 'orange', 'ambre', 'vert', 'turquoise', 'bleu', 'violet', 'rose', 'gris', 'brun'].map(c => {
                  const colorMap: Record<string, string> = {
                    encre: '#0a0a0c', rouge: '#e8483f', orange: '#f08a24', ambre: '#f0b429',
                    vert: '#3ecf8e', turquoise: '#2fbfa0', bleu: '#3b93f0', violet: '#8b5cf6',
                    rose: '#e152b0', gris: '#a3a3a3', brun: '#8b5e3c'
                  };
                  return (
                    <button key={c} onClick={() => setMascotColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${mascotColor === c ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent'}`}
                      style={{ backgroundColor: colorMap[c] }} />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto pt-12 px-5 pb-24">

        {/* Mascot Header */}
        <div className="flex flex-col items-center mb-8">
          <BloubMascot
            size={148}
            state={mascotState}
            expression={mascotExpression}
            shape={mascotShape}
            color={mascotColor}
            onInteract={() => triggerMascot('orbit', 'fier')}
          />
          <h1 className="text-2xl font-bold text-gray-900 mt-2 tracking-tight">Tasks</h1>
          {totalCount > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">
              {completedCount} of {totalCount} done
            </p>
          )}
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide -mx-1 px-1">
          {categories.map(cat => (
            <div key={cat.id} className="relative group flex-shrink-0">
              <button
                onClick={() => { setActiveCategory(cat.id); triggerMascot('hexagon', 'attentif'); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {cat.name}
              </button>
              {cat.id !== 'default' && activeCategory === cat.id && (
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-200 hover:bg-red-100 hover:text-red-500 text-gray-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          <form onSubmit={addCategory} className="flex-shrink-0">
            <div className="flex items-center bg-white border border-dashed border-gray-300 rounded-full px-3 py-1.5 gap-1 hover:border-gray-400 transition-colors">
              <input
                type="text"
                value={newCatText}
                onChange={e => setNewCatText(e.target.value)}
                placeholder="New list"
                className="bg-transparent outline-none text-sm text-gray-600 w-16 placeholder-gray-400"
              />
              <button type="submit" className="text-gray-400 hover:text-gray-800 transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </form>
        </div>

        {/* Add task input */}
        <form onSubmit={addTodo} className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={e => { setInputText(e.target.value); if (e.target.value) triggerMascot('thinking', 'curieux'); else triggerMascot('idle', 'neutre'); }}
              placeholder="Add a task..."
              className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 px-5 text-base text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="w-11 h-11 bg-gray-900 hover:bg-gray-800 active:scale-95 rounded-2xl text-white flex items-center justify-center flex-shrink-0 shadow-sm transition-all"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </form>

        {/* Task list */}
        <ul className="space-y-2">
          {filteredTodos.length === 0 && (
            <li className="text-center py-12 text-gray-400 text-sm">
              Nothing here yet.
            </li>
          )}
          {filteredTodos.map(todo => {
            const isExpanded = expandedTask === todo.id;
            const subtasksDone = (todo.subtasks ?? []).filter(s => s.completed).length;
            const subtasksTotal = (todo.subtasks ?? []).length;
            const isOverdue = !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date();

            return (
              <li key={todo.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  todo.completed
                    ? 'border-gray-100 opacity-50'
                    : isOverdue
                    ? 'border-red-200 shadow-sm shadow-red-50'
                    : 'border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3 px-4 py-3.5">
                  {/* Checkbox */}
                  <button onClick={() => toggleTodo(todo.id, todo.completed)} className="flex-shrink-0">
                    {todo.completed
                      ? <CheckCircle2 size={22} className="text-gray-800" />
                      : <Circle size={22} className={`${isOverdue ? 'text-red-300' : 'text-gray-200'} hover:text-gray-400 transition-colors`} />
                    }
                  </button>

                  {/* Text */}
                  <div className="flex-1 min-w-0" onClick={() => setExpandedTask(isExpanded ? null : todo.id)}>
                    <p className={`text-sm font-medium truncate ${todo.completed ? 'line-through text-gray-400' : isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                      {todo.text}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {todo.dueDate && (
                        <span className={`text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                          {isOverdue ? '⚠ ' : ''}
                          {new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {subtasksTotal > 0 && (
                        <span className="text-xs text-gray-400">{subtasksDone}/{subtasksTotal} subtasks</span>
                      )}
                    </div>
                  </div>

                  {/* Priority dot */}
                  {todo.priority && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PRIORITY_COLOR[todo.priority] }} />
                  )}

                  {/* Expand toggle */}
                  <button onClick={() => setExpandedTask(isExpanded ? null : todo.id)}
                    className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {/* Delete */}
                  <button onClick={() => deleteTodo(todo.id)}
                    className="text-gray-200 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                    {/* Priority picker */}
                    <div className="flex items-center gap-2">
                      <Flag size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-400 mr-1">Priority:</span>
                      {(['high', 'medium', 'low'] as const).map(p => (
                        <button key={p}
                          onClick={() => mutate({ type: 'SET_PRIORITY', id: todo.id, priority: p }).then(d => { setTodos(d.todos); setCategories(d.categories); })}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all border ${
                            todo.priority === p ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 hover:border-gray-400'
                          }`}
                          style={todo.priority === p ? { backgroundColor: PRIORITY_COLOR[p] } : {}}
                        >
                          {PRIORITY_LABEL[p]}
                        </button>
                      ))}
                    </div>

                    {/* Due date */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Due:</span>
                      <input type="date"
                        value={todo.dueDate ?? ''}
                        onChange={e => mutate({ type: 'SET_DUE_DATE', id: todo.id, dueDate: e.target.value }).then(d => { setTodos(d.todos); setCategories(d.categories); })}
                        className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-gray-400"
                      />
                      {todo.dueDate && (
                        <button onClick={() => mutate({ type: 'SET_DUE_DATE', id: todo.id, dueDate: null }).then(d => { setTodos(d.todos); setCategories(d.categories); })}
                          className="text-gray-300 hover:text-gray-500"><X size={12} /></button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
