const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Move addLog definition to top
const oldLog = `const memLogs = [];
const origLog = console.log; const origErr = console.error; console.error = (...args) => { origErr(...args); addLog('ERROR: ' + args.join(' ')); };
console.log = function(...args) {
  origLog.apply(console, args);
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  memLogs.unshift({ time: new Date().toISOString(), msg });
  if (memLogs.length > 100) memLogs.pop();
};`;

code = code.replace(oldLog, '');

const newLog = `const https       = require('https');

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

code = code.replace("const https       = require('https');", newLog);

// 2. Move getBot initialization below readData
const initBotCode = `/* ── Init bot on startup if token is already saved ── */
try {
  getBot();
} catch (err) {
  addLog(\`[TG] Bot Init Error: \${err.stack || err}\`);
  console.error('Bot Init Error:', err);
}`;

code = code.replace(initBotCode, '');

const dataHelpersCode = `/* ── Data helpers ── */
const readData  = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = data => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));`;

code = code.replace(dataHelpersCode, dataHelpersCode + '\n\n' + initBotCode);

fs.writeFileSync('server.js', code);
