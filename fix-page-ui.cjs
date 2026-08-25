const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Hide Header
code = code.replace(/\{activeTab !== 'settings' && \(/, "{(!selectedNote && activeTab !== 'settings') && (");

// Hide Mascot Hero and List header things inside the main content area?
// Actually, NoteViewer is currently rendered inside:
// {selectedNote ? ( ... NoteViewer ... ) : activeTab === 'settings' ? ( ... )}
// Wait! If NoteViewer is rendered, the list view and everything else is skipped!
// So only the main Header and the Bottom Navigation are still there!

// Hide Bottom Navigation
code = code.replace(/\{\/\* Bottom Navigation \*\/\}\n\s*\{\(\(\) => \{/, "{/* Bottom Navigation */}\n        {!selectedNote && (() => {");
// Close the block
// It ends with:
//               </div>
//             </nav>
//           );
//         })()}
code = code.replace(/<\/nav>\n\s*\);\n\s*\}\)\(\)\}/, "</nav>\n          );\n        })()}");

fs.writeFileSync('src/app/page.tsx', code);
console.log('Hidden UI when viewing note');
