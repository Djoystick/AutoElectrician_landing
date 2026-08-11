const fs = require('fs');
fs.copyFileSync('server.js', 'api/index.js');
let code = fs.readFileSync('api/index.js', 'utf8');

// 1. Replace getBot BEFORE global replace!
const getBotRegex = /function getBot\(\) \{[\s\S]*?return tgBot;\n\s*\}/;
const getBotNew = `function getBot() {
  if (process.env.VERCEL) {
    if (!tgBot) {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return null;
      tgBot = new TelegramBot(token);
      if (process.env.SITE_URL) {
        tgBot.setWebHook(process.env.SITE_URL + '/api/telegram-webhook').catch(e => console.error(e));
      }
      setupBotHandlers(tgBot);
    }
    return tgBot;
  } else {
    if (!tgBot) {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return null;
      tgBot = new TelegramBot(token, { polling: true });
      setupBotHandlers(tgBot);
    }
    return tgBot;
  }
}`;
code = code.replace(getBotRegex, getBotNew);

// 2. Refactor Top Requires and Supabase
const topRequireRegex = /const fs\s*=\s*require\('fs'\);\nconst path\s*=\s*require\('path'\);/;
const newTop = `const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
`;
code = code.replace(topRequireRegex, newTop);

// 3. Refactor async verbs
const verbs = ['get', 'post', 'put', 'delete', 'use'];
verbs.forEach(verb => {
  const regex = new RegExp(`app\\.${verb}\\((['"\`].*?['"\`]),\\s*(?:authCheck,\\s*)?(?:upload\\.single\\(['"\`].*?['"\`]\\),\\s*)?(?:upload\\.array\\(['"\`].*?['"\`],\\s*\\d+\\),\\s*)?(?:limiter[^,]*,\\s*)?(?:clientAuth,\\s*)?\\(req,\\s*res(?:,\\s*next)?\\)\\s*=>\\s*\\{`, 'g');
  
  code = code.replace(regex, (match) => {
    return match.replace('(req, res', 'async (req, res').replace('(req, res, next', 'async (req, res, next');
  });
});

code = code.replace(/readData\(\)/g, 'await readData()');
code = code.replace(/writeData\((.*?)\)/g, 'await writeData($1)');

// 4. Refactor readData and writeData
const dataHelpersOld = /\/\* ── Data helpers ── \*\/\nasync function readData\(\) \{[\s\S]*?async function writeData\(data\) \{[\s\S]*?\}\n\}/;
const dataHelpersOldSync = /\/\* ── Data helpers ── \*\/\nconst readData\s*=\s*\(\)\s*=>\s*JSON\.parse\(fs\.readFileSync\(DATA_FILE, 'utf8'\)\);\nconst writeData\s*=\s*data\s*=>\s*fs\.writeFileSync\(DATA_FILE, JSON\.stringify\(data, null, 2\)\);/;

// Wait, the dataHelpers are still sync in server.js! So we must use dataHelpersOldSync
// But we already replaced readData() with await readData() globally? 
// No, the declaration is `const await readData = () => ...`! That's bad syntax!
// The regex `readData\(\)` only matches calls, not `const readData =`. So the declaration became `const await readData = ...` ?
// No, the declaration is `const readData = () =>`. It doesn't have `()`.
// Let's replace the declaration cleanly.

const dataHelpersNew = `/* ── Data helpers ── */
async function readData() {
  if (!supabase) return { settings: {}, contacts: {}, services: [], reviews: [], clients: [], requests: [] };
  
  const [
    { data: settings },
    { data: contacts },
    { data: services },
    { data: reviews },
    { data: clients },
    { data: requests }
  ] = await Promise.all([
    supabase.from('settings').select('*').limit(1).maybeSingle(),
    supabase.from('contacts').select('*').limit(1).maybeSingle(),
    supabase.from('services').select('*').order('sort_order', { ascending: true }),
    supabase.from('reviews').select('*').order('sort_order', { ascending: true }),
    supabase.from('clients').select('*'),
    supabase.from('requests').select('*')
  ]);
  
  const mapClient = (c) => ({
    id: c.id, name: c.name, phone: c.phone, email: c.email,
    vkId: c.vk_id, telegramId: c.telegram_id, telegramUsername: c.telegram_username, telegramChatId: c.telegram_chat_id,
    cars: c.cars, repairs: c.repairs, createdAt: c.created_at
  });
  
  const mapRequest = (r) => ({
    id: r.id, name: r.name, phone: r.phone, problem: r.problem, address: r.address,
    timeframe: r.timeframe, status: r.status, clientId: r.client_id, createdAt: r.created_at
  });

  return {
    settings: settings?.data || {},
    contacts: contacts?.data || {},
    services: services || [],
    reviews: reviews || [],
    clients: (clients || []).map(mapClient),
    requests: (requests || []).map(mapRequest)
  };
}

async function writeData(data) {
  if (!supabase) return;

  try {
    const p = [];

    // Settings
    if (data.settings) {
      p.push(
        supabase.from('settings').select('id').limit(1).maybeSingle().then(({ data: row }) => {
          if (row) return supabase.from('settings').update({ data: data.settings }).eq('id', row.id);
          return supabase.from('settings').insert({ data: data.settings });
        })
      );
    }
    
    // Contacts
    if (data.contacts) {
      p.push(
        supabase.from('contacts').select('id').limit(1).maybeSingle().then(({ data: row }) => {
          if (row) return supabase.from('contacts').update({ data: data.contacts }).eq('id', row.id);
          return supabase.from('contacts').insert({ data: data.contacts });
        })
      );
    }

    // Services
    if (data.services) {
      const services = data.services.map((s, idx) => ({ ...s, sort_order: idx }));
      if (services.length > 0) p.push(supabase.from('services').upsert(services));
    }

    // Reviews
    if (data.reviews) {
      const reviews = data.reviews.map((r, idx) => ({ ...r, sort_order: idx }));
      if (reviews.length > 0) p.push(supabase.from('reviews').upsert(reviews));
    }

    // Clients
    if (data.clients) {
      const clients = data.clients.map(c => ({
        id: c.id, name: c.name, phone: c.phone, email: c.email,
        vk_id: c.vkId, telegram_id: c.telegramId, telegram_username: c.telegramUsername, telegram_chat_id: c.telegramChatId,
        cars: c.cars, repairs: c.repairs, created_at: c.createdAt
      }));
      if (clients.length > 0) p.push(supabase.from('clients').upsert(clients));
    }

    // Requests
    if (data.requests) {
      const requests = data.requests.map(r => ({
        id: r.id, name: r.name, phone: r.phone, problem: r.problem, address: r.address,
        timeframe: r.timeframe, status: r.status, client_id: r.clientId, created_at: r.createdAt
      }));
      if (requests.length > 0) p.push(supabase.from('requests').upsert(requests));
    }

    await Promise.all(p);
  } catch (err) {
    console.error('writeData error:', err);
  }
}
`;
if (code.match(dataHelpersOldSync)) {
  code = code.replace(dataHelpersOldSync, dataHelpersNew);
} else {
  console.log("data helpers sync regex missed");
}

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
