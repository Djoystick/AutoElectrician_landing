const fs = require('fs');

let html = fs.readFileSync('public/admin.html', 'utf8');

const htmlOld = `            <div>
              <label class="label">Ваш Telegram Chat ID (для уведомлений о заявках)</label>
              <input type="text" name="masterTelegramChatId" class="input" placeholder="123456789" />
              <p class="text-xs text-gray-500 mt-1">
                Напишите <a href="https://t.me/userinfobot" target="_blank" class="text-accent hover:underline">@userinfobot</a> — он пришлёт ваш Chat ID.
              </p>
            </div>`;

const htmlNew = `            <div>
              <label class="label">Telegram-уведомления (Мастера)</label>
              <div id="master-tg-list" class="flex flex-col gap-2 mb-2">
                <!-- Отрисовывается через JS -->
              </div>
              <p class="text-xs text-gray-500 mt-1">
                Чтобы добавить мастера, отправьте боту команду <code>/admin пароль_админки</code> с того Telegram-аккаунта, куда должны приходить уведомления. Для отключения отправьте <code>/unadmin</code>.
              </p>
            </div>`;

html = html.replace(htmlOld, htmlNew);
fs.writeFileSync('public/admin.html', html);

let js = fs.readFileSync('public/js/admin.js', 'utf8');

const jsOld = `function populateSettings() {
  const form = document.getElementById('form-settings');
  const s    = DATA.settings || {};
  if (form.elements.heroTitle)    form.elements.heroTitle.value    = s.heroTitle    || '';
  if (form.elements.heroSubtitle) form.elements.heroSubtitle.value = s.heroSubtitle || '';
  if (form.elements.masterName)   form.elements.masterName.value   = s.masterName   || '';
  document.getElementById('cb-accepting').checked = s.acceptingRequests !== false;
}`;

const jsNew = `function populateSettings() {
  const form = document.getElementById('form-settings');
  const s    = DATA.settings || {};
  if (form.elements.heroTitle)    form.elements.heroTitle.value    = s.heroTitle    || '';
  if (form.elements.heroSubtitle) form.elements.heroSubtitle.value = s.heroSubtitle || '';
  if (form.elements.masterName)   form.elements.masterName.value   = s.masterName   || '';
  document.getElementById('cb-accepting').checked = s.acceptingRequests !== false;

  const tgList = document.getElementById('master-tg-list');
  if (tgList) {
    const ids = s.masterTelegramChatIds || [];
    if (ids.length === 0) {
      tgList.innerHTML = '<span class="text-sm text-gray-400">Нет подключенных мастеров</span>';
    } else {
      tgList.innerHTML = ids.map(id => \`
        <div class="flex items-center justify-between bg-card p-2 rounded border border-border">
          <span class="text-sm">Chat ID: <b>\${id}</b></span>
          <button type="button" class="text-red-400 hover:text-red-300 transition-colors" onclick="removeMasterId('\${id}')">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      \`).join('');
      if (window.lucide) lucide.createIcons();
    }
  }
}

async function removeMasterId(id) {
  if (!confirm('Отключить уведомления для Chat ID ' + id + '?')) return;
  const s = DATA.settings || {};
  const ids = s.masterTelegramChatIds || [];
  const newIds = ids.filter(x => x !== id);
  const res = await api('PUT', '/api/settings', { masterTelegramChatIds: newIds });
  if (res.ok) {
    DATA.settings.masterTelegramChatIds = newIds;
    populateSettings();
    toast('Мастер удален');
  } else {
    toast('Ошибка удаления', 'error');
  }
}
window.removeMasterId = removeMasterId;
`;

js = js.replace(jsOld, jsNew);
fs.writeFileSync('public/js/admin.js', js);
