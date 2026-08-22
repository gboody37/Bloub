'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BloubMascot from '@/components/BloubMascot';
import { CheckCircle2, Circle, Trash2, Plus, Settings, X, ChevronDown, ChevronRight, Flag, Calendar, BarChart3, ListTodo } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'lists' | 'today' | 'stats'>('lists');
  const [inputText, setInputText] = useState('');
  const [newCatText, setNewCatText] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isListView, setIsListView] = useState(true);

  // Settings
  const [bgTheme, setBgTheme] = useState('bg-gray-50');

  // Mascot
  const [mascotState, setMascotState] = useState<StateId>('idle');
  const [mascotExpression, setMascotExpression] = useState<ExpressionId>('timide');
  const [mascotShape, setMascotShape] = useState('squircle');
  const [mascotColor, setMascotColor] = useState('encre');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load preferences
  useEffect(() => {
    const savedExpr = localStorage.getItem('mascotExpression') as ExpressionId;
    const savedShape = localStorage.getItem('mascotShape');
    const savedColor = localStorage.getItem('mascotColor');
    const savedTheme = localStorage.getItem('bgTheme');
    if (savedExpr) setMascotExpression(savedExpr);
    if (savedShape) setMascotShape(savedShape);
    if (savedColor) setMascotColor(savedColor);
    if (savedTheme) setBgTheme(savedTheme);
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('mascotExpression', mascotExpression);
    localStorage.setItem('mascotShape', mascotShape);
    localStorage.setItem('mascotColor', mascotColor);
    localStorage.setItem('bgTheme', bgTheme);
  }, [mascotExpression, mascotShape, mascotColor, bgTheme]);

  // AFK Timer (Sleep)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetAFK = () => {
      clearTimeout(timeout);
      if (mascotState === 'sleep') {
        setMascotState('idle');
        setMascotExpression(localStorage.getItem('mascotExpression') as ExpressionId || 'timide');
      }
      timeout = setTimeout(() => {
        setMascotState('sleep');
        setMascotExpression('somnolent');
      }, 15000); // Sleep after 15s of inactivity
    };
    window.addEventListener('mousemove', resetAFK);
    window.addEventListener('keydown', resetAFK);
    window.addEventListener('touchstart', resetAFK);
    resetAFK();
    return () => {
      window.removeEventListener('mousemove', resetAFK);
      window.removeEventListener('keydown', resetAFK);
      window.removeEventListener('touchstart', resetAFK);
      clearTimeout(timeout);
    };
  }, [mascotState]);

  const resetToIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setMascotState('idle');
      setMascotExpression(localStorage.getItem('mascotExpression') as ExpressionId || 'timide');
    }, 2000);
  }, []);

  const triggerMascot = useCallback((state: StateId, expr: ExpressionId) => {
    setMascotState(state);
    setMascotExpression(expr);
    resetToIdle();
  }, [resetToIdle]);

  const fetchTodos = async () => {
    const res = await fetch('/api/data');
    const data = await res.json();
    setTodos(data.todos);
    setCategories(data.categories);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const mutate = async (body: any) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res.json();
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      triggerMascot('idle', 'mefiant');
      return;
    }
    // "Amazed" state
    triggerMascot('wide', 'surpris');
    await mutate({ type: 'ADD_TODO', text: inputText, categoryId: activeCategory });
    setInputText('');
    setShowAddModal(false);
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatText.trim()) return;
    triggerMascot('orbit', 'heureux');
    await mutate({ type: 'ADD_CATEGORY', name: newCatText });
    setNewCatText('');
  };

  const deleteCategory = async (id: string) => {
    if (id === 'default') return;
    if (confirm('Delete this list?')) {
      triggerMascot('idle', 'triste');
      await mutate({ type: 'DELETE_CATEGORY', id });
      if (activeCategory === id) setActiveCategory('default');
    }
  };

  const handleCategoryClick = (cat: { id: string, name: string }) => {
    setActiveCategory(cat.id);
    setIsListView(false);
    
    // Deterministic shape & color morphing based on category
    const shapes: ('squircle'|'carre'|'rond')[] = ['squircle', 'carre', 'rond'];
    const colors: ('encre'|'lagon'|'prune')[] = ['encre', 'lagon', 'prune'];
    const hash = cat.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    setMascotShape(shapes[hash % shapes.length]);
    setMascotColor(colors[hash % colors.length]);
    triggerMascot('alert', 'excite');
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

  const filteredTodos = todos.filter(t => {
    if (activeTab === 'lists') return t.categoryId === activeCategory;
    if (activeTab === 'today') {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      const today = new Date();
      return due.toDateString() === today.toDateString() || due < today;
    }
    return false;
  });
  const completedCount = filteredTodos.filter(t => t.completed).length;
  const totalCount = filteredTodos.length;

  return (
    <main className={`min-h-screen max-w-md mx-auto ${bgTheme} flex flex-col font-sans relative transition-colors duration-500`}>
      {/* Header */}
      <header className="pt-12 pb-6 px-6 bg-white/50 backdrop-blur-md sticky top-0 z-30 shadow-sm shadow-gray-100/50 flex justify-between items-end border-b border-gray-100/50">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {activeTab === 'lists' ? (isListView ? 'My Lists' : categories.find(c => c.id === activeCategory)?.name) : activeTab === 'today' ? 'Today' : 'Stats'}
          </h1>
          {!isListView && activeTab === 'lists' && (
            <p className="text-gray-400 text-sm mt-1 font-medium">{completedCount} of {totalCount} completed</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 drop-shadow-sm pointer-events-auto" onClick={() => triggerMascot('orbit', 'heureux')}>
            <BloubMascot state={mascotState} expression={mascotExpression} shape={mascotShape} color={mascotColor} />
          </div>
          <button onClick={() => setShowSettings(true)} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all active:scale-95">
            <Settings size={22} />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-6"
          onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl animate-pop-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Customize</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-1.5 rounded-full"><X size={18}/></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">App Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bg-gray-50', name: 'Minimal' },
                    { id: 'bg-slate-900', name: 'Midnight' },
                    { id: 'bg-stone-100', name: 'Sand' },
                    { id: 'bg-rose-50', name: 'Blush' }
                  ].map(t => (
                    <button key={t.id} onClick={() => setBgTheme(t.id)}
                      className={`py-2 text-sm font-medium rounded-xl border ${bgTheme === t.id ? 'bg-gray-900 text-white border-transparent' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Default Shape</label>
                <div className="flex gap-2">
                  {['squircle', 'carre', 'rond'].map(s => (
                    <button key={s} onClick={() => setMascotShape(s)}
                      className={`flex-1 py-2 text-sm font-medium rounded-xl border ${mascotShape === s ? 'bg-gray-900 text-white border-transparent' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Default Color</label>
                <div className="flex gap-2">
                  {['encre', 'lagon', 'prune'].map(c => (
                    <button key={c} onClick={() => setMascotColor(c)}
                      className={`flex-1 py-2 text-sm font-medium rounded-xl border ${mascotColor === c ? 'bg-gray-900 text-white border-transparent' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center sm:p-6"
          onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl animate-pop-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">New Task</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-1.5 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={addTodo}>
              <input
                type="text"
                autoFocus
                value={inputText}
                onChange={e => {
                  setInputText(e.target.value);
                  if (e.target.value.length === 1 && !inputText) triggerMascot('alert', 'heureux');
                }}
                onFocus={() => triggerMascot('thinking', 'curieux')}
                placeholder="What needs to be done?"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-4 text-base font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all mb-4"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-full bg-gray-900 text-white font-semibold py-4 rounded-2xl shadow-md hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-95"
              >
                Save Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="px-6 py-6 flex-1 relative">
        
        {/* Lists Master View */}
        {activeTab === 'lists' && isListView ? (
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">My Lists</h2>
            <ul className="space-y-3">
              {categories.map(cat => {
                const count = todos.filter(t => t.categoryId === cat.id && !t.completed).length;
                return (
                  <li key={cat.id} className="group flex items-center justify-between bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-gray-300 cursor-pointer transition-all"
                      onClick={() => handleCategoryClick(cat)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <ListTodo size={20} />
                      </div>
                      <span className="font-semibold text-gray-800">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{count}</span>
                      {cat.id !== 'default' && (
                        <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className="text-gray-200 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <form onSubmit={addCategory} className="mt-6 flex items-center gap-2">
              <input type="text" value={newCatText} 
                onChange={e => {
                  setNewCatText(e.target.value);
                  if (e.target.value.length === 1 && !newCatText) triggerMascot('alert', 'heureux');
                }}
                onFocus={() => triggerMascot('thinking', 'curieux')}
                placeholder="New List..." className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 shadow-sm transition-all" />
              <button type="submit" disabled={!newCatText.trim()} className="bg-gray-900 text-white p-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"><Plus size={20}/></button>
            </form>
          </div>
        ) : (
          /* Task List View */
          <div>
            {/* Back button and List Title */}
            {activeTab === 'lists' && !isListView && (
               <div className="mb-4">
                 <button onClick={() => setIsListView(true)} className="text-sm font-medium text-gray-400 hover:text-gray-900 mb-2 transition-colors">← Back to Lists</button>
               </div>
            )}
            
            {/* Add Task FAB */}
            <button
              onClick={() => setShowAddModal(true)}
              className="fixed bottom-24 right-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-xl shadow-gray-400/30 flex items-center justify-center hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 z-40"
            >
              <Plus size={28} />
            </button>

            <ul className="space-y-3 pb-8">
              {filteredTodos.length === 0 && (
                <li className="text-center py-20 text-gray-400 text-sm">
                  {activeTab === 'lists' ? "No tasks in this list yet." : "Nothing due today!"}
                </li>
              )}
              {filteredTodos
                .slice()
                .sort((a, b) => Number(b.id) - Number(a.id))
                .map(todo => {
                  const isExpanded = expandedTask === todo.id;
                  const isOverdue = !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date();

                  return (
                    <li 
                      key={todo.id}
                      className={`bg-white/80 backdrop-blur-sm rounded-2xl border transition-all duration-200 overflow-hidden ${
                        todo.completed
                          ? 'border-gray-100 opacity-50'
                          : isOverdue
                          ? 'border-red-200 shadow-sm shadow-red-50'
                          : 'border-gray-200/50 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <button onClick={() => toggleTodo(todo.id, todo.completed)} className="flex-shrink-0">
                          {todo.completed
                            ? <CheckCircle2 size={22} className="text-gray-800" />
                            : <Circle size={22} className={`${isOverdue ? 'text-red-400' : 'text-gray-300'}`} />
                          }
                        </button>

                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : todo.id)}>
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
                          </div>
                        </div>

                        {todo.priority && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_COLOR[todo.priority] }} />
                        )}

                        <button onClick={() => setExpandedTask(isExpanded ? null : todo.id)} className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>

                        <button onClick={() => deleteTodo(todo.id)} className="text-gray-200 hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
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

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Due:</span>
                            <input type="date"
                              value={todo.dueDate ? todo.dueDate.split('T')[0] : ''}
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
        )}
      </div>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-40 px-6 py-2">
        <div className="max-w-md mx-auto flex justify-between items-center text-xs font-medium text-gray-400">
          <button 
            onClick={() => { setActiveTab('lists'); setIsListView(true); }}
            className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${activeTab === 'lists' ? 'text-gray-900' : 'hover:text-gray-600'}`}>
            <ListTodo size={22} className={activeTab === 'lists' ? 'text-gray-900' : ''} />
            <span>Lists</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${activeTab === 'today' ? 'text-gray-900' : 'hover:text-gray-600'}`}>
            <Calendar size={22} className={activeTab === 'today' ? 'text-gray-900' : ''} />
            <span>Today</span>
          </button>

          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${activeTab === 'stats' ? 'text-gray-900' : 'hover:text-gray-600'}`}>
            <BarChart3 size={22} className={activeTab === 'stats' ? 'text-gray-900' : ''} />
            <span>Stats</span>
          </button>
        </div>
      </nav>
      
      {/* Padding for bottom nav */}
      <div className="h-20" />
    </main>
  );
}
