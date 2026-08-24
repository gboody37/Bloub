const fs = require('fs');
let code = fs.readFileSync('src/components/BloubMascot.tsx', 'utf-8');

code = code.replace(
  /rafRef\.current = requestAnimationFrame\(tick\);\n    };\n\n    rafRef\.current = requestAnimationFrame\(tick\);/g,
  \
      if (!isStatic) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    if (isStatic) {
      // Force one immediate tick
      tick(performance.now());
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  \
);

fs.writeFileSync('src/components/BloubMascot.tsx', code);
