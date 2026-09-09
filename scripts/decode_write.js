const fs = require('fs');
fs.writeFileSync(process.argv[2], Buffer.from(process.argv[3], 'base64'));
console.log('Wrote ' + process.argv[2]);