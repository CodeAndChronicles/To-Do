/* ============================================================
   NOVA GLASS Version 2.2 Beta — app logic (index.html + styles.css + theme.css + app.js)
   Sections:
   1. Constants & palettes
   2. Utilities
   3. Storage
   4. State & migration
   5. Appearance
   6. Routing
   7. Task utilities
   8. Renderers
   9. Task actions
   10. Modals
   11. Categories
   12. Import/export
   13. Reminders
   14. Toasts
   15. Events
   16. Init
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     1. CONSTANTS & PALETTES
     ============================================================ */
  var STORAGE_KEYS = {
    tasks: 'nova-tasks',
    categories: 'nova-categories',
    settings: 'nova-settings',
    backup: 'nova-tasks-backup'
  };

  var APP_VERSION = '2.2.0-beta';
  var DEFAULT_CATEGORIES = ['Work', 'Personal', 'Study', 'Home'];
  var STATUSES = ['todo', 'progress', 'done'];
  var PRIORITIES = ['low', 'medium', 'high'];
  var STATUS_LABEL = { todo: 'To Do', progress: 'In Progress', done: 'Completed' };
  var PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
  var STATUS_ORDER = { todo: 0, progress: 1, done: 2 };
  var PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

  var PALETTES = {
    midnight: {
      label: 'Midnight Burgundy',
      desc: 'Deep navy surfaces with burgundy accents',
      preview: 'linear-gradient(135deg,#0c1122 0%,#18223f 55%,#b3314f 100%)',
      light: { bg: ['#f5f3fa', '#eceaf4', '#e4e1ef'], primary: '#7a1531', accent: '#a0213f',
        text: '#11162b', muted: '#4a5373', success: '#0f7a55', warning: '#a35a06', danger: '#c0262d', info: '#2b5fb4',
        surfaceRGB: '255,255,255', elevRGB: '255,255,255', borderRGB: '17,22,43', shadowRGB: '17,22,43' },
      dark: { bg: ['#0c1122', '#111a33', '#18223f'], primary: '#b3314f', accent: '#f08aa0',
        text: '#e8ecf8', muted: '#9aa6c4', success: '#3ccf9a', warning: '#f2b84b', danger: '#f27a82', info: '#7aa7ff',
        surfaceRGB: '22,31,58', elevRGB: '30,41,74', borderRGB: '255,255,255', shadowRGB: '2,5,15' }
    },
    burgundy: {
      label: 'Burgundy Wine',
      desc: 'Warmer, wine-forward variant on midnight violet',
      preview: 'linear-gradient(135deg,#14101f 0%,#271a35 55%,#c13a5c 100%)',
      light: { bg: ['#faf4f5', '#f3e9ec', '#ecdde2'], primary: '#6f1229', accent: '#9b1c3a',
        text: '#24121a', muted: '#6a4a55', success: '#0f7a55', warning: '#a35a06', danger: '#b8222b', info: '#2b5fb4',
        surfaceRGB: '255,255,255', elevRGB: '255,255,255', borderRGB: '36,18,26', shadowRGB: '36,18,26' },
      dark: { bg: ['#14101f', '#1c1429', '#271a35'], primary: '#c13a5c', accent: '#ff9bb0',
        text: '#f4e9f2', muted: '#bba5be', success: '#3ccf9a', warning: '#f2b84b', danger: '#f58a8f', info: '#8db4ff',
        surfaceRGB: '34,24,52', elevRGB: '46,32,68', borderRGB: '255,255,255', shadowRGB: '4,2,10' }
    }
  };

  var ACCENT_TO_PALETTE = {
    purple: 'midnight', blue: 'midnight', green: 'midnight',
    red: 'burgundy', pink: 'burgundy', orange: 'burgundy'
  };

  var DEFAULT_SETTINGS = {
    theme: 'system',
    palette: 'midnight',
    radius: 'medium',
    density: 'comfortable',
    fontSize: 'medium',
    motion: 'full',
    glassTransparency: 50,
    blurIntensity: 16,
    borderOpacity: 45,
    shadowIntensity: 50,
    backgroundIntensity: 60,
    weekStart: 'sun',
    showDates: true,
    showPriorityIndicators: true,
    autoSort: true,
    showAnimations: true,
    confirmDelete: true,
    reminders: false,
    dashboardCards: {
      stats: true,
      progress: true,
      quickActions: true,
      priority: false,
      upcoming: true,
      recent: false
    }
  };

  /* ============================================================
     2. UTILITIES
     ============================================================ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function icon(name, cls) {
    return '<iconify-icon icon="' + name + '"' + (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true"></iconify-icon>';
  }

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      try { return window.crypto.randomUUID(); } catch (e) { /* fall through */ }
    }
    return 't' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function formatDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function todayStr() { return formatDate(new Date()); }

  function isValidDateStr(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = new Date(s + 'T00:00:00');
    return !isNaN(d.getTime());
  }

  function isValidTimeStr(s) {
    return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  }

  function isValidIso(s) {
    if (typeof s !== 'string') return false;
    var d = new Date(s);
    return !isNaN(d.getTime());
  }

  function normalizeText(s) {
    if (!s) return '';
    s = String(s).toLowerCase();
    s = s.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
    s = s.replace(/[\u0623\u0625\u0622]/g, '\u0627');
    s = s.replace(/\u0649/g, '\u064A');
    s = s.replace(/\u0629/g, '\u0647');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function hexToRgba(hex, alpha) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var num = parseInt(h, 16);
    if (isNaN(num)) return 'rgba(124,58,237,' + alpha + ')';
    return 'rgba(' + ((num >> 16) & 255) + ',' + ((num >> 8) & 255) + ',' + (num & 255) + ',' + alpha + ')';
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  /* ============================================================
     3. STORAGE
     ============================================================ */
  var storage = {
    available: (function () {
      try {
        var k = '__nova_probe__';
        window.localStorage.setItem(k, '1');
        window.localStorage.removeItem(k);
        return true;
      } catch (e) { return false; }
    })(),
    getRaw: function (key) {
      if (!this.available) return null;
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    setRaw: function (key, val) {
      if (!this.available) return false;
      try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; }
    },
    getJSON: function (key) {
      var raw = this.getRaw(key);
      if (raw === null || raw === '') return null;
      try { return JSON.parse(raw); } catch (e) { return undefined; }
    },
    setJSON: function (key, val) { return this.setRaw(key, JSON.stringify(val)); }
  };

  /* ============================================================
     4. STATE & MIGRATION
     ============================================================ */
  var state = {
    tasks: [],
    categories: DEFAULT_CATEGORIES.slice(),
    settings: Object.assign({}, DEFAULT_SETTINGS),
    page: 'dashboard',
    editingId: null,
    search: '',
    filterStatus: 'all',
    filterDate: 'any',
    filterPriority: 'all',
    sort: 'smart',
    weekOffset: 0,
    calendar: {
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      selected: null
    }
  };

  var pendingToasts = [];

  function normSubs(a) {
    if (!Array.isArray(a)) return [];
    return a.filter(function (s) { return s && typeof s.text === 'string' && s.text.trim(); }).slice(0, 40).map(function (s) {
      return { id: s.id != null ? String(s.id) : uid(), text: s.text.trim().slice(0, 120), done: s.done === true };
    });
  }

  function normalizeTask(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var text = '';
    if (typeof raw.text === 'string') text = raw.text.trim();
    else if (typeof raw.title === 'string') text = raw.title.trim();
    if (!text) return null;

    var status;
    if (STATUSES.indexOf(raw.status) !== -1) status = raw.status;
    else if (raw.completed === true) status = 'done';
    else status = 'todo';

    var priority = PRIORITIES.indexOf(raw.priority) !== -1 ? raw.priority : 'medium';
    var createdAt = isValidIso(raw.createdAt) ? raw.createdAt : new Date().toISOString();
    var updatedAt = isValidIso(raw.updatedAt) ? raw.updatedAt : createdAt;

    return {
      id: raw.id != null ? String(raw.id) : uid(),
      text: text.slice(0, 200),
      description: typeof raw.description === 'string' ? raw.description.slice(0, 1000) : '',
      note: typeof raw.note === 'string' ? raw.note.slice(0, 2000) : '',
      status: status,
      priority: priority,
      category: typeof raw.category === 'string' ? raw.category.slice(0, 40) : '',
      location: typeof raw.location === 'string' ? raw.location.slice(0, 100) : '',
      dueDate: isValidDateStr(raw.dueDate) ? raw.dueDate : '',
      dueTime: isValidTimeStr(raw.dueTime) ? raw.dueTime : '',
      pinned: raw.pinned === true,
      reminder: raw.reminder === true,
      subtasks: normSubs(raw.subtasks),
      remindedKey: typeof raw.remindedKey === 'string' ? raw.remindedKey : '',
      createdAt: createdAt,
      updatedAt: updatedAt
    };
  }

  function loadAll() {
    // Tasks
    var data = storage.getJSON(STORAGE_KEYS.tasks);

    if (data === undefined) {
      var rawString = storage.getRaw(STORAGE_KEYS.tasks);
      if (rawString) storage.setRaw(STORAGE_KEYS.backup, rawString);
      pendingToasts.push(['Saved tasks could not be read. A backup copy was preserved.', 'error']);
      data = null;
    }

    if (data === null) {
      var backup = storage.getJSON(STORAGE_KEYS.backup);
      if (Array.isArray(backup) && backup.length) {
        data = backup;
        pendingToasts.push(['Tasks were recovered from a backup copy.', 'info']);
      }
    }

    var normalized = [];
    var migrated = false;

    if (Array.isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        var t = normalizeTask(data[i]);
        if (t) {
          normalized.push(t);
          if (data[i].status !== t.status || data[i].completed === true) migrated = true;
        } else {
          migrated = true;
        }
      }
      state.tasks = normalized;
      if (migrated) {
        var rawBefore = storage.getRaw(STORAGE_KEYS.tasks);
        if (rawBefore) storage.setRaw(STORAGE_KEYS.backup, rawBefore);
        saveTasks(true);
      }
    } else {
      state.tasks = [];
    }

    // Categories
    var cats = storage.getJSON(STORAGE_KEYS.categories);
    if (Array.isArray(cats)) {
      var clean = [];
      for (var c = 0; c < cats.length; c++) {
        if (typeof cats[c] === 'string' && cats[c].trim() && clean.indexOf(cats[c].trim()) === -1) {
          clean.push(cats[c].trim());
        }
      }
      state.categories = clean;
    } else {
      state.categories = DEFAULT_CATEGORIES.slice();
    }

    // Settings
    var saved = storage.getJSON(STORAGE_KEYS.settings);
    var s = Object.assign({}, DEFAULT_SETTINGS);
    s.dashboardCards = Object.assign({}, DEFAULT_SETTINGS.dashboardCards);

    if (saved && typeof saved === 'object') {
      Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
        if (key === 'dashboardCards') return;
        if (Object.prototype.hasOwnProperty.call(saved, key) &&
            typeof saved[key] === typeof DEFAULT_SETTINGS[key]) {
          s[key] = saved[key];
        }
      });
      if (saved.dashboardCards && typeof saved.dashboardCards === 'object') {
        Object.keys(DEFAULT_SETTINGS.dashboardCards).forEach(function (k) {
          if (typeof saved.dashboardCards[k] === 'boolean') s.dashboardCards[k] = saved.dashboardCards[k];
        });
      }
      // legacy
      if (typeof saved.reminders !== 'boolean' && typeof saved.enableNotifications === 'boolean') {
        s.reminders = saved.enableNotifications;
      }
      if (!saved.palette && saved.accentColor && ACCENT_TO_PALETTE[saved.accentColor]) {
        s.palette = ACCENT_TO_PALETTE[saved.accentColor];
      }
    }

    if (!PALETTES[s.palette]) s.palette = 'midnight';
    if (['system', 'light', 'dark'].indexOf(s.theme) === -1) s.theme = 'system';
    if (['small', 'medium', 'large'].indexOf(s.radius) === -1) s.radius = 'medium';
    if (['compact', 'comfortable'].indexOf(s.density) === -1) s.density = 'comfortable';
    if (['small', 'medium', 'large'].indexOf(s.fontSize) === -1) s.fontSize = 'medium';
    if (['full', 'reduced'].indexOf(s.motion) === -1) s.motion = 'full';
    if (['sun', 'mon', 'sat'].indexOf(s.weekStart) === -1) s.weekStart = 'sun';
    s.glassTransparency = clamp(parseInt(s.glassTransparency, 10), 0, 100, 50);
    s.blurIntensity = clamp(parseInt(s.blurIntensity, 10), 0, 30, 16);
    s.borderOpacity = clamp(parseInt(s.borderOpacity, 10), 0, 100, 45);
    s.shadowIntensity = clamp(parseInt(s.shadowIntensity, 10), 0, 100, 50);
    s.backgroundIntensity = clamp(parseInt(s.backgroundIntensity, 10), 0, 100, 60);

    state.settings = s;
  }

  function clamp(v, min, max, fallback) {
    if (isNaN(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  }

  function saveTasks(silent) {
    var ok = storage.setJSON(STORAGE_KEYS.tasks, state.tasks);
    if (!ok && !silent) toast('Could not save tasks. Storage may be full or blocked.', 'error', 6000);
    return ok;
  }
  function saveCategories() { storage.setJSON(STORAGE_KEYS.categories, state.categories); }
  function saveSettings() { storage.setJSON(STORAGE_KEYS.settings, state.settings); }

  /* ============================================================
     5. APPEARANCE
     ============================================================ */
  function resolveMode() {
    if (state.settings.theme === 'light') return 'light';
    if (state.settings.theme === 'dark') return 'dark';
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }

  function applyAppearance() {
    var s = state.settings;
    var mode = resolveMode();
    var pal = PALETTES[s.palette] || PALETTES['midnight'];
    var c = pal[mode];
    var root = document.documentElement.style;

    // Background
    root.setProperty('--bg-1', c.bg[0]);
    root.setProperty('--bg-2', c.bg[1]);
    root.setProperty('--bg-3', c.bg[2]);
    root.setProperty('--bg-flat', c.bg[1]);
    root.setProperty('--bg-intensity', String(s.backgroundIntensity / 100));

    // Glass alpha from transparency slider (0 = opaque, 100 = very transparent)
    var glassAlpha = 0.94 - (s.glassTransparency / 100) * 0.60; // 0.94 → 0.34
    root.setProperty('--surface', 'rgba(' + c.surfaceRGB + ',' + glassAlpha + ')');
    root.setProperty('--surface-2', 'rgba(' + c.surfaceRGB + ',' + (glassAlpha * 0.72) + ')');
    root.setProperty('--surface-3', 'rgba(' + c.surfaceRGB + ',' + (glassAlpha * 0.46) + ')');
    root.setProperty('--surface-solid', 'rgb(' + c.surfaceRGB + ')');

    // Border alpha
    var borderAlpha = 0.06 + (s.borderOpacity / 100) * 0.20;
    root.setProperty('--border', 'rgba(' + c.borderRGB + ',' + borderAlpha + ')');
    root.setProperty('--border-soft', 'rgba(' + c.borderRGB + ',' + (borderAlpha * 0.55) + ')');

    // Text
    root.setProperty('--text', c.text);
    root.setProperty('--text-muted', c.muted);

    // Primary / accent
    root.setProperty('--primary', c.primary);
    root.setProperty('--accent', c.accent);
    root.setProperty('--primary-soft', hexToRgba(c.primary, mode === 'dark' ? 0.26 : 0.16));
    root.setProperty('--accent-soft', hexToRgba(c.accent, mode === 'dark' ? 0.26 : 0.16));

    // Extended semantic tokens
    root.setProperty('--bg-tertiary', c.bg[2]);
    root.setProperty('--surface-elev', 'rgb(' + c.elevRGB + ')');
    root.setProperty('--info', c.info);
    root.setProperty('--info-soft', hexToRgba(c.info, mode === 'dark' ? 0.22 : 0.14));
    root.setProperty('--focus', c.accent);
    root.setProperty('--on-primary', '#ffffff');
    root.setProperty('--p-high', c.danger);
    root.setProperty('--p-medium', c.warning);
    root.setProperty('--p-low', c.success);

    // Semantic
    root.setProperty('--success', c.success);
    root.setProperty('--warning', c.warning);
    root.setProperty('--danger', c.danger);
    root.setProperty('--success-soft', hexToRgba(c.success, mode === 'dark' ? 0.20 : 0.14));
    root.setProperty('--warning-soft', hexToRgba(c.warning, mode === 'dark' ? 0.20 : 0.14));
    root.setProperty('--danger-soft', hexToRgba(c.danger, mode === 'dark' ? 0.20 : 0.14));

    // Shadow
    var shadowAlpha = (s.shadowIntensity / 100) * (mode === 'dark' ? 0.55 : 0.18);
    root.setProperty('--shadow', '0 6px 24px rgba(' + c.shadowRGB + ',' + shadowAlpha + ')');
    root.setProperty('--shadow-lg', '0 16px 48px rgba(' + c.shadowRGB + ',' + (shadowAlpha * 1.6) + ')');

    // Blur
    root.setProperty('--blur', s.blurIntensity + 'px');

    // Radius
    var r = s.radius === 'small' ? 10 : s.radius === 'large' ? 20 : 14;
    root.setProperty('--radius', r + 'px');
    root.setProperty('--radius-sm', Math.round(r * 0.7) + 'px');
    root.setProperty('--radius-lg', Math.round(r * 1.5) + 'px');

    // Root font size
    var fs = s.fontSize === 'small' ? 14 : s.fontSize === 'large' ? 18 : 16;
    document.documentElement.style.fontSize = fs + 'px';

    // Body classes
    document.body.classList.toggle('density-compact', s.density === 'compact');
    document.body.classList.toggle('motion-reduced', s.motion === 'reduced');

    // Theme attribute (for color-scheme and native controls)
    if (s.theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', s.theme);

    document.documentElement.setAttribute('data-palette', s.palette);

    // Theme-color meta
    var meta = $('#themeColorMeta');
    if (meta) meta.setAttribute('content', mode === 'dark' ? c.bg[0] : c.primary);

    // Theme toggle button
    var btn = $('#themeToggle');
    if (btn) {
      var dark = mode === 'dark';
      btn.innerHTML = icon(dark ? 'solar:sun-linear' : 'solar:moon-linear');
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      btn.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }

  /* ============================================================
     6. ROUTING & NAV
     ============================================================ */
  var PAGES = {
    dashboard: { label: 'Dashboard', icon: 'solar:home-2-linear', render: renderDashboard, short: 'Home' },
    tasks:     { label: 'All Tasks', icon: 'solar:list-check-linear', render: renderTasksPage, short: 'Tasks' },
    today:     { label: 'Today', icon: 'solar:calendar-date-linear', render: renderTodayPage, short: 'Today' },
    week:      { label: 'Week planner', icon: 'solar:notebook-linear', render: renderWeekPage, short: 'Week' },
    upcoming:  { label: 'Upcoming', icon: 'solar:calendar-minimalistic-linear', render: renderUpcomingPage },
    progress:  { label: 'In Progress', icon: 'solar:play-circle-linear', render: renderProgressPage },
    completed: { label: 'Completed', icon: 'solar:check-circle-linear', render: renderCompletedPage },
    calendar:  { label: 'Calendar', icon: 'solar:calendar-linear', render: renderCalendarPage, short: 'Calendar' },
    stats:     { label: 'Statistics', icon: 'solar:chart-2-linear', render: renderStatsPage, short: 'Stats' },
    settings:  { label: 'Settings', icon: 'solar:settings-linear', render: renderSettingsPage },
    about:     { label: 'About', icon: 'solar:info-circle-linear', render: renderAboutPage }
  };

  var NAV_GROUPS = [
    { label: '', items: ['dashboard', 'tasks'] },
    { label: 'By date', items: ['today', 'week', 'upcoming', 'calendar'] },
    { label: 'By status', items: ['progress', 'completed'] },
    { label: 'Insights', items: ['stats'] },
    { label: 'App', items: ['settings', 'about'] }
  ];
  var BOTTOM_ORDER = ['dashboard', 'today', 'week', 'tasks'];

  function navigate(page, replace) {
    if (!PAGES[page]) page = 'dashboard';
    state.page = page;
    if (page === 'week') state.weekOffset = 0;
    var hash = '#/' + page;
    if (location.hash !== hash) {
      if (replace) history.replaceState(null, '', hash);
      else history.pushState(null, '', hash);
    }
    renderPage();
    closeDrawer();
    var main = $('#main');
    if (main) main.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    return PAGES[h] ? h : 'dashboard';
  }

  function navItemHTML(key) {
    var p = PAGES[key], badge = '', n = 0;
    if (key === 'today') n = state.tasks.filter(function (t) { return t.dueDate === todayStr() && t.status !== 'done'; }).length;
    else if (key === 'progress') n = state.tasks.filter(function (t) { return t.status === 'progress'; }).length;
    if (n) badge = '<span class="nav-badge">' + n + '</span>';
    return '<button type="button" class="nav-item" data-page="' + key + '"' + (state.page === key ? ' aria-current="page"' : '') +
      ' aria-label="' + esc(p.label) + '">' + icon(p.icon) + '<span class="nav-label">' + esc(p.label) + '</span>' + badge + '</button>';
  }

  function renderNav() {
    // Sidebar
    var nav = $('#sidebarNav');
    if (nav) {
      nav.innerHTML = NAV_GROUPS.map(function (g) {
        return (g.label ? '<div class="nav-group-label">' + esc(g.label) + '</div>' : '') +
          g.items.map(navItemHTML).join('');
      }).join('');
    }

    // Bottom nav
    var bnav = $('#bottomNav');
    if (bnav) {
      var items = BOTTOM_ORDER.map(function (key) {
        var p = PAGES[key];
        return '<button type="button" class="bnav-item" data-page="' + key + '"' +
          (state.page === key ? ' aria-current="page"' : '') +
          ' aria-label="' + esc(p.label) + '">' +
          icon(p.icon) +
          '<span>' + esc(p.short || p.label) + '</span>' +
          '</button>';
      }).join('');
      items += '<button type="button" class="bnav-item" id="bnavMore" aria-label="Open menu">' +
        icon('solar:hamburger-menu-linear') +
        '<span>Menu</span></button>';
      bnav.innerHTML = items;
    }
  }

  function renderPage() {
    var page = PAGES[state.page] || PAGES.dashboard;
    var title = $('#pageTitle');
    if (title) title.textContent = page.label;
    document.title = page.label + ' — Nova Glass';

    var main = $('#main');
    if (!main) return;

    var html;
    try {
      html = page.render();
    } catch (e) {
      html = '<div class="empty-state"><div class="empty-icon">' + icon('solar:danger-triangle-linear') + '</div>' +
        '<h3>Something went wrong</h3><p>This page could not be rendered. Try reloading.</p></div>';
    }

    main.innerHTML = html;

    if (page.afterRender) {
      try { page.afterRender(); } catch (e) { /* non-fatal */ }
    }

    renderNav();

    // Refresh toast list state
    updateSearchClearBtn();
  }

  function updateSearchClearBtn() {
    var input = $('#taskSearchInput');
    var btn = $('#clearSearchBtn');
    if (input && btn) btn.hidden = input.value.length === 0;
  }

  /* ============================================================
     7. TASK UTILITIES
     ============================================================ */
  function dueMoment(task, endOfDay) {
    if (!task.dueDate) return null;
    var time = task.dueTime || (endOfDay ? '23:59' : '09:00');
    var d = new Date(task.dueDate + 'T' + time + ':00');
    return isNaN(d.getTime()) ? null : d;
  }

  function isOverdue(task) {
    if (task.status === 'done') return false;
    var m = dueMoment(task, true);
    return m ? m.getTime() < Date.now() : false;
  }

  function isToday(task) { return task.dueDate === todayStr(); }

  function isUpcoming(task) {
    if (task.status === 'done') return false;
    var m = dueMoment(task, true);
    return m ? m.getTime() >= Date.now() : false;
  }

  function formatDueLabel(task) {
    if (!task.dueDate) return '';
    var d = new Date(task.dueDate + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    var label;
    if (diff === 0) label = 'Today';
    else if (diff === 1) label = 'Tomorrow';
    else if (diff === -1) label = 'Yesterday';
    else {
      var opts = { month: 'short', day: 'numeric' };
      if (d.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
      try { label = d.toLocaleDateString(undefined, opts); }
      catch (e) { label = task.dueDate; }
    }
    return task.dueTime ? label + ', ' + task.dueTime : label;
  }

  function getVisibleTasks() {
    var q = normalizeText(state.search);
    var list = state.tasks.filter(function (t) {
      if (state.filterStatus !== 'all') {
        if (state.filterStatus === 'pinned') { if (!t.pinned) return false; }
        else if (t.status !== state.filterStatus) return false;
      }
      if (state.filterPriority !== 'all' && t.priority !== state.filterPriority) return false;
      if (state.filterDate !== 'any') {
        if (state.filterDate === 'today' && !isToday(t)) return false;
        if (state.filterDate === 'overdue' && !isOverdue(t)) return false;
        if (state.filterDate === 'upcoming' && !isUpcoming(t)) return false;
        if (state.filterDate === 'none' && t.dueDate) return false;
      }
      if (q) {
        var hay = normalizeText([t.text, t.description, t.note, t.location, t.category].filter(Boolean).join(' '));
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    sortTasks(list);
    return list;
  }

  function sortTasks(list) {
    var mode = state.sort;
    list.sort(function (a, b) {
      if (mode !== 'title') {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
      }
      if (mode === 'title') return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
      if (mode === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
      if (mode === 'priority') {
        var pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (pd !== 0) return pd;
        return compareDue(a, b);
      }
      if (mode === 'status') {
        var sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (sd !== 0) return sd;
        return compareDue(a, b);
      }
      if (mode === 'due') return compareDue(a, b);
      // smart
      var doneDiff = (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0);
      if (doneDiff !== 0) return doneDiff;
      var sDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (sDiff !== 0) return sDiff;
      var pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pDiff !== 0) return pDiff;
      var dDiff = compareDue(a, b);
      if (dDiff !== 0) return dDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  function compareDue(a, b) {
    var am = dueMoment(a, true), bm = dueMoment(b, true);
    if (am && bm) return am - bm;
    if (am && !bm) return -1;
    if (!am && bm) return 1;
    return 0;
  }

  function statusLabel(s) { return STATUS_LABEL[s] || 'To Do'; }
  function priorityLabel(p) { return PRIORITY_LABEL[p] || 'Medium'; }

  /* ============================================================
     8. RENDERERS
     ============================================================ */

  /* ---- organisation helpers (V2.2) ---- */
  var BUCKETS = [
    ['overdue', 'Overdue', 'solar:danger-triangle-linear'], ['today', 'Today', 'solar:calendar-date-linear'],
    ['tomorrow', 'Tomorrow', 'solar:sun-2-linear'], ['week', 'Next 7 days', 'solar:calendar-minimalistic-linear'],
    ['later', 'Later', 'solar:calendar-linear'], ['nodate', 'No date', 'solar:list-check-linear'],
    ['done', 'Completed', 'solar:check-circle-linear']
  ];
  var DAY_KEYS = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
    'الاحد': 0, 'الأحد': 0, 'الاثنين': 1, 'الإثنين': 1, 'الثلاثاء': 2, 'الاربعاء': 3, 'الأربعاء': 3, 'الخميس': 4, 'الجمعة': 5, 'السبت': 6 };

  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function startOfToday() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function weekStartIdx() { return { sun: 0, mon: 1, sat: 6 }[state.settings.weekStart] || 0; }
  function weekStartDate(offset) { var t = startOfToday(); return addDays(t, -((t.getDay() - weekStartIdx() + 7) % 7) + offset * 7); }
  function catHue(name) { var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return h % 360; }

  function bucketOf(t) {
    if (t.status === 'done') return 'done';
    if (!t.dueDate) return 'nodate';
    if (isOverdue(t)) return 'overdue';
    var d = Math.round((new Date(t.dueDate + 'T00:00:00') - startOfToday()) / 86400000);
    return d <= 0 ? 'today' : d === 1 ? 'tomorrow' : d <= 7 ? 'week' : 'later';
  }

  function subsToText(subs) { return (subs || []).map(function (s) { return (s.done ? '[x] ' : '') + s.text; }).join('\n'); }
  function parseSubs(text, prev) {
    var pool = (prev || []).slice();
    return String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 40).map(function (l) {
      var done = /^\[x\]\s*/i.test(l), txt = l.replace(/^\[x\]\s*/i, '').slice(0, 120);
      if (!txt) return null;
      var k = -1; for (var i = 0; i < pool.length; i++) if (pool[i].text === txt) { k = i; break; }
      var id = k > -1 ? pool.splice(k, 1)[0].id : uid();
      return { id: id, text: txt, done: done };
    }).filter(Boolean);
  }

  function matchCategory(name, dry) {
    name = name.trim().slice(0, 40);
    var n = normalizeText(name);
    for (var i = 0; i < state.categories.length; i++) if (normalizeText(state.categories[i]) === n) return state.categories[i];
    if (!dry) { state.categories.push(name); saveCategories(); }
    return name;
  }

  // "Physics lab report fri 5pm #Study !high" -> task fields
  function parseQuick(text, dry) {
    var toks = String(text).trim().split(/\s+/).filter(Boolean), rest = [], now = new Date();
    var out = { title: '', priority: 'medium', category: '', dueDate: '', dueTime: '' };
    toks.forEach(function (tk) {
      var lk = tk.toLowerCase(), m;
      if (tk.charAt(0) === '#' && tk.length > 1) { out.category = matchCategory(tk.slice(1), dry); return; }
      if ((m = lk.match(/^!(high|h|medium|m|low|l)$/))) { out.priority = { h: 'high', m: 'medium', l: 'low' }[m[1].charAt(0)]; return; }
      if (lk === 'today' || tk === 'اليوم') { out.dueDate = formatDate(now); return; }
      if (['tomorrow', 'tmr', 'tom', 'بكرة', 'بكره', 'غدا', 'غدًا'].indexOf(lk) !== -1) { out.dueDate = formatDate(addDays(now, 1)); return; }
      if (Object.prototype.hasOwnProperty.call(DAY_KEYS, lk)) { out.dueDate = formatDate(addDays(now, (DAY_KEYS[lk] - now.getDay() + 7) % 7 || 7)); return; }
      if ((m = lk.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/)) && +m[1] >= 1 && +m[1] <= 12) { out.dueTime = pad2(+m[1] % 12 + (m[3] === 'pm' ? 12 : 0)) + ':' + (m[2] || '00'); return; }
      if ((m = lk.match(/^([01]?\d|2[0-3]):([0-5]\d)$/))) { out.dueTime = pad2(+m[1]) + ':' + m[2]; return; }
      rest.push(tk);
    });
    while (rest.length && ['at', 'on', 'by', 'due'].indexOf(rest[rest.length - 1].toLowerCase()) !== -1) rest.pop();
    out.title = rest.join(' ').trim();
    if (out.dueTime && !out.dueDate) out.dueDate = formatDate(out.dueTime <= pad2(now.getHours()) + ':' + pad2(now.getMinutes()) ? addDays(now, 1) : now);
    return out;
  }

  function addTask(p) {
    var now = new Date().toISOString();
    var t = normalizeTask(Object.assign({ id: uid(), status: 'todo', createdAt: now, updatedAt: now }, p));
    if (!t) return null;
    state.tasks.unshift(t);
    saveTasks();
    return t;
  }

  function quickAddHTML(defDate) {
    return '<form class="quick-add" novalidate autocomplete="off"' + (defDate ? ' data-default-date="' + defDate + '"' : '') + '>' +
      '<div class="qa-row"><input type="text" class="input qa-input" dir="auto" maxlength="200" aria-label="Quick add task" placeholder="Quick add: Lab report fri 5pm #Study !high">' +
      '<button type="submit" class="btn btn-primary qa-btn" aria-label="Add task">' + icon('solar:add-circle-linear') + '</button></div>' +
      '<div class="qa-preview" aria-live="polite"></div></form>';
  }

  function updateQaPreview(input) {
    var box = input.closest('.quick-add').querySelector('.qa-preview');
    var p = input.value.trim() ? parseQuick(input.value, true) : null, h = '';
    if (p) {
      if (p.dueDate) h += '<span class="meta meta-date">' + icon('solar:calendar-linear') + esc(formatDueLabel(p)) + '</span>';
      if (p.category) h += '<span class="meta meta-cat" style="--h:' + catHue(p.category) + '">' + icon('solar:tag-linear') + esc(p.category) + '</span>';
      if (p.priority !== 'medium') h += '<span class="meta meta-priority p-' + p.priority + '">' + icon('solar:flag-linear') + esc(priorityLabel(p.priority)) + '</span>';
    }
    box.innerHTML = h;
  }

  function handleQuickAdd(form) {
    var input = form.querySelector('.qa-input');
    var p = parseQuick(input.value, false);
    if (!p.title) { toast('Type a task title first.', 'warning'); input.focus(); return; }
    if (!p.dueDate && form.dataset.defaultDate === 'today') p.dueDate = todayStr();
    var t = addTask({ text: p.title, priority: p.priority, category: p.category, dueDate: p.dueDate, dueTime: p.dueDate ? p.dueTime : '' });
    if (!t) return;
    renderPage();
    var q = $('.qa-input'); if (q) q.focus();
    toast('Added "' + t.text + '"' + (t.dueDate ? ' · ' + formatDueLabel(t) : ''), 'success', 2200);
  }

  function subsHTML(task) {
    var subs = task.subtasks || [];
    if (!subs.length) return '';
    var d = subs.filter(function (s) { return s.done; }).length;
    return '<details class="task-sub"><summary>' + icon('solar:checklist-minimalistic-linear') + '<span class="sub-count">' + d + '/' + subs.length + '</span>' +
      '<span class="sub-bar"><span style="width:' + Math.round(d / subs.length * 100) + '%"></span></span></summary><ul>' +
      subs.map(function (s) {
        return '<li><label class="sub-item"><input type="checkbox" data-sub="' + esc(s.id) + '"' + (s.done ? ' checked' : '') + '><span dir="auto">' + esc(s.text) + '</span></label></li>';
      }).join('') + '</ul></details>';
  }

  function toggleSub(input) {
    var card = input.closest('.task-card'), task = card && findTask(card.dataset.id);
    if (!task) return;
    var s = (task.subtasks || []).filter(function (x) { return x.id === input.dataset.sub; })[0];
    if (!s) return;
    s.done = input.checked;
    task.updatedAt = new Date().toISOString();
    saveTasks();
    var d = task.subtasks.filter(function (x) { return x.done; }).length;
    card.querySelector('.sub-count').textContent = d + '/' + task.subtasks.length;
    card.querySelector('.sub-bar span').style.width = Math.round(d / task.subtasks.length * 100) + '%';
  }

  function listSection(title, ic, list, cls) {
    return '<div class="group-head ' + (cls || '') + '">' + icon(ic) + '<span>' + esc(title) + '</span><small>' + list.length + '</small></div><ul class="task-list">' + list.map(taskCardHTML).join('') + '</ul>';
  }

  // ---- Reusable task card ----
  function taskCardHTML(task) {
    var overdue = isOverdue(task);
    var today = isToday(task) && !overdue;
    var classes = ['task-card', 'status-' + task.status];
    if (task.status === 'done') classes.push('is-done');
    if (task.pinned) classes.push('is-pinned');
    classes.push('prio-' + task.priority);
    if (overdue) classes.push('is-overdue');

    var toggleLabel = task.status === 'done'
      ? 'Mark "' + task.text + '" as To Do'
      : (task.status === 'todo'
          ? 'Start "' + task.text + '" (move to In Progress)'
          : 'Complete "' + task.text + '"');

    var checkIcon = task.status === 'done'
      ? 'solar:check-circle-bold'
      : (task.status === 'progress' ? 'solar:play-circle-bold' : 'solar:circle-linear');

    var meta = '';
    meta += '<span class="meta meta-status s-' + task.status + '">' +
      icon(task.status === 'done' ? 'solar:check-circle-linear' : task.status === 'progress' ? 'solar:play-circle-linear' : 'solar:circle-linear') +
      esc(statusLabel(task.status)) + '</span>';

    if (state.settings.showPriorityIndicators) {
      meta += '<span class="meta meta-priority p-' + task.priority + '">' +
        icon('solar:flag-linear') + esc(priorityLabel(task.priority)) + '</span>';
    }
    if (task.category) {
      meta += '<span class="meta meta-cat" style="--h:' + catHue(task.category) + '">' + icon('solar:tag-linear') + esc(task.category) + '</span>';
    }
    if (task.location) {
      meta += '<span class="meta meta-loc">' + icon('solar:map-point-linear') + esc(task.location) + '</span>';
    }
    if (state.settings.showDates && task.dueDate) {
      var dateClass = 'meta meta-date';
      if (overdue) dateClass += ' is-overdue';
      else if (today) dateClass += ' is-today';
      meta += '<span class="' + dateClass + '">' +
        icon('solar:calendar-linear') + esc(formatDueLabel(task)) +
        (overdue ? ' · Overdue' : '') + '</span>';
    }
    if (task.reminder) {
      meta += '<span class="meta meta-date">' + icon('solar:bell-linear') + 'Reminder</span>';
    }

    var desc = task.description && task.description.trim()
      ? '<p class="task-desc" dir="auto">' + esc(task.description) + '</p>' : '';

    if (state.justDone === task.id) classes.push('just-done');
    var noteTxt = task.note ? task.note.trim() : '';
    var note = noteTxt
      ? '<details class="task-note"><summary>' + icon('solar:notes-linear') + '<span class="tn-preview">' + esc(noteTxt.split('\n')[0].slice(0, 70)) + '</span></summary>' +
        '<div class="tn-full" dir="auto">' + esc(noteTxt) + '</div></details>' : '';

    return '<li class="' + classes.join(' ') + '" data-id="' + esc(task.id) + '">' +
      '<div class="task-top">' +
        '<button type="button" class="task-check" data-action="cycle-status" aria-label="' + esc(toggleLabel) + '" title="' + esc(toggleLabel) + '">' +
          icon(checkIcon) +
        '</button>' +
        '<div class="task-body" data-action="edit" role="button" tabindex="0" aria-label="Edit task: ' + esc(task.text) + '">' +
          '<p class="task-title" dir="auto">' + esc(task.text) + '</p>' +
          desc +
          '<div class="task-meta">' + meta + '</div>' +
        '</div>' +
      '</div>' + subsHTML(task) + note +
      '<div class="task-actions">' +
        '<button type="button" class="task-btn" data-action="edit" aria-label="Edit task: ' + esc(task.text) + '" title="Edit">' + icon('solar:pen-linear') + '</button>' +
        '<button type="button" class="task-btn' + (task.pinned ? ' is-active' : '') + '" data-action="pin" aria-pressed="' + (task.pinned ? 'true' : 'false') + '" aria-label="' + (task.pinned ? 'Unpin task: ' : 'Pin task: ') + esc(task.text) + '" title="' + (task.pinned ? 'Unpin' : 'Pin') + '">' + icon('solar:pin-linear') + '</button>' +
        '<button type="button" class="task-btn" data-action="delete" aria-label="Delete task: ' + esc(task.text) + '" title="Delete">' + icon('solar:trash-bin-trash-linear') + '</button>' +
      '</div>' +
    '</li>';
  }

  function emptyState(iconName, title, text, actionHtml) {
    return '<div class="empty-state">' +
      '<div class="empty-icon">' + icon(iconName) + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(text) + '</p>' +
      (actionHtml || '') +
      '</div>';
  }

  // ---- Dashboard ----
  function taskSection(title, ic, tasks, linkPage, linkLabel) {
    return '<div class="section-head"><h3>' + icon(ic) + ' ' + esc(title) + '</h3>' +
      (linkPage ? '<button type="button" class="section-link" data-page="' + linkPage + '">' + esc(linkLabel) + ' ' + icon('solar:arrow-right-linear') + '</button>' : '') +
      '</div><ul class="task-list">' + tasks.map(taskCardHTML).join('') + '</ul>';
  }

  function renderDashboard() {
    var s = state.settings, dc = s.dashboardCards;
    var total = state.tasks.length;
    var done = state.tasks.filter(function (t) { return t.status === 'done'; }).length;
    var prog = state.tasks.filter(function (t) { return t.status === 'progress'; }).length;
    var overdueList = state.tasks.filter(isOverdue).sort(compareDue);
    var percent = total ? Math.round((done / total) * 100) : 0;
    var hour = new Date().getHours();
    var greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    var dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    var html = '<div class="greeting"><h2>' + esc(greet) + ' ' + icon(hour < 18 ? 'solar:sun-2-linear' : 'solar:moon-stars-linear', 'anim-greet') + '</h2><p>' + esc(dateLabel) + '</p></div>';

    var dueToday = state.tasks.filter(function (t) { return isToday(t) && t.status !== 'done' && !isOverdue(t); }).length;
    html += '<p class="dash-summary">' + (dueToday + overdueList.length
      ? '<b>' + dueToday + '</b> due today' + (overdueList.length ? ' · <b class="is-danger">' + overdueList.length + '</b> overdue' : '')
      : 'You are all caught up.') + '</p>' + quickAddHTML();
    if (!total) {
      return html + emptyState('solar:list-check-linear', 'No tasks yet', 'Create your first task to get started.',
        '<button type="button" class="btn btn-primary" data-action="new-task">' + icon('solar:add-circle-linear') + 'Add a task</button>');
    }

    if (dc.progress || dc.stats) {
      html += '<div class="progress-card">';
      if (dc.progress) {
        html += '<div class="progress-head"><h3>' + icon('solar:chart-2-linear') + ' Progress</h3><span class="pct">' + percent + '%</span></div>' +
          '<div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + percent + '" aria-valuetext="' + percent + '% completed"><span class="progress-fill" style="width:' + percent + '%"></span></div>';
      }
      if (dc.stats) {
        html += '<div class="mini-stats">' +
          '<span><b>' + (total - done) + '</b> active</span><span><b>' + prog + '</b> in progress</span>' +
          '<span class="' + (overdueList.length ? 'is-danger' : '') + '"><b>' + overdueList.length + '</b> overdue</span><span><b>' + done + '</b> done</span></div>';
      }
      html += '</div>';
    }

    if (dc.quickActions) {
      html += '<div class="quick-grid">' +
        quickAction('solar:add-circle-linear', 'New task', 'primary', 'new-task') +
        quickAction('solar:calendar-date-linear', 'Today', 'warning', 'go-today') +
        quickAction('solar:danger-triangle-linear', 'Overdue', 'danger', 'go-overdue') +
        quickAction('solar:check-circle-linear', 'Completed', 'success', 'go-completed') + '</div>';
    }

    var strip = '';
    for (var di = 0; di < 7; di++) {
      var dd = addDays(startOfToday(), di), dds = formatDate(dd);
      var cn = state.tasks.filter(function (t) { return t.dueDate === dds && t.status !== 'done'; }).length;
      strip += '<button type="button" class="day-chip' + (di === 0 ? ' is-today' : '') + '" data-page="week" aria-label="' + esc(dd.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })) + ', ' + cn + ' open">' +
        '<small>' + esc(dd.toLocaleDateString(undefined, { weekday: 'short' })) + '</small><b>' + dd.getDate() + '</b><span class="dc-count' + (cn ? ' has' : '') + '">' + (cn || '') + '</span></button>';
    }
    html += '<div class="day-strip" role="group" aria-label="Next 7 days">' + strip + '</div>';

    var attention = overdueList.concat(state.tasks.filter(function (t) { return isToday(t) && t.status !== 'done' && !isOverdue(t); }).sort(compareDue)).slice(0, 4);
    if (attention.length) html += taskSection('Focus now', 'solar:bell-linear', attention, 'tasks', 'All tasks');

    if (dc.upcoming) {
      var shown = attention.map(function (t) { return t.id; });
      var upcoming = state.tasks.filter(function (t) { return isUpcoming(t) && shown.indexOf(t.id) === -1; }).sort(compareDue).slice(0, 3);
      if (upcoming.length) html += taskSection('Upcoming', 'solar:calendar-minimalistic-linear', upcoming, 'upcoming', 'View all');
      else if (!attention.length) html += emptyState('solar:calendar-minimalistic-linear', 'All clear', 'Nothing due soon. Tasks with due dates appear here.', '');
    }

    if (dc.priority) {
      var cnt = function (p) { return state.tasks.filter(function (t) { return t.priority === p && t.status !== 'done'; }).length; };
      html += '<div class="section-head"><h3>' + icon('solar:flag-linear') + ' Active by priority</h3></div><div class="priority-grid">' +
        '<div class="priority-card high"><div class="p-count">' + cnt('high') + '</div><div class="p-label">High</div></div>' +
        '<div class="priority-card medium"><div class="p-count">' + cnt('medium') + '</div><div class="p-label">Medium</div></div>' +
        '<div class="priority-card low"><div class="p-count">' + cnt('low') + '</div><div class="p-label">Low</div></div></div>';
    }
    if (dc.recent) {
      var recent = state.tasks.slice().sort(function (a, b) { return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt); }).slice(0, 3);
      html += taskSection('Recently updated', 'solar:clock-circle-linear', recent, 'tasks', 'All tasks');
    }
    return html;
  }

  function statCard(ic, tone, value, label) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + (tone || '') + '">' + icon(ic) + '</div>' +
      '<div class="stat-value">' + value + '</div>' +
      '<div class="stat-label">' + esc(label) + '</div>' +
      '</div>';
  }

  function quickAction(ic, label, tone, action) {
    return '<button type="button" class="quick-action ' + (tone || '') + '" data-action="' + action + '">' +
      '<span class="qa-icon">' + icon(ic) + '</span>' +
      '<span>' + esc(label) + '</span>' +
      '</button>';
  }

  // ---- Tasks page ----
  function renderTasksPage() {
    var visible = getVisibleTasks();
    var html = '';

    html += quickAddHTML() + '<div class="page-toolbar">' +
      '<div class="toolbar-row">' +
        '<div class="toolbar-search">' +
          icon('solar:magnifer-linear') +
          '<input type="search" class="input" id="taskSearchInput" placeholder="Search tasks, notes, locations…" value="' + esc(state.search) + '" aria-label="Search tasks" autocomplete="off">' +
          '<button type="button" class="clear-btn" id="clearSearchBtn" aria-label="Clear search"' + (state.search ? '' : ' hidden') + '>' +
            icon('solar:close-circle-linear') +
          '</button>' +
        '</div>' +
        '<button type="button" class="btn btn-primary" data-action="new-task" aria-label="Add new task">' +
          icon('solar:add-circle-linear') + '<span class="desktop-only" style="display:inline">New</span>' +
        '</button>' +
      '</div>' +
      '</div>';

    // Filters
    html += '<div class="filters-card">' +
      '<div class="chip-row" role="group" aria-label="Status filter">' +
        chip('status', 'all', 'All') +
        chip('status', 'todo', 'To Do') +
        chip('status', 'progress', 'In Progress') +
        chip('status', 'done', 'Completed') +
        chip('status', 'pinned', 'Pinned') +
      '</div>' +
      '<div class="chip-row" role="group" aria-label="Date filter">' +
        chip('date', 'any', 'Any date') +
        chip('date', 'today', 'Today') +
        chip('date', 'overdue', 'Overdue') +
        chip('date', 'upcoming', 'Upcoming') +
        chip('date', 'none', 'No date') +
      '</div>' +
      '<div class="chip-row" role="group" aria-label="Priority filter">' +
        chip('priority', 'all', 'Any priority') +
        chip('priority', 'low', 'Low', 'low') +
        chip('priority', 'medium', 'Medium', 'medium') +
        chip('priority', 'high', 'High', 'high') +
      '</div>' +
      '<div class="filters-foot">' +
        '<label for="sortSelect">Sort</label>' +
        '<select class="select" id="sortSelect">' +
          '<option value="smart"' + (state.sort === 'smart' ? ' selected' : '') + '>Smart</option>' +
          '<option value="due"' + (state.sort === 'due' ? ' selected' : '') + '>Due date</option>' +
          '<option value="priority"' + (state.sort === 'priority' ? ' selected' : '') + '>Priority</option>' +
          '<option value="status"' + (state.sort === 'status' ? ' selected' : '') + '>Status</option>' +
          '<option value="created"' + (state.sort === 'created' ? ' selected' : '') + '>Newest</option>' +
          '<option value="title"' + (state.sort === 'title' ? ' selected' : '') + '>Title A–Z</option>' +
        '</select>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="reset-filters">Reset</button>' +
      '</div>' +
      '</div>';

    // Count
    html += '<div class="section-head" style="margin-top:.25rem;">' +
      '<h3>' + icon('solar:list-check-linear') + ' Tasks <span style="color:var(--text-muted);font-weight:500;font-size:.85rem;">(' + visible.length + ')</span></h3>' +
      '</div>';

    html += '<div id="taskListHost">' + taskListInner(visible) + '</div>';
    return html;
  }

  function taskListInner(visible) {
    if (!visible.length) {
      var hasFilters = state.filterStatus !== 'all' || state.filterDate !== 'any' || state.filterPriority !== 'all' || state.search.trim() !== '';
      return hasFilters
        ? emptyState('solar:magnifer-linear', 'No matching tasks', 'Try adjusting your search or filters.', '<button type="button" class="btn btn-ghost" data-action="reset-filters">' + icon('solar:refresh-linear') + 'Reset filters</button>')
        : emptyState('solar:list-check-linear', 'Your list is empty', 'Use quick add above, or press the + button.', '');
    }
    if (state.sort !== 'smart' || state.filterStatus === 'done') return '<ul class="task-list">' + visible.map(taskCardHTML).join('') + '</ul>';
    var groups = {};
    visible.forEach(function (t) { var k = bucketOf(t); (groups[k] = groups[k] || []).push(t); });
    return BUCKETS.filter(function (b) { return groups[b[0]]; }).map(function (b) {
      var l = groups[b[0]], head = icon(b[2]) + '<span>' + b[1] + '</span><small>' + l.length + '</small>';
      var ul = '<ul class="task-list">' + l.map(taskCardHTML).join('') + '</ul>';
      return b[0] === 'done' ? '<details class="done-group"><summary class="group-head">' + head + '</summary>' + ul + '</details>'
        : '<div class="group-head g-' + b[0] + '">' + head + '</div>' + ul;
    }).join('');
  }

  function chip(kind, value, label, tone) {
    var active = false;
    if (kind === 'status') active = state.filterStatus === value;
    else if (kind === 'date') active = state.filterDate === value;
    else if (kind === 'priority') active = state.filterPriority === value;

    var attr = 'data-filter-' + kind + '="' + value + '"';
    var cls = 'chip' + (tone ? ' p-' + tone : '');
    return '<button type="button" class="' + cls + '" ' + attr + ' aria-pressed="' + active + '">' + esc(label) + '</button>';
  }

  // ---- Today ----
  function renderTodayPage() {
    var today = todayStr();
    var overdue = state.tasks.filter(isOverdue).sort(compareDue);
    var due = state.tasks.filter(function (t) { return t.dueDate === today && t.status !== 'done' && !isOverdue(t); }).sort(compareDue);
    var done = state.tasks.filter(function (t) { return t.dueDate === today && t.status === 'done'; });
    var label = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    var html = '<div class="greeting"><h2>' + icon('solar:calendar-date-linear') + ' Today</h2><p>' + esc(label) + ' · ' + (due.length + overdue.length) + ' to do</p></div>' + quickAddHTML('today');
    if (overdue.length) html += listSection('Overdue — still open', 'solar:danger-triangle-linear', overdue, 'g-overdue');
    if (due.length) html += listSection('Due today', 'solar:calendar-date-linear', due);
    else if (!overdue.length) html += emptyState('solar:calendar-date-linear', done.length ? 'Everything due today is done' : 'Nothing due today', 'Use quick add above, or plan ahead in the Week planner.', '');
    if (done.length) html += listSection('Done today', 'solar:check-circle-linear', done);
    return html;
  }

  // ---- Week planner ----
  function renderWeekPage() {
    var start = weekStartDate(state.weekOffset), today = todayStr(), byDate = {}, total = 0, done = 0;
    state.tasks.forEach(function (t) { if (t.dueDate) (byDate[t.dueDate] = byDate[t.dueDate] || []).push(t); });
    var end = addDays(start, 6);
    var fmt = function (d) { return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
    var days = '';
    for (var i = 0; i < 7; i++) {
      var d = addDays(start, i), ds = formatDate(d), list = (byDate[ds] || []).slice().sort(function (a, b) {
        if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
        return compareDue(a, b);
      });
      total += list.length; done += list.filter(function (t) { return t.status === 'done'; }).length;
      days += '<section class="week-day' + (ds === today ? ' is-today' : '') + '"><div class="wd-head"><div class="wd-name">' +
        esc(d.toLocaleDateString(undefined, { weekday: 'long' })) + ' <b>' + d.getDate() + '</b></div>' +
        (list.length ? '<small>' + list.length + '</small>' : '') +
        '<button type="button" class="icon-btn wd-add" data-action="new-task-date" data-date="' + ds + '" aria-label="Add task on ' + esc(fmt(d)) + '">' + icon('solar:add-circle-linear') + '</button></div>' +
        (list.length ? '<ul class="task-list">' + list.map(taskCardHTML).join('') + '</ul>' : '<p class="wd-empty">Nothing planned</p>') + '</section>';
    }
    var pct = total ? Math.round(done / total * 100) : 0;
    var overdue = state.weekOffset === 0 ? state.tasks.filter(isOverdue).sort(compareDue) : [];
    return '<div class="week-head"><div><h2 class="cal-title">' + esc(fmt(start) + ' – ' + fmt(end)) + '</h2><p class="wk-sub">' + done + ' of ' + total + ' done this week</p></div>' +
      '<div class="cal-nav"><button type="button" class="icon-btn" data-week-nav="-1" aria-label="Previous week">' + icon('solar:arrow-left-linear') + '</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-week-today>This week</button>' +
      '<button type="button" class="icon-btn" data-week-nav="1" aria-label="Next week">' + icon('solar:arrow-right-linear') + '</button></div></div>' +
      '<div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span class="progress-fill" style="width:' + pct + '%"></span></div>' +
      (overdue.length ? listSection('Overdue — still open', 'solar:danger-triangle-linear', overdue, 'g-overdue') : '') +
      '<div class="week-grid">' + days + '</div>';
  }

  // ---- Upcoming ----
  function renderUpcomingPage() {
    var list = state.tasks
      .filter(function (t) { return t.status !== 'done' && t.dueDate && dueMoment(t, true) && dueMoment(t, true).getTime() >= Date.now(); })
      .sort(compareDue);

    var html = '<div class="greeting"><h2>' + icon('solar:calendar-minimalistic-linear') + ' Upcoming</h2><p>Tasks with future due dates</p></div>';

    if (!list.length) {
      html += emptyState('solar:calendar-minimalistic-linear', 'No upcoming tasks', 'Tasks with future due dates will appear here.', '');
    } else {
      var groups = [], last = null;
      list.forEach(function (t) {
        if (!last || last.date !== t.dueDate) { last = { date: t.dueDate, items: [] }; groups.push(last); }
        last.items.push(t);
      });
      groups.forEach(function (g) {
        var lbl = formatDueLabel({ dueDate: g.date, dueTime: '' });
        html += '<div class="group-head"><span>' + esc(lbl) + '</span><small>' + g.items.length + '</small></div><ul class="task-list">' + g.items.map(taskCardHTML).join('') + '</ul>';
      });
    }
    return html;
  }

  // ---- In Progress ----
  function renderProgressPage() {
    var list = state.tasks.filter(function (t) { return t.status === 'progress'; });
    var html = '<div class="greeting"><h2>' + icon('solar:play-circle-linear') + ' In Progress</h2><p>' + list.length + ' task' + (list.length === 1 ? '' : 's') + ' with status In Progress</p></div>';

    if (!list.length) {
      html += emptyState('solar:play-circle-linear', 'Nothing in progress', 'Start a task from All Tasks to see it here.', '');
    } else {
      html += '<ul class="task-list">' + list.map(taskCardHTML).join('') + '</ul>';
    }
    return html;
  }

  // ---- Completed ----
  function renderCompletedPage() {
    var list = state.tasks.filter(function (t) { return t.status === 'done'; });
    list.sort(function (a, b) {
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });

    var html = '<div class="greeting" style="display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;">' +
      '<div><h2>' + icon('solar:check-circle-linear') + ' Completed</h2><p>' + list.length + ' task' + (list.length === 1 ? '' : 's') + ' done</p></div>' +
      (list.length ? '<button type="button" class="btn btn-ghost btn-sm" data-action="clear-completed">' + icon('solar:trash-bin-trash-linear') + 'Clear</button>' : '') +
      '</div>';

    if (!list.length) {
      html += emptyState('solar:check-circle-linear', 'No completed tasks yet', 'Complete a task to see it here.', '');
    } else {
      html += '<ul class="task-list">' + list.map(taskCardHTML).join('') + '</ul>';
    }
    return html;
  }

  // ---- Calendar ----
  function renderCalendarPage() {
    var y = state.calendar.year;
    var m = state.calendar.month;
    var today = todayStr();
    if (!state.calendar.selected) state.calendar.selected = today;
    var selected = state.calendar.selected;

    var monthName = new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    // Group tasks by date
    var byDate = {};
    state.tasks.forEach(function (t) {
      if (t.dueDate) {
        if (!byDate[t.dueDate]) byDate[t.dueDate] = [];
        byDate[t.dueDate].push(t);
      }
    });

    var firstDay = (new Date(y, m, 1).getDay() - weekStartIdx() + 7) % 7;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var daysInPrev = new Date(y, m, 0).getDate();

    var cells = '';
    // prev month days
    for (var i = firstDay - 1; i >= 0; i--) {
      var d = daysInPrev - i;
      cells += '<button type="button" class="cal-day other-month" disabled><span class="dnum">' + d + '</span></button>';
    }
    // current month
    for (var day = 1; day <= daysInMonth; day++) {
      var ds = y + '-' + pad2(m + 1) + '-' + pad2(day);
      var tasksForDay = byDate[ds] || [];
      var dots = tasksForDay.slice(0, 3).map(function (t) {
        return '<span class="cal-dot ' + t.priority + '"></span>';
      }).join('');
      if (tasksForDay.length > 3) {
        dots += '<span class="cal-more">+' + (tasksForDay.length - 3) + '</span>';
      }
      var cls = 'cal-day';
      if (ds === today) cls += ' is-today';
      if (ds === selected) cls += ' is-selected';
      cells += '<button type="button" class="' + cls + '" data-cal-day="' + ds + '" aria-label="' + ds + (tasksForDay.length ? ' (' + tasksForDay.length + ' tasks)' : '') + '">' +
        '<span class="dnum">' + day + '</span>' +
        '<span class="cal-dots">' + dots + '</span>' +
        '</button>';
    }
    // next month days
    var total = firstDay + daysInMonth;
    var nextDays = total <= 35 ? 35 - total : 42 - total;
    for (var n = 1; n <= nextDays; n++) {
      cells += '<button type="button" class="cal-day other-month" disabled><span class="dnum">' + n + '</span></button>';
    }

    var html = '<div class="cal-head">' +
      '<h2 class="cal-title">' + esc(monthName) + '</h2>' +
      '<div class="cal-nav">' +
        '<button type="button" class="icon-btn" data-cal-nav="-1" aria-label="Previous month">' + icon('solar:arrow-left-linear') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-cal-today>Today</button>' +
        '<button type="button" class="icon-btn" data-cal-nav="1" aria-label="Next month">' + icon('solar:arrow-right-linear') + '</button>' +
      '</div>' +
      '</div>' +
      '<div class="cal-card">' +
        '<div class="cal-weekdays">' +
          ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].slice(weekStartIdx()).concat(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].slice(0, weekStartIdx())).map(function (d) { return '<div>' + d + '</div>'; }).join('') +
        '</div>' +
        '<div class="cal-grid">' + cells + '</div>' +
      '</div>';

    // Selected day tasks
    if (selected) {
      var selTasks = byDate[selected] || [];
      var selDate = new Date(selected + 'T00:00:00');
      var selLabel = selDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      html += '<div class="cal-day-panel">' +
        '<h3>' + icon('solar:calendar-linear') + ' ' + esc(selLabel) + ' <span style="color:var(--text-muted);font-weight:500;font-size:.82rem;">(' + selTasks.length + ')</span></h3>';
      html += '<button type="button" class="btn btn-ghost btn-sm" data-action="new-task-date" data-date="' + selected + '">' + icon('solar:add-circle-linear') + 'Add task on this day</button>';
      if (selTasks.length) {
        html += '<ul class="task-list">' + selTasks.map(taskCardHTML).join('') + '</ul>';
      } else {
        html += emptyState('solar:calendar-linear', 'No tasks', 'Nothing due on this day.', '');
      }
      html += '</div>';
    }

    return html;
  }

  // ---- Statistics ----
  function renderStatsPage() {
    var total = state.tasks.length;
    var done = state.tasks.filter(function (t) { return t.status === 'done'; }).length;
    var progress = state.tasks.filter(function (t) { return t.status === 'progress'; }).length;
    var todo = total - done - progress;
    var overdue = state.tasks.filter(isOverdue).length;
    var percent = total ? Math.round((done / total) * 100) : 0;

    var html = '<div class="greeting"><h2>' + icon('solar:chart-2-linear') + ' Statistics</h2><p>Your productivity at a glance</p></div>';

    html += '<div class="stats-page-grid">' +
      bigStat('solar:checklist-linear', '', total, 'Total tasks') +
      bigStat('solar:check-circle-linear', 'success', done, 'Completed') +
      bigStat('solar:play-circle-linear', 'warning', progress, 'In progress') +
      bigStat('solar:danger-triangle-linear', 'danger', overdue, 'Overdue') +
      '</div>';

    // Progress
    html += '<div class="progress-card">' +
      '<div class="progress-head"><h3>' + icon('solar:chart-2-linear') + ' Completion rate</h3>' +
      '<span class="pct">' + percent + '%</span></div>' +
      '<div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + percent + '">' +
        '<span class="progress-fill" style="width:' + percent + '%"></span>' +
      '</div>' +
      '<div class="progress-meta"><span>' + done + ' completed</span><span>' + (total - done) + ' remaining</span></div>' +
      '</div>';

    // By status
    html += '<div class="breakdown-card"><h3>By status</h3>' +
      breakdownRow('To Do', todo, total, 'todo') +
      breakdownRow('In Progress', progress, total, 'progress') +
      breakdownRow('Completed', done, total, 'done') +
      '</div>';

    // By priority
    var high = state.tasks.filter(function (t) { return t.priority === 'high'; }).length;
    var medium = state.tasks.filter(function (t) { return t.priority === 'medium'; }).length;
    var low = state.tasks.filter(function (t) { return t.priority === 'low'; }).length;
    html += '<div class="breakdown-card"><h3>By priority</h3>' +
      breakdownRow('High', high, total, 'high') +
      breakdownRow('Medium', medium, total, 'medium') +
      breakdownRow('Low', low, total, 'low') +
      '</div>';

    // By category
    var catCounts = {};
    state.tasks.forEach(function (t) {
      var c = t.category || 'Uncategorized';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });
    var cats = Object.keys(catCounts).sort(function (a, b) { return catCounts[b] - catCounts[a]; });
    if (cats.length) {
      html += '<div class="breakdown-card"><h3>By category</h3>' +
        cats.map(function (c) { return breakdownRow(c, catCounts[c], total, 'primary'); }).join('') +
        '</div>';
    }

    // Recently completed
    var recent = state.tasks
      .filter(function (t) { return t.status === 'done'; })
      .sort(function (a, b) { return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt); })
      .slice(0, 5);
    if (recent.length) {
      html += '<div class="breakdown-card"><h3>Recently completed</h3><div class="recent-list">' +
        recent.map(function (t) {
          var d = new Date(t.updatedAt || t.createdAt);
          var label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          return '<div class="recent-item">' +
            '<span class="ri-icon">' + icon('solar:check-circle-linear') + '</span>' +
            '<span class="ri-text">' + esc(t.text) + '</span>' +
            '<span class="ri-date">' + esc(label) + '</span>' +
            '</div>';
        }).join('') +
        '</div></div>';
    }

    return html;
  }

  function bigStat(ic, tone, value, label) {
    return '<div class="big-stat">' +
      '<div class="bs-icon ' + (tone || '') + '">' + icon(ic) + '</div>' +
      '<div class="bs-value">' + value + '</div>' +
      '<div class="bs-label">' + esc(label) + '</div>' +
      '</div>';
  }

  function breakdownRow(label, count, total, tone) {
    var pct = total ? Math.round((count / total) * 100) : 0;
    return '<div class="breakdown-row">' +
      '<div class="bd-head"><span>' + esc(label) + '</span><span class="bd-count">' + count + ' (' + pct + '%)</span></div>' +
      '<div class="bd-bar"><div class="bd-fill ' + tone + '" style="width:' + pct + '%"></div></div>' +
      '</div>';
  }

  // ---- Settings ----
  function renderSettingsPage() {
    var s = state.settings;
    var secs = [['appearance', 'Appearance'], ['layout', 'Layout'], ['tasks', 'Tasks'], ['reminders', 'Reminders'], ['data', 'Data'], ['access', 'Motion'], ['about', 'About']];
    var html = '<div class="greeting"><h2>' + icon('solar:settings-linear') + ' Settings</h2><p>Changes apply immediately and are saved on this device</p></div>' +
      '<div class="settings-search">' + icon('solar:magnifer-linear') +
      '<input type="search" class="input" id="settingsSearch" placeholder="Search settings…" aria-label="Search settings"></div>' +
      '<div class="settings-layout"><nav class="settings-nav" aria-label="Settings sections">' +
      secs.map(function (x) { return '<button type="button" class="chip" data-settings-jump="set-' + x[0] + '">' + x[1] + '</button>'; }).join('') +
      '</nav><div class="settings-main">';

    html += settingsSection('appearance', 'Appearance', 'solar:palette-linear', 'Theme and color palette apply to the whole app.',
      '<div class="settings-row"><div class="sr-text"><div class="sr-title">Theme</div><div class="sr-desc">Light, dark, or follow your device</div></div><div class="sr-control"><div class="theme-grid seg" role="group" aria-label="Theme">' +
        themeBtn('system', 'solar:monitor-linear', 'System', s.theme) + themeBtn('light', 'solar:sun-linear', 'Light', s.theme) + themeBtn('dark', 'solar:moon-linear', 'Dark', s.theme) + '</div></div></div>' +
      '<div class="palette-grid" role="group" aria-label="Color palette">' +
        Object.keys(PALETTES).map(function (key) {
          var p = PALETTES[key];
          return '<button type="button" class="palette-option" data-palette="' + key + '" aria-pressed="' + (s.palette === key) + '" aria-label="' + esc(p.label) + '">' +
            '<span class="palette-swatch" style="background:' + p.preview + '"></span><span class="palette-name">' + esc(p.label) + '</span><span class="palette-desc">' + esc(p.desc) + '</span><span class="palette-check">' + icon('solar:check-circle-bold') + '</span></button>';
        }).join('') + '</div>' +
      '<details class="settings-adv"><summary>Surface effects</summary>' +
        sliderRow('glassTransparency', 'Surface translucency', 'Desktop only; phones use solid surfaces', s.glassTransparency, '%') +
        sliderRow('blurIntensity', 'Blur', 'Desktop only', s.blurIntensity, 'px', 0, 30) +
        sliderRow('borderOpacity', 'Border strength', 'Visibility of outlines', s.borderOpacity, '%') +
        sliderRow('shadowIntensity', 'Shadow depth', 'Elevation of cards', s.shadowIntensity, '%') +
        sliderRow('backgroundIntensity', 'Background tint', 'Strength of the background gradient', s.backgroundIntensity, '%') +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="reset-appearance">' + icon('solar:refresh-linear') + 'Reset appearance</button></details>');

    html += settingsSection('layout', 'Layout & interface', 'solar:widget-linear', 'Density, size and what appears on cards and the Dashboard.',
      segRow('density', 'Density', 'Spacing between items', [['comfortable', 'Comfortable'], ['compact', 'Compact']], s.density) +
      segRow('weekStart', 'Week starts on', 'Calendar and Week planner', [['sat', 'Sat'], ['sun', 'Sun'], ['mon', 'Mon']], s.weekStart) +
      segRow('radius', 'Corner radius', 'Roundness of cards and controls', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']], s.radius) +
      segRow('fontSize', 'Text size', 'Base text size', [['small', 'S'], ['medium', 'M'], ['large', 'L']], s.fontSize) +
      toggleRow('showDates', 'Due dates on cards', 'Show date and time', s.showDates) +
      toggleRow('showPriorityIndicators', 'Priority badges on cards', 'Show High / Medium / Low', s.showPriorityIndicators) +
      '<details class="settings-adv"><summary>Dashboard sections</summary><div class="dashboard-toggles">' +
        dashToggle('stats', 'Summary numbers', s.dashboardCards.stats) + dashToggle('progress', 'Progress bar', s.dashboardCards.progress) +
        dashToggle('quickActions', 'Quick actions', s.dashboardCards.quickActions) + dashToggle('upcoming', 'Upcoming', s.dashboardCards.upcoming) +
        dashToggle('priority', 'Priority counts', s.dashboardCards.priority) + dashToggle('recent', 'Recently updated', s.dashboardCards.recent) + '</div></details>');

    html += settingsSection('tasks', 'Tasks & categories', 'solar:checklist-linear', 'Categories appear in the task form and on cards.',
      toggleRow('confirmDelete', 'Confirm before deleting a task', 'Ask once per deletion', s.confirmDelete) +
      '<div class="cat-list" id="categoriesList"></div>' +
      '<div class="cat-add"><input type="text" class="input" id="newCategoryInput" maxlength="40" placeholder="New category name" aria-label="New category name">' +
      '<button type="button" class="icon-btn primary" id="addCategorySettingsBtn" aria-label="Add category">' + icon('solar:add-circle-linear') + '</button></div>');

    html += settingsSection('reminders', 'Reminders & notifications', 'solar:bell-linear', 'Reminders fire while Nova Glass is open.',
      toggleRow('reminders', 'Task reminders', 'Notify when a task with a reminder becomes due', s.reminders) +
      '<div class="sr-desc" id="reminderStatus"></div>');

    html += settingsSection('data', 'Data & backup', 'solar:database-linear', 'Your tasks stay on this device.',
      '<div class="btn-row"><button type="button" class="btn btn-ghost" id="exportBtn">' + icon('solar:download-linear') + 'Export JSON</button>' +
      '<button type="button" class="btn btn-ghost" id="importBtn">' + icon('solar:upload-linear') + 'Import JSON</button></div>' +
      '<input type="file" id="fileInput" accept="application/json,.json" hidden>' +
      '<div class="danger-zone"><div class="sr-title">Danger zone</div><div class="btn-row">' +
      '<button type="button" class="btn btn-danger btn-sm" id="clearAllBtn">' + icon('solar:trash-bin-trash-linear') + 'Delete all tasks</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-action="reset-all-settings">' + icon('solar:refresh-linear') + 'Reset all settings</button></div></div>');

    html += settingsSection('access', 'Accessibility & motion', 'solar:accessibility-linear', 'Reduced motion is also applied automatically if your device requests it.',
      segRow('motion', 'Motion', 'Icon animations and transitions', [['full', 'Full'], ['reduced', 'Reduced']], s.motion));

    html += settingsSection('about', 'About Nova Glass', 'solar:info-circle-linear', 'Version ' + APP_VERSION + ' (Beta)',
      '<button type="button" class="btn btn-ghost" data-page="about">' + icon('solar:info-circle-linear') + 'Open About</button>');

    return html + '</div></div>';
  }

  function settingsSection(id, title, ic, desc, inner) {
    return '<section class="settings-card" id="set-' + id + '"><div class="sc-head"><h3>' + icon(ic) + ' ' + esc(title) + '</h3><p>' + esc(desc) + '</p></div>' + inner + '</section>';
  }

  function segRow(key, title, desc, opts, cur) {
    return '<div class="settings-row"><div class="sr-text"><div class="sr-title">' + esc(title) + '</div><div class="sr-desc">' + esc(desc) + '</div></div>' +
      '<div class="sr-control"><div class="theme-grid seg" role="group" aria-label="' + esc(title) + '">' +
      opts.map(function (o) { return '<button type="button" class="theme-btn" data-seg="' + key + '" data-value="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '"><span>' + esc(o[1]) + '</span></button>'; }).join('') +
      '</div></div></div>';
  }

  function themeBtn(value, ic, label, current) {
    return '<button type="button" class="theme-btn" data-theme-btn="' + value + '" aria-pressed="' + (current === value) + '">' +
      icon(ic) + '<span>' + esc(label) + '</span>' +
      '</button>';
  }

  function sliderRow(key, title, desc, value, unit, min, max) {
    min = min != null ? min : 0;
    max = max != null ? max : 100;
    return '<div class="slider-row" data-setting="' + key + '">' +
      '<div class="sl-head"><span>' + esc(title) + '</span><span class="sl-val" data-val-for="' + key + '">' + value + unit + '</span></div>' +
      '<input type="range" data-slider="' + key + '" min="' + min + '" max="' + max + '" step="1" value="' + value + '" aria-label="' + esc(title) + '">' +
      '<div class="sr-desc" style="font-size:.74rem;">' + esc(desc) + '</div>' +
      '</div>';
  }

  function toggleRow(key, title, desc, checked) {
    return '<div class="settings-row"><div class="sr-text"><div class="sr-title">' + esc(title) + '</div><div class="sr-desc">' + esc(desc) + '</div></div>' +
      '<div class="sr-control">' +
        '<label class="switch"><input type="checkbox" data-toggle="' + key + '"' + (checked ? ' checked' : '') + ' aria-label="' + esc(title) + '"><span class="track"></span></label>' +
      '</div>' +
      '</div>';
  }

  function dashToggle(key, label, checked) {
    return '<label class="dash-toggle">' +
      '<input type="checkbox" data-dashcard="' + key + '"' + (checked ? ' checked' : '') + '>' +
      '<span>' + esc(label) + '</span>' +
      '</label>';
  }

  // ---- About ----
  function renderAboutPage() {
    return '<div class="about-card">' +
      '<div class="about-logo">' + icon('solar:layers-minimalistic-linear') + '</div>' +
      '<div class="about-title">Nova Glass</div>' +
      '<div class="about-version"><span class="beta-badge">Version 2.2 Beta</span> · ' + APP_VERSION + '</div>' +
      '<p class="about-desc">A mobile-first task manager with a Midnight + Burgundy identity. Everything is stored on this device — nothing is uploaded.</p>' +
      '<div class="feature-list">' +
        featureItem('solar:add-circle-linear', 'Quick add', 'Type a title with a day, time, #category and !priority') +
        featureItem('solar:notebook-linear', 'Week planner', 'Plan seven days at a glance, starting on the day you choose') +
        featureItem('solar:list-check-linear', 'Time groups', 'Overdue, Today, Tomorrow, Next 7 days, Later and No date') +
        featureItem('solar:checklist-minimalistic-linear', 'Checklists', 'Break any task into steps with live progress') +
        featureItem('solar:palette-linear', 'Midnight + Burgundy', 'Two palettes with light and dark modes') +
        featureItem('solar:database-linear', 'Local data', 'Tasks, categories and settings stay on this device') +
      '</div></div>' +
      '<div class="settings-card"><h3>' + icon('solar:info-circle-linear') + ' Technical</h3>' +
      '<div class="sr-desc" style="line-height:1.7;">' +
        '<strong>Icons:</strong> Iconify (Solar set), loaded from a CDN; labels stay readable if it is unavailable<br>' +
        '<strong>Data location:</strong> This browser only' +
      '</div></div>';
  }

  function featureItem(ic, title, desc) {
    return '<div class="feature-item">' + icon(ic) +
      '<div><strong>' + esc(title) + '</strong><span>' + esc(desc) + '</span></div>' +
      '</div>';
  }

  /* ============================================================
     9. TASK ACTIONS
     ============================================================ */
  function findTask(id) {
    for (var i = 0; i < state.tasks.length; i++) {
      if (state.tasks[i].id === id) return state.tasks[i];
    }
    return null;
  }

  function cycleStatus(id) {
    var task = findTask(id);
    if (!task) return;
    var next = { todo: 'progress', progress: 'done', done: 'todo' }[task.status] || 'todo';
    task.status = next;
    task.updatedAt = new Date().toISOString();
    if (next !== 'done') task.remindedKey = '';
    state.justDone = next === 'done' ? id : null;
    saveTasks();
    renderPage();
    state.justDone = null;
    announce('Task moved to ' + statusLabel(next));
  }

  async function deleteTask(id) {
    var task = findTask(id);
    if (!task) return;

    if (state.settings.confirmDelete) {
      var ok = await askConfirm('Delete task', 'Are you sure you want to delete "' + task.text + '"?', 'Delete');
      if (!ok) return;
    }

    state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
    saveTasks();
    renderPage();
    toast('Task deleted.', 'success');
  }

  function togglePin(id) {
    var task = findTask(id);
    if (!task) return;
    task.pinned = !task.pinned;
    task.updatedAt = new Date().toISOString();
    saveTasks();
    renderPage();
    announce(task.pinned ? 'Task pinned' : 'Task unpinned');
  }

  async function clearCompleted() {
    var completed = state.tasks.filter(function (t) { return t.status === 'done'; });
    if (!completed.length) {
      toast('No completed tasks to clear.', 'warning');
      return;
    }
    var ok = await askConfirm('Clear completed', 'Remove ' + completed.length + ' completed task' + (completed.length === 1 ? '' : 's') + '?', 'Clear');
    if (!ok) return;
    state.tasks = state.tasks.filter(function (t) { return t.status !== 'done'; });
    saveTasks();
    renderPage();
    toast(completed.length + ' task' + (completed.length === 1 ? '' : 's') + ' cleared.', 'success');
  }

  /* ============================================================
     10. MODALS
     ============================================================ */
  var activeModal = null;
  var lastFocused = null;
  var confirmResolve = null;

  var modalStack = [];

  function openModal(id) {
    var modal = $('#' + id);
    if (!modal) return;
    if (activeModal && activeModal !== modal) {
      if (id === 'promptModal') modalStack.push(activeModal);
      else closeModal(activeModal, true);
    }
    if (!activeModal || activeModal === modal || id === 'promptModal') lastFocused = lastFocused || document.activeElement;
    activeModal = modal;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      var t = modal.querySelector('[data-autofocus]') || modal.querySelector('input:not([type="hidden"]), select, textarea, button');
      if (t) try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); }
    }, 60);
  }

  function closeModal(idOrEl, skipRestore) {
    var modal = typeof idOrEl === 'string' ? $('#' + idOrEl) : idOrEl;
    if (!modal) return;
    modal.classList.remove('active');
    if (activeModal === modal) activeModal = modalStack.pop() || null;
    if (!activeModal) document.body.style.overflow = '';
    if (!skipRestore && !activeModal && lastFocused && lastFocused.focus) {
      try { lastFocused.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      lastFocused = null;
    }
  }

  function trapFocus(e) {
    if (e.key !== 'Tab' || !activeModal) return;
    var focusables = $$('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', activeModal)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function askConfirm(title, message, okLabel) {
    return new Promise(function (resolve) {
      $('#confirmTitle').textContent = title;
      $('#confirmMessage').textContent = message;
      $('#confirmOk').textContent = okLabel || 'Confirm';
      confirmResolve = resolve;
      openModal('confirmModal');
    });
  }
  function resolveConfirm(value) {
    var fn = confirmResolve;
    confirmResolve = null;
    closeModal('confirmModal');
    if (fn) fn(value);
  }

  function openTaskModal(task) {
    state.editingId = task ? task.id : null;
    $('#taskModalTitle').textContent = task ? 'Edit task' : 'New task';
    $('#taskSubmitLabel').textContent = task ? 'Save changes' : 'Add task';

    $('#taskTitle').value = task ? task.text : '';
    $('#taskDescription').value = task ? task.description : '';
    $('#taskStatus').value = task ? task.status : 'todo';
    $('#taskDueDate').value = task ? task.dueDate : '';
    $('#taskDueTime').value = task ? task.dueTime : '';
    $('#taskLocation').value = task ? task.location : '';
    $('#taskNote').value = task ? task.note : '';
    $('#taskReminder').checked = task ? task.reminder : false;
    $('#taskSubs').value = task ? subsToText(task.subtasks) : '';

    var priority = task ? task.priority : 'medium';
    $$('input[name="priority"]').forEach(function (r) { r.checked = r.value === priority; });

    fillCategorySelect(task ? task.category : '');
    clearFieldError();
    openModal('taskModal');
  }

  function fillCategorySelect(selected) {
    var sel = $('#taskCategory');
    if (!sel) return;
    var html = '<option value="">No category</option>';
    state.categories.forEach(function (c) {
      html += '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    });
    sel.innerHTML = html;
    sel.value = selected && state.categories.indexOf(selected) !== -1 ? selected : '';
  }

  function clearFieldError() {
    var input = $('#taskTitle');
    var err = $('#titleError');
    if (err) err.hidden = true;
    if (input) input.removeAttribute('aria-invalid');
  }

  function showFieldError(msg) {
    var input = $('#taskTitle');
    var err = $('#titleError');
    if (err) { err.textContent = msg; err.hidden = false; }
    if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
  }

  function handleTaskSubmit(e) {
    e.preventDefault();
    var text = $('#taskTitle').value.trim();
    if (!text) { showFieldError('Please enter a task title.'); return; }
    if (text.length > 200) { showFieldError('The title must be 200 characters or fewer.'); return; }
    clearFieldError();

    var priorityEl = $('input[name="priority"]:checked');
    var priority = priorityEl && PRIORITIES.indexOf(priorityEl.value) !== -1 ? priorityEl.value : 'medium';

    var statusEl = $('#taskStatus').value;
    var status = STATUSES.indexOf(statusEl) !== -1 ? statusEl : 'todo';

    var dueDate = $('#taskDueDate').value;
    if (dueDate && !isValidDateStr(dueDate)) dueDate = '';
    var dueTime = $('#taskDueTime').value;
    if (dueTime && !isValidTimeStr(dueTime)) dueTime = '';
    if (!dueDate) dueTime = '';

    var prevSubs = state.editingId ? ((findTask(state.editingId) || {}).subtasks || []) : [];
    var payload = {
      text: text,
      description: $('#taskDescription').value.trim().slice(0, 1000),
      note: $('#taskNote').value.trim().slice(0, 2000),
      status: status,
      priority: priority,
      category: $('#taskCategory').value || '',
      location: $('#taskLocation').value.trim().slice(0, 100),
      dueDate: dueDate,
      dueTime: dueTime,
      reminder: $('#taskReminder').checked,
      subtasks: parseSubs($('#taskSubs').value, prevSubs)
    };

    if (state.editingId) {
      var task = findTask(state.editingId);
      if (!task) {
        toast('That task no longer exists.', 'error');
        closeModal('taskModal');
        return;
      }
      var dueChanged = task.dueDate !== payload.dueDate || task.dueTime !== payload.dueTime;
      Object.keys(payload).forEach(function (k) { task[k] = payload[k]; });
      task.updatedAt = new Date().toISOString();
      if (dueChanged) task.remindedKey = '';
      saveTasks();
      closeModal('taskModal');
      renderPage();
      toast('Task updated.', 'success');
    } else {
      var newTask = Object.assign({
        id: uid(),
        pinned: false,
        remindedKey: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, payload);
      state.tasks.unshift(newTask);
      saveTasks();
      closeModal('taskModal');
      renderPage();
      toast('Task added.', 'success');
    }
    state.editingId = null;
  }

  /* ============================================================
     11. CATEGORIES
     ============================================================ */
  function addCategoryFromPrompt() {
    var inp = $('#promptInput'), err = $('#promptError');
    inp.value = ''; err.hidden = true; inp.removeAttribute('aria-invalid');
    openModal('promptModal');
  }

  function handlePromptSubmit(e) {
    e.preventDefault();
    var inp = $('#promptInput'), err = $('#promptError');
    var name = inp.value.trim().slice(0, 40);
    var msg = !name ? 'Please enter a category name.' : (state.categories.indexOf(name) !== -1 ? 'That category already exists.' : '');
    if (msg) { err.textContent = msg; err.hidden = false; inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
    state.categories.push(name);
    saveCategories();
    fillCategorySelect(name);
    closeModal('promptModal');
    toast('Category added.', 'success');
  }

  function addCategoryFromSettings() {
    var input = $('#newCategoryInput');
    if (!input) return;
    var name = input.value.trim().slice(0, 40);
    if (!name) return;
    if (state.categories.indexOf(name) !== -1) { toast('That category already exists.', 'warning'); return; }
    state.categories.push(name);
    saveCategories();
    input.value = '';
    renderCategoriesList();
    toast('Category added.', 'success');
  }

  async function removeCategory(name) {
    if (state.categories.indexOf(name) === -1) return;
    var used = state.tasks.filter(function (t) { return t.category === name; }).length;
    if (used > 0) {
      var ok = await askConfirm('Remove category',
        used + ' task' + (used === 1 ? '' : 's') + ' use "' + name + '". They will keep it as a label, but it will no longer be selectable. Remove anyway?', 'Remove');
      if (!ok) return;
    }
    state.categories = state.categories.filter(function (c) { return c !== name; });
    saveCategories();
    renderCategoriesList();
    fillCategorySelect($('#taskCategory') ? $('#taskCategory').value : '');
    toast('Category removed.', 'success');
  }

  function renderCategoriesList() {
    var el = $('#categoriesList');
    if (!el) return;
    if (!state.categories.length) {
      el.innerHTML = '<span style="color:var(--text-muted);font-size:.82rem;">No categories yet.</span>';
      return;
    }
    el.innerHTML = state.categories.map(function (c) {
      return '<span class="cat-item">' + esc(c) +
        '<button type="button" data-remove-category="' + esc(c) + '" aria-label="Remove category ' + esc(c) + '" title="Remove">' +
        icon('solar:close-circle-linear') + '</button></span>';
    }).join('');
  }

  /* ============================================================
     12. IMPORT / EXPORT
     ============================================================ */
  function exportTasks() {
    var payload = {
      app: 'nova-glass',
      version: 3,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      tasks: state.tasks,
      categories: state.categories,
      settings: state.settings
    };
    try {
      var json = JSON.stringify(payload, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var filename = 'nova-tasks-' + todayStr() + '.json';
      var link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      toast('Exported to ' + filename, 'success');
    } catch (e) {
      toast('Export failed. Your browser blocked the download.', 'error');
    }
  }

  function handleImportFile(event) {
    var input = event.target;
    var file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast('That file is too large to be a valid export.', 'error');
      return;
    }

    var reader = new FileReader();
    reader.onerror = function () { toast('The file could not be read.', 'error'); };
    reader.onload = async function (ev) {
      var parsed;
      try { parsed = JSON.parse(ev.target.result); }
      catch (e) { toast('That file is not valid JSON.', 'error'); return; }

      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tasks)) {
        toast('Invalid file: no task list was found inside.', 'error');
        return;
      }

      var imported = [];
      var invalid = 0;
      for (var i = 0; i < parsed.tasks.length; i++) {
        var t = normalizeTask(parsed.tasks[i]);
        if (t) imported.push(t);
        else invalid++;
      }

      if (!imported.length) { toast('No valid tasks were found in that file.', 'error'); return; }

      var ok = await askConfirm('Import tasks',
        'Import ' + imported.length + ' task' + (imported.length === 1 ? '' : 's') +
        (invalid ? ' (' + invalid + ' invalid skipped)' : '') +
        '? This will replace your current tasks. A backup is kept.', 'Import');
      if (!ok) return;

      storage.setJSON(STORAGE_KEYS.backup, state.tasks);
      state.tasks = imported;

      if (Array.isArray(parsed.categories)) {
        var cats = [];
        parsed.categories.forEach(function (c) {
          if (typeof c === 'string' && c.trim() && cats.indexOf(c.trim()) === -1) cats.push(c.trim());
        });
        if (cats.length) { state.categories = cats; saveCategories(); }
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        var merged = Object.assign({}, DEFAULT_SETTINGS);
        merged.dashboardCards = Object.assign({}, DEFAULT_SETTINGS.dashboardCards);
        Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
          if (key === 'dashboardCards') return;
          if (Object.prototype.hasOwnProperty.call(parsed.settings, key) &&
              typeof parsed.settings[key] === typeof DEFAULT_SETTINGS[key]) {
            merged[key] = parsed.settings[key];
          }
        });
        if (parsed.settings.dashboardCards && typeof parsed.settings.dashboardCards === 'object') {
          Object.keys(DEFAULT_SETTINGS.dashboardCards).forEach(function (k) {
            if (typeof parsed.settings.dashboardCards[k] === 'boolean') merged.dashboardCards[k] = parsed.settings.dashboardCards[k];
          });
        }
        if (!PALETTES[merged.palette]) merged.palette = 'midnight';
        state.settings = merged;
        saveSettings();
        applyAppearance();
      }

      saveTasks();
      renderPage();
      toast('Imported ' + imported.length + ' task' + (imported.length === 1 ? '' : 's') + '.', 'success');
    };
    reader.readAsText(file);
  }

  async function clearAllTasks() {
    if (!state.tasks.length) { toast('There are no tasks to delete.', 'warning'); return; }
    var ok = await askConfirm('Delete all tasks',
      'This will permanently delete all ' + state.tasks.length + ' tasks. A backup copy is kept in browser storage.', 'Delete all');
    if (!ok) return;
    storage.setJSON(STORAGE_KEYS.backup, state.tasks);
    state.tasks = [];
    saveTasks();
    renderPage();
    toast('All tasks deleted.', 'success');
  }

  async function resetAppearance() {
    var s = state.settings;
    s.theme = DEFAULT_SETTINGS.theme;
    s.palette = DEFAULT_SETTINGS.palette;
    s.radius = DEFAULT_SETTINGS.radius;
    s.density = DEFAULT_SETTINGS.density;
    s.fontSize = DEFAULT_SETTINGS.fontSize;
    s.motion = DEFAULT_SETTINGS.motion;
    s.glassTransparency = DEFAULT_SETTINGS.glassTransparency;
    s.blurIntensity = DEFAULT_SETTINGS.blurIntensity;
    s.borderOpacity = DEFAULT_SETTINGS.borderOpacity;
    s.shadowIntensity = DEFAULT_SETTINGS.shadowIntensity;
    s.backgroundIntensity = DEFAULT_SETTINGS.backgroundIntensity;
    saveSettings();
    applyAppearance();
    renderPage();
    toast('Appearance reset to defaults.', 'success');
  }

  async function resetAllSettings() {
    var ok = await askConfirm('Reset all settings',
      'Restore all appearance and behaviour settings to their defaults? Your tasks are NOT affected.', 'Reset');
    if (!ok) return;
    state.settings = Object.assign({}, DEFAULT_SETTINGS);
    state.settings.dashboardCards = Object.assign({}, DEFAULT_SETTINGS.dashboardCards);
    saveSettings();
    applyAppearance();
    renderPage();
    toast('All settings reset.', 'success');
  }

  /* ============================================================
     13. REMINDERS
     ============================================================ */
  var reminderTimer = null;

  function reminderKey(task) {
    return task.dueDate + 'T' + (task.dueTime || '09:00');
  }

  function checkReminders() {
    if (!state.settings.reminders) return;
    var now = Date.now();
    var changed = false;
    for (var i = 0; i < state.tasks.length; i++) {
      var t = state.tasks[i];
      if (!t.reminder || t.status === 'done' || !t.dueDate) continue;
      var m = dueMoment(t, false);
      if (!m) continue;
      var key = reminderKey(t);
      if (t.remindedKey === key) continue;
      if (m.getTime() <= now) {
        t.remindedKey = key;
        changed = true;
        fireReminder(t);
      }
    }
    if (changed) saveTasks();
  }

  function fireReminder(task) {
    var label = formatDueLabel(task) || 'now';
    toast('Reminder: "' + task.text + '" was due ' + label + '.', 'warning', 8000);
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try {
        new Notification('Nova Glass — task due', { body: task.text, tag: 'nova-' + task.id });
      } catch (e) { /* ignore */ }
    }
  }

  function startReminderLoop() {
    if (reminderTimer) clearInterval(reminderTimer);
    checkReminders();
    reminderTimer = setInterval(checkReminders, 60000);
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      var r = await Notification.requestPermission();
      return r === 'granted';
    } catch (e) { return false; }
  }

  function updateReminderStatus() {
    var el = $('#reminderStatus');
    if (!el) return;
    if (!('Notification' in window)) {
      el.textContent = 'System notifications are not supported here. In-app reminders work while the app is open.';
    } else if (Notification.permission === 'granted') {
      el.textContent = 'System notifications are enabled. In-app reminders also appear while Nova Glass is open.';
    } else if (Notification.permission === 'denied') {
      el.textContent = 'System notifications are blocked. In-app reminders still work while Nova Glass is open.';
    } else {
      el.textContent = 'Reminders appear in-app while Nova Glass is open. Enable the toggle above to request system notification permission.';
    }
  }

  /* ============================================================
     14. TOASTS
     ============================================================ */
  function toast(message, type, duration) {
    type = type || 'info';
    duration = typeof duration === 'number' ? duration : 3200;
    var container = $('#toastContainer');
    if (!container) return;

    var iconName = {
      success: 'solar:check-circle-linear',
      error: 'solar:danger-triangle-linear',
      warning: 'solar:danger-triangle-linear',
      info: 'solar:info-circle-linear'
    }[type] || 'solar:info-circle-linear';

    var dupes = $$('.toast .toast-body', container).filter(function (n) { return n.textContent === message; });
    if (dupes.length) return;
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<span class="toast-icon">' + icon(iconName) + '</span>' +
      '<span class="toast-body"></span>' +
      '<button type="button" class="toast-close" aria-label="Dismiss">' + icon('solar:close-circle-linear') + '</button>';
    el.querySelector('.toast-body').textContent = message;

    var close = function () {
      if (el.classList.contains('leaving')) return;
      el.classList.add('leaving');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 240);
    };
    el.querySelector('.toast-close').addEventListener('click', close);
    container.appendChild(el);
    if (duration > 0) setTimeout(close, duration);
    announce(message);
  }

  var announceTimer = null;
  function announce(msg) {
    var main = $('#main');
    if (!main) return;
    clearTimeout(announceTimer);
    main.setAttribute('aria-label', msg);
    announceTimer = setTimeout(function () { main.removeAttribute('aria-label'); }, 2000);
  }

  /* ============================================================
     15. EVENTS
     ============================================================ */
  function bindGlobalEvents() {
    // Sidebar collapse (desktop)
    var sidebarToggle = $('#sidebarToggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        document.getElementById('app').classList.toggle('sidebar-collapsed');
      });
    }

    // Mobile drawer
    var drawerBtn = $('#drawerBtn');
    var drawerOverlay = $('#drawerOverlay');
    if (drawerBtn) {
      drawerBtn.addEventListener('click', function () {
        document.body.classList.add('drawer-open');
        drawerBtn.setAttribute('aria-expanded', 'true');
        if (drawerOverlay) drawerOverlay.hidden = false;
      });
    }
    if (drawerOverlay) {
      drawerOverlay.addEventListener('click', closeDrawer);
    }

    // Logo
    var logo = $('#logoLink');
    if (logo) {
      logo.addEventListener('click', function (e) { e.preventDefault(); navigate('dashboard'); });
    }

    // FAB & sidebar add
    var fab = $('#fab');
    if (fab) fab.addEventListener('click', function () { openTaskModal(null); });
    var sidebarAdd = $('#sidebarAddBtn');
    if (sidebarAdd) sidebarAdd.addEventListener('click', function () { openTaskModal(null); });

    // Theme toggle
    var themeToggle = $('#themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function () {
        var mode = resolveMode();
        state.settings.theme = mode === 'dark' ? 'light' : 'dark';
        saveSettings();
        applyAppearance();
        if (state.page === 'settings') renderPage();
      });
    }

    // Top search → tasks page
    var topSearch = $('#topSearchBtn');
    if (topSearch) {
      topSearch.addEventListener('click', function () {
        navigate('tasks');
        setTimeout(function () {
          var input = $('#taskSearchInput');
          if (input) input.focus();
        }, 50);
      });
    }

    // Nav (delegated)
    document.addEventListener('click', function (e) {
      var navEl = e.target.closest('[data-page]');
      if (navEl && navEl.dataset.page && PAGES[navEl.dataset.page]) {
        e.preventDefault();
        navigate(navEl.dataset.page);
        return;
      }
      if (e.target.closest('#bnavMore')) {
        e.preventDefault();
        document.body.classList.add('drawer-open');
        if (drawerOverlay) drawerOverlay.hidden = false;
        if (drawerBtn) drawerBtn.setAttribute('aria-expanded', 'true');
      }
    });

    // Task actions (delegated across all pages)
    document.addEventListener('click', function (e) {
      // Task row body click → edit
      var body = e.target.closest('.task-body');
      if (body && !e.target.closest('[data-action="cycle-status"]')) {
        var item = body.closest('.task-card');
        if (item) {
          var t = findTask(item.dataset.id);
          if (t) { openTaskModal(t); return; }
        }
      }

      var action = e.target.closest('[data-action]');
      if (!action) return;
      var act = action.dataset.action;

      // Quick actions on dashboard
      if (act === 'new-task-date') { openTaskModal(null); $('#taskDueDate').value = action.dataset.date || ''; return; }
      if (act === 'new-task') { openTaskModal(null); return; }
      if (act === 'go-today') { navigate('today'); return; }
      if (act === 'go-overdue') { state.filterDate = 'overdue'; state.filterStatus = 'all'; state.filterPriority = 'all'; navigate('tasks'); return; }
      if (act === 'go-completed') { navigate('completed'); return; }
      if (act === 'reset-filters') {
        state.filterStatus = 'all'; state.filterDate = 'any'; state.filterPriority = 'all'; state.search = '';
        renderPage(); return;
      }
      if (act === 'clear-completed') { clearCompleted(); return; }
      if (act === 'reset-appearance') { resetAppearance(); return; }
      if (act === 'reset-all-settings') { resetAllSettings(); return; }

      // Task actions
      var card = action.closest('.task-card');
      if (!card) return;
      var id = card.dataset.id;
      if (act === 'cycle-status') cycleStatus(id);
      else if (act === 'edit') { var t = findTask(id); if (t) openTaskModal(t); }
      else if (act === 'pin') togglePin(id);
      else if (act === 'delete') deleteTask(id);
    });

    // Keyboard activation for task body
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var body = e.target.closest('.task-body');
        if (body) {
          e.preventDefault();
          var item = body.closest('.task-card');
          if (item) { var t = findTask(item.dataset.id); if (t) openTaskModal(t); }
        }
      }
    });

    // Search & filters (delegated)
    document.addEventListener('input', function (e) {
      if (e.target.classList && e.target.classList.contains('qa-input')) { updateQaPreview(e.target); return; }
      if (e.target.id === 'taskSearchInput') {
        state.search = e.target.value;
        var btn = $('#clearSearchBtn');
        if (btn) btn.hidden = state.search.length === 0;
        debouncedSearch();
      }
    });

    document.addEventListener('change', function (e) {
      if (e.target.id === 'sortSelect') {
        state.sort = e.target.value;
        renderPage();
      }
    });

    document.addEventListener('click', function (e) {
      // Filters
      var fStatus = e.target.closest('[data-filter-status]');
      if (fStatus) { state.filterStatus = fStatus.dataset.filterStatus; renderPage(); return; }
      var fDate = e.target.closest('[data-filter-date]');
      if (fDate) { state.filterDate = fDate.dataset.filterDate; renderPage(); return; }
      var fPrio = e.target.closest('[data-filter-priority]');
      if (fPrio) { state.filterPriority = fPrio.dataset.filterPriority; renderPage(); return; }
      // Clear search
      if (e.target.closest('#clearSearchBtn')) {
        state.search = '';
        var input = $('#taskSearchInput');
        if (input) { input.value = ''; input.focus(); }
        renderPage();
        return;
      }
    });

    // Calendar navigation
    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-cal-nav]');
      if (nav) {
        var dir = parseInt(nav.dataset.calNav, 10);
        state.calendar.month += dir;
        if (state.calendar.month > 11) { state.calendar.month = 0; state.calendar.year++; }
        if (state.calendar.month < 0) { state.calendar.month = 11; state.calendar.year--; }
        renderPage();
        return;
      }
      if (e.target.closest('[data-cal-today]')) {
        var now = new Date();
        state.calendar.year = now.getFullYear();
        state.calendar.month = now.getMonth();
        state.calendar.selected = todayStr();
        renderPage();
        return;
      }
      var wn = e.target.closest('[data-week-nav]');
      if (wn) { state.weekOffset += parseInt(wn.dataset.weekNav, 10); renderPage(); return; }
      if (e.target.closest('[data-week-today]')) { state.weekOffset = 0; renderPage(); return; }
      var dayBtn = e.target.closest('[data-cal-day]');
      if (dayBtn) {
        state.calendar.selected = dayBtn.dataset.calDay;
        renderPage();
        return;
      }
    });

    // Settings controls (delegated)
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.sub) { toggleSub(t); return; }
      if (t.dataset.themeBtn != null) return; // handled by click

      if (t.id === 'setRadius') { state.settings.radius = t.value; saveSettings(); applyAppearance(); return; }
      if (t.id === 'setDensity') { state.settings.density = t.value; saveSettings(); applyAppearance(); return; }
      if (t.id === 'setFontSize') { state.settings.fontSize = t.value; saveSettings(); applyAppearance(); return; }
      if (t.id === 'setMotion') { state.settings.motion = t.value; saveSettings(); applyAppearance(); return; }

      if (t.dataset.toggle) {
        var key = t.dataset.toggle;
        if (key === 'reminders') {
          (async function () {
            if (t.checked) {
              await requestNotifications();
              state.settings.reminders = true;
              saveSettings();
              startReminderLoop();
              updateReminderStatus();
              toast('Reminders enabled.', 'success');
            } else {
              state.settings.reminders = false;
              saveSettings();
              updateReminderStatus();
              toast('Reminders disabled.', 'info', 2000);
            }
          })();
        } else {
          state.settings[key] = t.checked;
          saveSettings();
          if (key === 'showDates' || key === 'showPriorityIndicators' || key === 'showAnimations') {
            // re-render current page for visual effect
            if (state.page !== 'settings') renderPage();
          }
        }
        return;
      }

      if (t.dataset.dashcard) {
        state.settings.dashboardCards[t.dataset.dashcard] = t.checked;
        saveSettings();
        return;
      }
    });

    // Theme buttons & palette buttons & sliders (delegated click/input)
    document.addEventListener('click', function (e) {
      var themeBtn = e.target.closest('[data-theme-btn]');
      if (themeBtn) {
        state.settings.theme = themeBtn.dataset.themeBtn;
        saveSettings();
        applyAppearance();
        // update aria-pressed on all theme buttons
        $$('[data-theme-btn]').forEach(function (b) {
          b.setAttribute('aria-pressed', b === themeBtn ? 'true' : 'false');
        });
        return;
      }
      var seg = e.target.closest('[data-seg]');
      if (seg) {
        state.settings[seg.dataset.seg] = seg.dataset.value;
        saveSettings();
        applyAppearance();
        $$('[data-seg="' + seg.dataset.seg + '"]').forEach(function (b) { b.setAttribute('aria-pressed', b === seg ? 'true' : 'false'); });
        return;
      }
      var jump = e.target.closest('[data-settings-jump]');
      if (jump) { var tgt = document.getElementById(jump.dataset.settingsJump); if (tgt) tgt.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      var palBtn = e.target.closest('[data-palette]');
      if (palBtn) {
        state.settings.palette = palBtn.dataset.palette;
        saveSettings();
        applyAppearance();
        $$('[data-palette]').forEach(function (b) {
          b.setAttribute('aria-pressed', b === palBtn ? 'true' : 'false');
        });
        return;
      }
      if (e.target.closest('#addCategorySettingsBtn')) { addCategoryFromSettings(); return; }
      var rmCat = e.target.closest('[data-remove-category]');
      if (rmCat) { removeCategory(rmCat.dataset.removeCategory); return; }
    });

    document.addEventListener('input', function (e) {
      var slider = e.target.closest('[data-slider]');
      if (slider) {
        var key = slider.dataset.slider;
        var val = parseInt(slider.value, 10);
        state.settings[key] = val;
        var unit = key === 'blurIntensity' ? 'px' : '%';
        var out = document.querySelector('[data-val-for="' + key + '"]');
        if (out) out.textContent = val + unit;
        applyAppearance();
        saveSettings();
        return;
      }
      if (e.target.id === 'settingsSearch') {
        filterSettings(e.target.value);
      }
      if (e.target.id === 'newCategoryInput') {
        // no-op, handled by button/enter
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.target.id === 'newCategoryInput' && e.key === 'Enter') {
        e.preventDefault();
        addCategoryFromSettings();
      }
    });

    // Data buttons (delegated)
    document.addEventListener('click', function (e) {
      if (e.target.closest('#exportBtn')) { exportTasks(); return; }
      if (e.target.closest('#importBtn')) { var fi = $('#fileInput'); if (fi) fi.click(); return; }
      if (e.target.closest('#clearAllBtn')) { clearAllTasks(); return; }
    });
    document.addEventListener('change', function (e) {
      if (e.target.id === 'fileInput') { handleImportFile(e); }
    });

    // Task modal
    var taskForm = $('#taskForm');
    if (taskForm) taskForm.addEventListener('submit', handleTaskSubmit);
    document.addEventListener('submit', function (e) {
      if (e.target.classList && e.target.classList.contains('quick-add')) { e.preventDefault(); handleQuickAdd(e.target); }
    });
    var promptForm = $('#promptForm');
    if (promptForm) promptForm.addEventListener('submit', handlePromptSubmit);
    var addCat = $('#addCategoryBtn');
    if (addCat) addCat.addEventListener('click', addCategoryFromPrompt);
    document.addEventListener('click', function (e) {
      var closeBtn = e.target.closest('[data-close-modal]');
      if (closeBtn) { closeModal(closeBtn.dataset.closeModal); return; }
      // Click outside modal card closes
      var modal = e.target.closest('.modal');
      if (modal && e.target === modal) {
        if (modal.id === 'confirmModal') resolveConfirm(false);
        else closeModal(modal.id);
      }
    });

    // Confirm modal
    var confirmCancel = $('#confirmCancel');
    if (confirmCancel) confirmCancel.addEventListener('click', function () { resolveConfirm(false); });
    var confirmOk = $('#confirmOk');
    if (confirmOk) confirmOk.addEventListener('click', function () { resolveConfirm(true); });

    // Global keyboard
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (activeModal) {
          if (activeModal.id === 'confirmModal') resolveConfirm(false);
          else closeModal(activeModal.id);
          return;
        }
        if (document.body.classList.contains('drawer-open')) closeDrawer();
      }
      trapFocus(e);

      // Shortcuts when not typing
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.key === 'n' || e.key === 'N') && !activeModal) {
        e.preventDefault(); openTaskModal(null);
      }
      if (e.key === '/') {
        e.preventDefault();
        var si = $('#taskSearchInput');
        if (si) { si.focus(); si.select(); }
        else navigate('tasks');
      }
    });

    // System theme change
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var handler = function () {
        if (state.settings.theme === 'system') applyAppearance();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
      else if (typeof mq.addListener === 'function') mq.addListener(handler);
    }

    // Reminders on visibility
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) checkReminders();
    });

    // Persist before unload
    window.addEventListener('beforeunload', function () {
      if (state.tasks.length || storage.getRaw(STORAGE_KEYS.tasks)) saveTasks(true);
    });

    // Hash routing
    window.addEventListener('hashchange', function () {
      var page = parseHash();
      if (page !== state.page) {
        state.page = page;
        renderPage();
      }
    });
  }

  var debouncedSearch = debounce(function () {
    if (state.page !== 'tasks') return;
    var visible = getVisibleTasks();
    var countEl = document.querySelector('.section-head h3 span');
    if (countEl) countEl.textContent = '(' + visible.length + ')';
    var host = $('#taskListHost');
    if (host) host.innerHTML = taskListInner(visible);
  }, 160);

  function filterSettings(q) {
    q = q.toLowerCase().trim();
    $$('.settings-card').forEach(function (card) {
      var match = !q || card.textContent.toLowerCase().indexOf(q) !== -1;
      card.style.display = match ? '' : 'none';
    });
  }

  function closeDrawer() {
    document.body.classList.remove('drawer-open');
    var drawerBtn = $('#drawerBtn');
    if (drawerBtn) drawerBtn.setAttribute('aria-expanded', 'false');
    var overlay = $('#drawerOverlay');
    if (overlay) setTimeout(function () { overlay.hidden = true; }, 250);
  }

  /* ============================================================
     SETTINGS PAGE — afterRender
     ============================================================ */
  PAGES.settings.afterRender = function () {
    renderCategoriesList();
    updateReminderStatus();
  };

  /* ============================================================
     16. INIT
     ============================================================ */
  function init() {
    loadAll();
    applyAppearance();

    // Initial route
    state.page = parseHash();

    bindGlobalEvents();
    renderPage();

    // Storage warning
    if (!storage.available) {
      toast('Browser storage is unavailable — changes will not persist after you close this page.', 'error', 9000);
    }

    // Pending load messages
    pendingToasts.forEach(function (p) { toast(p[0], p[1], 6000); });
    pendingToasts = [];

    startReminderLoop();

    // Iconify fallback: if it fails to load within 4s, use simple placeholders
    setTimeout(function () {
      if (!window.customElements || !customElements.get('iconify-icon')) {
        document.body.classList.add('icons-failed');
      }
    }, 4000);

    // Keep list fresh at midnight (Today/Overdue filters)
    setInterval(function () {
      if (!activeModal) {
        if (state.page === 'dashboard' || state.page === 'today' || state.page === 'upcoming' || state.page === 'calendar') {
          renderPage();
        }
      }
    }, 5 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
