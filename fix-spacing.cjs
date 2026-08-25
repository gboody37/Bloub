const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(/<div className="max-w-7xl mx-auto h-full flex flex-col p-6 lg:p-12 relative z-20">/, '<div className={`w-full max-w-7xl mx-auto h-full flex flex-col relative z-20 ${selectedNote ? "p-0" : "p-6 lg:p-12"}`}>');

code = code.replace(/\{activeTab === 'lists' && !isListView && \(/, '{!selectedNote && activeTab === "lists" && !isListView && (');

// And hide the mascot
// {showAddModal ? null : (() => {
code = code.replace(/\{showAddModal \? null : \(\(\) => \{/, '{selectedNote ? null : showAddModal ? null : (() => {');

fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed spacing');
