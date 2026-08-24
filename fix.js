const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

code = code.replace(/const storedTypes = JSON\.parse\(localStorage\.getItem\(session\?\.user\?\.id \+ \'_listTypes\'\) \|\| \'\{\}\'\);/g, 
  \const storedTypes = session?.user?.user_metadata?.listTypes || JSON.parse(localStorage.getItem(session?.user?.id + '_listTypes') || '{}');\);
code = code.replace(/const storedTypes2 = JSON\.parse\(localStorage\.getItem\(session\?\.user\?\.id \+ \'_listTypes\'\) \|\| \'\{\}\'\);/g, 
  \const storedTypes2 = session?.user?.user_metadata?.listTypes || JSON.parse(localStorage.getItem(session?.user?.id + '_listTypes') || '{}');\);

code = code.replace(/localStorage\.setItem\(session\?\.user\?\.id \+ \'_listTypes\', JSON\.stringify\(storedTypes\)\);/g,
  \localStorage.setItem(session?.user?.id + '_listTypes', JSON.stringify(storedTypes)); supabase.auth.updateUser({ data: { listTypes: storedTypes } }).catch(console.error);\);

fs.writeFileSync('src/app/page.tsx', code);
