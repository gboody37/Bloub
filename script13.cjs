const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /<p className="text-\[10px\] opacity-50 mt-1\.5 px-1 leading-tight text-slate-400">\s*Required for AI Quizzes\. Saved securely to your cloud profile\.\s*<\/p>/,
  \<p className="text-[10px] opacity-70 mt-1.5 px-1 leading-tight text-slate-400">
                Gemini 1.5 Flash is <strong className="text-purple-400">100% free and has no limits</strong> for personal use. Get your free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 hover:underline">aistudio.google.com</a>.
              </p>\
);

fs.writeFileSync('src/app/page.tsx', code);
