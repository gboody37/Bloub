const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// In Settings Mascot Preview
code = code.replace(/<BloubMascot size=\{96\} state="idle" expression="heureux" shape=\{targetShape\} color=\{targetColor\} \/>/, '<BloubMascot size={96} state="idle" expression="heureux" shape={targetShape} color={targetColor} isStatic={true} />');

// Category Scroller mascots
code = code.replace(/<BloubMascot size=\{32\} state="idle" expression="neutre" shape=\{mascotShape\} color=\{mascotColor\} \/>/, '<BloubMascot size={32} state="idle" expression="neutre" shape={mascotShape} color={mascotColor} isStatic={true} />');
code = code.replace(/<BloubMascot size=\{32\} state="idle" expression="neutre" shape=\{shape\} color=\{color\} \/>/, '<BloubMascot size={32} state="idle" expression="neutre" shape={shape} color={color} isStatic={true} />');

// Shape Grid mascots
code = code.replace(/<BloubMascot size=\{32\} state="idle" expression="neutre" shape=\{s\} color=\{targetColor\} \/>/, '<BloubMascot size={32} state="idle" expression="neutre" shape={s} color={targetColor} isStatic={true} />');

fs.writeFileSync('src/app/page.tsx', code);
