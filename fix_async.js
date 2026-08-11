const fs = require('fs');

let code = fs.readFileSync('api/index.js', 'utf8');

// Replace bot.onText and bot.on that aren't async
code = code.replace(/bot\.onText\(\/\\\/admin\(\?: \(\.\+\)\)\?\/, \(msg, match\) => \{/, "bot.onText(/\\/admin(?: (.+))?/, async (msg, match) => {");
code = code.replace(/bot\.on\('message', \(msg\) => \{/, "bot.on('message', async (msg) => {");
code = code.replace(/bot\.onText\((.*?),\s*\(msg(?:, match)?\)\s*=>\s*\{/g, (match, p1) => {
  if (match.includes('(msg, match)')) return `bot.onText(${p1}, async (msg, match) => {`;
  return `bot.onText(${p1}, async (msg) => {`;
});

// Also fix bot.on
code = code.replace(/bot\.on\((.*?),\s*\(msg(?:, match)?\)\s*=>\s*\{/g, (match, p1) => {
  if (match.includes('(msg, match)')) return `bot.on(${p1}, async (msg, match) => {`;
  return `bot.on(${p1}, async (msg) => {`;
});

fs.writeFileSync('api/index.js', code);
console.log('Fixed async issues in bot.on');
