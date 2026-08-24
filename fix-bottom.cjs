const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

const regex = /\{\/\* AI Configuration Section \*\/\}.*?Sign Out\s*<\/button>\s*<\/div>/s;

const replacement = `{/* AI Configuration Section */}
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
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        onBlur={() => {
                          if (!session) return;
                          const meta = session.user.user_metadata || {};
                          meta.geminiApiKey = geminiApiKey;
                          supabase.auth.updateUser({ data: meta }).catch(console.error);
                        }}
                        className={\`w-full px-4 py-3.5 text-xs font-mono rounded-2xl border-2 outline-none transition-all shadow-inner \${isDark ? 'bg-[#0f111a] border-slate-800 text-slate-300 focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 placeholder:text-slate-700' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10'}\`}
                      />
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 pointer-events-none"></div>
                    </div>
                    <p className="text-[10px] px-1 text-slate-500 font-medium">
                      Gemini 1.5 is <strong className="text-purple-400 font-bold">100% free with no limits</strong> for personal use. Get your free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 hover:text-blue-300 transition-colors">aistudio.google.com</a>.
                    </p>
                  </div>
      
                  {/* Antigravity CLI Skill Option */}
                  <div className={\`p-4 rounded-2xl border-2 relative overflow-hidden group transition-all \${isDark ? 'bg-[#0f111a] border-slate-800 hover:border-orange-500/30' : 'bg-slate-50 border-gray-200 hover:border-orange-400/50'}\`}>
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
                    <p className={\`text-[11px] leading-relaxed relative z-10 \${isDark ? 'text-slate-400' : 'text-gray-500'}\`}>
                      Control this app using <code className="font-mono font-bold text-orange-400">/todo</code> inside Antigravity. Download the script, open PowerShell, and run:
                      <code className={\`block mt-2 p-2.5 rounded-xl font-mono text-[10px] border \${isDark ? 'bg-black/40 border-white/5 text-orange-300' : 'bg-white border-gray-200 text-orange-600 shadow-sm'}\`}>
                        .\\install-todo-skill.ps1
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
                      className={\`w-full py-3.5 px-4 font-bold tracking-wide uppercase rounded-2xl transition-all active:scale-95 text-[11px] flex items-center justify-center gap-2 border-2 shadow-sm \${
                        isDark 
                          ? 'bg-[#0f111a] hover:bg-red-950/20 text-red-500 border-slate-800 hover:border-red-900/50 hover:shadow-red-900/20' 
                          : 'bg-white hover:bg-red-50 text-red-600 border-gray-200 hover:border-red-200 hover:shadow-red-500/10'
                      }\`}
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed bottom section!');
