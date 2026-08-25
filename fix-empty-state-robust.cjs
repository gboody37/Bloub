const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

const targetStr = `
                  {/* Empty State / Session Starter */}
                  <div className={\`p-8 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center \${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-gray-200 bg-gray-50/50'}\`}>
                    <div className="w-14 h-14 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3.5">
                      <GraduationCap size={28} />
                    </div>
                    <h3 className={\`text-sm font-bold mb-1 \${t.textPrimary}\`}>Ready for Study Session</h3>
                    <p className={\`text-xs max-w-xs mb-4 leading-relaxed \${t.textMuted}\`}>
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
                  </div>`;

if (code.includes('Ready for Study Session')) {
  // Wait, let's just find the index of the start and end and replace exactly
  const idx1 = code.indexOf('{/* Empty State / Session Starter */}');
  const endStr = "Study with Bloub\n                    </button>\n                  </div>";
  const idx2 = code.indexOf(endStr, idx1) + endStr.length;
  
  if (idx1 !== -1 && idx2 !== -1) {
    const origBlock = code.substring(idx1, idx2);
    const newBlock = `{(!selectedNote && !showGraphView && !showQuizSession && !showStudyExplorer) && (\n                  <>\n` + origBlock + `\n                  </>\n                  )}`;
    code = code.substring(0, idx1) + newBlock + code.substring(idx2);
    fs.writeFileSync('src/app/page.tsx', code);
    console.log('Fixed Empty State');
  } else {
    console.log('Could not find indices');
  }
} else {
  console.log('Could not find string');
}
