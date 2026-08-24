'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BloubMascot from '@/components/BloubMascot';
import { 
  CheckCircle2, Circle, Trash2, Plus, Settings, X, ChevronDown, ChevronRight, 
  Flag, Calendar, BarChart3, ListTodo, Edit2, MoreVertical, Palette, Shapes, 
  PaintBucket, LogOut, Download, Smartphone, Repeat, Bell, Monitor, Flame, 
  Cpu, AlertCircle, Mic, Camera, GraduationCap, BookOpen, Sparkles, Brain, 
  CheckSquare, Layers, FileText, Smile 
} from 'lucide-react';
import type { StateId } from '@/lib/bot/states';
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

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

const getListMascot = (cat: Category, settings: Record<string, {shape: string, color: string}>) => {
  if (cat.type === 'study') {
    return {
      shape: settings[cat.id]?.shape || 'livre',
      color: settings[cat.id]?.color || 'violet'
    };
  }
  const shapes = ['squircle', 'cercle', 'galet', 'hexagone', 'capsule'];
  const colors = ['vert', 'bleu', 'violet', 'orange', 'rose', 'turquoise', 'ambre'];
  const hash = (cat.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    shape: settings[cat.id]?.shape || shapes[hash % shapes.length],
    color: settings[cat.id]?.color || colors[hash % colors.length]
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

const THEMES = [
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

const SHAPE_IDS = ['squircle', 'cercle', 'galet', 'hexagone', 'capsule', 'soleil', 'nuage', 'goutte', 'oeuf'];

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
  const [isListView, setIsListView] = useState(true);
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
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [selectedNote, setSelectedNote] = useState<ParsedObsidianNote | null>(null);
  const [isFetchingNote, setIsFetchingNote] = useState(false);

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
  const [bgTheme, setBgTheme] = useState('bg-gray-100');
  const [catSettings, setCatSettings] = useState<Record<string, {shape: string, color: string, expression?: string}>>({});

  // Global Mascot
  const [mascotState, setMascotState] = useState<StateId>('idle');
  const [mascotExpression, setMascotExpression] = useState<ExpressionId>('timide');
  const [mascotShape, setMascotShape] = useState('squircle');
  const [mascotColor, setMascotColor] = useState('bleu');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Load settings when session changes
  useEffect(() => {
    if (!session) return;
    const uid = session.user.id;
    const meta = session.user.user_metadata || {};
    
    if (meta.geminiApiKey) setGeminiApiKey(meta.geminiApiKey);

    const savedExpr = localStorage.getItem(`${uid}_mascotExpression`) as ExpressionId;
    const savedShape = meta.mascotShape || localStorage.getItem(`${uid}_mascotShape`);
    const savedColor = meta.mascotColor || localStorage.getItem(`${uid}_mascotColor`);
    const savedTheme = meta.bgTheme || localStorage.getItem(`${uid}_bgTheme`);
    const savedCatSet = meta.catSettings || JSON.parse(localStorage.getItem(`${uid}_catSettings`) || 'null');
    
    if (savedExpr) setMascotExpression(savedExpr);
    if (savedShape) setMascotShape(savedShape);
    if (savedColor) setMascotColor(savedColor);
    if (savedTheme) setBgTheme(savedTheme);
    if (savedCatSet) setCatSettings(savedCatSet);
    
    // Mark as loaded so the save effect can start syncing changes
    setSettingsLoaded(true);
  }, [session]);

  // Cross-device settings sync on tab focus
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.user_metadata) {
          const meta = user.user_metadata;
          if (meta.mascotShape) setMascotShape(meta.mascotShape);
          if (meta.mascotColor) setMascotColor(meta.mascotColor);
          if (meta.bgTheme) setBgTheme(meta.bgTheme);
          if (meta.catSettings) setCatSettings(meta.catSettings);
          if (meta.geminiApiKey) setGeminiApiKey(meta.geminiApiKey);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [session]);

  // Save transient settings
  useEffect(() => {
    if (!session || !settingsLoaded) return;
    const uid = session.user.id;
    localStorage.setItem(`${uid}_mascotExpression`, mascotExpression);
    localStorage.setItem(`${uid}_mascotShape`, mascotShape);
    localStorage.setItem(`${uid}_mascotColor`, mascotColor);
    localStorage.setItem(`${uid}_bgTheme`, bgTheme);
    localStorage.setItem(`${uid}_catSettings`, JSON.stringify(catSettings));
    
    supabase.auth.updateUser({
      data: {
        mascotExpression,
        mascotShape,
        mascotColor,
        bgTheme,
        catSettings
      }
    }).catch(console.error);
  }, [session, settingsLoaded, mascotExpression, mascotShape, mascotColor, bgTheme, catSettings]);

  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    const activeTheme = THEMES.find(t => t.id === bgTheme);
    const themeColor = activeTheme ? activeTheme.color : '#0f172a';
    meta.setAttribute('content', themeColor);
    
    if (bgTheme !== 'minimal') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', bgTheme);
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    }
  }, [bgTheme]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetAFK = () => {
      clearTimeout(timeout);
      if (mascotState === 'sleep') {
        setMascotState('idle');
        setMascotExpression(localStorage.getItem(session?.user?.id + '_mascotExpression') as ExpressionId || 'timide');
      }
      timeout = setTimeout(() => {
        setMascotState('sleep');
        setMascotExpression('somnolent');
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
  }, [mascotState, session]);

  const resetToIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setMascotState('idle');
      setMascotExpression(localStorage.getItem(session?.user?.id + '_mascotExpression') as ExpressionId || 'timide');
    }, 2000);
  }, [session]);

  const triggerMascot = useCallback((state: StateId, expr: ExpressionId, persist?: boolean) => {
    setMascotState(state);
    setMascotExpression(expr);
    if (!persist) resetToIdle();
  }, [resetToIdle]);

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
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.status === 401) return;
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
  const heroShape = showListHero ? getListMascot(activeCatObj, catSettings).shape : mascotShape;
  const heroColor = showListHero ? getListMascot(activeCatObj, catSettings).color : mascotColor;
  
  const isGlobalTarget = settingsTarget === 'global';
  const targetCatObj: Category = categories.find(c => c.id === settingsTarget) || { id: 'default', name: 'General', type: 'todo' };
  const targetShape = isGlobalTarget ? mascotShape : getListMascot(targetCatObj, catSettings).shape;
  const targetColor = isGlobalTarget ? mascotColor : getListMascot(targetCatObj, catSettings).color;

  const updateTargetShape = (s: string) => {
    if (isGlobalTarget) setMascotShape(s);
    else setCatSettings(prev => ({ ...prev, [settingsTarget]: { ...prev[settingsTarget], shape: s, color: targetColor } }));
  };

  const updateTargetColor = (c: string) => {
    if (isGlobalTarget) setMascotColor(c);
    else setCatSettings(prev => ({ ...prev, [settingsTarget]: { ...prev[settingsTarget], shape: targetShape, color: c } }));
  };

  const updateTargetExpr = (expr: string) => {
    if (isGlobalTarget) setMascotExpression(expr as any);
    else setCatSettings(prev => ({ ...prev, [settingsTarget]: { ...prev[settingsTarget], expression: expr } }));
  };

  // Theme Logic
  const isDark = bgTheme.includes('slate-900') || bgTheme.includes('zinc-950') || bgTheme.includes('blue-950');

  const getFamily = (t: string) => {
    if (t.includes('slate')) return 'slate';
    if (t.includes('zinc')) return 'zinc';
    if (t.includes('blue-950')) return 'darkBlue';
    if (t.includes('stone')) return 'stone';
    if (t.includes('rose')) return 'rose';
    if (t.includes('blue')) return 'blue';
    if (t.includes('emerald')) return 'emerald';
    if (t.includes('violet')) return 'violet';
    if (t.includes('amber')) return 'amber';
    return 'gray';
  };
  const family = getFamily(bgTheme);

  const themeConfig = {
    slate: { card: 'bg-slate-800/80 border-slate-700/50 hover:border-slate-600', cardMuted: 'bg-slate-900/80 border-slate-800/80', nav: 'bg-slate-900/90 border-slate-800', input: 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-slate-500' },
    zinc: { card: 'bg-zinc-900/80 border-zinc-800/50 hover:border-zinc-700', cardMuted: 'bg-zinc-950/80 border-zinc-900/80', nav: 'bg-zinc-950/90 border-zinc-900', input: 'bg-zinc-900/80 border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-500' },
    darkBlue: { card: 'bg-blue-900/80 border-blue-800/50 hover:border-blue-700', cardMuted: 'bg-blue-950/80 border-blue-900/80', nav: 'bg-blue-950/90 border-blue-900', input: 'bg-blue-900/80 border-blue-800 text-white placeholder-blue-500 focus:border-blue-500' },
    stone: { card: 'bg-stone-50/80 border-stone-200/50 hover:border-stone-300', cardMuted: 'bg-stone-100/50 border-stone-100', nav: 'bg-stone-100/90 border-stone-200', input: 'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400 focus:border-stone-400' },
    rose: { card: 'bg-rose-50/90 border-rose-200/50 hover:border-rose-300', cardMuted: 'bg-rose-100/50 border-rose-100', nav: 'bg-rose-100/90 border-rose-200', input: 'bg-rose-50 border-rose-200 text-rose-900 placeholder-rose-400 focus:border-rose-400' },
    blue: { card: 'bg-blue-50/90 border-blue-200/50 hover:border-blue-300', cardMuted: 'bg-blue-100/50 border-blue-100', nav: 'bg-blue-100/90 border-blue-200', input: 'bg-blue-50 border-blue-200 text-blue-900 placeholder-blue-400 focus:border-blue-400' },
    emerald: { card: 'bg-emerald-50/90 border-emerald-200/50 hover:border-emerald-300', cardMuted: 'bg-emerald-100/50 border-emerald-100', nav: 'bg-emerald-100/90 border-emerald-200', input: 'bg-emerald-50 border-emerald-200 text-emerald-900 placeholder-emerald-400 focus:border-emerald-400' },
    violet: { card: 'bg-violet-50/90 border-violet-200/50 hover:border-violet-300', cardMuted: 'bg-violet-100/50 border-violet-100', nav: 'bg-violet-100/90 border-violet-200', input: 'bg-violet-50 border-violet-200 text-violet-900 placeholder-violet-400 focus:border-violet-400' },
    amber: { card: 'bg-amber-50/90 border-amber-200/50 hover:border-amber-300', cardMuted: 'bg-amber-100/50 border-amber-100', nav: 'bg-amber-100/90 border-amber-200', input: 'bg-amber-50 border-amber-200 text-amber-900 placeholder-amber-400 focus:border-amber-400' },
    gray: { card: 'bg-white/80 border-gray-200/50 hover:border-gray-300', cardMuted: 'bg-gray-50 border-gray-100', nav: 'bg-white/90 border-gray-100', input: 'bg-white/80 border-gray-200/50 text-gray-800 placeholder-gray-400 focus:border-gray-400' }
  };
  const tc = themeConfig[family as keyof typeof themeConfig] || themeConfig.gray;

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
    return <div className={`min-h-screen ${bgTheme} flex flex-col items-center justify-center`}><BloubMascot size={96} state="idle" expression="heureux" shape={mascotShape} color={mascotColor} /><p className="mt-4 text-gray-500 text-sm font-medium animate-pulse">Loading...</p></div>;
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
    <div className={`min-h-screen w-full ${bgTheme} transition-colors duration-500 font-sans`}>
      {isDark && (
        <div className="fixed inset-0 pointer-events-none z-[0] opacity-60 mix-blend-screen overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/40 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute top-[30%] left-[50%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[100px]" />
        </div>
      )}
      <main className={`w-full ${(!isListView && activeTab === 'lists' && activeCatObj?.type === 'study') ? 'max-w-7xl px-2 sm:px-6' : (activeTab === 'settings' ? 'max-w-5xl' : 'max-w-md')} mx-auto min-h-screen flex flex-col relative transition-all duration-500`}>
        {/* Header */}
        {activeTab !== 'settings' && (
          <header className={`pt-12 pb-6 px-6 sticky top-0 z-30 flex justify-between items-center border-b transition-colors duration-500 ${bgTheme} ${isDark ? 'border-slate-800' : 'border-gray-200/30'}`}>
            <div className="flex-1">
              <h1 className={`text-3xl font-bold tracking-tight transition-colors ${t.textPrimary}`}>
                {activeTab === 'lists' ? (isListView ? 'My Lists' : activeCatObj.name) : activeTab === 'today' ? 'Today' : 'Stats'}
              </h1>
              {!isListView && activeTab === 'lists' && (
                <div className="flex items-center gap-2 mt-1">
                  {activeCatObj.type === 'study' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      <GraduationCap size={13} /> Study Workspace
                    </span>
                  ) : (
                    <p className={`text-sm font-medium transition-colors ${t.textSecondary}`}>{completedCount} of {totalCount} completed</p>
                  )}
                </div>
              )}
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
            <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-1 items-center justify-center bg-slate-900/40 relative">
                <div className="cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => triggerMascot('orbit', mascotExpression)}>
                  <BloubMascot size={320} state="idle" expression={mascotExpression} shape={targetShape} color={targetColor} isStatic={false} />
                </div>
            </div>

            {/* Right side: Settings controls */}
            <div className="w-full md:w-1/2 lg:w-2/5 h-full overflow-y-auto custom-scrollbar pb-32 pt-6 px-6 bg-slate-900/90 dark:bg-slate-900 border-l border-slate-800">
              
              {/* Mobile Mascot Preview (Hidden on Desktop) */}
              <div className="md:hidden w-full flex flex-col items-center mb-6">
                <div className="w-32 h-32 flex items-center justify-center mb-4 cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => triggerMascot('orbit', mascotExpression)}>
                  <BloubMascot size={120} state="idle" expression={mascotExpression} shape={targetShape} color={targetColor} isStatic={false} />
                </div>
              </div>

              {/* Horizontal Category Scroller */}
              <div className="w-full flex gap-2.5 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar scroll-smooth mb-4 border-b border-slate-800">
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
                    <BloubMascot size={32} state="idle" expression={mascotExpression} shape={mascotShape} color={mascotColor} isStatic={true} />
                  </div>
                  <span className="text-[10px] font-bold mt-1 tracking-wide uppercase">Global</span>
                </button>
                {categories.map(cat => {
                  const { shape: cShape, color: cColor } = getListMascot(cat, catSettings);
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
                        <BloubMascot size={32} state="idle" expression="neutre" shape={cShape} color={cColor} isStatic={true} />
                      </div>
                      <span className="text-[10px] font-bold mt-1 tracking-wide uppercase truncate w-12 text-center">{cat.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Shape Section */}
              <div className="mb-6">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> 
                  Shape
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {SHAPE_IDS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateTargetShape(s)}
                      className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 transition-all cursor-pointer ${
                        targetShape === s
                          ? 'bg-slate-800 border-blue-500 shadow-md ring-2 ring-blue-500/30 ring-offset-1 ring-offset-slate-900 scale-105'
                          : isDark
                            ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <BloubMascot size={32} state="idle" expression="neutre" shape={s} color={targetColor} isStatic={true} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Expression Section */}
              <div className="mb-6">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  <Smile size={14} /> Expression
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {['neutre', 'attentif', 'surpris', 'excite', 'heureux', 'hilare', 'colere', 'triste', 'effraye', 'mefiant'].map(expr => (
                    <button
                      key={expr}
                      type="button"
                      onClick={() => updateTargetExpr(expr)}
                      className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 transition-all cursor-pointer ${
                        (settingsTarget === 'global' ? mascotExpression : (catSettings[settingsTarget]?.expression || 'neutre')) === expr
                          ? 'bg-slate-800 border-blue-500 shadow-md ring-2 ring-blue-500/30 ring-offset-1 ring-offset-slate-900 scale-105'
                          : isDark
                            ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      title={expr}
                    >
                      <BloubMascot size={32} state="idle" expression={expr as any} shape={targetShape} color={targetColor} isStatic={true} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Section */}
              <div className="mb-6">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
                  Colour
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
              <div className="pt-2 border-t border-dashed border-gray-300 dark:border-slate-700 mt-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2 transition-colors text-slate-400 dark:text-slate-500">
                  <Sparkles size={14} className="text-purple-500" /> NotebookLM API
                </span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Gemini API Key..."
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    onBlur={() => {
                      if (!session) return;
                      const meta = session.user.user_metadata || {};
                      meta.geminiApiKey = geminiApiKey;
                      supabase.auth.updateUser({ data: meta }).catch(console.error);
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded-xl border outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-purple-500' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-purple-500'}`}
                  />
                </div>
                <p className="text-[10px] opacity-70 mt-1.5 px-1 leading-tight text-slate-400">
                  Gemini 1.5 is <strong className="text-purple-400">100% free with no limits</strong> for personal use. Get your free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 hover:underline">aistudio.google.com</a>.
                </p>
              </div>
  
              {/* Antigravity CLI Skill Option */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-gray-100'} mt-4`}>
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
                  Control this app using <code className="font-mono text-[10px] font-semibold text-orange-400">/todo</code> inside Antigravity. Download the script, open PowerShell, and run:
                  <code className={`block mt-1.5 p-1.5 rounded font-mono text-[10px] ${isDark ? 'bg-slate-900 text-orange-300' : 'bg-gray-100 text-orange-700'}`}>
                    .\install-todo-skill.ps1
                  </code>
                </p>
              </div>
              
              {/* Sign Out Button */}
              <div className={`mt-6 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setTodos([]);
                    setCategories([]);
                    setShowSettings(false);
                  }}
                  className={`w-full py-3 px-4 font-semibold rounded-2xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2 ${
                    isDark 
                      ? 'bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-900/30' 
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100'
                  }`}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

        ) : (
          /* Main Content Area */
        <div className="px-6 py-6 flex-1 relative">
        
        {/* Large Hero Mascot */}
        <div className={`flex justify-center transition-all duration-300 ${showAddModal ? 'mb-2 pt-1' : 'mb-8 pt-4'}`}>
          <div className="cursor-pointer drop-shadow-xl hover:scale-105 transition-transform duration-300" onClick={() => triggerMascot('orbit', 'heureux')}>
            {(() => {
              const pendingContextCount = showListHero ? todos.filter(t => !t.completed && t.categoryId === activeCategory).length : todos.filter(t => !t.completed).length;
              const dyn = getDynamicMascotProps(heroShape, heroColor, pendingContextCount);
              const isAnim = mascotState !== 'idle';
              const catExpr = showListHero ? (catSettings[activeCategory]?.expression) : null;
              const heroExpr = catExpr || mascotExpression || dyn.expr;
              return (
                <BloubMascot size={showAddModal ? 96 : 160} state={mascotState} expression={isAnim ? mascotExpression : (heroExpr as ExpressionId)} shape={heroShape} color={dyn.color} />
              );
            })()}
          </div>
        </div>

        {/* Lists Master View */}
        {activeTab === 'lists' && isListView ? (
          <div className="space-y-4">
            <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${t.textMuted}`}>My Lists</h2>
            <ul className="space-y-3 relative">
              <AnimatePresence mode="popLayout">
              {categories.map(cat => {
                const count = todos.filter(t => t.categoryId === cat.id && !t.completed).length;
                const { shape: catShape, color: catColor } = getListMascot(cat, catSettings);
                const isMenuOpen = listMenuId === cat.id;
                const isEditing = editingListId === cat.id;
                const dynCat = getDynamicMascotProps(catShape, catColor, count);
                const isStudyList = cat.type === 'study';

                return (
                  <motion.li 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                    transition={{ duration: 0.2 }}
                    key={cat.id} 
                    className="relative"
                  >
                    <div 
                      className={`group flex flex-col justify-between rounded-2xl p-4 cursor-pointer transition-all ${t.card}`}
                      onPointerDown={() => handleCategoryPressIn(cat)}
                      onPointerUp={handleCategoryPressOut}
                      onPointerLeave={handleCategoryPressOut}
                      onClick={() => handleCategoryClick(cat)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 drop-shadow-sm flex items-center justify-center flex-shrink-0">
                            <BloubMascot size={42} state="idle" expression={dynCat.expr} shape={catShape} color={dynCat.color} />
                          </div>
                          <div className="flex flex-col">
                            {isEditing ? (
                              <form onSubmit={(e) => { e.preventDefault(); saveCategory(cat.id); }} onClick={e => e.stopPropagation()}>
                                <input 
                                  type="text" 
                                  autoFocus 
                                  value={editingListName} 
                                  onChange={e => setEditingListName(e.target.value)} 
                                  onBlur={() => saveCategory(cat.id)} 
                                  onFocus={e => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })} 
                                  className={`bg-transparent outline-none font-semibold text-lg ${t.textPrimary} border-b ${isDark ? 'border-slate-500' : 'border-gray-300'}`} 
                                />
                              </form>
                            ) : (
                              <span className={`font-semibold text-lg leading-snug ${t.textPrimary}`}>{cat.name}</span>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              {isStudyList ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                  <GraduationCap size={11} /> Study
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  <CheckSquare size={11} /> ToDo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isStudyList ? (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300">
                              Workspace
                            </span>
                          ) : (
                            <span className={`text-sm font-medium px-3 py-1 rounded-full ${isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>
                              {count}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Context Menu (Revealed on long press) */}
                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={`flex flex-wrap gap-2 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`} onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={() => { 
                                  setEditingListId(cat.id); 
                                  setEditingListName(cat.name); 
                                  setEditingListType(cat.type || 'todo');
                                  setListMenuId(null); 
                                }} 
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-colors ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                              >
                                <Edit2 size={14}/> Rename
                              </button>
                              
                              <button 
                                onClick={async () => {
                                  const nextType: ListType = cat.type === 'study' ? 'todo' : 'study';
                                  // Optimistically update local state
                                  setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, type: nextType } : c));
                                  // Persist to localStorage as fallback
                                  const storedTypes = session?.user?.user_metadata?.listTypes || JSON.parse(localStorage.getItem(session?.user?.id + '_listTypes') || '{}');
                                  storedTypes[cat.id] = nextType;
                                  localStorage.setItem(session?.user?.id + '_listTypes', JSON.stringify(storedTypes)); supabase.auth.updateUser({ data: { listTypes: storedTypes } }).catch(console.error);
                                  await mutate({ 
                                    type: 'UPDATE_CATEGORY', 
                                    id: cat.id, 
                                    categoryType: nextType,
                                    listType: nextType
                                  });
                                  setListMenuId(null);
                                }} 
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-colors ${
                                  cat.type === 'study'
                                    ? isDark ? 'bg-blue-950/40 text-blue-300 hover:bg-blue-950/60' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                    : isDark ? 'bg-purple-950/40 text-purple-300 hover:bg-purple-950/60' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                }`}
                              >
                                {cat.type === 'study' ? (
                                  <><CheckSquare size={14} /> To ToDo</>
                                ) : (
                                  <><GraduationCap size={14} /> To Study</>
                                )}
                              </button>

                              {cat.id !== 'default' && (
                                <button 
                                  onClick={() => deleteCategory(cat.id)} 
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                >
                                  <Trash2 size={14}/> Delete
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.li>
                );
              })}
              </AnimatePresence>
            </ul>

            {/* Create Category Form with List Type Selector */}
            <div className={`p-4 rounded-2xl border transition-all ${t.card} mt-6`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>Create New List</span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setNewCatType('todo')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      newCatType === 'todo'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <CheckSquare size={13} />
                    ToDo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType('study')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      newCatType === 'study'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <GraduationCap size={13} />
                    Study
                  </button>
                </div>
              </div>
              <form onSubmit={addCategory} className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newCatText} 
                  onChange={e => setNewCatText(e.target.value)}
                  onFocus={(e) => {
                    triggerMascot('thinking', 'curieux', true);
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  placeholder={newCatType === 'study' ? 'New Study List (e.g. AI Concepts, Exam Prep)...' : 'New ToDo List (e.g. Work, Gym)...'} 
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all ${t.input}`} 
                />
                <button 
                  type="submit" 
                  disabled={!newCatText.trim() || isSubmitting} 
                  className={`p-2.5 rounded-xl text-white font-semibold shadow-md transition-all disabled:opacity-50 active:scale-95 ${
                    newCatType === 'study' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Plus size={18}/>
                </button>
              </form>
            </div>
          </div>
        ) : activeTab === 'stats' ? (
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
            
            <div className={`w-full mt-6 p-6 rounded-3xl ${t.card} flex items-center gap-4`}>
              {(() => {
                const totalPending = todos.filter(t => !t.completed).length;
                const dynStats = getDynamicMascotProps(mascotShape, mascotColor, totalPending);
                return (
                  <div className="w-16 h-16"><BloubMascot size={64} state="idle" expression={dynStats.expr} shape={mascotShape} color={dynStats.color} /></div>
                );
              })()}
              <div>
                <p className={`font-semibold ${t.textPrimary}`}>
                  {todos.filter(t => !t.completed).length === 0 ? "You're all caught up!" : "Keep it up!"}
                </p>
                <p className={`text-sm ${t.textSecondary}`}>
                  {todos.filter(t => !t.completed).length === 0 ? "Enjoy your day." : "You have tasks waiting."}
                </p>
              </div>
            </div>
          </div>
          ) : activeTab === 'lists' && !isListView ? (
            /* Main Workspace View: Branching based on List Type (Study vs ToDo) */
            <div>
            {activeTab === 'lists' && !isListView && (
               <div className="mb-4">
                 <button onClick={() => setIsListView(true)} className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>← Back to Lists</button>
               </div>
            )}

            {/* Study Workspace Scaffold for categories with type === 'study' */}
            {activeTab === 'lists' && activeCatObj.type === 'study' ? (
              <div className="space-y-5">
                {/* Study Hub Hero Card - Hide when deep inside a view */}
                {!selectedNote && !showStudyExplorer && !showGraphView && (
                  <div className={`p-6 rounded-3xl border transition-all ${t.card} relative overflow-hidden`}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <h3 className={`text-lg font-bold ${t.textPrimary}`}>{activeCatObj.name}</h3>
                        <p className={`text-xs mt-1 leading-relaxed ${t.textSecondary}`}>
                          Connected to Supabase Cloud Vault.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Study UI: Viewer > Explorer > Tiles */}
                {selectedNote && showQuizSession ? (
                  <div className={`h-[800px] rounded-3xl overflow-hidden border shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-500 relative ${isDark ? 'border-purple-500/30 bg-slate-900/95' : 'border-purple-200 bg-white'}`}>
                    <QuizSession
                      note={selectedNote}
                      apiKey={geminiApiKey}
                      isDark={isDark}
                      onClose={() => setShowQuizSession(false)}
                      triggerMascot={triggerMascot}
                    />
                  </div>
                ) : selectedNote ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <NoteViewer 
                      note={selectedNote} 
                      isDark={isDark} 
                      isLoading={isFetchingNote}
                      onClose={() => setSelectedNote(null)}
                      onStartQuiz={() => setShowQuizSession(true)}
                      onWikilinkClick={async (target) => {
                        // Quick search for the wikilink target
                        try {
                          setIsFetchingNote(true);
                          const res = await fetch(`/api/obsidian/search?q=${encodeURIComponent(target)}`);
                          const data = await res.json();
                          if (data.results && data.results.length > 0) {
                            handleSelectNote(data.results[0].note || data.results[0]);
                          } else {
                            alert(`Could not find note: ${target}`);
                            setIsFetchingNote(false);
                          }
                        } catch (e) {
                          setIsFetchingNote(false);
                        }
                      }}
                      onUpdateNote={async (updatedContent) => {
                        const updated = { ...selectedNote, bodyContent: updatedContent, rawContent: updatedContent };
                        setSelectedNote(updated);
                        
                        try {
                          await fetch('/api/obsidian/notes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              userId: session?.user?.id,
                              notes: [{
                                title: selectedNote.title,
                                path: (selectedNote as any).path || (selectedNote as any).relativePath || selectedNote.id,
                                content: updatedContent,
                                folder: selectedNote.folder,
                                tags: selectedNote.tags,
                                word_count: updatedContent.split(/\s+/).length
                              }]
                            })
                          });
                        } catch (e) {
                          console.error('Failed to save note update', e);
                        }
                      }}
                    />
                  </div>
                ) : showGraphView ? (
                  <div className={`h-[600px] rounded-3xl overflow-hidden border transition-all animate-in fade-in zoom-in-95 duration-500 relative ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                    <button onClick={() => setShowGraphView(false)} className="absolute top-4 left-4 z-50 bg-black/60 hover:bg-black/80 px-3 py-1.5 flex items-center gap-2 rounded-xl text-white text-xs font-bold  transition-all shadow-xl">
                      <ChevronRight className="rotate-180" size={14} /> Back to Hub
                    </button>
                    <NoteGraph 
                      userId={session?.user?.id} 
                      isDark={isDark} 
                      onNodeClick={(n) => { 
                        setShowGraphView(false); 
                        setShowStudyExplorer(true); 
                        handleSelectNote({ id: n.id, title: n.name, relativePath: n.id, folder: n.folder, tags: [], wordCount: 0 }); 
                      }} 
                    />
                  </div>
                ) : showStudyExplorer ? (
                  <div className={`flex flex-col h-[600px] border rounded-3xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-500 ${t.card}`}>
                    <div className={`p-3 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                      <button 
                        onClick={() => setShowStudyExplorer(false)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <ChevronRight className="rotate-180" size={14} /> Back to Hub
                      </button>
                      <span className={`text-xs font-bold uppercase tracking-wider opacity-50 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Cloud Vault</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <NoteExplorer 
                        userId={session?.user?.id}
                        scopedFolder={activeCatObj?.vaultFolder}
                        scopedTags={activeCatObj?.studyTags}
                        onSelectNote={handleSelectNote}
                        isDark={isDark}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Vault Notes Tile */}
                    <button 
                      onClick={() => setShowStudyExplorer(true)}
                      className={`text-left p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${t.card} flex flex-col justify-between group`}
                    >
                      <div>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 group-hover:rotate-3">
                          <Brain size={18} />
                        </div>
                        <h4 className={`text-sm font-bold mb-1 ${t.textPrimary}`}>Vault Notes</h4>
                        <p className={`text-[11px] leading-relaxed ${t.textMuted}`}>
                          Scan and browse Markdown notes, frontmatter tags, and wikilinks.
                        </p>
                      </div>
                      <div className="mt-3 w-full pt-2.5 border-t border-dashed border-gray-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-500">
                        <span>Cloud Vault</span>
                        <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>

                    {/* AI Quizzing Tile */}
                    <button 
                      onClick={() => setShowStudyExplorer(true)}
                      className={`text-left p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${t.card} flex flex-col justify-between group`}
                    >
                      <div>
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 group-hover:-rotate-3">
                          <Sparkles size={18} />
                        </div>
                        <h4 className={`text-sm font-bold mb-1 ${t.textPrimary}`}>NotebookLM AI Quiz</h4>
                        <p className={`text-[11px] leading-relaxed ${t.textMuted}`}>
                          Generate interactive multi-choice quizzes and flashcards with Gemini.
                        </p>
                      </div>
                      <div className="mt-3 w-full pt-2.5 border-t border-dashed border-gray-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-purple-500">
                        <span>Select a Note First</span>
                        <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>

                    {/* Upload Book Tile */}
                    <label className={`text-left p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${t.card} flex flex-col justify-between group`}>
                      <input 
                        type="file" 
                        accept=".txt,.md,.csv" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          triggerMascot('thinking', 'curieux', true);
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const text = ev.target?.result as string;
                            setSelectedNote({
                              id: file.name,
                              title: file.name.replace(/\.[^/.]+$/, ""),
                              relativePath: file.name,
                              absolutePath: file.name,
                              folder: "Uploads",
                              frontmatter: {},
                              tags: [],
                              headings: [],
                              wikilinks: [],
                              rawContent: text,
                              bodyContent: text,
                              wordCount: text.split(/\s+/).length,
                              lastModifiedMs: file.lastModified
                            });
                            setShowStudyExplorer(false);
                            triggerMascot('orbit', 'heureux');
                          };
                          reader.readAsText(file);
                        }} 
                      />
                      <div>
                        <div className="w-9 h-9 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3 mb-2.5">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h4 className={`text-sm font-bold mb-1 ${t.textPrimary}`}>Upload Book</h4>
                          <p className={`text-[11px] leading-relaxed ${t.textMuted}`}>
                            Upload any .txt or .md book.
                          </p>
                        </div>
                      </div>
                    </label>

                    {/* Visual Graph Tile */}
                    <button 
                      onClick={() => setShowGraphView(true)}
                      className={`text-left p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${t.card} flex flex-col justify-between group`}
                    >
                      <div>
                        <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3 mb-2.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                        </div>
                        <div>
                          <h4 className={`text-sm font-bold mb-1 ${t.textPrimary}`}>Visual Graph</h4>
                          <p className={`text-[11px] leading-relaxed ${t.textMuted}`}>
                            2D map of your Brain.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Empty State / Session Starter */}
                <div className={`p-8 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center ${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-gray-200 bg-gray-50/50'}`}>
                  <div className="w-14 h-14 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3.5">
                    <GraduationCap size={28} />
                  </div>
                  <h3 className={`text-sm font-bold mb-1 ${t.textPrimary}`}>Ready for Study Session</h3>
                  <p className={`text-xs max-w-xs mb-4 leading-relaxed ${t.textMuted}`}>
                    Explore your cloud Obsidian notes or launch an AI quiz session to test your retention and master concepts.
                  </p>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowStudyExplorer(true);
                      triggerMascot('orbit', 'fier');
                    }} 
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 shadow-md shadow-purple-600/20 transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Sparkles size={13} />
                    Study with Bloub
                  </button>
                </div>
              </div>
            ) : (
              /* Classic ToDo Task List View */
              <div>
                {/* Add Task FAB */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="fixed bottom-24 right-6 sm:right-[calc(50%-13rem)] w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 z-40"
                >
                  <Plus size={28} />
                </button>

                <ul className="space-y-3 pb-8 relative">
                  <AnimatePresence mode="popLayout">
                  {filteredTodos.length === 0 && (
                    <motion.li layout initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className={`text-center py-20 text-sm ${t.textMuted}`}>
                      {activeTab === 'lists' ? "No tasks in this list yet." : "Nothing due today!"}
                    </motion.li>
                  )}
                  {filteredTodos
                    .slice()
                    .sort((a, b) => Number(b.id) - Number(a.id))
                    .map(todo => {
                      const isExpanded = expandedTask === todo.id;
                      const isOverdue = !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date();

                      return (
                        <motion.li 
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                          transition={{ duration: 0.2 }}
                          key={todo.id}
                          className={`rounded-2xl border transition-all duration-200 overflow-hidden ${todo.completed ? t.cardMuted + ' opacity-60' : isOverdue ? (isDark ? 'bg-red-950/30 border-red-900 shadow-red-900/20' : 'bg-red-50 border-red-200 shadow-red-100') : t.card}`}
                        >
                          <div className="flex items-center gap-3 px-4 py-3.5">
                            {todo.isHabit ? (
                              <button onClick={() => incrementHabit(todo)} className="flex-shrink-0">
                                {todo.completed ? (
                                  <CheckCircle2 size={22} className={isDark ? "text-slate-500" : "text-gray-800"} />
                                ) : (
                                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-black transition-all active:scale-90 ${
                                    isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-700'
                                  }`}>
                                    {(todo.habitCompletedCount || 0)}/{(todo.habitFrequency || 1)}
                                  </div>
                                )}
                              </button>
                            ) : (
                              <button onClick={() => toggleTodo(todo.id, todo.completed)} className="flex-shrink-0">
                                {todo.completed
                                  ? <CheckCircle2 size={22} className={isDark ? "text-slate-500" : "text-gray-800"} />
                                  : <Circle size={22} className={isOverdue ? 'text-red-400' : isDark ? 'text-slate-600' : 'text-gray-300'} />
                                }
                              </button>
                            )}

                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : todo.id)}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p dir="auto" className={`text-sm font-medium ${isExpanded ? 'break-words whitespace-normal' : 'truncate'} ${todo.completed ? 'line-through ' + t.textMuted : isOverdue ? 'text-red-500' : t.textPrimary}`}>
                                  {todo.text}
                                </p>
                                {todo.attachments && todo.attachments.length > 0 && (
                                  <div className="flex gap-2 w-full mt-2 overflow-x-auto custom-scrollbar pb-1">
                                    {todo.attachments.map((att, i) => (
                                      <div key={i} className="flex-shrink-0 relative rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 h-24 w-24 flex items-center justify-center">
                                        {att.type === 'image' && <img src={att.url} className="object-cover w-full h-full" alt="attachment" />}
                                        {att.type === 'video' && <video src={att.url} controls className="object-cover w-full h-full" />}
                                        {att.type === 'audio' && (
                                          <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
                                            <Mic size={24} className="text-blue-500" />
                                            <audio src={att.url} controls className="h-6 w-20 scale-75 transform origin-center" />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {todo.isHabit && (todo.habitStreak || 0) > 0 && (
                                  <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                                    <Flame size={10} className="fill-current text-orange-500" />
                                    {todo.habitStreak}d
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {todo.isHabit ? (
                                  <span className={`text-[10px] flex items-center gap-1 ${t.textMuted}`}>
                                    <Repeat size={10} />
                                    {todo.habitDays && todo.habitDays.length > 0 ? todo.habitDays.join(', ') : 'Every day'}
                                  </span>
                                ) : (
                                  todo.dueDate && (
                                    <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-400 font-semibold' : t.textMuted}`}>
                                      {isOverdue && <AlertCircle size={12} className="text-red-400" />}
                                      {isOverdue ? 'Overdue ' : ''}
                                      {new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            {todo.priority && (
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_COLOR[todo.priority] }} />
                            )}

                            <button onClick={() => setExpandedTask(isExpanded ? null : todo.id)} className={`transition-colors flex-shrink-0 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-300 hover:text-gray-500'}`}>
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>

                            <button onClick={() => deleteTodo(todo.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {isExpanded && (
                            <div className={`border-t px-4 py-3 space-y-3 ${isDark ? 'border-slate-700/50' : 'border-gray-100'}`}>
                              <div className="flex items-center gap-2">
                                <Flag size={14} className={t.textMuted} />
                                <span className={`text-xs mr-1 ${t.textMuted}`}>Priority:</span>
                                {(['high', 'medium', 'low'] as const).map(p => (
                                  <button key={p}
                                    onClick={() => mutate({ type: 'SET_PRIORITY', id: todo.id, priority: p }).then(d => { if (d) { setTodos(d.todos); setCategories(d.categories); } })}
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all border ${
                                      todo.priority === p ? 'text-white border-transparent' : isDark ? 'text-slate-400 border-slate-700' : 'text-gray-500 border-gray-200'
                                    }`}
                                    style={todo.priority === p ? { backgroundColor: PRIORITY_COLOR[p] } : {}}
                                  >
                                    {PRIORITY_LABEL[p]}
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-2">
                                <Calendar size={14} className={t.textMuted} />
                                <span className={`text-xs ${t.textMuted}`}>Due:</span>
                                <input type="date"
                                  value={todo.dueDate ? todo.dueDate.split('T')[0] : ''}
                                  onChange={e => mutate({ type: 'SET_DUE_DATE', id: todo.id, dueDate: e.target.value }).then(d => { if (d) { setTodos(d.todos); setCategories(d.categories); } })}
                                  className={`text-xs rounded-lg px-2 py-1 outline-none ${t.input}`}
                                />
                                {todo.dueDate && (
                                  <button onClick={() => mutate({ type: 'SET_DUE_DATE', id: todo.id, dueDate: null }).then(d => { if (d) { setTodos(d.todos); setCategories(d.categories); } })}
                                    className={`hover:text-red-400 ${t.textMuted}`}><X size={12} /></button>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </div>
      )}
      
      {/* Bottom Navigation */}
      {(() => {
        const activeColorHex = COLORS.find(c => c.id === mascotColor)?.hex;
        return (
          <nav className={`fixed bottom-0 left-0 right-0 border-t pb-safe z-40 px-6 py-2 ${t.nav}`}>
            <div className="max-w-md mx-auto flex justify-between items-center text-xs font-medium text-gray-400">
              <button 
                onClick={() => { setActiveTab('lists'); setIsListView(true); }}
                className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${activeTab === 'lists' ? 'font-semibold' : t.textSecondary}`}
                style={{ color: activeTab === 'lists' ? activeColorHex : undefined }}>
                <ListTodo size={22} />
                <span>Lists</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('today')}
                className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${activeTab === 'today' ? 'font-semibold' : t.textSecondary}`}
                style={{ color: activeTab === 'today' ? activeColorHex : undefined }}>
                <Calendar size={22} />
                <span>Today</span>
              </button>

              <button 
                onClick={() => setActiveTab('stats')}
                className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${activeTab === 'stats' ? 'font-semibold' : t.textSecondary}`}
                style={{ color: activeTab === 'stats' ? activeColorHex : undefined }}>
                <BarChart3 size={22} />
                <span>Stats</span>
              </button>

              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${activeTab === 'settings' ? 'font-semibold' : t.textSecondary}`}
                style={{ color: activeTab === 'settings' ? activeColorHex : undefined }}>
                <Settings size={22} />
                <span>Settings</span>
              </button>
            </div>
          </nav>
        );
      })()}
      
      {/* Padding for bottom nav */}
      <div className="h-20" />

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
