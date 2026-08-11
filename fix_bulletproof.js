const fs = require('fs');

fs.copyFileSync('server.js', 'api/index.js');
let code = fs.readFileSync('api/index.js', 'utf8');

const replacements = [
  // 1. App Verbs
  ["app.get('/api/data', (req, res) => {", "app.get('/api/data', async (req, res) => {"],
  ["app.get('/api/settings', (req, res) => {", "app.get('/api/settings', async (req, res) => {"],
  ["app.post('/api/settings', authCheck, (req, res) => {", "app.post('/api/settings', authCheck, async (req, res) => {"],
  ["app.post('/api/login', limiter, (req, res) => {", "app.post('/api/login', limiter, async (req, res) => {"],
  ["app.post('/api/requests', limiter, (req, res) => {", "app.post('/api/requests', limiter, async (req, res) => {"],
  ["app.get('/api/requests', authCheck, (req, res) => {", "app.get('/api/requests', authCheck, async (req, res) => {"],
  ["app.put('/api/requests/:id/status', authCheck, (req, res) => {", "app.put('/api/requests/:id/status', authCheck, async (req, res) => {"],
  ["app.delete('/api/requests/:id', authCheck, (req, res) => {", "app.delete('/api/requests/:id', authCheck, async (req, res) => {"],
  ["app.get('/api/services', (req, res) => {", "app.get('/api/services', async (req, res) => {"],
  ["app.post('/api/services', authCheck, (req, res) => {", "app.post('/api/services', authCheck, async (req, res) => {"],
  ["app.put('/api/services/reorder', authCheck, (req, res) => {", "app.put('/api/services/reorder', authCheck, async (req, res) => {"],
  ["app.put('/api/services/:id', authCheck, (req, res) => {", "app.put('/api/services/:id', authCheck, async (req, res) => {"],
  ["app.delete('/api/services/:id', authCheck, (req, res) => {", "app.delete('/api/services/:id', authCheck, async (req, res) => {"],
  ["app.get('/api/reviews', (req, res) => {", "app.get('/api/reviews', async (req, res) => {"],
  ["app.post('/api/reviews', authCheck, upload.single('image'), (req, res) => {", "app.post('/api/reviews', authCheck, upload.single('image'), async (req, res) => {"],
  ["app.put('/api/reviews/reorder', authCheck, (req, res) => {", "app.put('/api/reviews/reorder', authCheck, async (req, res) => {"],
  ["app.delete('/api/reviews/:id', authCheck, (req, res) => {", "app.delete('/api/reviews/:id', authCheck, async (req, res) => {"],
  ["app.get('/api/clients', authCheck, (req, res) => {", "app.get('/api/clients', authCheck, async (req, res) => {"],
  ["app.post('/api/clients', authCheck, (req, res) => {", "app.post('/api/clients', authCheck, async (req, res) => {"],
  ["app.put('/api/clients/:id', authCheck, (req, res) => {", "app.put('/api/clients/:id', authCheck, async (req, res) => {"],
  ["app.post('/api/client/auth/init', (req, res) => {", "app.post('/api/client/auth/init', async (req, res) => {"],
  ["app.get('/api/client/auth/poll/:session', (req, res) => {", "app.get('/api/client/auth/poll/:session', async (req, res) => {"],
  ["app.get('/api/client/me', clientAuth, (req, res) => {", "app.get('/api/client/me', clientAuth, async (req, res) => {"],
  ["app.post('/api/client/logout', (req, res) => {", "app.post('/api/client/logout', async (req, res) => {"],
  ["app.post('/api/clients/:id/cars', authCheck, (req, res) => {", "app.post('/api/clients/:id/cars', authCheck, async (req, res) => {"],
  ["app.delete('/api/clients/:id/cars/:cid', authCheck, (req, res) => {", "app.delete('/api/clients/:id/cars/:cid', authCheck, async (req, res) => {"],
  ["app.post('/api/clients/:id/repairs', authCheck, upload.array('photos', 5), (req, res) => {", "app.post('/api/clients/:id/repairs', authCheck, upload.array('photos', 5), async (req, res) => {"],
  ["app.delete('/api/clients/:id/repairs/:rid', authCheck, (req, res) => {", "app.delete('/api/clients/:id/repairs/:rid', authCheck, async (req, res) => {"],
  ["app.put('/api/client/reminder/:repairId', clientAuth, (req, res) => {", "app.put('/api/client/reminder/:repairId', clientAuth, async (req, res) => {"],
  ["app.post('/api/clients/:id/reminders', authCheck, (req, res) => {", "app.post('/api/clients/:id/reminders', authCheck, async (req, res) => {"],
  ["app.post('/api/debug', (req, res) => {", "app.post('/api/debug', async (req, res) => {"],
  ["app.get('/api/logs', (req, res) => {", "app.get('/api/logs', async (req, res) => {"],
  ["app.get('/api/analytics', authCheck, (req, res) => {", "app.get('/api/analytics', authCheck, async (req, res) => {"],

  // 2. ReadData/WriteData Global Replace
  ["readData()", "await readData()"],
  
  // 3. Bot Handlers
  ["bot.onText(/\\/start$/, (msg) => {", "bot.onText(/\\/start$/, async (msg) => {"],
  ["bot.onText(/\\/start auth_(.+)/, (msg, match) => {", "bot.onText(/\\/start auth_(.+)/, async (msg, match) => {"],
  ["bot.on('contact', (msg) => {", "bot.on('contact', async (msg) => {"],
  ["bot.onText(/\\/admin (.*)/, (msg, match) => {", "bot.onText(/\\/admin (.*)/, async (msg, match) => {"],
  ["bot.onText(/\\/unadmin/, (msg) => {", "bot.onText(/\\/unadmin/, async (msg) => {"],
  ["function setupBotHandlers(bot) {", "async function setupBotHandlers(bot) {"],

  // 4. Multer updates
  ["multer({ storage: storage })", "multer({ storage: multer.memoryStorage() })"],
  ["image: `/uploads/${req.file.filename}`", "image: 'data:' + req.file.mimetype + ';base64,' + req.file.buffer.toString('base64')"],
];

for (let [oldStr, newStr] of replacements) {
  // We use split-join for global replace of simple strings
  code = code.split(oldStr).join(newStr);
}

// 5. writeData global fix for parameters
code = code.replace(/writeData\((.*?)\)/g, 'await writeData($1)');
// Also since we replaced readData() with await readData(), it might have replaced it in the function definition!
code = code.replace(/const await readData  = \(\) =>/g, 'const readData  = () =>');

// 6. Top imports
code = code.replace("const fs = require('fs');\nconst path = require('path');", 
`const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;`);


// 7. readData / writeData implementation
const dataHelpers = `/* ── Data helpers ── */
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

    if (data.settings) {
      p.push(
        supabase.from('settings').select('id').limit(1).maybeSingle().then(({ data: row }) => {
          if (row) return supabase.from('settings').update({ data: data.settings }).eq('id', row.id);
          return supabase.from('settings').insert({ data: data.settings });
        })
      );
    }
    
    if (data.contacts) {
      p.push(
        supabase.from('contacts').select('id').limit(1).maybeSingle().then(({ data: row }) => {
          if (row) return supabase.from('contacts').update({ data: data.contacts }).eq('id', row.id);
          return supabase.from('contacts').insert({ data: data.contacts });
        })
      );
    }

    if (data.services) {
      const services = data.services.map((s, idx) => ({ ...s, sort_order: idx }));
      if (services.length > 0) p.push(supabase.from('services').upsert(services));
    }

    if (data.reviews) {
      const reviews = data.reviews.map((r, idx) => ({ ...r, sort_order: idx }));
      if (reviews.length > 0) p.push(supabase.from('reviews').upsert(reviews));
    }

    if (data.clients) {
      const clients = data.clients.map(c => ({
        id: c.id, name: c.name, phone: c.phone, email: c.email,
        vk_id: c.vkId, telegram_id: c.telegramId, telegram_username: c.telegramUsername, telegram_chat_id: c.telegramChatId,
        cars: c.cars, repairs: c.repairs, created_at: c.createdAt
      }));
      if (clients.length > 0) p.push(supabase.from('clients').upsert(clients));
    }

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
}`;

code = code.replace("/* ── Data helpers ── */\nconst readData  = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));\nconst writeData = data => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));", dataHelpers);

// 8. getBot implementation
const getBotRegex = /function getBot\(\) \{[\s\S]*?return tgBot;\n\}/;
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

// 9. Vercel export block
const endRegex = /app\.listen\(PORT, \(\) => \{[\s\S]*?\}\);/;
const endNew = `app.post('/api/telegram-webhook', (req, res) => {
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
code = code.replace(endRegex, endNew);

fs.writeFileSync('api/index.js', code);
console.log('Successfully generated api/index.js');
