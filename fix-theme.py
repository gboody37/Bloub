import sys

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """    // Theme Logic
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
    const tc = themeConfig[family as keyof typeof themeConfig] || themeConfig.gray;"""

replacement = """    // Theme Logic
    // User requested ONLY dark themes. bgTheme is a hex color (e.g. bg-[#1e1e2e]), 
    // so we use generic dark glassy translucent styles that overlay nicely on ANY hex color.
    const isDark = true; 
    
    const tc = {
      card: 'bg-black/20 border-white/10 hover:border-white/20 hover:bg-black/30 backdrop-blur-md',
      cardMuted: 'bg-black/40 border-black/50 backdrop-blur-md',
      nav: 'bg-black/40 border-t border-white/5 backdrop-blur-xl',
      input: 'bg-black/30 border-white/10 text-white placeholder-white/40 focus:border-white/30 backdrop-blur-md'
    };"""

if target in code:
    code = code.replace(target, replacement)
    with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Theme logic replaced successfully!")
else:
    print("Could not find the target theme block.")
