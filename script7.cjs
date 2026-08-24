const fs = require('fs');
let code = fs.readFileSync('src/components/study/NoteExplorer.tsx', 'utf-8');

code = code.replace(
  /await supabase\.from\('vault_notes'\)\.upsert\(\[newNote\]\);/g,
  \const { error: dbError } = await supabase.from('vault_notes').upsert([newNote]);
      if (dbError) throw new Error(dbError.message);\
);

fs.writeFileSync('src/components/study/NoteExplorer.tsx', code);
