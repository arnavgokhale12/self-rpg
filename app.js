// ── Constants ──────────────────────────────────────────────────────────────

const STATS = [
  { key: 'str', label: 'Strength',     icon: '💪' },
  { key: 'int', label: 'Intelligence', icon: '🧠' },
  { key: 'cha', label: 'Charisma',     icon: '🤝' },
  { key: 'wis', label: 'Wisdom',       icon: '🦉' },
  { key: 'vit', label: 'Vitality',     icon: '❤️' },
  { key: 'cre', label: 'Creativity',   icon: '🎨' },
];

const AVATARS = ['🧙', '🧝', '🧜', '🦸', '🧚', '🧌', '🪄', '⚔️'];

const CAT_ICONS = {
  mind: '🧠', body: '💪', social: '🤝', create: '🎨', spirit: '🌿', grind: '⚡'
};

const XP_PER_LEVEL = (level) => Math.floor(100 * Math.pow(1.35, level - 1));

// ── State ──────────────────────────────────────────────────────────────────

let state = {
  name: '',
  avatar: '🧙',
  level: 1,
  xp: 0,
  stats: { str: 5, int: 5, cha: 5, wis: 5, vit: 5, cre: 5 },
  quests: [],        // { id, name, category, xp }
  completed: [],     // { id, name, category, xp, completedAt }
  streak: 0,
  lastActiveDate: null,
  totalQuestsDone: 0,
};

// ── Persistence ────────────────────────────────────────────────────────────

function save() {
  localStorage.setItem('selfrpg_v1', JSON.stringify(state));
}

function load() {
  try {
    const raw = localStorage.getItem('selfrpg_v1');
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch (_) {}
}

// ── Helpers ────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function xpForNext() {
  return XP_PER_LEVEL(state.level);
}

function refreshStreak() {
  const t = today();
  if (state.lastActiveDate === null) return;
  const last = new Date(state.lastActiveDate);
  const now  = new Date(t);
  const diff = (now - last) / 86400000;
  if (diff > 1) state.streak = 0;
}

function markActive() {
  const t = today();
  if (state.lastActiveDate !== t) {
    if (state.lastActiveDate) {
      const last = new Date(state.lastActiveDate);
      const now  = new Date(t);
      const diff = (now - last) / 86400000;
      if (diff <= 1.5) state.streak += 1;
      else state.streak = 1;
    } else {
      state.streak = 1;
    }
    state.lastActiveDate = t;
  }
}

function clearTodayCompleted() {
  const t = today();
  // Completed list only shows today's completions
  state.completed = state.completed.filter(q => q.completedAt === t);
}

// ── Rendering ──────────────────────────────────────────────────────────────

function renderAll() {
  renderCharacter();
  renderStats();
  renderQuests();
}

function renderCharacter() {
  document.getElementById('avatar').textContent = state.avatar;
  document.getElementById('hero-display-name').textContent = state.name;
  document.getElementById('level-display').textContent = state.level;

  const needed = xpForNext();
  const pct = Math.min((state.xp / needed) * 100, 100);
  document.getElementById('xp-fill').style.width = pct + '%';
  document.getElementById('xp-display').textContent = state.xp;
  document.getElementById('xp-next-display').textContent = needed;

  document.getElementById('streak-badge').textContent =
    `🔥 ${state.streak} day streak`;
  document.getElementById('quests-done-count').textContent =
    `${state.totalQuestsDone} quests done`;
}

function renderStats() {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';
  STATS.forEach(s => {
    const val = state.stats[s.key];
    const pips = Array.from({ length: 10 }, (_, i) =>
      `<div class="pip ${i < val ? 'filled' : ''}"></div>`
    ).join('');
    grid.insertAdjacentHTML('beforeend', `
      <div class="stat-card">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-name">${s.label}</div>
        <div class="stat-pips">${pips}</div>
        <div class="stat-value">${val} / 10</div>
      </div>
    `);
  });
}

function renderQuests() {
  const list      = document.getElementById('quest-list');
  const noQuests  = document.getElementById('no-quests');
  const compList  = document.getElementById('completed-list');
  const noComp    = document.getElementById('no-completed');

  list.innerHTML = '';
  compList.innerHTML = '';

  if (state.quests.length === 0) {
    noQuests.classList.remove('hidden');
  } else {
    noQuests.classList.add('hidden');
    state.quests.forEach(q => list.insertAdjacentHTML('beforeend', questHTML(q, false)));
  }

  if (state.completed.length === 0) {
    noComp.classList.remove('hidden');
  } else {
    noComp.classList.add('hidden');
    state.completed.forEach(q => compList.insertAdjacentHTML('beforeend', questHTML(q, true)));
  }
}

function questHTML(q, done) {
  return `
    <div class="quest-item" data-id="${q.id}">
      <div class="quest-check ${done ? 'done' : ''}" data-id="${q.id}">
        ${done ? '✓' : ''}
      </div>
      <div class="quest-details">
        <div class="quest-title">${escHtml(q.name)}</div>
        <div class="quest-meta">
          <span class="quest-cat">${CAT_ICONS[q.category] || ''} ${q.category}</span>
          <span class="quest-xp">+${q.xp} XP</span>
        </div>
      </div>
      ${done ? '' : `<button class="quest-delete" data-id="${q.id}" title="Remove quest">✕</button>`}
    </div>
  `;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── XP & Leveling ──────────────────────────────────────────────────────────

function awardXP(amount) {
  state.xp += amount;
  let leveled = false;
  while (state.xp >= xpForNext()) {
    state.xp -= xpForNext();
    state.level += 1;
    leveled = true;
    boostStats();
  }
  if (leveled) showLevelUp();
  renderCharacter();
}

function boostStats() {
  // Small random boost to a stat on level up
  const keys = Object.keys(state.stats);
  const key = keys[Math.floor(Math.random() * keys.length)];
  state.stats[key] = Math.min(10, state.stats[key] + 1);
}

function showLevelUp() {
  const toast = document.getElementById('levelup-toast');
  document.getElementById('toast-level-text').textContent = `You reached Level ${state.level}!`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ── Quest Actions ──────────────────────────────────────────────────────────

function completeQuest(id) {
  const idx = state.quests.findIndex(q => q.id === id);
  if (idx === -1) return;
  const [q] = state.quests.splice(idx, 1);
  q.completedAt = today();
  state.completed.unshift(q);
  state.totalQuestsDone += 1;
  markActive();
  awardXP(q.xp);
  save();
  renderQuests();
  renderCharacter();
}

function deleteQuest(id) {
  state.quests = state.quests.filter(q => q.id !== id);
  save();
  renderQuests();
}

// ── Event Wiring ───────────────────────────────────────────────────────────

function init() {
  load();
  clearTodayCompleted();
  refreshStreak();

  if (state.name) {
    showDashboard();
  } else {
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  }

  // Onboarding
  document.getElementById('start-btn').addEventListener('click', () => {
    const nameEl = document.getElementById('hero-name');
    const name = nameEl.value.trim();
    if (!name) { nameEl.focus(); nameEl.style.borderColor = 'var(--red)'; return; }
    state.name = name;
    state.avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    markActive();
    save();
    showDashboard();
  });

  document.getElementById('hero-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('start-btn').click();
  });

  // Reset
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (!confirm('Reset your character? This cannot be undone.')) return;
    localStorage.removeItem('selfrpg_v1');
    location.reload();
  });

  // Add quest modal
  document.getElementById('add-quest-btn').addEventListener('click', () => {
    document.getElementById('quest-name-input').value = '';
    document.getElementById('quest-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('quest-name-input').focus(), 50);
  });

  document.getElementById('cancel-quest-btn').addEventListener('click', () => {
    document.getElementById('quest-modal').classList.add('hidden');
  });

  document.getElementById('quest-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('quest-modal'))
      document.getElementById('quest-modal').classList.add('hidden');
  });

  document.getElementById('quest-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('save-quest-btn').click();
  });

  document.getElementById('save-quest-btn').addEventListener('click', () => {
    const name = document.getElementById('quest-name-input').value.trim();
    if (!name) { document.getElementById('quest-name-input').focus(); return; }
    const category = document.getElementById('quest-category-input').value;
    const xp = parseInt(document.getElementById('quest-xp-input').value);
    state.quests.push({ id: uid(), name, category, xp });
    save();
    renderQuests();
    document.getElementById('quest-modal').classList.add('hidden');
  });

  // Quest list event delegation
  document.getElementById('quest-list').addEventListener('click', e => {
    const check = e.target.closest('.quest-check');
    if (check) { completeQuest(check.dataset.id); return; }
    const del = e.target.closest('.quest-delete');
    if (del) { deleteQuest(del.dataset.id); return; }
  });

  // Edit stats modal
  document.getElementById('edit-stats-btn').addEventListener('click', openStatsModal);
  document.getElementById('cancel-stats-btn').addEventListener('click', () => {
    document.getElementById('stats-modal').classList.add('hidden');
  });
  document.getElementById('stats-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('stats-modal'))
      document.getElementById('stats-modal').classList.add('hidden');
  });
  document.getElementById('save-stats-btn').addEventListener('click', saveStats);
}

function openStatsModal() {
  const form = document.getElementById('stats-edit-form');
  form.innerHTML = '';
  STATS.forEach(s => {
    form.insertAdjacentHTML('beforeend', `
      <div class="stat-edit-row">
        <label>${s.icon} ${s.label}</label>
        <input type="range" min="1" max="10" value="${state.stats[s.key]}" data-key="${s.key}"
          oninput="this.nextElementSibling.textContent=this.value" />
        <span class="stat-edit-val">${state.stats[s.key]}</span>
      </div>
    `);
  });
  document.getElementById('stats-modal').classList.remove('hidden');
}

function saveStats() {
  document.querySelectorAll('#stats-edit-form input[type=range]').forEach(el => {
    state.stats[el.dataset.key] = parseInt(el.value);
  });
  save();
  renderStats();
  document.getElementById('stats-modal').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  renderAll();
}

// ── Boot ───────────────────────────────────────────────────────────────────
init();
