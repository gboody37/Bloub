const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Fix 1: Persistence
code = code.replace(
  /localStorage\.setItem\(\\$\{uid\}_mascotExpression\, mascotExpression\);\s*\}, \[session, mascotExpression\]\);\s*\/\/ Save persistent settings \(Local \+ Cloud Sync\)\s*useEffect\(\(\) => \{\s*if \(\!session\) return;\s*const uid = session\.user\.id;\s*localStorage\.setItem/,
  "localStorage.setItem(\\$\{uid\}_mascotExpression\, mascotExpression);\n    localStorage.setItem"
);
code = code.replace(
  /data: \{\s*mascotShape,\s*mascotColor,\s*bgTheme,\s*catSettings\s*\}/,
  "data: {\n        mascotExpression,\n        mascotShape,\n        mascotColor,\n        bgTheme,\n        catSettings\n      }"
);
code = code.replace(
  /\}, \[session, mascotShape, mascotColor, bgTheme, catSettings\]\);/,
  "}, [session, settingsLoaded, mascotExpression, mascotShape, mascotColor, bgTheme, catSettings]);"
);

// Fix 2: Large Hero Mascot expression
code = code.replace(
  /const dyn = getDynamicMascotProps\(heroShape, heroColor, pendingContextCount\);\s*const isAnim = mascotState !== 'idle';\s*return \(\s*<BloubMascot size=\{showAddModal \? 96 : 160\} state=\{mascotState\} expression=\{isAnim \? mascotExpression : dyn\.expr\}/,
  \const dyn = getDynamicMascotProps(heroShape, heroColor, pendingContextCount);
              const isAnim = mascotState !== 'idle';
              const catExpr = showListHero ? (catSettings[activeCategory]?.expression) : null;
              const heroExpr = catExpr || mascotExpression || dyn.expr;
              return (
                <BloubMascot size={showAddModal ? 96 : 160} state={mascotState} expression={isAnim ? mascotExpression : heroExpr}\
);

fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed page.tsx');
