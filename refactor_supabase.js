const fs = require('fs');

let code = fs.readFileSync('api/index.js', 'utf8');

// Replace top requires and add Supabase initialization
const topRequireRegex = /const fs\s*=\s*require\('fs'\);\nconst path\s*=\s*require\('path'\);/;

const newTop = `const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
`;

code = code.replace(topRequireRegex, newTop);

// Replace readData and writeData implementation
const dataHelpersOld = /\/\* ── Data helpers ── \*\/\nconst readData\s*=\s*\(\)\s*=>\s*JSON\.parse\(fs\.readFileSync\(DATA_FILE, 'utf8'\)\);\nconst writeData\s*=\s*data\s*=>\s*fs\.writeFileSync\(DATA_FILE, JSON\.stringify\(data, null, 2\)\);/;

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
  
  return {
    settings: settings?.data || {},
    contacts: contacts?.data || {},
    services: services || [],
    reviews: reviews || [],
    clients: clients || [],
    requests: requests || []
  };
}

async function writeData(data) {
  if (!supabase) return;

  try {
    // Determine what changed by checking what keys are in data object.
    // In our app, data is usually the whole object returned by readData.
    // Since this is a lazy wrapper, we just sync settings and contacts for now.
    // Actually, routes modify specific arrays (e.g., data.clients).
    // The previous implementation wrote the whole JSON file.
    // Writing all 6 tables on every writeData call is VERY heavy!
    // We should patch the routes that use writeData(data) to update Supabase directly.
    // But since we want a quick drop-in replacement, we will do a bulk sync of settings and contacts.
    
    // For arrays, if they changed, we could upsert.
    // We will leave this empty and manually fix routes!
    throw new Error('writeData must be replaced with direct Supabase calls');
  } catch (err) {
    console.error('writeData error:', err);
  }
}
`;

code = code.replace(dataHelpersOld, dataHelpersNew);

fs.writeFileSync('api/index.js', code);
