'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Eye, EyeOff, Sparkles, Key, Check, AlertCircle, Loader2, 
  Palette, Shapes, PaintBucket, Bell, Smartphone, Cpu, Download, 
  LogOut, ChevronDown, ChevronRight 
} from 'lucide-react';
import BloubMascot from '@/components/BloubMascot';
import { COLORS } from '@/lib/bot/skins';
import type { Category } from '@/types/todo';
import { maskApiKey } from '@/lib/ai/quiz';

export const THEMES = [
  { id: 'bg-gray-100', name: 'Minimal', color: '#f3f4f6' },
  { id: 'bg-slate-900', name: 'Midnight', color: '#0f172a' },
  { id: 'bg-zinc-950', name: 'Abyss', color: '#09090b' },
  { id: 'bg-blue-950', name: 'Dark Blue', color: '#172554' },
  { id: 'bg-gradient-to-br from-stone-200 to-stone-300', name: 'Sand', color: '#d6d3d1' },
  { id: 'bg-gradient-to-br from-rose-100 to-pink-200', name: 'Blush', color: '#fbcfe8' },
  { id: 'bg-gradient-to-br from-blue-100 to-cyan-100', name: 'Ocean', color: '#cffafe' },
  { id: 'bg-gradient-to-br from-emerald-100 to-teal-100', name: 'Mint', color: '#ccfbf1' },
  { id: 'bg-gradient-to-br from-violet-100 to-purple-200', name: 'Lavender', color: '#e9d5ff' },
  { id: 'bg-gradient-to-br from-amber-100 to-yellow-200', name: 'Sunlight', color: '#fde68a' }
];

export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended - Fastest & High Precision)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Standard Lightweight)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Next-Gen)' }
];

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  // Theme & Mascot settings
  bgTheme?: string;
  setBgTheme?: (theme: string) => void;
  mascotShape?: string;
  mascotColor?: string;
  targetShape?: string;
  targetColor?: string;
  updateTargetShape?: (shape: string) => void;
  updateTargetColor?: (color: string) => void;
  categories?: Category[];
  catSettings?: Record<string, { shape: string; color: string }>;
  settingsTarget?: string;
  setSettingsTarget?: (target: string) => void;
  // Push notifications
  isSubscribed?: boolean;
  handlePushToggle?: () => Promise<void> | void;
  sendTestPush?: () => Promise<void> | void;
  // Auth
  onSignOut?: () => Promise<void> | void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  userId = 'default_user',
  bgTheme = 'bg-slate-900',
  setBgTheme,
  mascotShape = 'squircle',
  mascotColor = 'bleu',
  targetShape = 'squircle',
  targetColor = 'bleu',
  updateTargetShape,
  updateTargetColor,
  categories = [],
  catSettings = {},
  settingsTarget = 'global',
  setSettingsTarget,
  isSubscribed = false,
  handlePushToggle,
  sendTestPush,
  onSignOut
}: SettingsModalProps) {
  const isDark = bgTheme.includes('900') || bgTheme.includes('950') || bgTheme.includes('dark');

  const storageKey = `${userId}_geminiApiKey`;
  const storageModelKey = `${userId}_geminiModel`;

  // Local state for Gemini API key & model with lazy initialization
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) || localStorage.getItem('vibe_todos_gemini_api_key') || '';
    }
    return '';
  });

  const [model, setModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageModelKey) || localStorage.getItem('vibe_todos_gemini_model') || 'gemini-2.5-flash';
    }
    return 'gemini-2.5-flash';
  });

  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Accordion toggles
  const [showAiSettings, setShowAiSettings] = useState(true);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Handle saving API key
  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    setTestResult(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, newKey);
      localStorage.setItem('vibe_todos_gemini_api_key', newKey);
    }
  };

  // Handle saving model selection
  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageModelKey, newModel);
      localStorage.setItem('vibe_todos_gemini_model', newModel);
    }
  };

  // Test Gemini API key connection
  const handleTestConnection = async () => {
    if (!apiKey || apiKey.trim() === '') {
      setTestResult({ success: false, message: 'Please enter a Gemini API key first.' });
      return;
    }

    setIsTestingKey(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/study/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey.trim()
        },
        body: JSON.stringify({
          action: 'test-key',
          apiKey: apiKey.trim(),
          model
        })
      });

      const data = await res.json();

      if (res.ok && (data.success || data.valid)) {
        setTestResult({
          success: true,
          message: data.message || `Connected successfully to Google Gemini (${model})`
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || data.error || 'Connection failed. Please check your API key.'
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setTestResult({
        success: false,
        message: `Network error testing key: ${error.message}`
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      data-spatial-container="modal"
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className={`rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl my-auto max-h-[90vh] overflow-y-auto custom-scrollbar border ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <h2 className="text-lg font-bold">App Settings & AI</h2>
          </div>
          <button 
            onClick={onClose} 
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
          >
            <X size={18}/>
          </button>
        </div>

        {/* Mascot Preview inside Settings */}
        <div className={`flex flex-col items-center mb-6 rounded-2xl p-4 border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
          <div className="w-24 h-24 mb-3">
            <BloubMascot size={96} state="idle" expression="heureux" shape={targetShape} color={targetColor} />
          </div>
          
          {/* Horizontal Category Scroller for per-list mascot customization */}
          {setSettingsTarget && (
            <div className="w-full flex gap-2.5 overflow-x-auto pb-2 custom-scrollbar px-1">
              <button 
                onClick={() => setSettingsTarget('global')} 
                className={`flex-shrink-0 flex flex-col items-center p-2 rounded-2xl border transition-all ${
                  settingsTarget === 'global' 
                    ? 'bg-blue-500 text-white border-transparent shadow-md' 
                    : isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <BloubMascot size={32} state="idle" expression="neutre" shape={mascotShape} color={mascotColor} />
                </div>
                <span className="text-[10px] font-semibold mt-1">Global</span>
              </button>
              {categories.map(c => {
                const shape = catSettings[c.id]?.shape || (c.type === 'study' ? 'livre' : 'squircle');
                const color = catSettings[c.id]?.color || (c.type === 'study' ? 'violet' : 'bleu');
                return (
                  <button 
                    key={c.id} 
                    onClick={() => setSettingsTarget(c.id)} 
                    className={`flex-shrink-0 flex flex-col items-center p-2 rounded-2xl border transition-all ${
                      settingsTarget === c.id 
                        ? 'bg-blue-500 text-white border-transparent shadow-md' 
                        : isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <BloubMascot size={32} state="idle" expression="neutre" shape={shape} color={color} />
                    </div>
                    <span className="text-[10px] font-semibold mt-1 truncate w-14 text-center">{c.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Section 1: AI & Gemini API Key Settings */}
          <div className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-purple-950/20 border-purple-900/40' : 'bg-purple-50/60 border-purple-100'}`}>
            <button 
              type="button"
              onClick={() => setShowAiSettings(!showAiSettings)}
              className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2"
            >
              <span className="flex items-center gap-1.5">
                <Key size={14} /> Google Gemini AI Settings
              </span>
              {showAiSettings ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <AnimatePresence>
              {showAiSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3 pt-1"
                >
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Provide your unrestricted Google AI Studio Gemini API key to enable NotebookLM-style dynamic quizzing and study tutoring.
                  </p>

                  {/* API Key Input */}
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Gemini API Key
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={e => handleApiKeyChange(e.target.value)}
                        placeholder="AIzaSy..."
                        className={`w-full rounded-xl py-2.5 pl-3 pr-10 text-xs font-mono outline-none border transition-all ${
                          isDark 
                            ? 'bg-slate-900/90 border-slate-700 text-slate-100 focus:border-purple-500' 
                            : 'bg-white border-gray-200 text-gray-900 focus:border-purple-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className={`absolute right-2.5 p-1 rounded-lg transition-colors ${
                          isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700'
                        }`}
                        title={showKey ? 'Hide key' : 'Show key'}
                      >
                        {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {apiKey && !showKey && (
                      <span className={`block mt-1 text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        Masked: {maskApiKey(apiKey)}
                      </span>
                    )}
                  </div>

                  {/* Model Selection Dropdown */}
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Default Gemini Model
                    </label>
                    <select
                      value={model}
                      onChange={e => handleModelChange(e.target.value)}
                      className={`w-full rounded-xl py-2.5 px-3 text-xs outline-none border transition-all ${
                        isDark 
                          ? 'bg-slate-900/90 border-slate-700 text-slate-100 focus:border-purple-500' 
                          : 'bg-white border-gray-200 text-gray-900 focus:border-purple-500'
                      }`}
                    >
                      {GEMINI_MODELS.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Test Connection Button & Status Indicator */}
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isTestingKey || !apiKey.trim()}
                      onClick={handleTestConnection}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-md shadow-purple-600/20 transition-all active:scale-95"
                    >
                      {isTestingKey ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Testing Connection...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          Test Connection
                        </>
                      )}
                    </button>

                    {testResult && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-2 p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                          testResult.success
                            ? isDark 
                              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : isDark
                              ? 'bg-red-950/40 border-red-800 text-red-300'
                              : 'bg-red-50 border-red-200 text-red-800'
                        }`}
                      >
                        {testResult.success ? (
                          <Check size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <span className="leading-snug">{testResult.message}</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 2: App Theme Selection */}
          {setBgTheme && (
            <div>
              <button 
                onClick={() => setShowThemePicker(!showThemePicker)} 
                className={`w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2 transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Palette size={14} /> App Theme ({THEMES.find(th => th.id === bgTheme)?.name || 'Minimal'})
                </span>
                {showThemePicker ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <AnimatePresence>
                {showThemePicker && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-2 pt-1 pb-2">
                      {THEMES.map(theme => (
                        <button 
                          key={theme.id} 
                          onClick={() => setBgTheme(theme.id)}
                          className={`flex items-center gap-2 py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                            bgTheme === theme.id 
                              ? 'bg-blue-500 text-white border-transparent shadow-md' 
                              : isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-inner flex-shrink-0" style={{ backgroundColor: theme.color }} />
                          {theme.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Section 3: Mascot Shape Customizer */}
          {updateTargetShape && (
            <div>
              <button 
                onClick={() => setShowShapePicker(!showShapePicker)} 
                className={`w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2 transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span className="flex items-center gap-1.5"><Shapes size={14} /> Mascot Shape</span>
                {showShapePicker ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <AnimatePresence>
                {showShapePicker && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1 pb-2">
                      {['cercle', 'squircle', 'triangle', 'hexagone', 'nuage', 'goutte', 'galet', 'capsule', 'oeuf', 'soleil', 'fromage', 'livre'].map(s => (
                        <button 
                          key={s} 
                          onClick={() => updateTargetShape(s)}
                          className={`flex flex-col items-center justify-center py-2 rounded-xl border transition-all ${
                            targetShape === s 
                              ? 'bg-blue-500 text-white border-transparent shadow-md' 
                              : isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div className="w-7 h-7 flex items-center justify-center pointer-events-none drop-shadow-sm">
                            <BloubMascot size={28} state="idle" expression="neutre" shape={s} color={targetColor} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Section 4: Mascot Color Customizer */}
          {updateTargetColor && (
            <div>
              <button 
                onClick={() => setShowColorPicker(!showColorPicker)} 
                className={`w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2 transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span className="flex items-center gap-1.5"><PaintBucket size={14} /> Mascot Color</span>
                {showColorPicker ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <AnimatePresence>
                {showColorPicker && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-4 gap-2 pt-1 pb-2">
                      {COLORS.map(c => (
                        <button 
                          key={c.id} 
                          onClick={() => updateTargetColor(c.id)}
                          className={`flex flex-col items-center justify-center py-2 rounded-xl border transition-all ${
                            targetColor === c.id 
                              ? 'bg-blue-500 text-white border-transparent shadow-md' 
                              : isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full shadow-inner border border-black/10" style={{ backgroundColor: c.hex }} />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Section 5: Push Notifications */}
          {handlePushToggle && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handlePushToggle}
                className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl border transition-all font-semibold text-xs active:scale-95 ${
                  isSubscribed 
                    ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                    : isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Bell size={15} />
                  {isSubscribed ? 'Notifications Enabled' : 'Enable Mobile Notifications'}
                </span>
              </button>
              {isSubscribed && sendTestPush && (
                <button
                  type="button"
                  onClick={sendTestPush}
                  className="w-full mt-2 py-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Smartphone size={12} />
                  Send Test Push Notification
                </button>
              )}
            </div>
          )}

          {/* Section 6: Antigravity CLI Skill */}
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                <Cpu size={14} /> Antigravity /todo Skill
              </span>
              <a 
                href="/downloads/install-todo-skill.ps1" 
                download="install-todo-skill.ps1"
                className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                Download <Download size={10} />
              </a>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Control this app using <code className="font-mono text-[10px] font-semibold text-orange-400">/todo</code> inside Antigravity. Run:
              <code className={`block mt-1.5 p-1.5 rounded font-mono text-[10px] ${isDark ? 'bg-slate-900 text-orange-300' : 'bg-gray-100 text-orange-700'}`}>
                .\install-todo-skill.ps1
              </code>
            </p>
          </div>

          {/* Section 7: Sign Out */}
          {onSignOut && (
            <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <button
                type="button"
                onClick={onSignOut}
                className={`w-full py-2.5 px-4 font-semibold rounded-2xl transition-all active:scale-95 text-xs flex items-center justify-center gap-2 ${
                  isDark 
                    ? 'bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-900/30' 
                    : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100'
                }`}
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
