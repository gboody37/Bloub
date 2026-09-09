'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BloubMascot from '@/components/BloubMascot';
import { 
  CheckCircle2, Circle, Trash2, Plus, Settings, X, ChevronDown, ChevronRight, 
  Flag, Calendar, BarChart3, ListTodo, Edit2, MoreVertical, Palette, Shapes, 
  PaintBucket, LogOut, Download, Smartphone, Repeat, Bell, Monitor, Flame, 
  Cpu, AlertCircle, Mic, Camera, GraduationCap, BookOpen, Sparkles, Brain, 
  CheckSquare, Layers, FileText, Smile, ArrowLeft, Users, HelpCircle, Menu
} from 'lucide-react';
import { STATE_BY_ID, type StateId } from '@/lib/bot/states';
import type { ExpressionId } from '@/lib/bot/expressions';
import { COLORS } from '@/lib/bot/skins';
import { createClient } from '@/lib/supabase/client';
import { VAPID_PUBLIC_KEY } from '@/lib/push-config';
import type { Todo, Category, ListType, Subtask, Attachment } from '@/types/todo';
import NoteExplorer from '@/components/study/NoteExplorer';
import NoteViewer from '@/components/study/NoteViewer';
import QuizSession from '@/components/study/QuizSession';
import NoteGraph from '@/components/study/NoteGraph';
import type { ObsidianNoteSummary, ParsedObsidianNote } from '@/types/obsidian';
import { parseObsidianMarkdown } from '@/lib/obsidian/parser';
import { recordMutation, markMutationSynced, markMutationFailed, type MutationType } from '@/lib/storage/offline-wal';
import { getThemeVariables } from '@/lib/theme/tokens';
import MochiHeaderBadge from '@/components/mascot/MochiHeaderBadge';
import CozyParchmentReader from '@/components/study/CozyParchmentReader';
import CozyFlashcardQuiz from '@/components/study/CozyFlashcardQuiz';
import CozyDailyQuests from '@/components/todo/CozyDailyQuests';

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

const getListMascot = (cat: Category, settings: Record<string, {shape: string, color: string}>, defaultShape = 'squircle', defaultColor = 'bleu') => {
  if (cat.type === 'study') {
    return {
      shape: settings[cat.id]?.shape || 'livre',
      color: settings[cat.id]?.color || defaultColor
    };
  }
  return {
    shape: settings[cat.id]?.shape || defaultShape,
    color: settings[cat.id]?.color || defaultColor
  };
};

const getDynamicMascotProps = (shape: string, baseColor: string, pendingCount: number): { expr: ExpressionId, color: string } => {
  if (pendingCount === 0) {
    if (shape === 'soleil') return { expr: 'hilare', color: baseColor }; 
    if (shape === 'nuage') return { expr: 'heureux', color: baseColor }; 
    if (shape === 'goutte') return { expr: 'heureux', color: baseColor }; 
    return { expr: 'fier', color: baseColor }; // proud by default
  }
  
  if (pendingCount > 4) {
    if (shape === 'soleil') return { expr: 'effraye', color: 'rouge' }; // wide-eyed red sun (overheating!)
    if (shape === 'nuage') return { expr: 'colere', color: 'gris' }; // angry grey storm cloud
    if (shape === 'goutte') return { expr: 'triste', color: 'bleu' }; // crying
    if (shape === 'oeuf') return { expr: 'surpris', color: 'creme' }; // shocked / cracking egg
    return { expr: 'effraye', color: baseColor }; // stressed out
  }
  
  // Normal workload
  return { expr: 'attentif', color: baseColor };
};

export const THEMES = [
  { id: 'bg-[#141211]', name: 'Cozy Loft (Amber)', color: '#141211' },
  { id: 'bg-[#101412]', name: 'Cozy Matcha (Sage)', color: '#101412' },
  { id: 'bg-[#080d2a]', name: 'Dark Blue', color: '#080d2a' },
  { id: 'bg-[#1a0b2e]', name: 'Midnight Violet', color: '#1a0b2e' },
  { id: 'bg-[#022c22]', name: 'Emerald Night', color: '#022c22' },
  { id: 'bg-[#3b0712]', name: 'Crimson Ember', color: '#3b0712' },
  { id: 'bg-[#422006]', name: 'Solar Amber', color: '#422006' },
  { id: 'bg-[#082f49]', name: 'Abyssal Cyan', color: '#082f49' },
  { id: 'bg-[#380424]', name: 'Neon Rose', color: '#380424' },
  { id: 'bg-[#052e16]', name: 'Forest Moss', color: '#052e16' },
  { id: 'bg-[#1e1b4b]', name: 'Royal Indigo', color: '#1e1b4b' },
  { id: 'bg-[#2e0854]', name: 'Deep Plum', color: '#2e0854' },
  { id: 'bg-[#3c1605]', name: 'Burnt Bronze', color: '#3c1605' },
  { id: 'bg-[#0f172a]', name: 'Titanium Slate', color: '#0f172a' },
  { id: 'bg-[#030712]', name: 'Obsidian OLED', color: '#030712' },
  { id: 'bg-[#18181b]', name: 'Phantom Charcoal', color: '#18181b' },
  { id: 'bg-[#3b0d2d]', name: 'Mystic Magenta', color: '#3b0d2d' },
  { id: 'bg-[#0c1a30]', name: 'Arctic Navy', color: '#0c1a30' }
];

const SHAPE_IDS = ['squircle', 'cercle', 'galet', 'capsule', 'triangle', 'hexagone', 'nuage', 'goutte', 'oeuf', 'soleil', 'fromage', 'livre'];

export default function Home() {
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('default');
  const [activeTab, setActiveTab] = useState<'lists' | 'today' | 'stats' | 'settings'>('lists');
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<{file: File, type: 'image'|'video'|'audio', previewUrl?: string}[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [newCatText, setNewCatText] = useState('');
  const [newCatType, setNewCatType] = useState<ListType>('todo');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListView, setIsListView] = useState(false);
  const [isHabit, setIsHabit] = useState(false);
  const [habitDays, setHabitDays] = useState<string[]>([]);
  const [habitFrequency, setHabitFrequency] = useState(1);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // List Context Menu (Long press)
  const [listMenuId, setListMenuId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [editingListType, setEditingListType] = useState<ListType>('todo');
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Study Workflow State
  const [showStudyExplorer, setShowStudyExplorer] = useState(false);
  const [showGraphView, setShowGraphView] = useState(false);
  const [showQuizSession, setShowQuizSession] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vibe_geminiApiKey') || localStorage.getItem('guest_geminiApiKey') || '';
    }
    return '';
  });
  const [selectedNote, setSelectedNote] = useState<ParsedObsidianNote | null>(null);
  const [isFetchingNote, setIsFetchingNote] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY.current + 10) {
          setIsNavVisible(false);
        } else if (currentScrollY < lastScrollY.current - 10) {
          setIsNavVisible(true);
        }
        // Keep it visible if near the top
        if (currentScrollY < 50) {
          setIsNavVisible(true);
        }
        lastScrollY.current = currentScrollY;
        rafId = null;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Auth Effect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Gesture / Back Button Trap for PWAs
  const viewStateRef = useRef({ isListView, showSettings, showAddModal, activeTab });
  viewStateRef.current = { isListView, showSettings, showAddModal, activeTab };

  useEffect(() => {
    window.history.pushState('home', '');
    const handlePopState = () => {
      const s = viewStateRef.current;
      if (!s.isListView || s.showSettings || s.showAddModal || s.activeTab !== 'lists') {
        setIsListView(true);
        setShowSettings(false);
        setShowAddModal(false);
        setActiveTab('lists');
        window.history.pushState('home', '');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Settings Target
  const [settingsTarget, setSettingsTarget] = useState<string>('global');

  // Settings
  const [bgTheme, setBgTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vibe_bgTheme') || localStorage.getItem('guest_bgTheme');
      if (!stored || stored === 'bg-[#080d2a]') {
        try {
          localStorage.setItem('vibe_bgTheme', 'bg-[#141211]');
          localStorage.setItem('guest_bgTheme', 'bg-[#141211]');
        } catch {}
        return 'bg-[#141211]';
      }
      return stored;
    }
    return 'bg-[#141211]';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vibe_bgTheme');
      if (stored === 'bg-[#080d2a]') {
        setBgTheme('bg-[#141211]');
        localStorage.setItem('vibe_bgTheme', 'bg-[#141211]');
        localStorage.setItem('guest_bgTheme', 'bg-[#141211]');
      }
    }
  }, []);
  const [mobileViewTab, setMobileViewTab] = useState<'quests' | 'study' | 'quiz'>('quests');
  const [catSettings, setCatSettings] = useState<Record<string, {shape: string, color: string, expression?: string}>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('vibe_catSettings') || localStorage.getItem('guest_catSettings');
        return raw ? JSON.parse(raw) : {};
      } catch {}
    }
    return {};
  });

  // Global Mascot - Persistent Customization Settings (saved to storage)
  const [mascotShape, setMascotShape] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vibe_mascotShape') || localStorage.getItem('guest_mascotShape') || 'squircle';
    }
    return 'squircle';
  });
  const [mascotColor, setMascotColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vibe_mascotColor') || localStorage.getItem('guest_mascotColor') || 'bleu';
    }
    return 'bleu';
  });
  const [mascotExpression, setMascotExpression] = useState<ExpressionId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('vibe_mascotExpression') || localStorage.getItem('guest_mascotExpression') || 'timide') as ExpressionId;
    }
    return 'timide';
  });
  const [mascotGaze, setMascotGaze] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vibe_mascotGaze') || localStorage.getItem('guest_mascotGaze') || 'center';
    }
    return 'center';
  });
  const [settingsLoaded, setSettingsLoaded] = useState(true);

  // Transient Mascot Animation Reactions (ephemeral, never auto-saved)
  const [animState, setAnimState] = useState<StateId>('idle');
  const [animExpression, setAnimExpression] = useState<ExpressionId | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Backward compatibility alias
  const mascotState = animState;
  const setMascotState = setAnimState;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && session) {
      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }).catch(err => console.warn('SW Ready Error:', err));
    }
  }, [session]);

  const handlePushToggle = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported on this browser.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (isSubscribed) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          setIsSubscribed(false);
        }
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Notification permission denied.');
          return;
        }

        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
          const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        };

        const subscribeOptions = {
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        };

        const subscription = await registration.pushManager.subscribe(subscribeOptions);
        
        const res = await fetch('/api/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription })
        });

        if (res.ok) {
          setIsSubscribed(true);
          triggerMascot('wink', 'heureux');
        } else {
          alert('Failed to save subscription to server.');
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Error setting up push notifications: ' + err.message);
    }
  };

  const sendTestPush = async () => {
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Vibe Todos',
          body: 'Your mobile push notifications are fully configured!'
        })
      });
      if (res.ok) {
        triggerMascot('wink', 'heureux');
      } else {
        alert('Failed to send test push.');
      }
    } catch (err: any) {
      alert('Error sending test push: ' + err.message);
    }
  };

  // Load settings when session changes (local storage wins, Supabase as cloud fallback)
  useEffect(() => {
    if (!session) return;
    const uid = session.user?.id;
    const prefix = uid ? `${uid}_` : 'guest_';
    const meta = session.user?.user_metadata || {};
    
    // Only import from remote Supabase metadata if localStorage is empty (e.g. new browser/device)
    const localTheme = localStorage.getItem('vibe_bgTheme') || localStorage.getItem(`${prefix}bgTheme`);
    if (!localTheme && meta.bgTheme) setBgTheme(meta.bgTheme);

    const localShape = localStorage.getItem('vibe_mascotShape') || localStorage.getItem(`${prefix}mascotShape`);
    if (!localShape && meta.mascotShape) setMascotShape(meta.mascotShape);

    const localColor = localStorage.getItem('vibe_mascotColor') || localStorage.getItem(`${prefix}mascotColor`);
    if (!localColor && meta.mascotColor) setMascotColor(meta.mascotColor);

    const localExpr = localStorage.getItem('vibe_mascotExpression') || localStorage.getItem(`${prefix}mascotExpression`);
    if (!localExpr && meta.mascotExpression) setMascotExpression(meta.mascotExpression as ExpressionId);

    const localGaze = localStorage.getItem('vibe_mascotGaze') || localStorage.getItem(`${prefix}mascotGaze`);
    if (!localGaze && meta.mascotGaze) setMascotGaze(meta.mascotGaze);

    const localCat = localStorage.getItem('vibe_catSettings') || localStorage.getItem(`${prefix}catSettings`);
    if (!localCat && meta.catSettings) {
      if (typeof meta.catSettings === 'string') {
        try { setCatSettings(JSON.parse(meta.catSettings)); } catch {}
      } else if (meta.catSettings && typeof meta.catSettings === 'object') {
        setCatSettings(meta.catSettings);
      }
    }

    const localApiKey = localStorage.getItem('vibe_geminiApiKey') || localStorage.getItem(`${prefix}geminiApiKey`);
    if (!localApiKey && meta.geminiApiKey) setGeminiApiKey(meta.geminiApiKey);
  }, [session]);

  // Sync tab visibility without destructive network overwrites
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        try {
          const savedTheme = localStorage.getItem('vibe_bgTheme');
          if (savedTheme && savedTheme !== bgTheme) setBgTheme(savedTheme);
          const savedShape = localStorage.getItem('vibe_mascotShape');
          if (savedShape && savedShape !== mascotShape) setMascotShape(savedShape);
          const savedColor = localStorage.getItem('vibe_mascotColor');
          if (savedColor && savedColor !== mascotColor) setMascotColor(savedColor);
          const savedGaze = localStorage.getItem('vibe_mascotGaze');
          if (savedGaze && savedGaze !== mascotGaze) setMascotGaze(savedGaze);
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [bgTheme, mascotShape, mascotColor, mascotGaze]);

  // Save persistent customization settings (immediate localStorage + debounced Supabase sync)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const uid = session?.user?.id;
    const prefix = uid ? `${uid}_` : 'guest_';

    // 1. Immediate synchronous localStorage write
    try {
      localStorage.setItem('vibe_mascotExpression', mascotExpression);
      localStorage.setItem('vibe_mascotShape', mascotShape);
      localStorage.setItem('vibe_mascotColor', mascotColor);
      localStorage.setItem('vibe_mascotGaze', mascotGaze);
      localStorage.setItem('vibe_bgTheme', bgTheme);
      localStorage.setItem('vibe_catSettings', JSON.stringify(catSettings));

      // Compatibility with prefix
      localStorage.setItem(`${prefix}mascotExpression`, mascotExpression);
      localStorage.setItem(`${prefix}mascotShape`, mascotShape);
      localStorage.setItem(`${prefix}mascotColor`, mascotColor);
      localStorage.setItem(`${prefix}mascotGaze`, mascotGaze);
      localStorage.setItem(`${prefix}bgTheme`, bgTheme);
      localStorage.setItem(`${prefix}catSettings`, JSON.stringify(catSettings));
    } catch (e) {
      console.warn('[Settings] localStorage write warning:', e);
    }
    
    // 2. Debounced background Supabase sync
    if (session) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        supabase.auth.updateUser({
          data: {
            mascotExpression,
            mascotShape,
            mascotColor,
            mascotGaze,
            bgTheme,
            catSettings,
            geminiApiKey
          }
        }).catch(err => console.warn('[Settings] Supabase sync error:', err));
      }, 500);
    }
  }, [mascotExpression, mascotShape, mascotColor, mascotGaze, bgTheme, catSettings, geminiApiKey, session]);

  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    const activeTheme = THEMES.find(t => t.id === bgTheme);
    const themeColor = activeTheme ? activeTheme.color : '#080d2a';
    meta.setAttribute('content', themeColor);
    
    if (bgTheme !== 'minimal') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', bgTheme);
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    }

    try {
      const vars = getThemeVariables(bgTheme);
      if (vars) {
        Object.entries(vars).forEach(([prop, val]) => {
          document.documentElement.style.setProperty(prop, val);
        });
      }
    } catch (e) {
      console.warn('Failed to set theme variables:', e);
    }
  }, [bgTheme]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetAFK = () => {
      clearTimeout(timeout);
      if (animState === 'sleep') {
        setAnimState('idle');
        setAnimExpression(null);
      }
      timeout = setTimeout(() => {
        setAnimState('sleep');
        setAnimExpression('somnolent');
      }, 15000);
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
  }, [animState]);

  const resetToIdle = useCallback((currentState?: StateId) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const targetState = currentState ?? animState;
    const durationSec = STATE_BY_ID.get(targetState)?.duration ?? 2.4;
    idleTimerRef.current = setTimeout(() => {
      setAnimState('idle');
      setAnimExpression(null);
    }, durationSec * 1000);
  }, [animState]);

  const triggerMascot = useCallback((state: StateId, expr: ExpressionId, persist?: boolean) => {
    setAnimState(state);
    setAnimExpression(expr);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    if (!persist) {
      const durationSec = STATE_BY_ID.get(state)?.duration ?? 2.4;
      idleTimerRef.current = setTimeout(() => {
        setAnimState('idle');
        setAnimExpression(null);
      }, durationSec * 1000);
    }
  }, []);

  const handleSelectNote = async (noteSummary: ObsidianNoteSummary | { note: ObsidianNoteSummary }) => {
    const target = (noteSummary as any)?.note || noteSummary;
    const relPath = target?.relativePath || target?.path || target?.id;
    if (!relPath) {
      console.warn('Cannot select note without relative path:', noteSummary);
      setIsFetchingNote(false);
      return;
    }
    setIsFetchingNote(true);
    triggerMascot('thinking', 'curieux');
    try {
      const res = await fetch('/api/obsidian/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notePath: relPath })
      });
      const data = await res.json();
      if (res.ok && data.note) {
        setSelectedNote(data.note);
        triggerMascot('orbit', 'heureux');
      } else {
        triggerMascot('alert', 'mefiant');
        alert('Failed to load note: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      triggerMascot('alert', 'triste');
    } finally {
      setIsFetchingNote(false);
    }
  };

  const handleUpdateNote = useCallback(async (updatedContent: string) => {
    if (!selectedNote) return;

    const parsed = parseObsidianMarkdown(
      updatedContent,
      selectedNote.relativePath || selectedNote.id,
      selectedNote.absolutePath
    );

    const updatedNote: ParsedObsidianNote = {
      ...selectedNote,
      ...parsed,
      id: selectedNote.id,
      title: parsed.title || selectedNote.title,
      folder: selectedNote.folder || parsed.folder,
      relativePath: selectedNote.relativePath || parsed.relativePath,
      rawContent: updatedContent,
      bodyContent: parsed.bodyContent
    };

    setSelectedNote(updatedNote);

    const notePayload = {
      userId: session?.user?.id,
      notes: [{
        title: updatedNote.title,
        path: (updatedNote as any).path || updatedNote.relativePath || updatedNote.id,
        content: updatedContent,
        folder: updatedNote.folder,
        tags: updatedNote.tags,
        word_count: updatedNote.wordCount || updatedContent.split(/\s+/).length
      }]
    };

    let walId: string | null = null;
    try {
      walId = await recordMutation({
        type: 'UPDATE_NOTE',
        payload: notePayload
      });
    } catch (walErr) {
      console.warn('[OfflineWAL] Failed to record note mutation in handleUpdateNote:', walErr);
    }

    try {
      const res = await fetch('/api/obsidian/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notePayload)
      });
      if (res.ok && walId) {
        await markMutationSynced(walId);
      } else if (!res.ok && walId) {
        await markMutationFailed(walId, `HTTP ${res.status}`);
      }
    } catch (e: any) {
      console.error('Failed to save note update', e);
      if (walId) {
        await markMutationFailed(walId, e?.message || 'Network error');
      }
    }
  }, [selectedNote, session?.user?.id]);

  const fetchTodos = async () => {
    if (!session) return;
    const res = await fetch('/api/data');
    if (res.status === 401) return;
    const data = await res.json();
    
    // Auto-clear logic: Clear completed tasks (non-habit) every 12 hours
    const uid = session.user.id;
    const lastClear = localStorage.getItem(`${uid}_lastClear`);
    const now = Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;
    
    let currentTodos = data.todos;
    
    if (!lastClear || now - parseInt(lastClear) > twelveHours) {
      const hasCompleted = currentTodos.some((t: any) => t.completed && !t.isHabit);
      if (hasCompleted) {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'CLEAR_COMPLETED' })
        });
        currentTodos = currentTodos.filter((t: any) => !t.completed || t.isHabit);
      }
      localStorage.setItem(`${uid}_lastClear`, now.toString());
    }

    setTodos(currentTodos);
    
    let cats = data.categories || [];
    if (!cats.find((c: any) => c.id === 'default')) {
      cats = [{ id: 'default', name: 'General', type: 'todo' as ListType }, ...cats];
    }
    // Merge localStorage fallback types (for when DB column doesn't exist yet)
    const storedTypes = session?.user?.user_metadata?.listTypes || JSON.parse(localStorage.getItem(session?.user?.id + '_listTypes') || '{}');
    cats = cats.map((c: any) => {
      const dbType = c.type === 'study' ? 'study' : undefined;
      const localType = storedTypes[c.id];
      return { ...c, type: (dbType || localType || 'todo') as ListType };
    });
    setCategories(cats);
  };

  useEffect(() => {
    if (session) {
      fetchTodos();
    }
  }, [session]);

  const mutate = async (body: any) => {
    if (!session) return;

    // Durable Offline WAL logging before network fetch
    const mutationType: MutationType = body?.type?.includes('CATEGORY') ? 'MUTATE_CATEGORY' : 'MUTATE_TODO';
    let walId: string | null = null;
    try {
      walId = await recordMutation({
        type: mutationType,
        payload: body
      });
    } catch (walErr) {
      console.warn('[OfflineWAL] Failed to record mutation in mutate():', walErr);
    }

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.status === 401) return;
      if (!res.ok) {
        if (walId) await markMutationFailed(walId, `HTTP ${res.status}: ${res.statusText}`);
        return;
      }

      if (walId) {
        await markMutationSynced(walId);
      }

      const data = await res.json();
      setTodos(data.todos);
      
      let cats = data.categories || [];
      if (!cats.find((c: any) => c.id === 'default')) {
        cats = [{ id: 'default', name: 'General', type: 'todo' as ListType }, ...cats];
      }
      const storedTypes2 = session?.user?.user_metadata?.listTypes || JSON.parse(localStorage.getItem(session?.user?.id + '_listTypes') || '{}');
      cats = cats.map((c: any) => {
        const dbType = c.type === 'study' ? 'study' : undefined;
        const localType = storedTypes2[c.id];
        return { ...c, type: (dbType || localType || 'todo') as ListType };
      });
      setCategories(cats);
      
      return data;
    } catch (err: any) {
      console.warn('[mutate] Network request failed, mutation queued in offline WAL:', err);
      if (walId) {
        await markMutationFailed(walId, err?.message || 'Network error');
      }
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) {
      triggerMascot('idle', 'mefiant');
      return;
    }
    setIsSubmitting(true);
    triggerMascot('wide', 'surpris');
    
    const uploadedAttachments: Attachment[] = [];
    if (pendingAttachments.length > 0) {
      for (const att of pendingAttachments) {
        const fileExt = att.file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data, error } = await supabase.storage.from('media').upload(fileName, att.file);
        
        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
          uploadedAttachments.push({ type: att.type, url: publicUrl, name: att.file.name });
        }
      }
    }

    await mutate({ 
      type: 'ADD_TODO', 
      text: inputText, 
      categoryId: activeCategory,
      isHabit,
      habitFrequency,
      habitDays,
      attachments: uploadedAttachments
    });
    setInputText('');
    setPendingAttachments([]);
    setIsHabit(false);
    setHabitDays([]);
    setHabitFrequency(1);
    setShowAddModal(false);
    setIsSubmitting(false);
  };

  const addTodoWithText = async (text: string, categoryId?: string) => {
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    triggerMascot('wide', 'heureux');
    await mutate({
      type: 'ADD_TODO',
      text: text.trim(),
      categoryId: categoryId || activeCategory,
      isHabit: false,
      habitFrequency: 1,
      habitDays: [],
      attachments: []
    });
    setIsSubmitting(false);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      triggerMascot('idle', 'heureux');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
          setPendingAttachments(prev => [...prev, { file, type: 'audio' }]);
          stream.getTracks().forEach(t => t.stop());
        };
        
        mediaRecorder.start();
        setIsRecording(true);
        triggerMascot('wide', 'surpris');
      } catch (err) {
        alert('Microphone permission denied.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newAtts = files.map(file => ({
        file,
        type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
        previewUrl: URL.createObjectURL(file)
      }));
      setPendingAttachments(prev => [...prev, ...newAtts]);
    }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    triggerMascot('orbit', 'heureux');
    const newId = Date.now().toString();
    // Optimistically add to local state with the correct type
    setCategories(prev => [...prev, { id: newId, name: newCatText.trim(), type: newCatType }]);
    // Persist type to localStorage as fallback
    const storedTypes = session?.user?.user_metadata?.listTypes || JSON.parse(localStorage.getItem(session?.user?.id + '_listTypes') || '{}');
    storedTypes[newId] = newCatType;
    localStorage.setItem(session?.user?.id + '_listTypes', JSON.stringify(storedTypes)); supabase.auth.updateUser({ data: { listTypes: storedTypes } }).catch(console.error);
    await mutate({ 
      type: 'ADD_CATEGORY', 
      name: newCatText.trim(),
      categoryType: newCatType,
      listType: newCatType
    });
    setNewCatText('');
    setNewCatType('todo');
    setIsSubmitting(false);
  };

  const deleteCategory = async (id: string) => {
    if (id === 'default') return;
    if (confirm('Delete this list?')) {
      triggerMascot('idle', 'triste');
      setCategories(categories.filter(c => c.id !== id));
      if (activeCategory === id) setActiveCategory('default');
      await mutate({ type: 'DELETE_CATEGORY', id });
    }
    setListMenuId(null);
  };
  
  const saveCategory = async (id: string) => {
    if (!editingListName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await mutate({ 
      type: 'UPDATE_CATEGORY', 
      id, 
      name: editingListName.trim(),
      categoryType: editingListType,
      listType: editingListType
    });
    setEditingListId(null);
    setListMenuId(null);
    setIsSubmitting(false);
  };

  const handleCategoryPressIn = (cat: Category) => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      setListMenuId(cat.id);
      setEditingListType(cat.type || 'todo');
      triggerMascot('alert', 'curieux');
    }, 500); // 500ms long press
  };

  const handleCategoryPressOut = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleCategoryClick = (cat: Category) => {
    if (listMenuId === cat.id || editingListId === cat.id) return;
    setActiveCategory(cat.id);
    setIsListView(false);
    triggerMascot('alert', 'excite');
  };

  const incrementHabit = async (todo: Todo) => {
    const currentCount = todo.habitCompletedCount || 0;
    const freq = todo.habitFrequency || 1;
    const isNextCompleted = currentCount + 1 >= freq;
    
    // Optimistic UI updates
    const updatedTodos = todos.map(t => t.id === todo.id ? { 
      ...t, 
      habitCompletedCount: todo.completed ? 0 : currentCount + 1,
      completed: todo.completed ? false : isNextCompleted
    } : t);
    setTodos(updatedTodos);

    if (todo.completed) {
      triggerMascot('idle', 'neutre');
    } else if (isNextCompleted) {
      triggerMascot('orbit', 'fier');
      setTimeout(() => triggerMascot('idle', 'blase'), 3500);
    } else {
      triggerMascot('wink', 'heureux');
      resetToIdle();
    }

    await mutate({ 
      type: 'INCREMENT_HABIT', 
      id: todo.id,
      newCount: todo.completed ? 0 : currentCount + 1,
      isCompleted: todo.completed ? false : isNextCompleted
    });
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
    setTodos(todos.filter(t => t.id !== id));
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

  const activeCatObj: Category = categories.find(c => c.id === activeCategory) || { id: 'default', name: 'General', type: 'todo' };
  
  const showListHero = !isListView && activeTab === 'lists';
  const heroShape = showListHero ? getListMascot(activeCatObj, catSettings, mascotShape, mascotColor).shape : mascotShape;
  const heroColor = showListHero ? getListMascot(activeCatObj, catSettings, mascotShape, mascotColor).color : mascotColor;
  
  const isGlobalTarget = settingsTarget === 'global';
  const targetCatObj: Category = categories.find(c => c.id === settingsTarget) || { id: 'default', name: 'General', type: 'todo' };
  const targetShape = isGlobalTarget ? mascotShape : (catSettings[settingsTarget]?.shape || getListMascot(targetCatObj, catSettings, mascotShape, mascotColor).shape);
  const targetColor = isGlobalTarget ? mascotColor : (catSettings[settingsTarget]?.color || getListMascot(targetCatObj, catSettings, mascotShape, mascotColor).color);
  const targetExpr: ExpressionId = (isGlobalTarget ? mascotExpression : (catSettings[settingsTarget]?.expression as ExpressionId)) || 'neutre';

  const updateTargetShape = (s: string) => {
    if (isGlobalTarget) {
      setMascotShape(s);
      try {
        localStorage.setItem('vibe_mascotShape', s);
        localStorage.setItem('guest_mascotShape', s);
      } catch {}
      if (session) {
        supabase.auth.updateUser({ data: { mascotShape: s } }).catch(console.error);
      }
    } else {
      setCatSettings(prev => {
        const next = {
          ...prev,
          [settingsTarget]: {
            ...prev[settingsTarget],
            shape: s,
            color: prev[settingsTarget]?.color || targetColor,
            expression: prev[settingsTarget]?.expression || 'neutre'
          }
        };
        try {
          localStorage.setItem('vibe_catSettings', JSON.stringify(next));
          localStorage.setItem('guest_catSettings', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  };

  const updateTargetColor = (c: string) => {
    if (isGlobalTarget) {
      setMascotColor(c);
      try {
        localStorage.setItem('vibe_mascotColor', c);
        localStorage.setItem('guest_mascotColor', c);
      } catch {}
      if (session) {
        supabase.auth.updateUser({ data: { mascotColor: c } }).catch(console.error);
      }
    } else {
      setCatSettings(prev => {
        const next = {
          ...prev,
          [settingsTarget]: {
            ...prev[settingsTarget],
            shape: prev[settingsTarget]?.shape || targetShape,
            color: c,
            expression: prev[settingsTarget]?.expression || 'neutre'
          }
        };
        try {
          localStorage.setItem('vibe_catSettings', JSON.stringify(next));
          localStorage.setItem('guest_catSettings', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  };

  const updateTargetExpr = (expr: string) => {
    if (isGlobalTarget) {
      setMascotExpression(expr as any);
      try {
        localStorage.setItem('vibe_mascotExpression', expr);
        localStorage.setItem('guest_mascotExpression', expr);
      } catch {}
      if (session) {
        supabase.auth.updateUser({ data: { mascotExpression: expr } }).catch(console.error);
      }
    } else {
      setCatSettings(prev => {
        const next = {
          ...prev,
          [settingsTarget]: {
            ...prev[settingsTarget],
            shape: prev[settingsTarget]?.shape || targetShape,
            color: prev[settingsTarget]?.color || targetColor,
            expression: expr
          }
        };
        try {
          localStorage.setItem('vibe_catSettings', JSON.stringify(next));
          localStorage.setItem('guest_catSettings', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
    triggerMascot('idle', expr as any, true);
  };

  // Theme Logic
    // User requested ONLY dark themes. bgTheme is a hex color (e.g. bg-[#1e1e2e]), 
    // so we use generic dark glassy translucent styles that overlay nicely on ANY hex color.
    const isDark = true; 
    
    const tc = {
      card: 'bg-black/20 border border-white/10 hover:border-white/20 hover:bg-black/30 backdrop-blur-md text-white',
      cardMuted: 'bg-black/40 border-black/50 backdrop-blur-md text-slate-300',
      nav: 'bg-black/40 border-t border-white/5 backdrop-blur-xl',
      input: 'bg-black/30 border-white/10 text-white placeholder-white/40 focus:border-white/30 backdrop-blur-md'
    };

  const t = {
    textPrimary: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-slate-300' : 'text-gray-600',
    textMuted: isDark ? 'text-slate-500' : 'text-gray-500',
    card: tc.card + ' shadow-sm',
    cardMuted: tc.cardMuted,
    input: tc.input,
    nav: tc.nav + ' ',
    iconCircle: isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-100 text-gray-600',
    pillActive: isDark ? 'bg-slate-700 border-slate-500 text-white shadow-md scale-105' : 'bg-white border-gray-400 text-gray-900 shadow-md scale-105',
    pillInactive: isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
  };

  if (loadingAuth) {
    return <div className={`min-h-screen ${bgTheme} flex flex-col items-center justify-center`} suppressHydrationWarning><BloubMascot size={96} state="idle" expression="heureux" shape={mascotShape} color={mascotColor} /><p className="mt-4 text-gray-500 text-sm font-medium animate-pulse">Loading...</p></div>;
  }

  if (!session) {
    return (
      <div className={`min-h-screen ${bgTheme} flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500`}>
        <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} className={`max-w-sm w-full p-8 rounded-3xl shadow-xl ${t.card} relative z-10 text-center flex flex-col items-center`}>
          <div className="mb-8 drop-shadow-xl"><BloubMascot size={120} state="idle" expression="hilare" shape="soleil" color="ambre" /></div>
          <h1 className={`text-2xl font-bold mb-2 tracking-tight ${t.textPrimary}`}>Vibe Todos</h1>
          <p className={`text-sm mb-8 leading-relaxed ${t.textSecondary}`}>Sign in to sync your tasks and personal vibes across all your devices.</p>
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/api/auth/callback`, queryParams: { prompt: 'select_account' } } })} className="w-full py-3.5 px-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-center gap-3 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all active:scale-95">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
            Continue with Google
          </button>

          <button onClick={() => setShowDownloadMenu(true)} className={`mt-3 w-full py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-95 border ${
            isDark 
              ? 'bg-slate-800 border-slate-700/60 text-slate-200 hover:bg-slate-700' 
              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}>
            <Download size={16} />
            Download App
          </button>
        </motion.div>

        {/* Download Menu Modal (Login Page) */}
        {showDownloadMenu && (
          <div className="fixed inset-0 bg-black/40  z-50 flex items-center justify-center p-6 text-left"
            onClick={() => setShowDownloadMenu(false)}>
            <div className={`rounded-3xl p-7 max-w-sm w-full shadow-2xl animate-pop-in ${isDark ? 'bg-slate-900 border border-slate-800 text-slate-100' : 'bg-white text-gray-900'}`}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Download Vibe Todos</h2>
                <button onClick={() => setShowDownloadMenu(false)} className={`p-1.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-700'}`}><X size={18}/></button>
              </div>
              
              <div className="space-y-3 pt-2">
                {/* Android APK Download Option */}
                <a 
                  href="/downloads/Todos.apk" 
                  download="Todos.apk"
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl border transition-all font-semibold text-sm ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Smartphone size={18} className="text-green-500" />
                    Android Installer (APK)
                  </span>
                  <Download size={14} className="opacity-60" />
                </a>

                {/* Windows Setup Installer Option */}
                <a 
                  href="/downloads/VibeTodosSetup.exe" 
                  download="VibeTodosSetup.exe"
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl border transition-all font-semibold text-sm ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Monitor size={18} className="text-blue-500" />
                    <span className="text-left">
                      Windows Setup Installer (EXE)
                      <span className="block text-[10px] font-normal opacity-60">Installs app, creates desktop & start menu shortcuts</span>
                    </span>
                  </span>
                  <Download size={14} className="opacity-60" />
                </a>

                {/* Web App PWA Installer Option */}
                <button 
                  onClick={() => {
                    setShowDownloadMenu(false);
                    setShowInstallGuide(true);
                  }}
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl border transition-all font-semibold text-sm text-left ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Smartphone size={18} className="text-indigo-500" />
                    Install Web App (PWA Guide)
                  </span>
                  <ChevronRight size={14} className="opacity-60" />
                </button>

              </div>
            </div>
          </div>
        )}

        {/* PWA Install Guide Modal (Login Page) */}
        {showInstallGuide && (
          <div className="fixed inset-0 bg-black/40  z-50 flex items-center justify-center p-6 text-left"
            onClick={() => setShowInstallGuide(false)}>
            <div className={`rounded-3xl p-7 max-w-sm w-full shadow-2xl animate-pop-in ${isDark ? 'bg-slate-900 border border-slate-800 text-slate-100' : 'bg-white text-gray-900'}`}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Install Web App (PWA)</h2>
                <button onClick={() => setShowInstallGuide(false)} className={`p-1.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-700'}`}><X size={18}/></button>
              </div>

              <div className="space-y-5">
                <div className="flex gap-3 items-start">
                  <Smartphone size={20} className="text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">iPhone & iPad (Safari)</h4>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Tap the share icon <span className="font-semibold">"Share"</span> at the bottom of Safari, and select <span className="font-semibold">"Add to Home Screen"</span>.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Smartphone size={20} className="text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Android / Chrome / Brave</h4>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Tap the menu dots in the top-right and select <span className="font-semibold">"Install App"</span> or <span className="font-semibold">"Add to Home Screen"</span>.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Monitor size={20} className="text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Firefox / Other Browsers</h4>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Look for the install or download icon in the URL search bar, or use Chrome/Brave/Edge to install as a desktop shortcut.</p>
                  </div>
                </div>
              </div>
              
              <button onClick={() => setShowInstallGuide(false)} className="mt-6 w-full bg-blue-600 text-white font-semibold py-3.5 rounded-2xl shadow-md hover:bg-blue-700 transition-all active:scale-95">
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full ${bgTheme} transition-colors duration-500 font-sans`} suppressHydrationWarning>
      <main className={`w-full ${selectedNote ? 'max-w-[100vw] px-0 md:px-4' : 'max-w-[1440px] px-4 sm:px-6 lg:px-8'} mx-auto ${selectedNote ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-[100dvh] pb-24'} flex flex-col relative transition-all duration-500`}>
        {/* Cozy Loft Top Header */}
        {activeTab !== 'settings' && !selectedNote && (
          <header className="pt-6 pb-5 flex justify-between items-center transition-colors">
            {/* Left: Brand with amber crescent */}
            <div 
              className="flex items-center gap-2 cursor-pointer group select-none" 
              onClick={() => { setActiveTab('lists'); setIsListView(false); }}
            >
              <span className="text-amber-500 font-bold text-xl select-none group-hover:scale-110 transition-transform">(</span>
              <span className="text-lg font-bold tracking-tight text-stone-100 font-sans">
                Bloub
              </span>
            </div>

            {/* Center: Mochi Header Badge */}
            <div className="flex items-center justify-center">
              <MochiHeaderBadge
                statusText={
                  totalCount === 0
                    ? 'Bloub is resting'
                    : completedCount === totalCount
                    ? 'All quests complete!'
                    : 'Bloub is studying'
                }
                themeType={bgTheme === 'bg-[#101412]' ? 'matcha' : 'amber'}
                onClick={() => {
                  const nextTheme = bgTheme === 'bg-[#101412]' ? 'bg-[#141211]' : 'bg-[#101412]';
                  setBgTheme(nextTheme);
                  try {
                    localStorage.setItem('vibe_bgTheme', nextTheme);
                    localStorage.setItem('guest_bgTheme', nextTheme);
                  } catch {}
                }}
              />
            </div>

            {/* Right: Three ghost icon buttons matching mockup */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextTheme = bgTheme === 'bg-[#101412]' ? 'bg-[#141211]' : 'bg-[#101412]';
                  setBgTheme(nextTheme);
                  try {
                    localStorage.setItem('vibe_bgTheme', nextTheme);
                    localStorage.setItem('guest_bgTheme', nextTheme);
                  } catch {}
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-300 transition-colors"
                title="Theme: Amber / Matcha"
              >
                <Users className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowInstallGuide(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-300 transition-colors"
                title="Help & Shortcuts"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-200 bg-[#211c18] border border-[#302822] shadow-sm transition-colors"
                title="Menu & Settings"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </header>
        )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/15 z-50 flex items-end pb-36 justify-center sm:items-center sm:pb-6 p-4"
          onClick={() => setShowAddModal(false)}>
          <div className={`rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl animate-pop-in ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-semibold ${t.textPrimary}`}>New Task</h2>
              <button onClick={() => setShowAddModal(false)} className={`p-1.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-700'}`}><X size={18}/></button>
            </div>
            
            <form onSubmit={addTodo}>
              <textarea
                dir="auto"
                autoFocus
                value={inputText}
                onChange={e => {
                  setInputText(e.target.value);
                }}
                onFocus={(e) => {
                  triggerMascot('thinking', 'curieux', true);
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                placeholder="What needs to be done?"
                rows={3}
                className={`w-full rounded-2xl py-4 px-4 text-base font-medium transition-all mb-4 outline-none resize-none custom-scrollbar ${t.input}`}
              />

              {/* Attachments Preview */}
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 px-1">
                  {pendingAttachments.map((att, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 h-16 w-16 flex items-center justify-center">
                      {att.type === 'image' && <img src={att.previewUrl} className="object-cover w-full h-full" alt="preview" />}
                      {att.type === 'video' && <video src={att.previewUrl} className="object-cover w-full h-full" />}
                      {att.type === 'audio' && <Mic size={24} className="text-blue-500" />}
                      <button type="button" onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-xl p-1 opacity-80 hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Media Controls */}
              <div className="flex items-center gap-3 mb-4 px-1">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Mic size={20} />
                </button>
                <label className={`p-3 rounded-full cursor-pointer transition-all ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <Camera size={20} />
                  <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleFileSelect} />
                </label>
              </div>

              {/* Habit Toggle */}
              <div className="flex items-center justify-between mb-4 px-1">
                <span className={`text-sm font-semibold ${t.textPrimary}`}>Make it a Habit</span>
                <button
                  type="button"
                  onClick={() => setIsHabit(!isHabit)}
                  className={`w-11 h-6 rounded-full transition-all relative outline-none ${
                    isHabit ? 'bg-blue-600' : isDark ? 'bg-slate-800' : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-md ${
                    isHabit ? 'left-5.5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Habit Details (Days & Frequency) */}
              <AnimatePresence>
                {isHabit && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }} 
                    className="space-y-4 mb-5 overflow-hidden"
                  >
                    {/* Days Selector */}
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${t.textMuted}`}>Repeat Days (Leave empty for every day)</span>
                      <div className="flex justify-between gap-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                          const isSelected = habitDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setHabitDays(habitDays.filter(d => d !== day));
                                } else {
                                  setHabitDays([...habitDays, day]);
                                }
                              }}
                              className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                                isSelected 
                                  ? 'bg-blue-600 text-white border-transparent' 
                                  : isDark 
                                    ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700' 
                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {day[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Frequency Selector */}
                    <div className="flex items-center justify-between border-t border-dashed border-gray-100 dark:border-slate-800 pt-3">
                      <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>Times per day</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setHabitFrequency(Math.max(1, habitFrequency - 1))}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold border transition-all ${
                            isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          -
                        </button>
                        <span className={`font-bold text-sm w-4 text-center ${t.textPrimary}`}>{habitFrequency}</span>
                        <button
                          type="button"
                          onClick={() => setHabitFrequency(Math.min(10, habitFrequency + 1))}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold border transition-all ${
                            isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={!inputText.trim() || isSubmitting}
                className="w-full bg-blue-600 text-white font-semibold py-4 rounded-2xl shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
              >
                {isSubmitting ? 'Saving...' : 'Save Task'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Area or Settings */}
      {activeTab === 'settings' ? (
          <div className="flex-1 w-full flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-300 md:shadow-2xl md:my-6 md:rounded-3xl md:border md:border-white/10">
            {/* Left side: HUGE MASCOT */}
            <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-1 items-center justify-center bg-slate-900/40 relative overflow-visible">
                <div className="cursor-pointer hover:scale-105 transition-transform duration-300 overflow-visible" onClick={() => triggerMascot('orbit', targetExpr)}>
                  <BloubMascot size={320} state={animState} expression={targetExpr} shape={targetShape} color={targetColor} isStatic={false} />
                </div>
            </div>

            {/* Right side: Settings controls */}
            <div className="w-full md:w-1/2 lg:w-2/5 h-full overflow-y-auto custom-scrollbar pb-32 pt-6 px-6 bg-slate-900/90 dark:bg-slate-900 border-l border-slate-800">
              
              {/* Mascot Preview inside Settings */}
              <div className="bg-slate-900 rounded-3xl p-4 mb-6 border border-slate-800 flex flex-col items-center">
                <div className="w-32 h-32 flex items-center justify-center mb-4 cursor-pointer hover:scale-105 transition-transform duration-300 overflow-visible" onClick={() => triggerMascot('orbit', targetExpr)}>
                  <BloubMascot size={120} state={animState} expression={targetExpr} shape={targetShape} color={targetColor} isStatic={false} />
                </div>

                {/* Horizontal Category Scroller */}
                <div className="w-full flex gap-2.5 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar scroll-smooth border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setSettingsTarget('global')}
                    className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-2xl border transition-all ${
                      settingsTarget === 'global'
                        ? 'bg-slate-700/90 border-blue-500 text-white shadow-md scale-105 ring-1 ring-blue-500/30'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center pointer-events-none">
                      <BloubMascot size={48} state="idle" expression={mascotExpression} shape={mascotShape} color={mascotColor} isStatic={true} />
                    </div>
                    <span className="text-[10px] font-bold mt-1 tracking-wide uppercase">Global</span>
                  </button>
                  {categories.map(cat => {
                    const { shape: cShape, color: cColor } = getListMascot(cat, catSettings);
                    const cExpr = (catSettings[cat.id]?.expression as ExpressionId) || 'neutre';
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSettingsTarget(cat.id)}
                        className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-2xl border transition-all ${
                          settingsTarget === cat.id
                            ? 'bg-slate-700/90 border-blue-500 text-white shadow-md scale-105 ring-1 ring-blue-500/30'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <div className="w-8 h-8 flex items-center justify-center pointer-events-none">
                          <BloubMascot size={48} state="idle" expression={cExpr} shape={cShape} color={cColor} isStatic={true} />
                        </div>
                        <span className="text-[10px] font-bold mt-1 tracking-wide uppercase truncate w-12 text-center">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shape Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <Shapes size={14} /> Shape
                  </span>
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider capitalize">
                    {targetShape}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {SHAPE_IDS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateTargetShape(s)}
                      className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 transition-all cursor-pointer p-1 ${
                        targetShape === s
                          ? 'bg-slate-800 border-blue-500 shadow-md ring-2 ring-blue-500/30 ring-offset-1 ring-offset-slate-900 scale-105'
                          : isDark
                            ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      title={s}
                    >
                      <BloubMascot size={48} state="idle" expression="neutre" shape={s} color={targetColor} isStatic={true} />
                      <span className="text-[9px] font-bold text-slate-400 capitalize truncate max-w-[50px] text-center mt-0.5">{s}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expression Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <Smile size={14} /> Expression
                  </span>
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider capitalize">
                    {targetExpr}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['neutre', 'attentif', 'surpris', 'excite', 'heureux', 'hilare', 'colere', 'triste', 'effraye', 'mefiant', 'curieux', 'fier', 'timide', 'blase'].map(expr => (
                    <button
                      key={expr}
                      type="button"
                      onClick={() => updateTargetExpr(expr)}
                      className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 transition-all cursor-pointer p-1 ${
                        targetExpr === expr
                          ? 'bg-slate-800 border-blue-500 shadow-md ring-2 ring-blue-500/30 ring-offset-1 ring-offset-slate-900 scale-105'
                          : isDark
                            ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      title={expr}
                    >
                      <BloubMascot size={48} state="idle" expression={expr as any} shape="squircle" color={targetColor} isStatic={true} />
                      <span className="text-[9px] font-bold text-slate-400 capitalize truncate max-w-[50px] text-center mt-0.5">{expr}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Section */}
              <div className="mb-6">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  <PaintBucket size={14} /> Colour
                </span>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => updateTargetColor(c.id)}
                      className={`flex aspect-square items-center justify-center rounded-full transition-all cursor-pointer ${
                        targetColor === c.id
                          ? 'ring-2 ring-blue-500 ring-offset-[3px] ring-offset-[#0f172a] scale-110 shadow-md'
                          : 'hover:scale-110 hover:ring-2 hover:ring-slate-500 hover:ring-offset-[2px] hover:ring-offset-[#0f172a]'
                      }`}
                      aria-label={c.id}
                      title={c.id}
                    >
                      <span
                        className="block w-6 h-6 rounded-full ring-1 ring-black/20 ring-inset shadow-inner"
                        style={{ backgroundColor: c.hex }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Section */}
              <div className="mb-6">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  <Palette size={14} /> Theme
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setBgTheme(theme.id)}
                      className={`flex items-center gap-2 py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                        bgTheme === theme.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md font-semibold'
                          : isDark
                            ? 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700/80 hover:text-white'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-inner flex-shrink-0" style={{ backgroundColor: theme.color }} />
                      <span className="truncate">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>


              {/* Push Notifications Section */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePushToggle}
                  className={`w-full flex items-center justify-between py-3.5 px-4 rounded-2xl border transition-all font-semibold text-sm active:scale-95 ${
                    isSubscribed 
                      ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                      : isDark
                        ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Bell size={16} />
                    {isSubscribed ? 'Notifications Enabled' : 'Enable Mobile Notifications'}
                  </span>
                </button>
                {isSubscribed && (
                  <button
                    type="button"
                    onClick={sendTestPush}
                    className="w-full mt-2 py-2 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Smartphone size={12} />
                    Send Test Push Notification
                  </button>
                )}
              </div>
  
              {/* AI Configuration Section */}
                <div className="mt-8 flex flex-col gap-5 relative">
                  
                  {/* NotebookLM API */}
                  <div className="flex flex-col gap-3">
                    <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <Sparkles size={12} className="text-purple-400" /> NOTEBOOKLM API
                    </span>
                    <div className="relative group">
                      <input
                        type="password"
                        placeholder="Paste your Gemini API Key..."
                        value={geminiApiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGeminiApiKey(val);
                          try {
                            localStorage.setItem('vibe_geminiApiKey', val);
                            localStorage.setItem('guest_geminiApiKey', val);
                          } catch {}
                        }}
                        onBlur={() => {
                          try {
                            localStorage.setItem('vibe_geminiApiKey', geminiApiKey);
                            localStorage.setItem('guest_geminiApiKey', geminiApiKey);
                          } catch {}
                          if (session) {
                            supabase.auth.updateUser({ data: { geminiApiKey } }).catch(console.error);
                          }
                        }}
                        className={`w-full px-4 py-3.5 text-xs font-mono rounded-2xl border-2 outline-none transition-all shadow-inner ${isDark ? 'bg-[#0f111a] border-slate-800 text-slate-300 focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 placeholder:text-slate-700' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10'}`}
                      />
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 pointer-events-none"></div>
                    </div>
                    <p className="text-[10px] px-1 text-slate-500 font-medium">
                      Gemini 1.5 is <strong className="text-purple-400 font-bold">100% free with no limits</strong> for personal use. Get your free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 hover:text-blue-300 transition-colors">aistudio.google.com</a>.
                    </p>
                  </div>
      
                  {/* Antigravity CLI Skill Option */}
                  <div className={`p-4 rounded-2xl border-2 relative overflow-hidden group transition-all ${isDark ? 'bg-[#0f111a] border-slate-800 hover:border-orange-500/30' : 'bg-slate-50 border-gray-200 hover:border-orange-400/50'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-all group-hover:bg-orange-500/10"></div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
                        <Cpu size={12} /> ANTIGRAVITY /TODO SKILL
                      </span>
                      <a 
                        href="/downloads/install-todo-skill.ps1" 
                        download="install-todo-skill.ps1"
                        className="text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-full transition-colors"
                      >
                        Download <Download size={10} />
                      </a>
                    </div>
                    <p className={`text-[11px] leading-relaxed relative z-10 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Control this app using <code className="font-mono font-bold text-orange-400">/todo</code> inside Antigravity. Download the script, open PowerShell, and run:
                      <code className={`block mt-2 p-2.5 rounded-xl font-mono text-[10px] border ${isDark ? 'bg-black/40 border-white/5 text-orange-300' : 'bg-white border-gray-200 text-orange-600 shadow-sm'}`}>
                        .\install-todo-skill.ps1
                      </code>
                    </p>
                  </div>
                  
                  {/* Sign Out Button */}
                  <div className="pt-2 mt-2">
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setTodos([]);
                        setCategories([]);
                        setShowSettings(false);
                      }}
                      className={`w-full py-3.5 px-4 font-bold tracking-wide uppercase rounded-2xl transition-all active:scale-95 text-[11px] flex items-center justify-center gap-2 border-2 shadow-sm ${
                        isDark 
                          ? 'bg-[#0f111a] hover:bg-red-950/20 text-red-500 border-slate-800 hover:border-red-900/50 hover:shadow-red-900/20' 
                          : 'bg-white hover:bg-red-50 text-red-600 border-gray-200 hover:border-red-200 hover:shadow-red-500/10'
                      }`}
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
            </div>
          </div>

        ) : (
          /* Main Content Area */
        <div className={`flex-1 relative flex flex-col min-h-0 ${selectedNote ? 'p-0 h-full' : 'py-2'}`}>

        {/* Cozy Loft Bento Grid (Desktop, Tablet Landscape, Tablet Portrait & Phone) */}
        {activeTab === 'lists' && !selectedNote && (
          <div className="flex-1 flex flex-col mb-8 mt-2">
            {/* Desktop Layout (1024px+): 3-Column Bento Grid */}
            <div className="hidden lg:grid grid-cols-3 gap-6 items-stretch min-h-[620px]">
              {/* Column 1: Daily Quests */}
              <div className="col-span-1 h-full">
                <CozyDailyQuests
                  todos={todos}
                  categories={categories}
                  activeCategory={activeCategory}
                  onToggleTodo={(id) => {
                    const targetTodo = todos.find(t => t.id === id);
                    if (targetTodo) toggleTodo(id, targetTodo.completed);
                  }}
                  onAddTodo={(txt, catId) => addTodoWithText(txt, catId)}
                  onDeleteTodo={deleteTodo}
                  onSelectCategory={(id) => setActiveCategory(id)}
                  onOpenAddCategory={() => setShowAddModal(true)}
                  isMatcha={bgTheme === 'bg-[#101412]'}
                />
              </div>

              {/* Column 2: Cozy Study Session & Parchment Reader */}
              <div className="col-span-1 h-full">
                <CozyParchmentReader
                  note={selectedNote}
                  onOpenVault={() => setShowStudyExplorer(true)}
                  isMatcha={bgTheme === 'bg-[#101412]'}
                />
              </div>

              {/* Column 3: Flashcard Quiz */}
              <div className="col-span-1 h-full">
                <CozyFlashcardQuiz
                  onStartFullQuiz={() => setShowQuizSession(true)}
                  isMatcha={bgTheme === 'bg-[#101412]'}
                />
              </div>
            </div>

            {/* Tablet Landscape (768px - 1023px): 2-Column Split */}
            <div className="hidden md:grid lg:hidden grid-cols-12 gap-5 items-stretch min-h-[580px]">
              {/* Left 5 cols: Quests on top, Quiz below */}
              <div className="col-span-5 flex flex-col gap-5 h-full">
                <div className="flex-1 min-h-[320px]">
                  <CozyDailyQuests
                    todos={todos}
                    categories={categories}
                    activeCategory={activeCategory}
                    onToggleTodo={(id) => {
                      const targetTodo = todos.find(t => t.id === id);
                      if (targetTodo) toggleTodo(id, targetTodo.completed);
                    }}
                    onAddTodo={(txt, catId) => addTodoWithText(txt, catId)}
                    onDeleteTodo={deleteTodo}
                    onSelectCategory={(id) => setActiveCategory(id)}
                    onOpenAddCategory={() => setShowAddModal(true)}
                    isMatcha={bgTheme === 'bg-[#101412]'}
                  />
                </div>
                <div className="flex-1 min-h-[260px]">
                  <CozyFlashcardQuiz
                    onStartFullQuiz={() => setShowQuizSession(true)}
                    isMatcha={bgTheme === 'bg-[#101412]'}
                  />
                </div>
              </div>

              {/* Right 7 cols: Cozy Study Reader Hero */}
              <div className="col-span-7 h-full min-h-[580px]">
                <CozyParchmentReader
                  note={selectedNote}
                  onOpenVault={() => setShowStudyExplorer(true)}
                  isMatcha={bgTheme === 'bg-[#101412]'}
                />
              </div>
            </div>

            {/* Tablet Portrait & Mobile (< 768px): Vertical Bento Stack with Responsive Tabs */}
            <div className="flex md:hidden flex-col gap-4">
              <div className="flex items-center justify-center p-1 rounded-2xl bg-[#1c1917] border border-stone-800">
                <button
                  type="button"
                  onClick={() => setMobileViewTab('quests')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    mobileViewTab === 'quests'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Daily Quests
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewTab('study')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    mobileViewTab === 'study'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Study Session
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewTab('quiz')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    mobileViewTab === 'quiz'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Quiz
                </button>
              </div>

              <div className="min-h-[520px]">
                {mobileViewTab === 'quests' && (
                  <CozyDailyQuests
                    todos={todos}
                    categories={categories}
                    activeCategory={activeCategory}
                    onToggleTodo={(id) => {
                      const targetTodo = todos.find(t => t.id === id);
                      if (targetTodo) toggleTodo(id, targetTodo.completed);
                    }}
                    onAddTodo={(txt, catId) => addTodoWithText(txt, catId)}
                    onDeleteTodo={deleteTodo}
                    onSelectCategory={(id) => setActiveCategory(id)}
                    onOpenAddCategory={() => setShowAddModal(true)}
                    isMatcha={bgTheme === 'bg-[#101412]'}
                  />
                )}
                {mobileViewTab === 'study' && (
                  <div className="h-[560px]">
                    <CozyParchmentReader
                      note={selectedNote}
                      onOpenVault={() => setShowStudyExplorer(true)}
                      isMatcha={bgTheme === 'bg-[#101412]'}
                    />
                  </div>
                )}
                {mobileViewTab === 'quiz' && (
                  <CozyFlashcardQuiz
                    onStartFullQuiz={() => setShowQuizSession(true)}
                    isMatcha={bgTheme === 'bg-[#101412]'}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Full Immersive Note & Book Viewer with Highlights & Annotations */}
        {selectedNote && (
          <div className="flex-1 flex flex-col h-full min-h-0 mb-6">
            <div className="flex items-center justify-between pb-3 mb-2 px-1">
              <button
                type="button"
                onClick={() => setSelectedNote(null)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#241e1a] border border-[#382f28] text-xs font-semibold text-stone-300 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Loft</span>
              </button>
              <span className="text-xs text-stone-400 font-mono truncate max-w-sm">
                {selectedNote.title}
              </span>
            </div>
            <div className="flex-1 rounded-[28px] overflow-hidden border border-[#2e2620] bg-[#181412] shadow-2xl min-h-[620px] flex flex-col">
              <NoteViewer
                note={selectedNote}
                isLoading={isFetchingNote}
                onClose={() => setSelectedNote(null)}
                onStartQuiz={() => setShowQuizSession(true)}
                onUpdateNote={handleUpdateNote}
                isDark={true}
              />
            </div>
          </div>
        )}

        {activeTab === 'stats' ? (
          /* Stats View */
          <div className="flex flex-col items-center justify-center py-8">
            <h2 className={`text-2xl font-bold mb-8 ${t.textPrimary}`}>Your Progress</h2>
            
            <div className="w-full grid grid-cols-2 gap-4">
              <div className={`p-6 rounded-3xl ${t.card} flex flex-col items-center justify-center`}>
                <span className={`text-4xl font-bold mb-2 ${t.textPrimary}`}>{todos.filter(t => t.completed).length}</span>
                <span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Completed</span>
              </div>
              <div className={`p-6 rounded-3xl ${t.card} flex flex-col items-center justify-center`}>
                <span className={`text-4xl font-bold mb-2 ${t.textPrimary}`}>{todos.filter(t => !t.completed).length}</span>
                <span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Pending</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      )}
      
      {/* Study Vault Explorer Modal */}
      {showStudyExplorer && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setShowStudyExplorer(false)}
        >
          <div 
            className="bg-[#181412] border border-[#2e2620] rounded-[28px] p-6 max-w-2xl w-full max-h-[85vh] h-[640px] flex flex-col shadow-2xl animate-pop-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-[#2e2620]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f5efe6] tracking-tight">Study Vault & Books</h3>
                  <p className="text-xs text-stone-400">Search or upload any book, note, or PDF to study with Bloub</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStudyExplorer(false)}
                className="w-8 h-8 rounded-full bg-[#241e1a] border border-[#382f28] flex items-center justify-center text-stone-400 hover:text-stone-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
              <NoteExplorer
                userId={session?.user?.id}
                selectedNoteId={selectedNote?.id}
                onSelectNote={(n) => {
                  handleSelectNote(n);
                  setShowStudyExplorer(false);
                }}
                isDark={true}
              />
            </div>
          </div>
        </div>
      )}
      


      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black/40  z-50 flex items-center justify-center p-6"
          onClick={() => setShowInstallGuide(false)}>
          <div className={`rounded-3xl p-7 max-w-sm w-full shadow-2xl animate-pop-in ${isDark ? 'bg-slate-900 border border-slate-800 text-slate-100' : 'bg-white text-gray-900'}`}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Install Guide</h2>
              <button onClick={() => setShowInstallGuide(false)} className={`p-1.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-700'}`}><X size={18}/></button>
            </div>
            <div className="space-y-4 text-sm">
              <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>To add this app to your home screen so it behaves like a native app:</p>
              
              <div className="space-y-3 pt-2">
                <div className="flex gap-3 items-start">
                  <Smartphone size={20} className="text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Safari on iPhone / iPad</h4>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Tap the share button in the browser menu, then scroll down and select <span className="font-semibold">"Add to Home Screen"</span>.</p>
                  </div>
                </div>
                
                <div className="flex gap-3 items-start">
                  <Smartphone size={20} className="text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Android / Chrome / Brave</h4>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Tap the menu dots in the top-right and select <span className="font-semibold">"Install App"</span> or <span className="font-semibold">"Add to Home Screen"</span>.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Monitor size={20} className="text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Firefox / Other Browsers</h4>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Look for the install or download icon in the URL search bar, or use Chrome/Brave/Edge to install as a desktop shortcut.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <button onClick={() => setShowInstallGuide(false)} className="mt-6 w-full bg-blue-600 text-white font-semibold py-3.5 rounded-2xl shadow-md hover:bg-blue-700 transition-all active:scale-95">
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Download Menu Modal */}
      {showDownloadMenu && (
        <div className="fixed inset-0 bg-black/40  z-50 flex items-center justify-center p-6"
          onClick={() => setShowDownloadMenu(false)}>
          <div className={`rounded-3xl p-7 max-w-sm w-full shadow-2xl animate-pop-in ${isDark ? 'bg-slate-900 border border-slate-800 text-slate-100' : 'bg-white text-gray-900'}`}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Download Vibe Todos</h2>
              <button onClick={() => setShowDownloadMenu(false)} className={`p-1.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-700'}`}><X size={18}/></button>
            </div>
            
            <div className="space-y-3 pt-2">
              {/* Android APK Download Option */}
              <a 
                href="/downloads/Todos.apk" 
                download="Todos.apk"
                className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl border transition-all font-semibold text-sm ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Smartphone size={18} className="text-green-500" />
                  Android Installer (APK)
                </span>
                <Download size={14} className="opacity-60" />
              </a>

              {/* Windows Setup Installer Option */}
              <a 
                href="/downloads/VibeTodosSetup.exe" 
                download="VibeTodosSetup.exe"
                className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl border transition-all font-semibold text-sm ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Monitor size={18} className="text-blue-500" />
                  <span className="text-left">
                    Windows Setup Installer (EXE)
                    <span className="block text-[10px] font-normal opacity-60">Installs app, creates desktop & start menu shortcuts</span>
                  </span>
                </span>
                <Download size={14} className="opacity-60" />
              </a>

              {/* Web App PWA Installer Option */}
              <button 
                onClick={() => {
                  setShowDownloadMenu(false);
                  handleInstallClick();
                }}
                className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl border transition-all font-semibold text-sm text-left ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Smartphone size={18} className="text-indigo-500" />
                  Install Web App (PWA Guide)
                </span>
                <ChevronRight size={14} className="opacity-60" />
              </button>

            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
