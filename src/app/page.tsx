'use client';

import { useState, useEffect, useRef } from 'react';
import Mascot from '@/components/Mascot';
import { CheckCircle2, Circle, Trash2, Plus } from 'lucide-react';
import anime from 'animejs';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState('');
  const [mood, setMood] = useState<'idle' | 'happy' | 'sad' | 'thinking'>('idle');

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.error('Failed to fetch todos', error);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setMood('thinking');
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const newTodo = await res.json();
      setTodos([...todos, newTodo]);
      setInputText('');
      setMood('happy');
      
      setTimeout(() => setMood('idle'), 2000);
    } catch (error) {
      console.error('Failed to add todo', error);
      setMood('sad');
      setTimeout(() => setMood('idle'), 2000);
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    setMood('thinking');
    try {
      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: !completed }),
      });
      if (res.ok) {
        setTodos(todos.map(t => t.id === id ? { ...t, completed: !completed } : t));
        if (!completed) {
            setMood('happy');
        } else {
            setMood('idle');
        }
      }
      setTimeout(() => setMood('idle'), 2000);
    } catch (error) {
      console.error('Failed to toggle', error);
      setMood('sad');
      setTimeout(() => setMood('idle'), 2000);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      setTodos(todos.filter(t => t.id !== id));
      setMood('sad');
      setTimeout(() => setMood('idle'), 2000);
    } catch (error) {
      console.error('Failed to delete', error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-indigo-500/30">
      <div className="max-w-2xl mx-auto pt-20 px-6 pb-20">
        
        <div className="text-center mb-10">
          <Mascot mood={mood} />
          <h1 className="text-4xl font-extrabold tracking-tight mt-6 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Vibe Todos
          </h1>
          <p className="text-gray-400 mt-2">The shared to-do list for vibe coders.</p>
        </div>

        <form onSubmit={addTodo} className="relative flex items-center mb-10">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl py-4 pl-6 pr-14 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-xl shadow-black/20"
          />
          <button 
            type="submit" 
            className="absolute right-3 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-colors flex items-center justify-center"
          >
            <Plus size={24} />
          </button>
        </form>

        <ul className="space-y-4">
          {todos.length === 0 && (
            <div className="text-center text-gray-500 mt-12">
              No tasks yet. Add one above!
            </div>
          )}
          {todos.map(todo => (
            <li 
              key={todo.id}
              className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                todo.completed 
                  ? 'bg-gray-900/50 border-gray-800/50 opacity-50' 
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700 shadow-lg shadow-black/10'
              }`}
            >
              <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleTodo(todo.id, todo.completed)}>
                {todo.completed ? (
                  <CheckCircle2 className="text-indigo-500" size={24} />
                ) : (
                  <Circle className="text-gray-500 group-hover:text-indigo-400 transition-colors" size={24} />
                )}
                <span className={`text-lg transition-all duration-300 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                  {todo.text}
                </span>
              </div>
              <button 
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
              >
                <Trash2 size={20} />
              </button>
            </li>
          ))}
        </ul>

      </div>
    </main>
  );
}
