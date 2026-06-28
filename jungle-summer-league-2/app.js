/**
 * Boulder League — SPA JavaScript
 * Single-file Vanilla JS, ES6+, no framework, no build tool.
 * All API calls target /api/v2 (same-origin, proxied by Go backend).
 */

/* ═══════════════════════════════════════════════════════════
   API
═══════════════════════════════════════════════════════════ */
const API_BASE = 'https://boulderchamphionship-810252893028.europe-west1.run.app/api/v2';

/**
 * Generic fetch wrapper with error handling.
 * @param {string} path  - endpoint path (e.g. '/leaderboard')
 * @param {RequestInit} [options] - fetch options
 * @returns {Promise<any>}
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const defaultHeaders = { 'Content-Type': 'application/json' };

  const res = await fetch(url, {
    ...options,
    headers: { ...defaultHeaders, ...(options.headers || {}) },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.message || body.error || msg;
    } catch (_) { /* ignore parse error */ }
    throw new Error(msg);
  }

  // 204 No Content
  if (res.status === 204) return null;

  const json = await res.json();

  // Unwrap common API envelope: { success, message, data: <actual payload> }
  if (json !== null && typeof json === 'object' && 'data' in json) {
    return json.data;
  }

  return json;
}

/* ═══════════════════════════════════════════════════════════
   CLIENT-SIDE TTL CACHE  (Leaderboard — 1 saat)
═══════════════════════════════════════════════════════════ */
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 saat
const CACHE_PREFIX = 'jsl_cache_';

/**
 * localStorage tabanlı TTL cache.
 * Sadece GET istekleri için kullanılmalıdır.
 *
 * @param {string} path       - API endpoint path
 * @param {boolean} [force]   - true ise cache'i atla, sunucudan çek
 * @returns {Promise<{ data: any, fromCache: boolean, cachedAt: Date|null }>}
 */
async function cachedApiFetch(path, force = false) {
  const key = CACHE_PREFIX + path;

  // Cache'den oku
  if (!force) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const entry = JSON.parse(raw);
        const age = Date.now() - entry.ts;
        if (age < CACHE_TTL_MS) {
          return { data: entry.data, fromCache: true, cachedAt: new Date(entry.ts) };
        }
      }
    } catch (_) { /* bozuk cache — yoksay */ }
  }

  // Sunucudan çek
  const data = await apiFetch(path);

  // Cache'e yaz
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) { /* localStorage dolu olabilir — yoksay */ }

  return { data, fromCache: false, cachedAt: new Date() };
}

/**
 * Belirli bir endpoint'in cache'ini temizler.
 * @param {string} path
 */
function invalidateCache(path) {
  try { localStorage.removeItem(CACHE_PREFIX + path); } catch (_) { }
}

/* ═══════════════════════════════════════════════════════════
   API CALLS
═══════════════════════════════════════════════════════════ */

const api = {
  // Leaderboard  (cache destekli — force=true ile cache atlanır)
  getLeaderboard: (force = false) => cachedApiFetch('/leaderboard', force),
  getFullLeaderboard: (force = false) => cachedApiFetch('/leaderboard/full', force),


  // Climbers
  getClimbers: () => apiFetch('/climbers'),
  addClimber: (body) => apiFetch('/climbers', { method: 'POST', body: JSON.stringify(body) }),
  deleteClimber: (id) => apiFetch(`/climbers/${id}`, { method: 'DELETE' }),

  // Routes
  getRoutes: (week) => apiFetch(`/routes?week=${week}`),
  addRoute: (body) => apiFetch('/routes', { method: 'POST', body: JSON.stringify(body) }),
  deleteRoute: (id) => apiFetch(`/routes/${id}`, { method: 'DELETE' }),

  // Attempts
  getAttempts: (id, week) => apiFetch(`/climbers/${id}/attempts?week=${week}`),
  addAttempt: (body) => apiFetch('/attempts', { method: 'POST', body: JSON.stringify(body) }),

  // Actions
  calculateWeekPoints: (week) => apiFetch('/actions/calculate-weekly-points', {
    method: 'POST',
    body: JSON.stringify({ week: Number(week) }),
  }),
};

/* ═══════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════════════════════════════════ */
/**
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');

  const colors = {
    success: 'border-green-500/40 bg-green-500/10 text-green-300',
    error: 'border-red-500/40   bg-red-500/10   text-red-300',
    info: 'border-brand-500/40 bg-brand-500/10 text-brand-300',
  };
  const icons = {
    success: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`,
    error: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />`,
    info: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
  };

  const toast = document.createElement('div');
  toast.className = `toast-item pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border 
    backdrop-blur-md shadow-xl max-w-sm text-sm font-medium transition-all duration-500 translate-y-2 opacity-0
    ${colors[type]}`;

  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${icons[type]}
    </svg>
    <span class="flex-1">${message}</span>
    <button class="ml-2 opacity-60 hover:opacity-100 transition-opacity" onclick="this.parentElement.remove()">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });
  });

  // Auto remove after 4s
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

/* ═══════════════════════════════════════════════════════════
   TAB NAVIGATION
═══════════════════════════════════════════════════════════ */
const TAB_IDS = ['leaderboard', 'admin', 'attempts'];

function activateTab(tabId) {
  TAB_IDS.forEach((id) => {
    const btn = document.getElementById(`tab-${id}`);
    const panel = document.getElementById(`panel-${id}`);

    if (id === tabId) {
      btn.classList.add('border-brand-500', 'text-brand-400');
      btn.classList.remove('border-transparent', 'text-gray-400');
      btn.setAttribute('aria-selected', 'true');
      panel.classList.remove('hidden');
      panel.classList.add('animate-slide-up');
      // Trigger animation restart
      void panel.offsetWidth;
    } else {
      btn.classList.remove('border-brand-500', 'text-brand-400');
      btn.classList.add('border-transparent', 'text-gray-400');
      btn.setAttribute('aria-selected', 'false');
      panel.classList.add('hidden');
      panel.classList.remove('animate-slide-up');
    }
  });
}

function initTabs() {
  TAB_IDS.forEach((id) => {
    document.getElementById(`tab-${id}`).addEventListener('click', () => {
      activateTab(id);
      // Lazy-load data on first visit
      if (id === 'admin' && !adminInitialized) initAdmin();
      if (id === 'attempts' && !attemptsInitialized) initAttempts();
    });
  });
  // Default active tab
  activateTab('leaderboard');
}

/* ═══════════════════════════════════════════════════════════
   HELPERS: DOM
═══════════════════════════════════════════════════════════ */
function setLoading(loadingId, listId, emptyId, isLoading) {
  const loading = document.getElementById(loadingId);
  const list = document.getElementById(listId);
  const empty = emptyId ? document.getElementById(emptyId) : null;

  if (isLoading) {
    loading?.classList.remove('hidden');
    list?.classList.add('hidden');
    empty?.classList.add('hidden');
  } else {
    loading?.classList.add('hidden');
    list?.classList.remove('hidden');
  }
}

function setButtonLoading(btn, isLoading, originalText) {
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<div class="spinner-sm"></div>`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || originalText || btn.innerHTML;
  }
}

/* ═══════════════════════════════════════════════════════════
   TAB 1: LEADERBOARD  (Full — overall + weekly)
═══════════════════════════════════════════════════════════ */

/** Cached full leaderboard data from /leaderboard/full */
let lbData = null;
/** Currently active view: 'overall' | 'week_N' */
let lbActiveView = 'overall';

// ── helpers ──

function lbSetTableState(loadingId, tableId, emptyId, state /* 'loading'|'data'|'empty' */) {
  const loading = document.getElementById(loadingId);
  const table = document.getElementById(tableId);
  const empty = document.getElementById(emptyId);
  loading?.classList.toggle('hidden', state !== 'loading');
  table?.classList.toggle('hidden', state !== 'data');
  empty?.classList.toggle('hidden', state !== 'empty');
}

/**
 * Render the OVERALL (best-4) table.
 * Climber shape: ClimberWeeklyDetail { id, firstName, lastName, bestFourPoints, totalPoints, weeklyPoints }
 */
function renderOverallTable(climbers, tbodyId, tableId, emptyId, loadingId, countId) {
  document.getElementById(countId).textContent = `${climbers?.length ?? 0} sporcu`;

  if (!climbers || climbers.length === 0) {
    lbSetTableState(loadingId, tableId, emptyId, 'empty');
    return;
  }
  lbSetTableState(loadingId, tableId, emptyId, 'data');

  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = climbers.map((c, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
    const rankCell = medal
      ? `<td class="px-5 py-4 text-lg">${medal}</td>`
      : `<td class="px-5 py-4 text-gray-500 text-sm font-mono">${i + 1}</td>`;

    const rowBg = i === 0 ? 'bg-amber-500/5' : '';
    const scoreColor = i === 0 ? 'text-amber-400' : 'text-brand-400';
    const best4 = (c.bestFourPoints ?? 0).toFixed(2);
    const total = (c.totalPoints ?? 0).toFixed(2);

    // Build week breakdown mini-badges
    const weeks = c.weeklyPoints ? Object.keys(c.weeklyPoints).sort((a, b) => Number(a) - Number(b)) : [];
    const weekBadges = weeks.map(w =>
      `<span class="lb-week-chip" title="Hafta ${w}">${(c.weeklyPoints[w]).toFixed(1)}</span>`
    ).join('');

    return `
      <tr class="leaderboard-row ${rowBg}">
        ${rankCell}
        <td class="px-5 py-3">
          <div class="font-semibold text-white leading-snug">
            ${escHtml(c.firstName || '')} ${escHtml(c.lastName || '')}
          </div>
          ${weekBadges ? `<div class="flex flex-wrap gap-1 mt-1">${weekBadges}</div>` : ''}
        </td>
        <td class="px-5 py-3 text-right">
          <span class="font-bold text-base ${scoreColor}">${best4}</span>
        </td>
        <td class="px-5 py-3 text-right">
          <span class="text-sm text-gray-500">${total}</span>
        </td>
      </tr>`;
  }).join('');
}

/**
 * Render a WEEKLY table.
 * Climber shape: ClimberWeekEntry { id, firstName, lastName, points }
 */
function renderWeeklyTable(climbers, tbodyId, tableId, emptyId, loadingId, countId) {
  document.getElementById(countId).textContent = `${climbers?.length ?? 0} sporcu`;

  if (!climbers || climbers.length === 0) {
    lbSetTableState(loadingId, tableId, emptyId, 'empty');
    return;
  }
  lbSetTableState(loadingId, tableId, emptyId, 'data');

  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = climbers.map((c, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
    const rankCell = medal
      ? `<td class="px-5 py-4 text-lg">${medal}</td>`
      : `<td class="px-5 py-4 text-gray-500 text-sm font-mono">${i + 1}</td>`;
    const rowBg = i === 0 ? 'bg-amber-500/5' : '';
    const scoreColor = i === 0 ? 'text-amber-400' : 'text-brand-400';
    return `
      <tr class="leaderboard-row ${rowBg}">
        ${rankCell}
        <td class="px-5 py-4">
          <span class="font-semibold text-white">
            ${escHtml(c.firstName || '')} ${escHtml(c.lastName || '')}
          </span>
        </td>
        <td class="px-5 py-4 text-right">
          <span class="font-bold text-base ${scoreColor}">${(c.points ?? 0).toFixed(2)}</span>
        </td>
      </tr>`;
  }).join('');
}

// ── View switcher ──

function setActivePill(viewKey) {
  lbActiveView = viewKey;

  // Update pill styles
  document.querySelectorAll('.lb-pill').forEach(btn => {
    const isActive = btn.dataset.view === viewKey;
    btn.classList.toggle('lb-pill-active', isActive);
  });

  // Show / hide views
  const overallEl = document.getElementById('lb-overall-view');
  const weeklyEl = document.getElementById('lb-weekly-view');

  if (viewKey === 'overall') {
    overallEl.classList.remove('hidden');
    weeklyEl.classList.add('hidden');
  } else {
    overallEl.classList.add('hidden');
    weeklyEl.classList.remove('hidden');
    if (lbData) renderWeekView(viewKey);
  }
}

function renderWeekView(weekKey) {
  if (!lbData) return;
  const weekData = lbData.weekly?.[weekKey];
  if (!weekData) {
    // No data for this week yet
    lbSetTableState('wk-men-loading', 'wk-men-table', 'wk-men-empty', 'empty');
    lbSetTableState('wk-women-loading', 'wk-women-table', 'wk-women-empty', 'empty');
    document.getElementById('wk-men-count').textContent = '0 sporcu';
    document.getElementById('wk-women-count').textContent = '0 sporcu';
    return;
  }
  renderWeeklyTable(
    weekData.men,
    'wk-men-tbody', 'wk-men-table', 'wk-men-empty', 'wk-men-loading', 'wk-men-count'
  );
  renderWeeklyTable(
    weekData.women,
    'wk-women-tbody', 'wk-women-table', 'wk-women-empty', 'wk-women-loading', 'wk-women-count'
  );
}

// ── Build week pills from data ──

function buildWeekPills(weeklyData) {
  const container = document.getElementById('lb-week-pills');
  container.innerHTML = '';

  const weekKeys = Object.keys(weeklyData || {}).sort((a, b) => Number(a) - Number(b));
  weekKeys.forEach(wk => {
    const btn = document.createElement('button');
    btn.className = 'lb-pill';
    btn.dataset.view = wk;
    btn.textContent = `${wk}. Hafta`;
    btn.addEventListener('click', () => setActivePill(wk));
    container.appendChild(btn);
  });
}

// ── Main load ──

/**
 * @param {boolean} [force] - true ise cache'i atlayarak sunucudan çeker
 */
async function loadLeaderboard(force = false) {
  // Reset UI
  document.getElementById('lb-global-loading').classList.remove('hidden');
  document.getElementById('lb-overall-view').classList.add('hidden');
  document.getElementById('lb-weekly-view').classList.add('hidden');
  document.getElementById('lb-error').classList.add('hidden');

  try {
    const { data, fromCache, cachedAt } = await api.getFullLeaderboard(force);
    lbData = data;

    // Build week pills from received data
    buildWeekPills(lbData.weekly);

    // Render overall tables
    const overall = lbData.overall ?? {};
    renderOverallTable(
      overall.men,
      'men-tbody', 'men-table', 'men-empty', 'men-loading', 'men-count'
    );
    renderOverallTable(
      overall.women,
      'women-tbody', 'women-table', 'women-empty', 'women-loading', 'women-count'
    );

    // Switch to the currently active view
    document.getElementById('lb-global-loading').classList.add('hidden');
    setActivePill(lbActiveView);

    // Cache durumu badge'ini güncelle
    _lbUpdateCacheBadge(fromCache, cachedAt);

  } catch (err) {
    console.error('[Leaderboard] Yüklenemedi:', err);
    document.getElementById('lb-global-loading').classList.add('hidden');
    const errEl = document.getElementById('lb-error');
    document.getElementById('lb-error-msg').textContent = `Liderlik tablosu yüklenemedi: ${err.message}`;
    errEl.classList.remove('hidden');
  }
}

/**
 * Leaderboard panelindeki cache durum badge'ini günceller.
 * @param {boolean} fromCache
 * @param {Date|null} cachedAt
 */
function _lbUpdateCacheBadge(fromCache, cachedAt) {
  const badge = document.getElementById('lb-cache-badge');
  if (!badge) return;

  if (fromCache && cachedAt) {
    const timeStr = cachedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    badge.textContent = `⚡ Önbellekten · ${timeStr}`;
    badge.title = `Veri ${cachedAt.toLocaleString('tr-TR')} tarihinde önbelleğe alındı. 1 saat geçerlidir.`;
    badge.className = 'lb-cache-badge lb-cache-badge--cached';
  } else if (cachedAt) {
    const timeStr = cachedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    badge.textContent = `🔄 Canlı · ${timeStr}`;
    badge.title = `Veri sunucudan yeni çekildi ve önbelleğe alındı.`;
    badge.className = 'lb-cache-badge lb-cache-badge--live';
  }
}

function initLeaderboard() {
  // Overall pill click
  document.getElementById('lb-view-overall').addEventListener('click', () => setActivePill('overall'));

  // Refresh butonu cache'i atlayarak zorla yeniler
  document.getElementById('btn-refresh-leaderboard').addEventListener('click', () => loadLeaderboard(true));

  loadLeaderboard();
}

/* ═══════════════════════════════════════════════════════════
   TAB 2: ADMIN
═══════════════════════════════════════════════════════════ */
let adminInitialized = false;

// ── Climbers ──

function renderClimberItem(climber) {
  const li = document.createElement('li');
  li.id = `climber-item-${climber.id}`;
  li.className = 'list-item flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-surface-700/50 border border-surface-600';

  const genderBadge = climber.gender === 'M' || climber.gender === 'male'
    ? `<span class="badge-blue">E</span>`
    : `<span class="badge-pink">K</span>`;

  li.innerHTML = `
    <div class="flex items-center gap-2 min-w-0">
      ${genderBadge}
      <span class="text-sm font-medium text-gray-200 truncate">
        ${escHtml(climber.firstName || climber.first_name || '')} ${escHtml(climber.lastName || climber.last_name || '')}
      </span>
    </div>
    <button data-id="${climber.id}" class="btn-delete-climber flex-shrink-0 p-1.5 rounded-lg text-gray-500
      hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
      title="Sil" aria-label="Tırmanışçıyı sil">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  `;

  li.querySelector('.btn-delete-climber').addEventListener('click', () => deleteClimber(climber.id, li));
  return li;
}

async function loadClimbers() {
  setLoading('climbers-loading', 'climbers-list', 'climbers-empty', true);
  try {
    const climbers = await api.getClimbers();
    const list = document.getElementById('climbers-list');
    const empty = document.getElementById('climbers-empty');

    list.innerHTML = '';
    setLoading('climbers-loading', 'climbers-list', 'climbers-empty', false);

    if (!climbers || climbers.length === 0) {
      list.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    climbers.forEach(c => list.appendChild(renderClimberItem(c)));
  } catch (err) {
    console.error('[Admin] Tırmanışçılar yüklenemedi:', err);
    showToast(`Tırmanışçılar yüklenemedi: ${err.message}`, 'error');
    document.getElementById('climbers-loading').classList.add('hidden');
  }
}

async function deleteClimber(id, listItem) {
  if (!confirm('Bu tırmanışçıyı silmek istediğinize emin misiniz?')) return;
  try {
    await api.deleteClimber(id);
    listItem.classList.add('opacity-0', 'scale-95', 'transition-all', 'duration-300');
    setTimeout(() => listItem.remove(), 300);
    showToast('Tırmanışçı silindi.', 'success');

    // Refresh attempts select too if initialized
    if (attemptsInitialized) refreshAttemptsClimberSelect();
  } catch (err) {
    console.error('[Admin] Tırmanışçı silinemedi:', err);
    showToast(`Tırmanışçı silinemedi: ${err.message}`, 'error');
  }
}

function initClimberForm() {
  const form = document.getElementById('form-add-climber');
  const btn = document.getElementById('btn-add-climber');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('climber-firstname').value.trim();
    const lastName = document.getElementById('climber-lastname').value.trim();
    const gender = document.getElementById('climber-gender').value;

    if (!firstName || !lastName || !gender) return;

    setButtonLoading(btn, true);
    try {
      const newClimber = await api.addClimber({ firstName, lastName, gender });
      showToast(`${firstName} ${lastName} eklendi!`, 'success');
      form.reset();

      // Prepend to list
      const list = document.getElementById('climbers-list');
      const empty = document.getElementById('climbers-empty');
      list.classList.remove('hidden');
      empty.classList.add('hidden');
      const li = renderClimberItem(newClimber);
      li.classList.add('opacity-0');
      list.prepend(li);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => li.classList.add('opacity-100', 'transition-opacity', 'duration-500'));
      });

      // Refresh attempts select if open
      if (attemptsInitialized) refreshAttemptsClimberSelect();
    } catch (err) {
      console.error('[Admin] Tırmanışçı eklenemedi:', err);
      showToast(`Tırmanışçı eklenemedi: ${err.message}`, 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// ── Routes ──

function renderRouteItem(route) {
  const li = document.createElement('li');
  li.id = `route-item-${route.id}`;
  li.className = 'list-item flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-surface-700/50 border border-surface-600';

  li.innerHTML = `
    <div class="flex items-center gap-2 min-w-0">
      <span class="grade-badge">${escHtml(route.grade || '')}</span>
      <div class="min-w-0">
        <div class="text-sm font-medium text-gray-200 truncate">${escHtml(route.grade || '')} · Hafta ${route.week}</div>
        <div class="text-xs text-gray-500">${(route.gradeValue ?? route.grade_value ?? 0).toFixed(1)} puan</div>
      </div>
    </div>
    <button data-id="${route.id}" class="btn-delete-route flex-shrink-0 p-1.5 rounded-lg text-gray-500
      hover:text-red-400 hover:bg-red-500/10 transition-all duration-200" title="Sil" aria-label="Rotayı sil">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  `;

  li.querySelector('.btn-delete-route').addEventListener('click', () => deleteRoute(route.id, li));
  return li;
}

async function loadRoutes(week) {
  const loading = document.getElementById('routes-loading');
  const list = document.getElementById('routes-list');
  const empty = document.getElementById('routes-empty');

  loading.classList.remove('hidden');
  list.innerHTML = '';
  empty.classList.add('hidden');

  try {
    const routes = await api.getRoutes(week);
    loading.classList.add('hidden');

    if (!routes || routes.length === 0) {
      empty.textContent = `Hafta ${week} için rota bulunamadı.`;
      empty.classList.remove('hidden');
      return;
    }

    routes.forEach(r => list.appendChild(renderRouteItem(r)));
  } catch (err) {
    console.error('[Admin] Rotalar yüklenemedi:', err);
    loading.classList.add('hidden');
    showToast(`Rotalar yüklenemedi: ${err.message}`, 'error');
  }
}

async function deleteRoute(id, listItem) {
  if (!confirm('Bu rotayı silmek istediğinize emin misiniz?')) return;
  try {
    await api.deleteRoute(id);
    listItem.classList.add('opacity-0', 'scale-95', 'transition-all', 'duration-300');
    setTimeout(() => listItem.remove(), 300);
    showToast('Rota silindi.', 'success');
  } catch (err) {
    console.error('[Admin] Rota silinemedi:', err);
    showToast(`Rota silinemedi: ${err.message}`, 'error');
  }
}

function initRouteForm() {
  const form = document.getElementById('form-add-route');
  const btn = document.getElementById('btn-add-route');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const week = Number(document.getElementById('route-week').value);
    const grade = document.getElementById('route-grade').value.trim();
    const gradeValue = parseFloat(document.getElementById('route-grade-value').value);

    if (!week || !grade || isNaN(gradeValue)) return;

    setButtonLoading(btn, true);
    try {
      const newRoute = await api.addRoute({ week, grade, gradeValue });
      showToast(`Rota "${grade}" eklendi!`, 'success');
      form.reset();

      // If route list is showing the same week, prepend
      const filterWeek = document.getElementById('routes-filter-week').value;
      if (filterWeek && Number(filterWeek) === week) {
        const list = document.getElementById('routes-list');
        const empty = document.getElementById('routes-empty');
        empty.classList.add('hidden');
        const li = renderRouteItem(newRoute);
        li.classList.add('opacity-0');
        list.prepend(li);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => li.classList.add('opacity-100', 'transition-opacity', 'duration-500'));
        });
      }
    } catch (err) {
      console.error('[Admin] Rota eklenemedi:', err);
      showToast(`Rota eklenemedi: ${err.message}`, 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });

  document.getElementById('btn-filter-routes').addEventListener('click', () => {
    const week = document.getElementById('routes-filter-week').value;
    if (!week) { showToast('Hafta numarası girin.', 'info'); return; }
    loadRoutes(Number(week));
  });
}

// ── Calculate ──
function initCalculate() {
  const btn = document.getElementById('btn-calculate');
  btn.addEventListener('click', async () => {
    const week = Number(document.getElementById('calc-week').value);
    if (!week || week < 1) {
      showToast('Geçerli bir hafta numarası girin.', 'info');
      return;
    }

    const confirmed = confirm(`Hafta ${week} için puanlar hesaplanacak. Onaylıyor musunuz?`);
    if (!confirmed) return;

    setButtonLoading(btn, true);
    try {
      await api.calculateWeekPoints(week);
      showToast(`✅ Hafta ${week} puanları başarıyla güncellendi!`, 'success');
      document.getElementById('calc-week').value = '';

      // Auto-refresh leaderboard if visible
      if (!document.getElementById('panel-leaderboard').classList.contains('hidden')) {
        loadLeaderboard();
      }
    } catch (err) {
      console.error('[Admin] Puan hesaplanamadı:', err);
      showToast(`Puan hesaplanamadı: ${err.message}`, 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

function initAdmin() {
  adminInitialized = true;
  loadClimbers();
  initClimberForm();
  initRouteForm();
  initCalculate();
}

/* ═══════════════════════════════════════════════════════════
   TAB 3: ATTEMPTS
═══════════════════════════════════════════════════════════ */
let attemptsInitialized = false;
let allClimbers = [];

async function refreshAttemptsClimberSelect() {
  try {
    allClimbers = await api.getClimbers();
    const select = document.getElementById('attempt-climber-select');
    const current = select.value;
    select.innerHTML = '<option value="" disabled>Tırmanışçı seçin...</option>';
    (allClimbers || []).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`;
      if (c.id == current) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('[Attempts] Tırmanışçılar yüklenemedi:', err);
    showToast(`Tırmanışçılar yüklenemedi: ${err.message}`, 'error');
  }
}

/**
 * Render attempt input rows for each route
 * @param {Array} routes
 * @param {string} climberId
 * @param {number} week
 */
async function renderAttemptRoutes(routes, climberId, week) {
  const listEl = document.getElementById('attempt-routes-list');
  const placeholder = document.getElementById('attempt-routes-placeholder');
  const loading = document.getElementById('attempt-routes-loading');

  loading.classList.add('hidden');
  listEl.innerHTML = '';

  if (!routes || routes.length === 0) {
    placeholder.innerHTML = `
      <svg class="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm">Hafta ${week} için rota bulunamadı.</p>`;
    placeholder.classList.remove('hidden');
    listEl.classList.add('hidden');
    return;
  }

  // Fetch existing attempts for this climber/week to pre-fill inputs
  let existingAttempts = [];
  try {
    existingAttempts = await api.getAttempts(climberId, week) || [];
  } catch (err) {
    console.warn('[Attempts] Mevcut denemeler getirilemedi:', err);
  }

  const attemptsByRoute = {};
  existingAttempts.forEach(a => {
    const rid = a.routeId || a.route_id;
    attemptsByRoute[rid] = a;
  });

  placeholder.classList.add('hidden');
  listEl.classList.remove('hidden');

  routes.forEach((route, idx) => {
    const existing = attemptsByRoute[route.id];
    const existingTries = existing ? (existing.triesCount ?? existing.tries_count ?? '') : '';

    const card = document.createElement('div');
    card.className = 'attempt-route-card flex items-center gap-4 p-4 rounded-xl bg-surface-700/50 border border-surface-600';
    card.style.animationDelay = `${idx * 60}ms`;

    card.innerHTML = `
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="grade-badge">${escHtml(route.grade || '')}</span>
          <span class="text-sm font-semibold text-white">${escHtml(route.grade || '')}</span>
        </div>
        <p class="text-xs text-gray-500">${(route.gradeValue ?? route.grade_value ?? 0).toFixed(1)} puan · Hafta ${route.week}</p>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <div class="relative">
          <input
            id="tries-${route.id}"
            type="number"
            min="1"
            placeholder="—"
            value="${existingTries}"
            class="input-field w-20 text-center font-bold"
            aria-label="Deneme sayısı"
          />
          <label class="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-semibold uppercase tracking-wider text-gray-600 bg-surface-800 px-1">Deneme</label>
        </div>
        <button
          data-route-id="${route.id}"
          data-climber-id="${climberId}"
          data-week="${week}"
          class="btn-save-attempt btn-primary px-4 py-2 text-sm ${existing ? 'btn-success' : ''}">
          ${existing ? '✓ Güncelle' : 'Kaydet'}
        </button>
      </div>
    `;

    const saveBtn = card.querySelector('.btn-save-attempt');
    saveBtn.addEventListener('click', () => handleSaveAttempt(saveBtn, route.id, climberId, week));
    listEl.appendChild(card);
  });
}

async function handleSaveAttempt(btn, routeId, climberId, week) {
  const triesInput = document.getElementById(`tries-${routeId}`);
  const triesCount = parseInt(triesInput.value, 10);

  if (!triesCount || triesCount < 1) {
    showToast('Lütfen geçerli bir deneme sayısı girin.', 'info');
    triesInput.focus();
    return;
  }

  setButtonLoading(btn, true);
  try {
    await api.addAttempt({
      climberId,
      routeId,
      week: Number(week),
      triesCount,
    });
    showToast('Deneme kaydedildi!', 'success');
    btn.dataset.originalText = '✓ Güncelle';
    btn.classList.add('btn-success');
  } catch (err) {
    console.error('[Attempts] Deneme kaydedilemedi:', err);
    showToast(`Deneme kaydedilemedi: ${err.message}`, 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

function initAttempts() {
  attemptsInitialized = true;
  refreshAttemptsClimberSelect();

  const select = document.getElementById('attempt-climber-select');
  const weekIn = document.getElementById('attempt-week');
  const fetchBtn = document.getElementById('btn-fetch-routes-attempt');
  const summary = document.getElementById('attempt-summary');
  const nameEl = document.getElementById('attempt-climber-name');
  const weekEl = document.getElementById('attempt-week-label');

  const updateSummary = () => {
    const climberId = select.value;
    const week = weekIn.value;
    if (climberId && week) {
      const climber = allClimbers.find(c => String(c.id) === String(climberId));
      if (climber) {
        nameEl.textContent = `${climber.firstName || climber.first_name || ''} ${climber.lastName || climber.last_name || ''}`;
        weekEl.textContent = `Hafta ${week} rotaları`;
        summary.classList.remove('hidden');
      }
    } else {
      summary.classList.add('hidden');
    }
  };

  select.addEventListener('change', updateSummary);
  weekIn.addEventListener('input', updateSummary);

  fetchBtn.addEventListener('click', async () => {
    const climberId = select.value;
    const week = Number(weekIn.value);

    if (!climberId) { showToast('Lütfen bir tırmanışçı seçin.', 'info'); return; }
    if (!week || week < 1) { showToast('Lütfen geçerli bir hafta numarası girin.', 'info'); return; }

    const listEl = document.getElementById('attempt-routes-list');
    const placeholder = document.getElementById('attempt-routes-placeholder');
    const loading = document.getElementById('attempt-routes-loading');

    placeholder.classList.add('hidden');
    listEl.classList.add('hidden');
    loading.classList.remove('hidden');

    setButtonLoading(fetchBtn, true);
    try {
      const routes = await api.getRoutes(week);
      await renderAttemptRoutes(routes, climberId, week);
    } catch (err) {
      console.error('[Attempts] Rotalar getirilemedi:', err);
      loading.classList.add('hidden');
      showToast(`Rotalar getirilemedi: ${err.message}`, 'error');
    } finally {
      setButtonLoading(fetchBtn, false);
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
/**
 * Escape HTML special chars to prevent XSS
 * @param {string} str
 */
function escHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initLeaderboard();
});
