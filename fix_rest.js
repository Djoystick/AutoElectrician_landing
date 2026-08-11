const fs = require('fs');
let code = fs.readFileSync('api/index.js', 'utf8');

// 5. Fix setupBotHandlers and inner async functions
code = code.replace(/function setupBotHandlers\(bot\) \{/, 'async function setupBotHandlers(bot) {');
code = code.replace(/bot\.onText\(\/admin \(.*?\), \(msg, match\) => \{/, 'bot.onText(/\\/admin (.*)/, async (msg, match) => {');
code = code.replace(/bot\.onText\(\/unadmin, \(msg\) => \{/, 'bot.onText(/\\/unadmin/, async (msg) => {');
code = code.replace(/bot\.onText\(\/start\$\/, \(msg\) => \{/, 'bot.onText(/\\/start$/, async (msg) => {');
code = code.replace(/bot\.onText\(\/start auth_\(\.\+\), \(msg, match\) => \{/, 'bot.onText(/\\/start auth_(.+)/, async (msg, match) => {');
code = code.replace(/bot\.on\('contact', \(msg\) => \{/, 'bot.on(\'contact\', async (msg) => {');

// 6. Add Webhook route and export
const exportLineOld = /app\.listen\(PORT, \(\) => \{[\s\S]*?\}\);/;
const exportLineNew = `app.post('/api/telegram-webhook', (req, res) => {
  const bot = getBot();
  if (bot) bot.processUpdate(req.body);
  res.sendStatus(200);
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(\`✅ Server running on http://localhost:\${PORT}\`);
  });
}
module.exports = app;
`;
code = code.replace(exportLineOld, exportLineNew);

// 7. Multer fixes for Vercel
code = code.replace(
  /const upload = multer\(\{ storage: storage \}\);/,
  'const upload = multer({ storage: multer.memoryStorage() });'
);

code = code.replace(
  /const newReview = \{[\s\S]*?id: uuidv4\(\),[\s\S]*?name: req\.body\.name,[\s\S]*?text: req\.body\.text,[\s\S]*?image: \/uploads\/.*?\.jpg[\s\S]*?\};/g,
  `const newReview = { id: uuidv4(), name: req.body.name, text: req.body.text, image: 'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64'), sort_order: 999 };`
);

fs.writeFileSync('api/index.js', code);
console.log('Successfully generated api/index.js');
