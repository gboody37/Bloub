const fs = require('fs');
let code = fs.readFileSync('src/components/study/NoteExplorer.tsx', 'utf-8');

// Remove Header Bar completely
code = code.replace(/\{\/\* Header Bar \*\/\}[\s\S]*?(?=\{\/\* Syncing Progress Alert \*\/)/, '');

// Convert Notes Tree to Grid of Cards
const treeRegex = /\{\/\* Notes Tree \/ List \*\/\}[\s\S]*?(?=\<\/div>\n  \<\/div>)/;
const newUI = \
      {/* Notes Grid */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 opacity-50 space-y-3">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-xs font-semibold">Loading Vault...</span>
          </div>
        ) : error ? (
          <div className={\p-4 rounded-xl text-center text-xs \\}>{error}</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center p-6 opacity-50 text-xs font-medium">No notes found. Connect your vault to get started!</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(tree).sort((a,b) => a[0].localeCompare(b[0])).map(([folder, folderNotes]) => (
              <div key={folder}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <FolderOpen size={16} className="text-blue-500" />
                  <h4 className={\	ext-sm font-bold \\}>{folder}</h4>
                  <span className="ml-auto text-[10px] font-bold opacity-40 bg-gray-500/10 px-2 py-0.5 rounded-full">{folderNotes.length} notes</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {folderNotes.map(note => {
                    const isSelected = selectedNoteId === note.id || selectedNoteId === note.relativePath;
                    return (
                      <button
                        key={note.id}
                        onClick={() => onSelectNote(note)}
                        className={\lex flex-col items-start p-4 rounded-2xl text-left transition-all border \\}
                      >
                        <div className={\w-10 h-10 rounded-xl mb-3 flex items-center justify-center \\}>
                          <FileText size={18} className={isSelected ? 'text-white' : 'text-blue-500'} />
                        </div>
                        <span className="font-bold text-sm leading-tight line-clamp-2 mb-1">{note.title}</span>
                        {note.tags && note.tags.length > 0 && (
                          <span className={\	ext-[10px] truncate w-full mt-auto \\}>
                            {note.tags.join(', ')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
\;

code = code.replace(treeRegex, newUI);

fs.writeFileSync('src/components/study/NoteExplorer.tsx', code);
