'use client';

import { useState, useEffect } from 'react';
import Mascot from '@/components/Mascot';
import { CheckCircle2, Circle, Trash2, Plus, Settings, X } from 'lucide-react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [activeCategory, setActiveCategory] = useState<string>('default');
  const [inputText, setInputText] = useState('');
  const [newCatText, setNewCatText] = useState('');
  
  const [mood, setMood] = useState<'idle' | 'happy' | 'sad' | 'thinking'>('idle');
  const [shape, setShape] = useState<'squircle' | 'circle' | 'cloud' | 'pebble'>('squircle');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        setTodos(data.todos || []);
        setCategories(data.categories || [{ id: 'default', name: 'General' }]);
      });
  }, []);

  const mutate = async (payload: any) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setTodos(data.todos);
    setCategories(data.categories);
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    setMood('thinking');
    await mutate({ type: 'ADD_TODO', text: inputText, categoryId: activeCategory });
    
    setInputText('');
    setMood('happy');
    setTimeout(() => setMood('idle'), 2000);
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatText.trim()) return;
    await mutate({ type: 'ADD_CATEGORY', name: newCatText });
    setNewCatText('');
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    setMood(completed ? 'idle' : 'happy');
    await mutate({ type: 'TOGGLE_TODO', id, completed: !completed });
    if (!completed) setTimeout(() => setMood('idle'), 1500);
  };

  const deleteTodo = async (id: string) => {
    setMood('sad');
    await mutate({ type: 'DELETE_TODO', id });
    setTimeout(() => setMood('idle'), 1500);
  };

  const deleteCategory = async (id: string) => {
    if (id === 'default') return;
    await mutate({ type: 'DELETE_CATEGORY', id });
    if (activeCategory === id) setActiveCategory('default');
  };

  const filteredTodos = todos.filter(t => t.categoryId === activeCategory);

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-200 relative">
      {/* Settings Button */}
      <button 
        onClick={() => setShowSettings(true)}
        className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors"
      >
        <Settings size={24} />
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Avatar Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Choose your avatar shape:</p>
            <div className="grid grid-cols-2 gap-3">
              {(['squircle', 'circle', 'cloud', 'pebble'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setShape(s)}
                  className={`p-3 rounded-xl border font-medium capitalize transition-all ${
                    shape === s ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto pt-16 px-6 pb-20">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-10">
          <Mascot mood={mood} shape={shape} />
          <h1 className="text-3xl font-semibold tracking-tight mt-4 text-gray-900">
            Tasks
          </h1>
        </div>

        {/* Categories / Lists */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map(cat => (
            <div key={cat.id} className="relative group flex-shrink-0">
              <button
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
              {cat.id !== 'default' && (
                <button 
                  onClick={() => deleteCategory(cat.id)}
                  className="absolute -top-2 -right-2 bg-white text-gray-400 border border-gray-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 shadow-sm hover:text-red-500"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          
          <form onSubmit={addCategory} className="flex-shrink-0 flex items-center bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
            <input 
              type="text" 
              value={newCatText}
              onChange={(e) => setNewCatText(e.target.value)}
              placeholder="New list..." 
              className="bg-transparent border-none outline-none text-sm w-20 placeholder-gray-400"
            />
            <button type="submit" className="text-gray-400 hover:text-blue-500"><Plus size={16}/></button>
          </form>
        </div>

        {/* Clean Input Form */}
        <form onSubmit={addTodo} className="relative flex items-center mb-8 shadow-sm">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full bg-white border border-gray-300 rounded-2xl py-3.5 pl-5 pr-14 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          <button 
            type="submit" 
            className="absolute right-2 p-1.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition-colors flex items-center justify-center"
          >
            <Plus size={20} />
          </button>
        </form>

        {/* Task List */}
        <ul className="space-y-2">
          {filteredTodos.length === 0 && (
            <div className="text-center text-gray-400 mt-10 text-sm">
              No tasks in this list.
            </div>
          )}
          {filteredTodos.map(todo => (
            <li 
              key={todo.id}
              className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                todo.completed 
                  ? 'bg-gray-50 border-gray-100' 
                  : 'bg-white border-gray-200 shadow-sm hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleTodo(todo.id, todo.completed)}>
                {todo.completed ? (
                  <CheckCircle2 className="text-blue-500" size={24} />
                ) : (
                  <Circle className="text-gray-300 group-hover:text-gray-400 transition-colors" size={24} />
                )}
                <span className={`text-base transition-all duration-200 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {todo.text}
                </span>
              </div>
              <button 
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>

      </div>
    </main>
  );
}
