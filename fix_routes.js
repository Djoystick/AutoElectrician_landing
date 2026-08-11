const fs = require('fs');

let code = fs.readFileSync('api/index.js', 'utf8');

// Replace any non-async (req, res) or (req, res, next) with async
code = code.replace(/app\.(get|post|put|delete)\((.*?),\s*(?:(.*?),)?\s*\(req,\s*res(?:,\s*next)?\)\s*=>\s*\{/g, (match, verb, path, mid) => {
  if (mid) {
    return `app.${verb}(${path}, ${mid}, async (req, res) => {`;
  }
  return `app.${verb}(${path}, async (req, res) => {`;
});

// clientAuth also uses await readData internally now? Wait, no, clientAuth doesn't. But just in case:
code = code.replace(/const clientAuth = \(req, res, next\) => \{/, "const clientAuth = async (req, res, next) => {");

// Also replace the webhook handler which was app.post('/api/telegram-webhook', (req, res) => {
code = code.replace(/app\.post\('\/api\/telegram-webhook', \(req, res\) => \{/g, "app.post('/api/telegram-webhook', async (req, res) => {");

fs.writeFileSync('api/index.js', code);
console.log('Fixed remaining sync routes');
