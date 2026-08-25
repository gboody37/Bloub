const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

const emptyStateStart = "{/* Empty State / Session Starter */}";
code = code.replace(
  /\{\/\* Empty State \/ Session Starter \*\/\}/g,
  "{(!selectedNote && !showGraphView && !showQuizSession && !showStudyExplorer) && (\n                  <>\n                    {/* Empty State / Session Starter */}"
);

code = code.replace(
  /Study with Bloub\n                    <\/button>\n                  <\/div>\n                <\/div>/g,
  "Study with Bloub\n                    </button>\n                  </div>\n                  </>\n                  )}\n                </div>"
);

fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed empty state visibility');
