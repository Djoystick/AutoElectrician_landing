const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const strToRemove = "const memLogs = [];\\r\\nconst origLog = console.log; const origErr = console.error; console.error = (...args) => { origErr(...args); addLog('ERROR: ' + args.join(' ')); };\\r\\nconsole.log = function(...args) {\\r\\n  origLog.apply(console, args);\\r\\n  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');\\r\\n  memLogs.unshift({ time: new Date().toISOString(), msg });\\r\\n  if (memLogs.length > 100) memLogs.pop();\\r\\n};";

code = code.replace(/const memLogs = \[\];\r?\nconst origLog = console\.log; const origErr = console\.error; console\.error = \(\.\.\.args\) => \{ origErr\(\.\.\.args\); addLog\('ERROR: ' \+ args\.join\(' '\)\); \};\r?\nconsole\.log = function\(\.\.\.args\) \{\r?\n\s+origLog\.apply\(console, args\);\r?\n\s+const msg = args\.map\(a => typeof a === 'object' \? JSON\.stringify\(a\) : String\(a\)\)\.join\(' '\);\r?\n\s+memLogs\.unshift\(\{ time: new Date\(\)\.toISOString\(\), msg \}\);\r?\n\s+if \(memLogs\.length > 100\) memLogs\.pop\(\);\r?\n\};/g, '');

fs.writeFileSync('server.js', code);
