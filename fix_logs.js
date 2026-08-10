const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// The original location of memLogs
const oldLogLoc = `/* ── In-memory logs (limit to 100) ── */
const memLogs = [];
const addLog = (msg) => {
  memLogs.unshift({ time: new Date().toISOString(), msg });
  if (memLogs.length > 100) memLogs.pop();
};
const origLog = console.log;
console.log = (...args) => {
  const msg = args.join(' ');
  origLog(...args);
  addLog(msg);
};`;

// The old modified location (if present)
const oldModLoc = `const memLogs = [];
const origLog = console.log; const origErr = console.error; console.error = (...args) => { origErr(...args); addLog('ERROR: ' + args.join(' ')); };
console.log = function(...args) {
  origLog.apply(console, args);
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  memLogs.unshift({ time: new Date().toISOString(), msg });
  if (memLogs.length > 100) memLogs.pop();
};`;

code = code.replace(oldLogLoc, '');
code = code.replace(oldModLoc, '');

const newLogLoc = `const https       = require('https');

/* ── In-memory logs (limit to 100) ── */
const memLogs = [];
const addLog = (msg) => {
  memLogs.unshift({ time: new Date().toISOString(), msg });
  if (memLogs.length > 100) memLogs.pop();
};
const origLog = console.log;
const origErr = console.error;
console.log = (...args) => {
  const msg = args.join(' ');
  origLog(...args);
  addLog(msg);
};
console.error = (...args) => {
  origErr(...args);
  addLog('ERROR: ' + args.join(' '));
};
`;

code = code.replace("const https       = require('https');", newLogLoc);
fs.writeFileSync('server.js', code);
