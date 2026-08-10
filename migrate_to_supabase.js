require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Ошибка: Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в файле .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATA_FILE = path.join(__dirname, 'data', 'data.json');

async function migrate() {
  console.log('🚀 Начинаем миграцию данных в Supabase...');
  
  if (!fs.existsSync(DATA_FILE)) {
    console.error('❌ Файл data.json не найден!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  try {
    // 1. Settings
    if (data.settings) {
      console.log('⏳ Миграция настроек...');
      const res = await supabase.from('settings').select('id').limit(1).maybeSingle();
      if (res.data) {
        await supabase.from('settings').update({ data: data.settings }).eq('id', res.data.id);
      } else {
        await supabase.from('settings').insert({ data: data.settings });
      }
    }

    // 2. Contacts
    if (data.contacts) {
      console.log('⏳ Миграция контактов...');
      const res = await supabase.from('contacts').select('id').limit(1).maybeSingle();
      if (res.data) {
        await supabase.from('contacts').update({ data: data.contacts }).eq('id', res.data.id);
      } else {
        await supabase.from('contacts').insert({ data: data.contacts });
      }
    }

    // 3. Services
    if (data.services && data.services.length > 0) {
      console.log(`⏳ Миграция услуг (${data.services.length} шт.)...`);
      const services = data.services.map((s, idx) => ({
        id: s.id || Date.now().toString() + idx,
        title: s.title || '',
        description: s.description || '',
        icon: s.icon || '',
        price: s.price || '',
        active: s.active !== false,
        sort_order: idx
      }));
      const { error } = await supabase.from('services').upsert(services);
      if (error) throw error;
    }

    // 4. Reviews
    if (data.reviews && data.reviews.length > 0) {
      console.log(`⏳ Миграция отзывов (${data.reviews.length} шт.)...`);
      const reviews = data.reviews.map((r, idx) => ({
        id: r.id || Date.now().toString() + idx,
        name: r.name || '',
        text: r.text || '',
        image: r.image || '',
        sort_order: idx
      }));
      const { error } = await supabase.from('reviews').upsert(reviews);
      if (error) throw error;
    }

    // 5. Clients
    if (data.clients && data.clients.length > 0) {
      console.log(`⏳ Миграция клиентов (${data.clients.length} шт.)...`);
      const clients = data.clients.map(c => ({
        id: c.id,
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || '',
        vk_id: c.vkId || '',
        telegram_id: c.telegramId ? String(c.telegramId) : null,
        telegram_username: c.telegramUsername || '',
        telegram_chat_id: c.telegramChatId ? String(c.telegramChatId) : null,
        cars: c.cars || [],
        repairs: c.repairs || [],
        created_at: c.createdAt || new Date().toISOString()
      }));
      const { error } = await supabase.from('clients').upsert(clients);
      if (error) throw error;
    }

    // 6. Requests
    if (data.requests && data.requests.length > 0) {
      console.log(`⏳ Миграция заявок (${data.requests.length} шт.)...`);
      const requests = data.requests.map(r => ({
        id: r.id,
        name: r.name || '',
        phone: r.phone || '',
        problem: r.problem || '',
        address: r.address || '',
        timeframe: r.timeframe || '',
        status: r.status || 'new',
        client_id: r.clientId || null,
        created_at: r.createdAt || new Date().toISOString()
      }));
      const { error } = await supabase.from('requests').upsert(requests);
      if (error) throw error;
    }

    console.log('✅ Миграция успешно завершена!');
  } catch (err) {
    console.error('❌ Ошибка миграции:', err);
  }
}

migrate();
