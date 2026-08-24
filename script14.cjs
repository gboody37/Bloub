const fs = require('fs');
let code = fs.readFileSync('src/components/study/NoteExplorer.tsx', 'utf-8');

// Fix upsert
code = code.replace(
  /await supabase\.from\('vault_notes'\)\.upsert\(\[newNote\]\);/,
  \wait supabase.from('vault_notes').upsert([newNote], { onConflict: 'user_id,path' });\
);

fs.writeFileSync('src/components/study/NoteExplorer.tsx', code);
