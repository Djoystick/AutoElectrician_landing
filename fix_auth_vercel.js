const fs = require('fs');

let code = fs.readFileSync('api/index.js', 'utf8');

// 1. clientAuth
const clientAuthOld = /const clientAuth = async \(req, res, next\) => \{[\s\S]*?next\(\);\s*\};/;
const clientAuthNew = `const clientAuth = async (req, res, next) => {
  const token = req.headers['x-client-token'];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  
  const { data: session } = await supabase.from('auth_sessions').select('*').eq('token', token).maybeSingle();
  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    if (session) await supabase.from('auth_sessions').delete().eq('token', token);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  req.clientId = session.client_id;
  next();
};`;
if (!code.match(clientAuthOld)) console.log("Failed to match clientAuthOld");
code = code.replace(clientAuthOld, clientAuthNew);

// 2. /api/client/auth/request
const otpReqOld = /app\.post\('\/api\/client\/auth\/request', limiterOtpRequest, async \(req, res\) => \{[\s\S]*?res\.json\(\{ ok: true \}\);\s*\}\);/;
const otpReqNew = `app.post('/api/client/auth/request', limiterOtpRequest, async (req, res) => {
  console.log('[DEBUG] POST /api/client/auth/request received:', req.body);
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  if (supabase) {
    await supabase.from('auth_otps').upsert({ phone, code, expires_at: expiresAt });
  }

  console.log(\`[OTP] Generated code \${code} for \${phone}\`);
  res.json({ ok: true });
});`;
if (!code.match(otpReqOld)) console.log("Failed to match otpReqOld");
code = code.replace(otpReqOld, otpReqNew);

// 3. /api/client/auth
const otpVerifyOld = /app\.post\('\/api\/client\/auth', limiterOtpVerify, async \(req, res\) => \{[\s\S]*?res\.json\(\{ ok: true, token, client \}\);\s*\}\);/;
const otpVerifyNew = `app.post('/api/client/auth', limiterOtpVerify, async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });

  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { data: otpRow } = await supabase.from('auth_otps').select('*').eq('phone', phone).maybeSingle();

  if (!otpRow) return res.status(400).json({ error: 'Код не запрашивался' });
  
  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    await supabase.from('auth_otps').delete().eq('phone', phone);
    return res.status(400).json({ error: 'Код устарел' });
  }
  
  if (String(otpRow.code) !== String(code)) {
    return res.status(400).json({ error: 'Неверный код' });
  }

  await supabase.from('auth_otps').delete().eq('phone', phone);

  const data = await readData();
  let client = (data.clients || []).find(c => c.phone === phone);
  
  if (!client) {
    client = {
      id: crypto.randomUUID(),
      name: 'Новый клиент',
      phone,
      createdAt: new Date().toISOString()
    };
    if (!data.clients) data.clients = [];
    data.clients.push(client);
    await writeData(data);
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  await supabase.from('auth_sessions').insert({
    token,
    client_id: client.id,
    expires_at: expiresAt
  });

  res.json({ ok: true, token, client });
});`;
if (!code.match(otpVerifyOld)) console.log("Failed to match otpVerifyOld");
code = code.replace(otpVerifyOld, otpVerifyNew);

// 4. /api/client/auth/init
const magicInitOld = /app\.post\('\/api\/client\/auth\/init', async \(req, res\) => \{[\s\S]*?res\.json\(\{ ok: true, sessionId, botUrl: botUsername \? `https:\/\/t\.me\/\$\{botUsername\}\?start=auth_\$\{sessionId\}` : null \}\);\s*\}\);/;
const magicInitNew = `app.post('/api/client/auth/init', async (req, res) => {
  const sessionId = crypto.randomUUID();
  
  if (supabase) {
    await supabase.from('auth_magic_links').insert({
      session_id: sessionId,
      status: 'pending'
    });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  let botUsername = cachedBotUsername;
  
  if (!botUsername && botToken) {
    try {
      const resp = await fetch(\`https://api.telegram.org/bot\${botToken}/getMe\`);
      const json = await resp.json();
      if (json.ok) {
        botUsername = json.result.username;
        cachedBotUsername = botUsername;
      }
    } catch (err) {
      console.error('Failed to get bot info:', err);
    }
  }
  
  res.json({ 
    ok: true, 
    sessionId, 
    botUrl: botUsername ? \`https://t.me/\${botUsername}?start=auth_\${sessionId}\` : null 
  });
});`;
if (!code.match(magicInitOld)) console.log("Failed to match magicInitOld");
code = code.replace(magicInitOld, magicInitNew);

// 5. /api/client/auth/poll/:session
const magicPollOld = /app\.get\('\/api\/client\/auth\/poll\/:session', async \(req, res\) => \{[\s\S]*?res\.json\(\{ status: 'error' \}\);\s*\}\);/;
const magicPollNew = `app.get('/api/client/auth/poll/:session', async (req, res) => {
  const { session } = req.params;
  
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { data: s } = await supabase.from('auth_magic_links').select('*').eq('session_id', session).maybeSingle();

  if (!s) return res.json({ status: 'not_found' });
  
  if (s.status === 'pending') {
    return res.json({ status: 'pending' });
  }

  if (s.status === 'approved') {
    const data = await readData();
    const client = (data.clients || []).find(c => c.id === s.client_id);
    
    if (!client) return res.status(404).json({ error: 'Client not found' });

    await supabase.from('auth_magic_links').delete().eq('session_id', session);

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    await supabase.from('auth_sessions').insert({
      token,
      client_id: client.id,
      expires_at: expiresAt
    });

    return res.json({ status: 'approved', token, client });
  }

  res.json({ status: 'error' });
});`;
if (!code.match(magicPollOld)) console.log("Failed to match magicPollOld");
code = code.replace(magicPollOld, magicPollNew);

// 6. /api/client/logout
const logoutOld = /app\.post\('\/api\/client\/logout', async \(req, res\) => \{[\s\S]*?res\.json\(\{ ok: true \}\);\s*\}\);/;
const logoutNew = `app.post('/api/client/logout', async (req, res) => {
  const token = req.headers['x-client-token'];
  if (token && supabase) {
    await supabase.from('auth_sessions').delete().eq('token', token);
  }
  res.json({ ok: true });
});`;
if (!code.match(logoutOld)) console.log("Failed to match logoutOld");
code = code.replace(logoutOld, logoutNew);

// 7. bot.onText start auth_
const magicBotOld = /bot\.onText\(\/\\\/start auth_\(\.\+\)\/, async \(msg, match\) => \{[\s\S]*?bot\.sendMessage\(chatId, '✅ Вы успешно авторизованы! Можете вернуться на сайт\.'\);\n\s*\}\);/;
const magicBotNew = `bot.onText(/\\/start auth_(.+)/, async (msg, match) => {
    const sessionId = match[1];
    const chatId = msg.chat.id;

    if (!supabase) {
      return bot.sendMessage(chatId, '❌ Ошибка сервера: база данных не подключена.');
    }

    const { data: s } = await supabase.from('auth_magic_links').select('*').eq('session_id', sessionId).maybeSingle();

    if (!s || s.status !== 'pending') {
      return bot.sendMessage(chatId, '❌ Ссылка устарела или недействительна. Вернитесь на сайт и нажмите кнопку входа еще раз.');
    }

    const data = await readData();
    let client = (data.clients || []).find(c => String(c.telegramId) === String(msg.from.id) || String(c.telegramChatId) === String(chatId));
    
    if (!client) {
      client = {
        id: crypto.randomUUID(),
        name: msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : ''),
        phone: '',
        telegramId: msg.from.id,
        telegramUsername: msg.from.username,
        telegramChatId: chatId,
        createdAt: new Date().toISOString()
      };
      if (!data.clients) data.clients = [];
      data.clients.push(client);
      await writeData(data);
    } else {
      let updated = false;
      if (!client.telegramId) { client.telegramId = msg.from.id; updated = true; }
      if (!client.telegramChatId) { client.telegramChatId = chatId; updated = true; }
      if (updated) await writeData(data);
    }

    await supabase.from('auth_magic_links').update({
      status: 'approved',
      client_id: client.id
    }).eq('session_id', sessionId);

    bot.sendMessage(chatId, '✅ Вы успешно авторизованы! Можете вернуться на сайт.');
  });`;

if (!code.match(magicBotOld)) console.log("Failed to match magicBotOld");
code = code.replace(magicBotOld, magicBotNew);

fs.writeFileSync('api/index.js', code);
console.log('Finished auth migration');
