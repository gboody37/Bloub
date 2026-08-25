import sys
import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the block
pattern = r"// Theme Logic\s*const isDark = bgTheme\.includes[\s\S]*?const tc = themeConfig\[family as keyof typeof themeConfig\] \|\| themeConfig\.gray;"
replacement = """// Theme Logic
    // User requested ONLY dark themes. bgTheme is a hex color (e.g. bg-[#1e1e2e]), 
    // so we use generic dark glassy translucent styles that overlay nicely on ANY hex color.
    const isDark = true; 
    
    const tc = {
      card: 'bg-black/20 border border-white/10 hover:border-white/20 hover:bg-black/30 backdrop-blur-md text-white',
      cardMuted: 'bg-black/40 border-black/50 backdrop-blur-md text-slate-300',
      nav: 'bg-black/40 border-t border-white/5 backdrop-blur-xl',
      input: 'bg-black/30 border-white/10 text-white placeholder-white/40 focus:border-white/30 backdrop-blur-md'
    };"""

new_code = re.sub(pattern, replacement, code)
if new_code != code:
    with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Regex replacement successful!")
else:
    print("Regex replacement failed!")
