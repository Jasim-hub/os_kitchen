/* ==========================================================
   common.js
   Shared helpers used by every page: layout chrome (sidebar /
   topbar), toasts, confirm dialog, modal helpers, formatters,
   validation helpers, and small DOM utilities.
   ========================================================== */

/* ---------------- LAYOUT CHROME ---------------- */

const NAV_ITEMS = [
  { href: 'index.html?new=1', label: 'Dashboard', icon: 'grid', page: 'dashboard' },
  { href: 'orders.html', label: 'Orders', icon: 'list', page: 'orders' },
  { href: 'order-details.html', label: 'New Order', icon: 'plus', page: 'new-order' },
  { href: 'food-items.html', label: 'Food Items', icon: 'utensils', page: 'food-items' },
  { href: 'customers.html', label: 'Customers', icon: 'users', page: 'customers' },
  { href: 'reports.html', label: 'Reports', icon: 'chart', page: 'reports' },
  { href: 'settings.html', label: 'Settings', icon: 'settings', page: 'settings' },
];

const ICONS = {
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  utensils: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 3v7a3 3 0 0 0 6 0V3M7 10v11M17 3c-1.5 0-3 1.5-3 4s1.5 6 3 6 3-3 3-6-1.5-4-3-4zM17 13v8"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 8.2a3 3 0 1 1 3.2 5.4M18 14.5c2.4.5 3.5 2 3.5 5.5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="20" x2="5" y2="11"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="19" y1="20" x2="19" y2="14"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10a1.6 1.6 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V10a1.6 1.6 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
};

function icon(name) { return ICONS[name] || ''; }

function renderShell(activePage, pageTitle, crumb) {
  const navHtml = NAV_ITEMS.map(item => `
    <a href="${item.href}" class="${item.page === activePage ? 'active' : ''}">
      ${icon(item.icon)}<span>${item.label}</span>
    </a>`).join('');

  document.getElementById('appShell').innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="mark">OS</div>
        <div>
          <div class="title">OS Kitchen</div>
          <div class="sub">Exciting Foods</div>
        </div>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-foot">
        <div class="avatar">A</div>
        <div class="info">
          <div class="name">Admin</div>
          <div class="role">Caterer Staff</div>
        </div>
        <button title="Logout" onclick="toast('Logout is not wired to auth in this demo build.')">${icon('logout')}</button>
      </div>
    </aside>
    <div class="main">
      <div class="topbar">
        <div class="flex items-center gap-12">
          <button class="hamburger" onclick="toggleSidebar()">${icon('menu')}</button>
          <div>
            <h1>${pageTitle}</h1>
            <div class="crumb">${crumb || ''}</div>
          </div>
        </div>
        <div class="topbar-actions" id="topbarActions"></div>
      </div>
      <div class="content" id="pageContent"></div>
    </div>
  `;

  if (!window.SUPABASE_CONFIGURED) {
    toast('Supabase URL / anon key not set yet — edit js/supabase.js', 'error', 6000);
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ---------------- TOASTS ---------------- */

function ensureToastStack() {
  let el = document.getElementById('toastStack');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastStack';
    el.className = 'toast-stack';
    document.body.appendChild(el);
  }
  return el;
}

function toast(message, type = 'info', duration = 3200) {
  const stack = ensureToastStack();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 250);
  }, duration);
}

/* ---------------- CONFIRM DIALOG ---------------- */

function confirmDialog(message, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <div class="modal-body">
          <h3 style="margin-bottom:8px;">Please confirm</h3>
          <p class="text-soft" style="margin:0;">${message}</p>
        </div>
        <div class="modal-foot">
          <button class="btn" id="cd-cancel">Cancel</button>
          <button class="btn btn-danger" id="cd-ok">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#cd-cancel').onclick = () => { backdrop.remove(); resolve(false); };
    backdrop.querySelector('#cd-ok').onclick = () => { backdrop.remove(); resolve(true); };
    backdrop.onclick = (e) => { if (e.target === backdrop) { backdrop.remove(); resolve(false); } };
  });
}

/* ---------------- MODAL HELPERS ---------------- */

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ---------------- FORMATTERS ---------------- */

function money(n) {
  const num = Number(n) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDateDisplay(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTimeDisplay(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDaysISO(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeekISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const TIME_SLOTS = ['08:00','09:00','10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','15:00','16:00','17:00','18:00','19:00','19:30','20:00','20:30','21:00'];

function formatTime12(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

const STATUS_LIST = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
function statusBadge(status) {
  const s = (status || 'Pending').toLowerCase();
  return `<span class="badge st-${s}">${status || 'Pending'}</span>`;
}

/* ---------------- VALIDATION ---------------- */

function requiredMsg(value, msg) {
  if (value === undefined || value === null || String(value).trim() === '') return msg;
  return null;
}

function showFieldError(inputEl, message) {
  clearFieldError(inputEl);
  inputEl.closest('.form-group, .field')?.classList.add('field-error');
  const err = document.createElement('div');
  err.className = 'error-text';
  err.textContent = message;
  err.dataset.autoError = '1';
  inputEl.insertAdjacentElement('afterend', err);
}
function clearFieldError(inputEl) {
  inputEl.closest('.form-group, .field')?.classList.remove('field-error');
  const next = inputEl.nextElementSibling;
  if (next && next.dataset && next.dataset.autoError) next.remove();
}
function clearAllFieldErrors(form) {
  form.querySelectorAll('[data-auto-error]').forEach(e => e.remove());
  form.querySelectorAll('.field-error').forEach(e => e.classList.remove('field-error'));
}

/* ---------------- MISC ---------------- */

function debounce(fn, wait = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function qs(param) {
  return new URLSearchParams(window.location.search).get(param);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function loadingRow(colspan, label = 'Loading…') {
  return `<tr><td colspan="${colspan}" class="loading-row"><span class="spinner"></span>${label}</td></tr>`;
}

function emptyState(title, sub) {
  return `<div class="empty-state">${icon('empty')}<div class="t">${title}</div><div>${sub || ''}</div></div>`;
}

function errorState(msg) {
  return `<div class="empty-state" style="color:var(--brick);">${msg}</div>`;
}

function getSettings() {
  try {
    return JSON.parse(localStorage.getItem('foodOrderSettings')) || {
      businessName: 'OS Events',
      address: 'OS Events, Pothencode, Thiruvananthapuram, Kerala',
      phone: '+91 9745445594',
    };
  } catch (e) {
    return { businessName: 'OS Events', address: '', phone: '+91 9745445594' };
  }
}
function saveSettings(s) { localStorage.setItem('foodOrderSettings', JSON.stringify(s)); }
