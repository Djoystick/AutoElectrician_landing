require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const dataPath = path.join(__dirname, '../data/data.json');

async function migrate() {
  if (!fs.existsSync(dataPath)) {
    console.error("data.json not found!");
    return;
  }
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  console.log("Migrating settings...");
  if (data.settings) {
    const { error } = await supabase.from('settings').update({ data: data.settings }).neq('id', '00000000-0000-0000-0000-000000000000');
    // If update fails because table is empty, do insert
    const { data: existingSettings } = await supabase.from('settings').select('id');
    if (existingSettings && existingSettings.length === 0) {
       await supabase.from('settings').insert({ data: data.settings });
    }
  }

  console.log("Migrating contacts...");
  if (data.contacts) {
    const { data: existingContacts } = await supabase.from('contacts').select('id');
    if (existingContacts && existingContacts.length === 0) {
       await supabase.from('contacts').insert({ data: data.contacts });
    } else {
       await supabase.from('contacts').update({ data: data.contacts }).neq('id', '00000000-0000-0000-0000-000000000000');
    }
  }

  console.log("Migrating clients...");
  for (const client of data.clients || []) {
    const payload = {
      id: client.id,
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      vk_id: client.vkId || '',
      telegram_id: String(client.telegramId || ''),
      telegram_username: client.telegramUsername || '',
      telegram_chat_id: String(client.telegramChatId || ''),
      cars: client.cars || [],
      repairs: client.repairs || [],
      created_at: client.createdAt || new Date().toISOString()
    };
    const { error } = await supabase.from('clients').upsert(payload);
    if (error) console.error("Error migrating client", client.name, error);
  }

  console.log("Migrating requests...");
  for (const req of data.requests || []) {
    const payload = {
      id: req.id,
      name: req.name,
      phone: req.phone,
      problem: req.problem,
      address: req.address || '',
      timeframe: req.timeframe || '',
      status: req.status || 'new',
      client_id: req.clientId || null,
      created_at: req.createdAt || new Date().toISOString()
    };
    const { error } = await supabase.from('requests').upsert(payload);
    if (error) console.error("Error migrating request", req.id, error);
  }

  console.log("Migrating services...");
  for (const s of data.services || []) {
    const payload = {
      id: s.id,
      title: s.title,
      description: s.description,
      icon: s.icon,
      price: s.price,
      active: s.active !== false,
      sort_order: s.sortOrder || 0
    };
    const { error } = await supabase.from('services').upsert(payload);
    if (error) console.error("Error migrating service", s.id, error);
  }

  console.log("Migrating reviews...");
  for (const r of data.reviews || []) {
    const payload = {
      id: r.id,
      name: r.name,
      text: r.text,
      image: r.image,
      sort_order: r.sortOrder || 0
    };
    const { error } = await supabase.from('reviews').upsert(payload);
    if (error) console.error("Error migrating review", r.id, error);
  }

  console.log("Migrating initial Master...");
  const pwd = data.settings?.password || 'admin';
  const masterChatId = data.settings?.masterTelegramChatId || '';
  if (pwd) {
     const { data: m } = await supabase.from('masters').select('id');
     if (!m || m.length === 0) {
        await supabase.from('masters').insert({
           name: 'Main Master',
           password: pwd,
           telegram_chat_id: masterChatId
        });
        console.log("Master added successfully.");
     }
  }

  console.log("Migration complete!");
}

migrate();
