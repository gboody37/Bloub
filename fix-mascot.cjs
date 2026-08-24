const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Add animExpression state
code = code.replace(
  /const \[mascotExpression, setMascotExpression\] = useState<ExpressionId>\('timide'\);/,
  "const [mascotExpression, setMascotExpression] = useState<ExpressionId>('timide');\n  const [animExpression, setAnimExpression] = useState<ExpressionId | null>(null);"
);

// 2. Fix resetToIdle
code = code.replace(
  /const resetToIdle = useCallback\(\(\) => \{[\s\S]*?\}, 2000\);\n  \}, \[session\]\);/,
  `const resetToIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setMascotState('idle');
      setAnimExpression(null);
    }, 2000);
  }, []);`
);

// 3. Fix triggerMascot
code = code.replace(
  /const triggerMascot = useCallback\(\(state: StateId, expr: ExpressionId, persist\?: boolean\) => \{\n\s*setMascotState\(state\);\n\s*setMascotExpression\(expr\);\n\s*if \(\!persist\) resetToIdle\(\);\n\s*\}, \[resetToIdle\]\);/,
  `const triggerMascot = useCallback((state: StateId, expr: ExpressionId, persist?: boolean) => {
    setMascotState(state);
    setAnimExpression(expr);
    if (!persist) resetToIdle();
  }, [resetToIdle]);`
);

// 4. Fix sleep AFK expression
code = code.replace(
  /timeout = setTimeout\(\(\) => \{\n\s*setMascotState\('sleep'\);\n\s*setMascotExpression\('somnolent'\);\n\s*\}, 15000\);/,
  `timeout = setTimeout(() => {
      setMascotState('sleep');
      setAnimExpression('somnolent');
    }, 15000);`
);
code = code.replace(
  /if \(mascotState === 'sleep'\) \{\n\s*setMascotState\('idle'\);\n\s*setMascotExpression\(localStorage.getItem\(session\?.user\?.id \+ '_mascotExpression'\) as ExpressionId \|\| 'timide'\);\n\s*\}/,
  `if (mascotState === 'sleep') {
      setMascotState('idle');
      setAnimExpression(null);
    }`
);

// 5. Fix hero mascot BloubMascot render
code = code.replace(
  /<BloubMascot size=\{showAddModal \? 96 : 160\} state=\{mascotState\} expression=\{isAnim \? mascotExpression : \(heroExpr as ExpressionId\)\} shape=\{heroShape\} color=\{dyn\.color\} \/>/,
  '<BloubMascot size={showAddModal ? 96 : 160} state={mascotState} expression={isAnim ? (animExpression || mascotExpression) : (heroExpr as ExpressionId)} shape={heroShape} color={dyn.color} />'
);

fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed mascot expression override!');
