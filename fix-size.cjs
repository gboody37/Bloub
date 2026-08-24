const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(/<BloubMascot size=\{32\} state="idle" expression="neutre" shape=\{s\} color=\{targetColor\}/g, '<BloubMascot size={56} state="idle" expression="neutre" shape={s} color={targetColor}');
code = code.replace(/<BloubMascot size=\{32\} state="idle" expression=\{expr as any\} shape=\{targetShape\} color=\{targetColor\}/g, '<BloubMascot size={56} state="idle" expression={expr as any} shape={targetShape} color={targetColor}');
code = code.replace(/<BloubMascot size=\{32\} state="idle" expression=\{mascotExpression\} shape=\{mascotShape\} color=\{mascotColor\}/g, '<BloubMascot size={48} state="idle" expression={mascotExpression} shape={mascotShape} color={mascotColor}');
code = code.replace(/<BloubMascot size=\{32\} state="idle" expression="neutre" shape=\{cShape\} color=\{cColor\}/g, '<BloubMascot size={48} state="idle" expression="neutre" shape={cShape} color={cColor}');

fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed sizes');
