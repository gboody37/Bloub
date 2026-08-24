const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /const isAnim = mascotState !== 'idle';\n\s*return \(\n\s*<BloubMascot size=\{showAddModal \? 96 : 160\} state=\{mascotState\} expression=\{isAnim \? mascotExpression : dyn\.expr\} shape=\{heroShape\} color=\{dyn\.color\} \/>\n\s*\);/,
  \const isAnim = mascotState !== 'idle';
                const heroExpr = showListHero ? (catSettings[activeCategory]?.expression || mascotExpression) : mascotExpression;
                return (
                  <BloubMascot size={showAddModal ? 96 : 160} state={mascotState} expression={isAnim ? mascotExpression : heroExpr} shape={heroShape} color={dyn.color} />
                );\
);

fs.writeFileSync('src/app/page.tsx', code);
