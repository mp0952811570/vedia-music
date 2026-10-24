// Vedia Music — front-end
const $ = s => document.querySelector(s);
const audio = $('#audio');

// ---------- icons ----------
const I = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M5 5.5v13a1 1 0 0 0 1.55.83L15 13.6V18a1 1 0 0 0 2 0V6a1 1 0 0 0-2 0v4.4L6.55 4.67A1 1 0 0 0 5 5.5z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M19 5.5v13a1 1 0 0 1-1.55.83L9 13.6V18a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v4.4l8.45-5.73A1 1 0 0 1 19 5.5z"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M5.3 8.3a1 1 0 0 1 1.4 0L12 13.6l5.3-5.3a1 1 0 1 1 1.4 1.4l-6 6a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 0-1.4z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.3l-1.1-1C6.1 15 3 12.2 3 8.7 3 5.9 5.2 3.8 7.9 3.8c1.6 0 3 .7 4.1 1.9 1.1-1.2 2.5-1.9 4.1-1.9 2.7 0 4.9 2.1 4.9 4.9 0 3.5-3.1 6.3-7.9 10.6l-1.1 1z"/></svg>',
  heartO: '<svg viewBox="0 0 24 24"><path d="M16.1 3.8c-1.6 0-3 .7-4.1 1.9-1.1-1.2-2.5-1.9-4.1-1.9C5.2 3.8 3 5.9 3 8.7c0 3.5 3.1 6.3 7.9 10.6l1.1 1 1.1-1C17.9 15 21 12.2 21 8.7c0-2.8-2.2-4.9-4.9-4.9zM12.1 17.8l-.1.1-.1-.1C7.6 13.9 5 11.6 5 8.7 5 7 6.2 5.8 7.9 5.8c1.3 0 2.6.9 3.1 2h2c.5-1.1 1.8-2 3.1-2 1.7 0 2.9 1.2 2.9 2.9 0 2.9-2.6 5.2-6.9 9.1z"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24"><path d="M10.6 9.2L5.4 4 4 5.4l5.2 5.2 1.4-1.4zM14.5 4l2 2L4 18.6 5.4 20 18 7.5l2 2V4h-5.5zm.3 9.4l-1.4 1.4 3.1 3.1-2 2.1H20v-5.5l-2 2-3.2-3.1z"/></svg>',
  repeat: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
  repeat1: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>',
  plAdd: '<svg viewBox="0 0 24 24"><path d="M3 6h12v2H3V6zm0 4h12v2H3v-2zm0 4h8v2H3v-2zm14-4h2v3h3v2h-3v3h-2v-3h-3v-2h3v-3z"/></svg>',
  expand: '<svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z"/></svg>',
  back10: '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/><text x="12" y="15.6" font-size="6.6" font-weight="800" text-anchor="middle">10</text></svg>',
  fwd10: '<svg viewBox="0 0 24 24"><path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"/><text x="12" y="15.6" font-size="6.6" font-weight="800" text-anchor="middle">10</text></svg>',
  collapse: '<svg viewBox="0 0 24 24"><path d="M8 4h2v6H4V8h4V4zm6 0h2v4h4v2h-6V4zM4 14h6v6H8v-4H4v-2zm10 0h6v2h-4v4h-2v-6z"/></svg>',
};
const setIcon = (el, name) => { if (el) el.innerHTML = I[name]; };

// ---------- storage ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('vedia:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('vedia:' + k, JSON.stringify(v)); } catch {} },
};

// optional server password (if ACCESS_KEY is set on the server)
let KEY = new URLSearchParams(location.search).get('key') || store.get('key', '');
if (new URLSearchParams(location.search).get('key')) { store.set('key', KEY); history.replaceState(null, '', '/'); }
const withKey = url => (KEY ? url + (url.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(KEY) : url);
async function api(url, opts) {
  const r = await fetch(withKey(url), opts);
  if (r.status === 401) {
    const k = prompt('請輸入 Vedia Music 通行碼');
    if (k) { KEY = k.trim(); store.set('key', KEY); return api(url, opts); }
  }
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// ---------- state ----------
const S = {
  queue: store.get('queue', []),
  index: store.get('index', -1),
  history: store.get('history', []),
  shuffle: store.get('shuffle', false),
  repeat: store.get('repeat', 'off'), // off | all | one
  offsets: store.get('offsets', {}),
  translate: store.get('translate', false),
  autoRadio: store.get('autoRadio', true),
  liked: store.get('liked', []),
  playlists: store.get('playlists', []), // [{id, name, tracks, created, updated}]
  libUpdated: store.get('libUpdated', 0),
  results: [],
  home: null, // {chips, sections} from /api/home
  homeChip: '', // selected mood chip ('' = everything)
  homeBusy: false,
  // playlist / album / artist pages opened on top of these tabs, newest last:
  // {type, id, title, subtitle, cover, items, …, y = the scroll position to return to}
  pages: { home: [], search: [] },
  me: null, // {name, owner} for this device's code
  friends: null, // owner only: [{id, name, key, created, lastSeen}]
  tab: 'home',
  openPl: null,
  editPl: false,
  lyrics: null, // {id, lines:[{t,text,tr}], plain}
};
const cur = () => S.queue[S.index];
const persist = () => {
  store.set('queue', S.queue.slice(0, 500));
  store.set('index', S.index);
  store.set('history', S.history.slice(0, 100));
  store.set('shuffle', S.shuffle);
  store.set('repeat', S.repeat);
  store.set('offsets', S.offsets);
  store.set('translate', S.translate);
  store.set('autoRadio', S.autoRadio);
};

// ---------- library sync (liked + playlists are also saved on the server) ----------
let pushT = null;
function persistLib() {
  S.libUpdated = Date.now();
  store.set('liked', S.liked);
  store.set('playlists', S.playlists);
  store.set('libUpdated', S.libUpdated);
  store.set('libDirty', true);
  clearTimeout(pushT);
  pushT = setTimeout(pushLibrary, 700);
}
async function pushLibrary() {
  try {
    await api('/api/library', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ liked: S.liked, playlists: S.playlists, updatedAt: S.libUpdated }),
    });
    store.set('libDirty', false);
  } catch {}
}
async function pullLibrary() {
  try {
    const d = await api('/api/library');
    const serverAt = d.updatedAt || 0;
    const dirty = store.get('libDirty', false);
    const localHas = S.liked.length || S.playlists.length;
    const serverHas = (d.liked || []).length || (d.playlists || []).length;
    if ((serverAt > S.libUpdated && !dirty) || (!localHas && serverHas)) {
      S.liked = d.liked || []; S.playlists = d.playlists || []; S.libUpdated = serverAt;
      store.set('liked', S.liked); store.set('playlists', S.playlists); store.set('libUpdated', serverAt);
      if (S.openPl && !getPl(S.openPl)) S.openPl = null;
      syncLike(); render();
    } else if (localHas && (dirty || S.libUpdated > serverAt)) {
      pushLibrary();
    }
  } catch {}
}

// ---------- helpers ----------
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cleanT = t => ({ id: t.id, title: t.title || '', artist: t.artist || '', album: t.album || '', duration: t.duration || 0, cover: t.cover || '' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}
const status = msg => { $('#status').textContent = msg || ''; };
const isLiked = id => S.liked.some(x => x.id === id);

// ---------- theme: the accent colour follows the artwork ----------
// Same approach as Auralane (MIT, © 2026 adam10000423-oss): average the mid-tone pixels of a 32×32
// copy of the cover, then keep the result saturated enough and mid-light so it reads on the dark UI.
const DEFAULT_THEME = [41, 182, 246]; // Vedia blue until something plays
let themeReq = 0;
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb(h, s, l) {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255));
}
function applyTheme([r, g, b]) {
  const css = document.documentElement.style;
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const lift = luma < 165 ? Math.min(0.58, 0.2 + ((165 - luma) / 165) * 0.5) : 0; // lighter tint for text on dark
  css.setProperty('--theme', `${r}, ${g}, ${b}`);
  css.setProperty('--theme-lite', [r, g, b].map(v => Math.round(v + (255 - v) * lift)).join(', '));
  css.setProperty('--on-accent', luma > 150 ? '#101014' : '#f5f5f6');
}
function themeFromArtwork(url) {
  const req = ++themeReq;
  if (!url) return applyTheme(DEFAULT_THEME);
  const img = new Image();
  img.crossOrigin = 'anonymous'; // both cover CDNs answer with Access-Control-Allow-Origin: *
  img.onload = () => {
    if (req !== themeReq) return;
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 32, 32);
      const px = ctx.getImageData(0, 0, 32, 32).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < px.length; i += 16) {
        const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        if (l > 20 && l < 235) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
      }
      if (!n) return applyTheme(DEFAULT_THEME);
      const [h, s, l] = rgbToHsl(r / n, g / n, b / n);
      applyTheme(hslToRgb(h, Math.max(0.4, Math.min(0.85, s * 1.5)), Math.max(0.45, Math.min(0.65, l))));
    } catch { applyTheme(DEFAULT_THEME); }
  };
  img.onerror = () => { if (req === themeReq) applyTheme(DEFAULT_THEME); };
  img.src = url.replace(/=w\d+-h\d+/, '=w64-h64');
}

// generic bottom sheet; onPick receives the clicked button's dataset
function sheet(html, onPick) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.innerHTML = html;
  const close = () => { bg.remove(); sh.remove(); };
  bg.onclick = close;
  sh.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    close();
    if (!b.hasAttribute('data-x')) onPick({ ...b.dataset });
  };
  document.body.append(bg, sh);
}

// ---------- playlists ----------
const getPl = id => S.playlists.find(p => p.id === id);
function dedupe(tracks) {
  const seen = new Set();
  return tracks.filter(t => t && t.id && !seen.has(t.id) && seen.add(t.id)).map(cleanT);
}
function createPlaylist(name, tracks = []) {
  const p = { id: uid(), name: String(name).trim().slice(0, 100) || '未命名歌單', tracks: dedupe(tracks), created: Date.now(), updated: Date.now() };
  S.playlists.unshift(p);
  persistLib();
  return p;
}
function addToPlaylist(p, tracks) {
  const have = new Set(p.tracks.map(t => t.id));
  const add = dedupe(tracks).filter(t => !have.has(t.id));
  p.tracks.push(...add);
  p.updated = Date.now();
  persistLib();
  return add.length;
}
function pickPlaylist(tracks) {
  tracks = tracks.filter(Boolean);
  if (!tracks.length) return;
  const rows = S.playlists.map((p, i) => `<button data-p="${i}">${esc(p.name)}<small>${p.tracks.length} 首</small></button>`).join('');
  sheet(`<div class="sheet-title">加入歌單${tracks.length > 1 ? `（${tracks.length} 首）` : `：${esc(tracks[0].title)}`}</div>
    <div class="sheet-scroll"><button data-p="new" class="accent">＋ 新增歌單</button>${rows}</div><button data-x>取消</button>`, d => {
    let p;
    if (d.p === 'new') {
      const name = prompt('新歌單名稱');
      if (!name || !name.trim()) return;
      p = createPlaylist(name);
    } else p = S.playlists[Number(d.p)];
    if (!p) return;
    const n = addToPlaylist(p, tracks);
    toast(n ? `已加入「${p.name}」${tracks.length > 1 ? `（${n} 首）` : ''}` : '歌曲已在這個歌單裡');
    render();
  });
}
function plMenu(p) {
  if (!p) return;
  sheet(`<div class="sheet-title">${esc(p.name)}</div>
    <button data-a="rename">重新命名</button>
    <button data-a="queue">全部加到播放佇列</button>
    <button data-a="del" class="danger">刪除歌單</button>
    <button data-x>取消</button>`, d => {
    if (d.a === 'rename') {
      const n = prompt('歌單名稱', p.name);
      if (n && n.trim()) { p.name = n.trim().slice(0, 100); p.updated = Date.now(); persistLib(); render(); }
    }
    if (d.a === 'queue') {
      S.queue.push(...p.tracks.map(cleanT)); persist();
      toast(`已加入 ${p.tracks.length} 首到佇列`);
      if (S.index < 0 && S.queue.length) playIndex(0);
    }
    if (d.a === 'del' && confirm(`確定刪除歌單「${p.name}」？`)) {
      S.playlists = S.playlists.filter(x => x.id !== p.id);
      S.openPl = null; S.editPl = false;
      persistLib(); render(); toast('已刪除歌單');
    }
  });
}
async function importPlaylist() {
  const url = prompt('貼上 YouTube 或 YouTube Music 的歌單網址');
  if (!url || !url.trim()) return;
  toast('匯入中…');
  try {
    const d = await api('/api/ytplaylist?url=' + encodeURIComponent(url.trim()));
    if (!d.items || !d.items.length) { toast('這個歌單沒有可播放的歌曲'); return; }
    const p = createPlaylist(d.name || '匯入的歌單', d.items);
    S.openPl = p.id; S.editPl = false;
    render(); window.scrollTo(0, 0);
    toast(`已匯入 ${p.tracks.length} 首`);
  } catch { toast('匯入失敗：請確認是公開或「不公開」的歌單網址'); }
}

// ---------- list rendering ----------
function rowHTML(t, i, ctx) {
  const playing = cur() && cur().id === t.id ? ' playing' : '';
  return `<div class="row${playing}" data-i="${i}" data-ctx="${ctx}">
    <img loading="lazy" src="${esc(t.cover)}" alt="" onerror="this.style.visibility='hidden'">
    <div class="meta"><div class="t1">${esc(t.title)}</div><div class="t2">${esc(t.artist)}${t.album ? ' · ' + esc(t.album) : ''}</div></div>
    <span class="dur">${t.duration ? fmt(t.duration) : ''}</span>
    <button class="more" data-more="${i}" aria-label="更多">⋯</button>
  </div>`;
}
function editRowHTML(t, i, n) {
  return `<div class="row edit" data-i="${i}" data-ctx="edit">
    <img loading="lazy" src="${esc(t.cover)}" alt="" onerror="this.style.visibility='hidden'">
    <div class="meta"><div class="t1">${esc(t.title)}</div><div class="t2">${esc(t.artist)}</div></div>
    <button class="mini-btn" data-mv="-1" ${i === 0 ? 'disabled' : ''} aria-label="上移">↑</button>
    <button class="mini-btn" data-mv="1" ${i === n - 1 ? 'disabled' : ''} aria-label="下移">↓</button>
    <button class="mini-btn danger" data-rm aria-label="移除">✕</button>
  </div>`;
}
const page = () => S.pages[S.tab]?.at(-1) || null;
// shelves on screen: the open artist page's, else the home page's
const pageSections = () => page()?.sections || (S.tab === 'home' ? S.home?.sections : null) || [];
function listFor(tab) {
  if (tab === 'search') return S.results;
  if (tab === 'col') return page()?.items || [];
  if (tab.startsWith('sec:')) return pageSections()[Number(tab.slice(4))]?.items || [];
  if (tab === 'queue') return S.queue;
  if (tab === 'liked') return S.liked;
  if (tab === 'history') return S.history;
  if (tab === 'pl') return getPl(S.openPl)?.tracks || [];
  return [];
}
function renderPlList(el) {
  const head = `<div class="pl-actions"><button id="plNew" class="primary">＋ 新增歌單</button><button id="plImport">匯入 YouTube 歌單</button></div>`;
  if (!S.playlists.length) {
    el.innerHTML = head + `<div class="empty"><small>還沒有歌單<br>可以新增歌單，或貼上 YouTube / YouTube Music 的歌單網址匯入</small></div>`;
    return;
  }
  el.innerHTML = head + S.playlists.map(p => {
    const cover = p.tracks.find(t => t.cover)?.cover || '/icons/icon-192.png';
    return `<div class="row pl-row" data-pl="${esc(p.id)}">
      <img loading="lazy" src="${esc(cover)}" alt="">
      <div class="meta"><div class="t1">${esc(p.name)}</div><div class="t2">${p.tracks.length} 首</div></div>
      <span class="chev">›</span></div>`;
  }).join('');
}
function renderPlDetail(el, p) {
  const total = p.tracks.reduce((a, t) => a + (t.duration || 0), 0);
  const head = `<div class="pl-head">
    <button id="plBack" class="link">‹ 所有歌單</button>
    <div class="pl-title">${esc(p.name)}</div>
    <div class="t2">${p.tracks.length} 首${total ? ' · ' + Math.round(total / 60) + ' 分鐘' : ''}</div>
    <div class="pl-actions">
      <button id="plPlay" class="primary">▶ 播放</button>
      <button id="plShuffle">隨機播放</button>
      <button id="plEdit">${S.editPl ? '完成' : '編輯'}</button>
      <button id="plMore" aria-label="更多">⋯</button>
    </div></div>`;
  const body = p.tracks.length
    ? p.tracks.map((t, i) => (S.editPl ? editRowHTML(t, i, p.tracks.length) : rowHTML(t, i, 'pl'))).join('')
    : `<div class="empty"><small>歌單是空的<br>在任何歌曲右邊的「⋯」選「加入歌單…」</small></div>`;
  el.innerHTML = head + body;
}
// Re-rendering (a song starting, a page finishing loading) must not throw horizontal rows back to
// their start: chip rows keep their position within a tab, carousels within the same page.
let shownView = null, shownTab = null;
function render() {
  const el = $('#list');
  moreObs?.disconnect();
  const view = page() || (S.tab === 'home' ? S.home : S.tab);
  const chipX = shownTab === S.tab && !page() ? el.querySelector('.chip-row')?.scrollLeft || 0 : 0;
  const shelfX = view === shownView ? [...el.querySelectorAll('[data-shelf]')].map(s => s.scrollLeft) : [];
  shownView = view; shownTab = S.tab;
  draw(el);
  const chips = el.querySelector('.chip-row');
  if (chips && chipX) chips.scrollLeft = chipX;
  el.querySelectorAll('[data-shelf]').forEach((s, i) => { if (shelfX[i]) s.scrollLeft = shelfX[i]; });
}
function draw(el) {
  const pg = page();
  if (pg) return pg.type === 'artist' ? renderArtist(el, pg) : renderCollection(el, pg);
  if (S.tab === 'home') return renderHome(el);
  if (S.tab === 'search') return renderSearch(el);
  if (S.tab === 'users') return renderFriends(el);
  if (S.tab === 'playlists') {
    const p = S.openPl && getPl(S.openPl);
    if (p) return renderPlDetail(el, p);
    S.openPl = null;
    return renderPlList(el);
  }
  const items = listFor(S.tab);
  if (!items.length) {
    el.innerHTML = `<div class="empty"><small>${{ queue: '佇列是空的', liked: '還沒有收藏的歌曲', history: '還沒有播放紀錄' }[S.tab]}</small></div>`;
    return;
  }
  let head = '';
  if (S.tab === 'queue') head = `<div class="section-title"><span>${items.length} 首${S.repeat === 'all' ? ' · 循環播放' : S.autoRadio ? ' · 自動接推薦歌曲' : ''}</span><span><button id="saveQ">存成歌單</button>　<button id="clearQ">清空</button></span></div>`;
  if (S.tab === 'liked') head = `<div class="section-title"><span>${items.length} 首</span><span><button id="likedToPl">存成歌單</button>　<button id="playAllLiked">全部播放</button></span></div>`;
  el.innerHTML = head + items.map((t, i) => rowHTML(t, i, S.tab)).join('');
}

$('#list').addEventListener('click', e => {
  const id = e.target.id;
  const p = S.openPl && getPl(S.openPl);
  if (id === 'homeRefresh' || id === 'homeRetry') { loadHome(S.homeChip, true); return; }
  if (id === 'pageBack') { closePage(); return; }
  if (id === 'friendAdd') { addFriend(); return; }
  const friend = e.target.closest('[data-friend]');
  if (friend) { const u = S.friends?.[Number(friend.dataset.friend)]; if (u) friendSheet(u); return; }
  const pg = page(), pgItems = pg?.items || [];
  if (id === 'colPlay' && pgItems.length) { playList(pgItems, 0); return; }
  if (id === 'colShuffle' && pgItems.length) {
    S.shuffle = true; persist(); syncModes();
    playList(pgItems, Math.floor(Math.random() * pgItems.length));
    return;
  }
  if (id === 'colSave' && pgItems.length) {
    const np = createPlaylist(pg.title, pgItems);
    toast(`已存成歌單「${np.name}」（${np.tracks.length} 首）`);
    return;
  }
  if (id === 'artistRadio' && pgItems.length) { playList([pgItems[0]], 0, true); return; }
  if (id === 'artistAll' && pg?.allSongs) {
    openPage({ type: 'playlist', id: pg.allSongs, title: `${pg.title} 全部歌曲`, subtitle: '', cover: pgItems[0]?.cover || '' });
    return;
  }
  if (id === 'albumArtist' && pg?.artistId) { openPage({ type: 'artist', id: pg.artistId, title: pg.artist }); return; }
  if (id === 'artistBio') { e.target.classList.toggle('open'); return; }
  const stype = e.target.closest('[data-stype]');
  if (stype) { if (stype.dataset.stype !== searchType) runSearch(searchQ, stype.dataset.stype); return; }
  const chip = e.target.closest('[data-chip]');
  if (chip) { if (chip.dataset.chip !== S.homeChip) loadHome(chip.dataset.chip); return; }
  const card = e.target.closest('[data-card]');
  if (card) {
    const [si, i] = card.dataset.card.split(':').map(Number);
    const item = pageSections()[si]?.items[i];
    if (item?.type === 'song') playList([item], 0, true);
    else if (item) openPage(item);
    return;
  }
  const ent = e.target.closest('[data-ent]');
  if (ent) { const item = S.results[Number(ent.dataset.ent)]; if (item) openPage(item); return; }
  if (id === 'clearQ') { const c = cur(); S.queue = c ? [c] : []; S.index = c ? 0 : -1; persist(); render(); return; }
  if (id === 'saveQ' || id === 'likedToPl') {
    const src = id === 'saveQ' ? S.queue : S.liked;
    const name = prompt('歌單名稱', id === 'saveQ' ? '我的佇列' : '我的收藏');
    if (name && name.trim()) { const np = createPlaylist(name, src); toast(`已建立「${np.name}」（${np.tracks.length} 首）`); }
    return;
  }
  if (id === 'playAllLiked') { playList(S.liked, 0); return; }
  if (id === 'loadMore') { loadMoreResults(); return; }
  if (id === 'plNew') {
    const name = prompt('新歌單名稱');
    if (name && name.trim()) { const np = createPlaylist(name); S.openPl = np.id; S.editPl = false; render(); }
    return;
  }
  if (id === 'plImport') { importPlaylist(); return; }
  if (id === 'plBack') { S.openPl = null; S.editPl = false; render(); return; }
  if (id === 'plPlay') { if (p && p.tracks.length) playList(p.tracks, 0); return; }
  if (id === 'plShuffle') {
    if (p && p.tracks.length) {
      S.shuffle = true; persist(); syncModes();
      playList(p.tracks, Math.floor(Math.random() * p.tracks.length));
    }
    return;
  }
  if (id === 'plEdit') { S.editPl = !S.editPl; render(); return; }
  if (id === 'plMore') { plMenu(p); return; }

  const plRow = e.target.closest('[data-pl]');
  if (plRow) { S.openPl = plRow.dataset.pl; S.editPl = false; render(); window.scrollTo(0, 0); return; }

  const mv = e.target.closest('[data-mv]');
  const rm = e.target.closest('[data-rm]');
  if ((mv || rm) && p) {
    const i = Number(e.target.closest('.row').dataset.i);
    if (rm) p.tracks.splice(i, 1);
    else {
      const j = i + Number(mv.dataset.mv);
      if (j >= 0 && j < p.tracks.length) [p.tracks[i], p.tracks[j]] = [p.tracks[j], p.tracks[i]];
    }
    p.updated = Date.now(); persistLib(); render();
    return;
  }

  const more = e.target.closest('[data-more]');
  const row = e.target.closest('.row');
  if (!row || row.dataset.ctx === 'edit') return;
  const ctx = row.dataset.ctx;
  const i = Number(row.dataset.i);
  const items = listFor(ctx);
  if (!items[i]) return;
  if (more) { openSheet(items[i], ctx, i); return; }
  if (ctx === 'queue') playIndex(i);
  else if (ctx === 'search' || ctx.startsWith('sec:')) playList([items[i]], 0, true);
  else playList(items, i);
});

// track action sheet
function openSheet(t, ctx, i) {
  sheet(`<div class="sheet-title">${esc(t.title)} — ${esc(t.artist)}</div>
    <button data-a="next">下一首播放</button>
    <button data-a="add">加到佇列尾端</button>
    <button data-a="pl">加入歌單…</button>
    <button data-a="radio">以此歌開始電台</button>
    <button data-a="like">${isLiked(t.id) ? '取消收藏' : '加入收藏'}</button>
    ${ctx === 'queue' ? '<button data-a="rmq" class="danger">從佇列移除</button>' : ''}
    ${ctx === 'pl' ? '<button data-a="rmpl" class="danger">從這個歌單移除</button>' : ''}
    <button data-x>取消</button>`, d => {
    const a = d.a;
    if (a === 'next') {
      if (S.index < 0) { S.queue = [cleanT(t)]; playIndex(0); }
      else { S.queue.splice(S.index + 1, 0, cleanT(t)); toast('將在下一首播放'); }
    }
    if (a === 'add') {
      S.queue.push(cleanT(t)); toast('已加到佇列');
      if (S.index < 0) playIndex(S.queue.length - 1);
    }
    if (a === 'pl') { pickPlaylist([t]); return; }
    if (a === 'radio') playList([t], 0, true);
    if (a === 'like') toggleLike(t);
    if (a === 'rmq') {
      S.queue.splice(i, 1);
      if (i < S.index) S.index--;
      else if (i === S.index) { S.index--; next(); }
    }
    if (a === 'rmpl') {
      const p = getPl(S.openPl);
      if (p) { p.tracks.splice(i, 1); p.updated = Date.now(); persistLib(); toast('已從歌單移除'); }
    }
    persist(); render();
  });
}

// tabs
function setTab(tab) {
  S.tab = tab;
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  const tab = b.dataset.tab;
  if (tab === 'playlists' && S.tab === 'playlists') { S.openPl = null; S.editPl = false; }
  if (tab === S.tab && S.pages[tab]) S.pages[tab] = []; // tapping the open tab again returns to its top
  if (tab === 'home' && !S.home && !S.homeBusy) loadHome();
  if (tab === 'users') loadFriends();
  setTab(tab); render(); window.scrollTo(0, 0);
});

// ---------- friends (owner only) ----------
// Each friend gets a link carrying their own code; their liked songs and playlists are kept
// separately on the server. Only the owner's code sees the 朋友 tab.
async function loadMe() {
  try {
    S.me = await api('/api/me');
    $('.tabs button[data-tab="users"]').classList.toggle('hidden', !S.me.owner);
    if (S.tab === 'home' && !page()) render(); // greets a friend by name
  } catch {}
}
async function loadFriends() {
  try { S.friends = (await api('/api/users')).users || []; }
  catch { S.friends = S.friends || []; toast('朋友名單載入失敗'); }
  if (S.tab === 'users') render();
}
const friendLink = u => `${location.origin}/?key=${encodeURIComponent(u.key)}`;
const daysAgo = t => Math.round((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86400000);
const lastUsed = t => (!t ? '還沒用過' : ['今天', '昨天'][daysAgo(t)] || (daysAgo(t) < 7 ? `${daysAgo(t)} 天前` : `${new Date(t).getMonth() + 1}/${new Date(t).getDate()}`));

function renderFriends(el) {
  const F = S.friends;
  const head = `<div class="page-head"><div><div class="eyebrow">分享</div><h1>朋友</h1>
      <p>每位朋友有自己的連結，收藏和歌單各自獨立，互不影響。</p></div></div>
    <div class="pl-actions"><button id="friendAdd" class="primary">＋ 新增朋友</button></div>`;
  const body = !F ? '<div class="spinner"></div>'
    : !F.length ? '<div class="empty"><small>還沒有朋友<br>按「新增朋友」產生他專屬的連結</small></div>'
    : F.map((u, i) => `<div class="row" data-friend="${i}">
        <span class="avatar">${esc([...u.name][0] || '?')}</span>
        <div class="meta"><div class="t1">${esc(u.name)}</div><div class="t2">最近使用：${lastUsed(u.lastSeen)}</div></div>
        <span class="chev">›</span>
      </div>`).join('');
  el.innerHTML = head + body + '<p class="note">播放器重新啟動後網址會改變，到時再從這裡把新連結傳給朋友。</p>';
}

async function addFriend() {
  const name = prompt('朋友的名字');
  if (!name || !name.trim()) return;
  try {
    const u = await api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) });
    S.friends = [...(S.friends || []), u];
    render();
    friendSheet(u, true);
  } catch { toast('新增失敗'); }
}
function copyText(text) {
  if (!navigator.clipboard) { prompt('複製這個連結', text); return; }
  navigator.clipboard.writeText(text).then(() => toast('已複製連結'), () => prompt('複製這個連結', text));
}
function friendSheet(u, isNew = false) {
  const link = friendLink(u);
  sheet(`<div class="sheet-title">${isNew ? `已新增「${esc(u.name)}」，把連結傳給他：` : `${esc(u.name)} 的連結`}<div class="link-text">${esc(link)}</div></div>
    ${navigator.share ? '<button data-a="share" class="accent">分享連結…</button>' : ''}
    <button data-a="copy">複製連結</button>
    <button data-a="reset">重設連結（舊連結會失效）</button>
    <button data-a="del" class="danger">刪除朋友</button>
    <button data-x>取消</button>`, async d => {
    if (d.a === 'share') navigator.share({ title: 'Vedia Music', text: `${u.name}，這是你的 Vedia Music 連結`, url: link }).catch(() => {});
    if (d.a === 'copy') copyText(link);
    if (d.a === 'reset' && confirm(`重設「${u.name}」的連結？舊連結會立刻失效，要把新連結再傳給他。`)) {
      try {
        Object.assign(u, await api(`/api/users/${u.id}/reset`, { method: 'POST' }));
        render(); toast('已產生新連結'); friendSheet(u);
      } catch { toast('重設失敗'); }
    }
    if (d.a === 'del' && confirm(`刪除「${u.name}」？他的連結會失效，收藏和歌單也會一起刪除。`)) {
      try {
        await api(`/api/users/${u.id}`, { method: 'DELETE' });
        S.friends = S.friends.filter(x => x !== u);
        render(); toast(`已刪除「${u.name}」`);
      } catch { toast('刪除失敗'); }
    }
  });
}

// ---------- pages: playlist / album / artist ----------
// Opened on top of the home or search tab (from anywhere else, on search); back returns to
// the page underneath at the scroll position it was left at.
async function openPage(item) {
  if (S.tab !== 'home' && S.tab !== 'search') setTab('search');
  const p = { ...item, items: null, y: window.scrollY };
  S.pages[S.tab].push(p);
  render(); window.scrollTo(0, 0);
  try {
    const d = await api(`/api/${item.type}/${encodeURIComponent(item.id)}`);
    p.items = (d.items || []).map(cleanT);
    p.title = p.title || d.name || '';
    if (item.type === 'album') Object.assign(p, { artist: d.artist, artistId: d.artistId, cover: p.cover || d.cover });
    if (item.type === 'artist') {
      Object.assign(p, { title: d.name || p.title, description: d.description, listeners: d.listeners, subscribers: d.subscribers, banner: d.banner, allSongs: d.allSongs, sections: d.sections || [] });
    }
  } catch {
    p.items = []; p.failed = true;
  }
  if (page() === p) render();
}
function closePage() {
  const p = S.pages[S.tab]?.pop();
  render(); window.scrollTo(0, p?.y || 0);
}
const backHTML = () => `<button id="pageBack" class="link back">‹ 返回</button>`;

function renderCollection(el, c) {
  const items = c.items || [];
  const total = items.reduce((a, t) => a + (t.duration || 0), 0);
  const info = c.items ? `${items.length} 首${total ? ' · ' + Math.round(total / 60) + ' 分鐘' : ''}` : '';
  const head = `<div class="col-head">
      ${backHTML()}
      <div class="col-top">
        <img class="col-cover" src="${esc(c.cover)}" alt="" onerror="this.style.visibility='hidden'">
        <div class="col-meta">
          <div class="eyebrow">${KIND[c.type] || ''}</div>
          <div class="col-title">${esc(c.title)}</div>
          ${c.artistId ? `<button id="albumArtist" class="link">${esc(c.artist)} ›</button>` : c.subtitle ? `<div class="t2 wrap">${esc(c.subtitle)}</div>` : ''}
          <div class="t2">${info}</div>
        </div>
      </div>
      ${items.length ? '<div class="pl-actions"><button id="colPlay" class="primary">▶ 播放</button><button id="colShuffle">隨機播放</button><button id="colSave">存成歌單</button></div>' : ''}
    </div>`;
  const body = !c.items ? '<div class="spinner"></div>'
    : items.length ? items.map((t, i) => rowHTML(t, i, 'col')).join('')
    : `<div class="empty"><small>${c.failed ? '載入失敗，請稍後再試' : '這裡沒有可以播放的歌曲'}</small></div>`;
  el.innerHTML = head + body;
}

function renderArtist(el, a) {
  const stats = [a.listeners, a.subscribers && `${a.subscribers} 位訂閱者`].filter(Boolean).join(' · ');
  const hero = `<div class="artist-hero"${a.banner ? ` style="background-image:url('${esc(a.banner)}')"` : ''}>
      ${backHTML()}
      <div class="artist-name"><div class="eyebrow">歌手</div><h1>${esc(a.title)}</h1>${stats ? `<div class="t2">${esc(stats)}</div>` : ''}</div>
    </div>`;
  if (!a.items) { el.innerHTML = hero + '<div class="spinner"></div>'; return; }
  if (!a.items.length && !a.sections?.length) {
    el.innerHTML = hero + `<div class="empty"><small>${a.failed ? '載入失敗，請稍後再試' : '這位歌手沒有可以播放的歌曲'}</small></div>`;
    return;
  }
  el.innerHTML = hero
    + (a.description ? `<p id="artistBio" class="artist-bio">${esc(a.description)}</p>` : '')
    + (a.items.length ? '<div class="pl-actions"><button id="colPlay" class="primary">▶ 播放</button><button id="colShuffle">隨機播放</button><button id="artistRadio">電台</button></div>' : '')
    + (a.items.length ? `<section class="shelf"><div class="shelf-head"><h2>熱門歌曲</h2></div>${a.items.map((t, i) => rowHTML(t, i, 'col')).join('')}${a.allSongs ? '<button id="artistAll" class="ghost-btn more-btn">全部歌曲 ›</button>' : ''}</section>` : '')
    + (a.sections || []).map(shelfHTML).join('');
}

// Now playing → the artist's page (a track only carries the artist's name, so look it up).
async function openArtistByName(name) {
  const q = String(name || '').split(/\s*[,、&/]\s*/)[0];
  if (!q) return;
  try {
    const d = await api('/api/search?' + new URLSearchParams({ q, type: 'artists' }));
    const a = d.items?.[0];
    if (!a) { toast('找不到這位歌手'); return; }
    if (full.classList.contains('open')) $('#fullClose').click();
    openPage(a);
  } catch { toast('找不到這位歌手'); }
}

// ---------- home ----------
// YouTube Music's home page (Taiwan, signed out): mood chips plus shelves of quick picks,
// playlists and new releases. Playlists / albums / artists open as a collection page.
const KIND = { song: '歌曲', playlist: '歌單', album: '專輯', artist: '歌手' };
const greeting = () => { const h = new Date().getHours(); return h >= 5 && h < 11 ? '早安' : h >= 11 && h < 18 ? '午安' : '晚安'; };
let homeSeq = 0;

async function loadHome(params = S.homeChip, fresh = false) {
  const seq = ++homeSeq;
  S.homeChip = params;
  S.homeBusy = true;
  if (S.tab === 'home' && !page()) render();
  try {
    const q = new URLSearchParams({ params });
    if (fresh) q.set('fresh', '1');
    const d = await api('/api/home?' + q);
    if (seq !== homeSeq) return;
    S.home = { chips: d.chips?.length ? d.chips : S.home?.chips || [], sections: d.sections || [] };
  } catch {
    if (seq !== homeSeq) return;
    toast('首頁載入失敗，請稍後再試');
    S.home = { chips: S.home?.chips || [], sections: [] };
  } finally {
    if (seq === homeSeq) S.homeBusy = false;
  }
  if (S.tab === 'home' && !page()) render();
}

function cardHTML(t, si, i) {
  const playing = t.type === 'song' && cur()?.id === t.id ? ' playing' : '';
  return `<button class="card${playing}" data-card="${si}:${i}">
    <img loading="lazy"${t.type === 'artist' ? ' class="round"' : ''} src="${esc(t.cover)}" alt="" onerror="this.style.visibility='hidden'">
    <span class="ct">${esc(t.title)}</span>
    <span class="cs">${esc(t.subtitle || t.artist || KIND[t.type] || '')}</span>
  </button>`;
}
function shelfHTML(s, si) {
  const head = `<div class="shelf-head">${s.subtitle ? `<small>${esc(s.subtitle)}</small>` : ''}<h2>${esc(s.title)}</h2></div>`;
  const body = s.layout === 'rows'
    ? `<div class="shelf-rows" data-shelf style="grid-template-rows:repeat(${Math.min(4, s.items.length)},auto)">${s.items.map((t, i) => rowHTML(t, i, 'sec:' + si)).join('')}</div>`
    : `<div class="shelf-cards" data-shelf>${s.items.map((t, i) => cardHTML(t, si, i)).join('')}</div>`;
  return `<section class="shelf">${head}${body}</section>`;
}
function renderHome(el) {
  const H = S.home;
  const chips = H?.chips?.length ? [{ title: '全部', params: '' }, ...H.chips] : [];
  let body;
  if (!H || S.homeBusy) body = '<div class="spinner"></div>';
  else if (!H.sections.length) body = '<div class="empty"><small>首頁暫時載入不了</small><br><button id="homeRetry" class="ghost-btn">再試一次</button></div>';
  else body = H.sections.map(shelfHTML).join('');
  el.innerHTML = `<div class="page-head">
      <div><div class="eyebrow">Vedia Music</div><h1>${greeting()}${S.me?.name ? '，' + esc(S.me.name) : ''}</h1><p>今天想聽點什麼？</p></div>
      <button id="homeRefresh" class="ghost-btn">重新整理</button>
    </div>
    ${chips.length ? `<div class="chip-row">${chips.map(c => `<button class="chip${c.params === S.homeChip ? ' on' : ''}" data-chip="${esc(c.params)}">${esc(c.title)}</button>`).join('')}</div>` : ''}
    ${body}`;
}

// ---------- search ----------
// One result type at a time (songs, videos, albums, artists, playlists), 20 per page; nearing the
// end of the list (or tapping 載入更多結果) loads the next page.
const MAX_RESULTS = 400;
const SEARCH_TYPES = [['songs', '歌曲'], ['videos', '影片'], ['albums', '專輯'], ['artists', '歌手'], ['playlists', '歌單']];
let searchQ = '', searchType = 'songs', searchNext = null, searchSeq = 0, searchBusy = false, moreBusy = false;
const moreObs = 'IntersectionObserver' in window
  ? new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) loadMoreResults(); }, { rootMargin: '0px 0px 400px 0px' })
  : null;

$('#searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  if (!q) return;
  $('#searchInput').blur();
  setTab('search');
  window.scrollTo(0, 0);
  runSearch(q, 'songs');
});

async function runSearch(q, type) {
  const seq = ++searchSeq;
  searchQ = q; searchType = type; searchNext = null; S.results = []; S.pages.search = [];
  searchBusy = true;
  if (S.tab === 'search') render();
  try {
    const d = await api('/api/search?' + new URLSearchParams({ q, type }));
    if (seq !== searchSeq) return;
    S.results = d.items || [];
    searchNext = d.next || null;
  } catch {
    if (seq !== searchSeq) return;
    toast('搜尋失敗，請稍後再試');
  } finally {
    if (seq === searchSeq) searchBusy = false;
  }
  if (S.tab === 'search' && !page()) render();
}

// albums, artists and playlists open a page instead of playing
function entityRowHTML(t, i) {
  return `<div class="row" data-ent="${i}">
    <img loading="lazy"${t.type === 'artist' ? ' class="round"' : ''} src="${esc(t.cover)}" alt="" onerror="this.style.visibility='hidden'">
    <div class="meta"><div class="t1">${esc(t.title)}</div><div class="t2">${esc(t.subtitle || KIND[t.type] || '')}</div></div>
    <span class="chev">›</span>
  </div>`;
}
function renderSearch(el) {
  if (!searchQ) {
    el.innerHTML = `<div class="empty"><img src="/icons/icon-192.png" alt=""><p>MUSIC LIVES HERE</p><small>輸入歌名或歌手開始聽歌</small></div>`;
    return;
  }
  const types = `<div class="chip-row">${SEARCH_TYPES.map(([k, label]) => `<button class="chip${k === searchType ? ' on' : ''}" data-stype="${k}">${label}</button>`).join('')}</div>`;
  let body;
  if (searchBusy) body = '<div class="spinner"></div>';
  else if (!S.results.length) body = '<div class="empty"><small>找不到結果，換個關鍵字或分類試試</small></div>';
  else body = S.results.map((t, i) => (t.type && t.type !== 'song' ? entityRowHTML(t, i) : rowHTML(t, i, 'search'))).join('')
    + (searchNext ? '<div id="moreResults" class="more-results"><button id="loadMore">載入更多結果</button></div>' : '');
  el.innerHTML = types + body;
  const more = $('#moreResults');
  if (more) moreObs?.observe(more);
}

async function loadMoreResults() {
  if (!searchNext || moreBusy) return;
  moreBusy = true;
  const seq = searchSeq;
  const btn = $('#loadMore');
  if (btn) { btn.disabled = true; btn.textContent = '載入中…'; }
  try {
    const d = await api('/api/search?' + new URLSearchParams({ q: searchQ, type: searchType, next: searchNext }));
    if (seq !== searchSeq) return;
    const have = new Set(S.results.map(x => x.id));
    const fresh = (d.items || []).filter(x => !have.has(x.id));
    S.results.push(...fresh);
    // stop at a page with nothing new (YouTube repeating itself) or a very long list
    searchNext = fresh.length && S.results.length < MAX_RESULTS ? d.next || null : null;
    if (S.tab === 'search' && !page()) render();
  } catch {
    if (seq !== searchSeq) return;
    toast('載入更多失敗，請再試一次');
    if (btn) { btn.disabled = false; btn.textContent = '載入更多結果'; }
  } finally {
    moreBusy = false;
  }
}

// ---------- playback ----------
let loadToken = 0;
// radio=true: search/radio mode, keeps adding recommended songs after the queue ends.
// Playing a playlist / liked / history keeps exactly those songs.
function playList(list, i, radio = false) {
  S.queue = list.map(cleanT);
  S.autoRadio = radio;
  radioGen++;
  playIndex(i);
  if (radio) fillRadio(list[i].id); // a new radio starts with recommendations even when looping
}

// Appends recommended songs. One request at a time: two overlapping fills used to race, and the
// one that cleared the rest of the queue could land last and leave only the current song.
// radioGen changes with every new list, so a fill still loading for the old list is dropped.
let radioGen = 0, radioFill = null;
function fillRadio(id) {
  if (radioFill?.gen === radioGen) return radioFill.p;
  const gen = radioGen;
  const p = (async () => {
    try {
      const d = await api('/api/upnext/' + id);
      if (gen !== radioGen) return;
      const have = new Set(S.queue.map(x => x.id));
      S.queue.push(...(d.items || []).filter(x => !have.has(x.id)));
      persist();
      if (S.tab === 'queue') render();
      prefetchNext();
    } catch {
    } finally {
      if (radioFill?.p === p) radioFill = null;
    }
  })();
  radioFill = { gen, p };
  return p;
}

function playIndex(i) {
  if (i < 0 || i >= S.queue.length) return;
  S.index = i;
  const t = cur();
  const token = ++loadToken;
  S.history = [t, ...S.history.filter(x => x.id !== t.id)].slice(0, 100);
  persist();
  updateMeta(t);
  status('載入中…');
  audio.preload = 'auto';
  audio.src = withKey('/api/stream/' + t.id);
  audio.play().catch(err => { if (token === loadToken && err.name === 'NotAllowedError') status('點一下播放鍵開始'); });
  loadLyrics(t, token);
  render();
  // looping the whole queue means playing it again, not growing it with recommendations
  if (S.autoRadio && S.repeat !== 'all' && S.queue.length - S.index <= 3) fillRadio(t.id);
  prefetchNext();
}

// The next song must already be on the server when this one ends. With the screen locked, iOS
// suspends the page a moment after the sound stops: a next song that still has to be fetched from
// YouTube (several seconds), or one that turns out to be unplayable, leaves the player silent until
// the app is opened again. So the next song is picked in advance — also in shuffle — and prepared
// while this one plays, and songs the server can't play are skipped before their turn comes.
const badIds = new Map(); // id -> time until which it's skipped
const isBad = id => (badIds.get(id) || 0) > Date.now();
const markBad = id => badIds.set(id, Date.now() + 10 * 60 * 1000);
let shufflePick = null; // {from, i, id}: the shuffle choice for after the current song
function chooseNext() {
  const n = S.queue.length;
  const ok = i => i !== S.index && !isBad(S.queue[i].id);
  if (S.shuffle && n > 1) {
    const c = [...Array(n).keys()].filter(ok);
    return c.length ? c[Math.floor(Math.random() * c.length)] : -1;
  }
  for (let i = S.index + 1; i < n; i++) if (ok(i)) return i;
  if (S.repeat === 'all') for (let i = 0; i < S.index; i++) if (ok(i)) return i;
  return -1;
}
function nextIndex() {
  if (!S.shuffle) return chooseNext(); // in order: follows queue edits as they happen
  const p = shufflePick;
  if (p && p.from === S.index && S.queue[p.i]?.id === p.id && !isBad(p.id)) return p.i;
  const i = chooseNext();
  shufflePick = i < 0 ? null : { from: S.index, i, id: S.queue[i].id };
  return i;
}
const prepared = new Set();
function prefetchNext() {
  const i = nextIndex();
  if (i < 0) return;
  const id = S.queue[i].id;
  if (prepared.has(id)) return;
  prepared.add(id);
  fetch(withKey('/api/prepare/' + id)).then(r => {
    if (r.ok) return;
    prepared.delete(id);
    if (r.status === 502) { markBad(id); prefetchNext(); } // unplayable: pick and prepare another
  }).catch(() => prepared.delete(id));
}

function next(auto = false) {
  if (!S.queue.length) return;
  if (auto && S.repeat === 'one') { audio.currentTime = 0; audio.play(); return; }
  const i = nextIndex();
  if (i >= 0) { playIndex(i); return; }
  if (S.autoRadio && S.repeat !== 'all') {
    // radio: recommendations still loading (or the last fetch failed) — get them, then go on
    const at = S.index;
    status('載入推薦歌曲…');
    fillRadio(cur().id).then(() => {
      if (S.index !== at) return;
      const j = nextIndex();
      if (j >= 0) playIndex(j); else status('佇列已播完');
    });
    return;
  }
  status('佇列已播完');
}
function prev() {
  if (audio.currentTime > 4 || S.index <= 0) { audio.currentTime = 0; return; }
  playIndex(S.index - 1);
}
function togglePlay() {
  if (!audio.src) { if (cur()) playIndex(S.index); return; }
  audio.paused ? audio.play() : audio.pause();
}

audio.addEventListener('play', syncPlayIcons);
audio.addEventListener('pause', syncPlayIcons);
// also covers resuming a restored session with the play button, which doesn't go through playIndex
audio.addEventListener('playing', () => { status(''); prefetchNext(); });
audio.addEventListener('waiting', () => status('緩衝中…'));
audio.addEventListener('ended', () => next(true));
audio.addEventListener('error', () => {
  if (!audio.src) return;
  if (cur()) markBad(cur().id);
  status('這首歌無法播放，跳到下一首');
  toast('無法播放：' + (cur()?.title || ''));
  // straight away: a timer may not run again while the screen is locked
  next();
});
audio.addEventListener('loadedmetadata', () => { $('#tDur').textContent = fmt(dur()); updatePosition(); });

function syncPlayIcons() {
  const p = audio.paused ? 'play' : 'pause';
  setIcon($('#playBtn'), p); setIcon($('#miniPlay'), p);
  // a song ending on its own also fires "pause"; telling iOS "paused" then can end the background
  // audio session before the next song starts, so the lock screen keeps saying "playing"
  if (audio.ended && (S.repeat === 'one' || S.autoRadio || nextIndex() >= 0)) return;
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
}

// ---------- progress ----------
// Track length for the UI. The server remuxes YouTube audio so browsers time it correctly, but a track
// that still arrives as YouTube's fragmented m4a makes iOS Safari report about twice its length (the
// extra half is silence), so a reported length far past the catalogue's is replaced by the catalogue's.
function dur() {
  const d = audio.duration, known = cur()?.duration || 0;
  if (!d || !isFinite(d)) return known;
  return known && d > known * 1.5 ? known : d;
}
let seeking = false;
audio.addEventListener('timeupdate', () => {
  const d = dur();
  const c = audio.currentTime;
  const p = d ? (c / d) * 100 : 0;
  $('#miniBar').style.width = p + '%';
  if (!seeking) { $('#seek').value = d ? Math.round((c / d) * 1000) : 0; $('#seek').style.setProperty('--p', p + '%'); }
  $('#tCur').textContent = fmt(c);
  syncLyrics(c);
  // inflated length (see dur): the real audio is over, skip the silent remainder
  if (d && d < audio.duration - 5 && c > d + 1 && !audio.paused) next(true);
});
const seek = $('#seek');
seek.addEventListener('input', () => {
  seeking = true;
  $('#tCur').textContent = fmt((seek.value / 1000) * dur());
  seek.style.setProperty('--p', seek.value / 10 + '%');
});
seek.addEventListener('change', () => {
  const d = dur();
  if (d) audio.currentTime = (seek.value / 1000) * d;
  seeking = false;
});

// ---------- now playing UI ----------
function updateMeta(t) {
  $('#mini').classList.remove('hidden');
  $('#miniCover').src = t.cover; $('#fullCover').src = t.cover;
  $('#fullBg').style.backgroundImage = `url("${t.cover}")`;
  $('#miniTitle').textContent = t.title; $('#fullTitle').textContent = t.title;
  $('#miniArtist').textContent = t.artist; $('#fullArtist').textContent = t.artist + (t.album ? ' · ' + t.album : '');
  $('#focusCover').src = t.cover; $('#focusTitle').textContent = t.title; $('#focusArtist').textContent = t.artist;
  $('#tCur').textContent = '0:00'; $('#tDur').textContent = fmt(t.duration);
  themeFromArtwork(t.cover);
  syncLike();
  document.title = `${t.title} · Vedia Music`;
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title, artist: t.artist, album: t.album || 'Vedia Music',
      artwork: [
        { src: t.cover.replace(/=w\d+-h\d+/, '=w256-h256'), sizes: '256x256', type: 'image/jpeg' },
        { src: t.cover, sizes: '544x544', type: 'image/jpeg' },
      ],
    });
  }
}
function updatePosition() {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  try {
    const d = dur();
    if (d) navigator.mediaSession.setPositionState({ duration: d, position: Math.min(audio.currentTime, d), playbackRate: audio.playbackRate });
  } catch {}
}
audio.addEventListener('seeked', updatePosition);
audio.addEventListener('play', updatePosition);

// Lock screen / Control Center buttons. iOS (WebKit) forgets handlers registered before the page is
// "Now Playing", and again whenever playback restarts (first play, a new song); without previous /
// next it falls back to ±10 s. So they are registered again each time playback starts, and the seek
// actions are cleared explicitly (skipping 10 s lives in the player instead).
function registerMediaActions() {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  const h = (a, f) => { try { ms.setActionHandler(a, f); } catch {} };
  h('play', () => audio.play());
  h('pause', () => audio.pause());
  h('previoustrack', () => prev());
  h('nexttrack', () => next());
  h('seekto', d => { audio.currentTime = d.seekTime; updatePosition(); });
  h('seekforward', null);
  h('seekbackward', null);
}
registerMediaActions();
audio.addEventListener('playing', registerMediaActions);
audio.addEventListener('loadedmetadata', registerMediaActions);
window.addEventListener('pageshow', registerMediaActions);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') registerMediaActions(); });

// like
function toggleLike(t = cur()) {
  if (!t) return;
  if (isLiked(t.id)) { S.liked = S.liked.filter(x => x.id !== t.id); toast('已取消收藏'); }
  else { S.liked.unshift(cleanT(t)); toast('已加入收藏'); }
  persistLib(); syncLike(); if (S.tab === 'liked') render();
}
function syncLike() {
  const t = cur(); const on = t && isLiked(t.id);
  setIcon($('#likeBtn'), on ? 'heart' : 'heartO');
  $('#likeBtn').classList.toggle('liked', !!on);
}

// full player open/close
const full = $('#full');
const openFull = () => { full.classList.add('open'); full.setAttribute('aria-hidden', 'false'); history.pushState({ full: 1 }, ''); startKaraoke(); };
const closeFull = () => { setFocus(false); full.classList.remove('open'); full.setAttribute('aria-hidden', 'true'); };
$('#fullArtist').onclick = () => openArtistByName(cur()?.artist);
$('#miniOpen').onclick = openFull;
$('#miniCover').onclick = openFull;
$('#fullClose').onclick = () => (history.state?.full ? history.back() : closeFull());
window.addEventListener('popstate', () => { if (full.classList.contains('open')) closeFull(); });
// swipe down to close
let ty = null;
full.addEventListener('touchstart', e => { if (!e.target.closest('.lyrics, #seek')) ty = e.touches[0].clientY; }, { passive: true });
full.addEventListener('touchend', e => { if (ty !== null && e.changedTouches[0].clientY - ty > 110) $('#fullClose').click(); ty = null; }, { passive: true });

document.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b));
  $('#viewCover').classList.toggle('on', b.dataset.view === 'cover');
  $('#viewLyrics').classList.toggle('on', b.dataset.view === 'lyrics');
  lastLine = -2; syncLyrics(audio.currentTime); startKaraoke();
});

// controls
setIcon($('#fullClose'), 'down');
setIcon($('#prevBtn'), 'prev'); setIcon($('#nextBtn'), 'next'); setIcon($('#miniNext'), 'next');
setIcon($('#back10Btn'), 'back10'); setIcon($('#fwd10Btn'), 'fwd10');
setIcon($('#addPlBtn'), 'plAdd');
const REPEAT_LABEL = { off: '循環：關', all: '循環：全部', one: '循環：單曲' };
const syncModes = () => {
  $('#shuffleBtn').innerHTML = `${I.shuffle}<span>隨機：${S.shuffle ? '開' : '關'}</span>`;
  $('#shuffleBtn').classList.toggle('on', S.shuffle);
  $('#repeatBtn').innerHTML = `${I[S.repeat === 'one' ? 'repeat1' : 'repeat']}<span>${REPEAT_LABEL[S.repeat]}</span>`;
  $('#repeatBtn').classList.toggle('on', S.repeat !== 'off');
  audio.loop = S.repeat === 'one'; // the browser restarts the song itself, also behind the lock screen
};
const skipBy = s => {
  if (!audio.src) return;
  audio.currentTime = Math.max(0, Math.min(dur() || Infinity, audio.currentTime + s));
  updatePosition();
};
$('#back10Btn').onclick = () => skipBy(-10);
$('#fwd10Btn').onclick = () => skipBy(10);
$('#playBtn').onclick = togglePlay; $('#miniPlay').onclick = togglePlay;
$('#nextBtn').onclick = () => next(); $('#miniNext').onclick = () => next();
$('#prevBtn').onclick = prev;
$('#likeBtn').onclick = () => toggleLike();
$('#addPlBtn').onclick = () => { if (cur()) pickPlaylist([cur()]); };
$('#shuffleBtn').onclick = () => { S.shuffle = !S.shuffle; persist(); syncModes(); toast(S.shuffle ? '隨機播放：開' : '隨機播放：關'); };
$('#repeatBtn').onclick = () => {
  S.repeat = { off: 'all', all: 'one', one: 'off' }[S.repeat]; persist(); syncModes();
  toast({ off: '循環播放：關', all: S.autoRadio ? '循環播放目前的佇列（不再自動加入推薦歌曲）' : '循環播放整個佇列', one: '單曲循環' }[S.repeat]);
  if (S.tab === 'queue') render();
};

// ---------- lyrics ----------
// /api/lyrics picks the best of several sources and returns timed lines, word timings when the
// source has them (karaoke), the source's own translation when it has one, and every version it
// found; a version chosen in the 來源 sheet is remembered per song.
let lastLine = -2;
let userScrollUntil = 0;
const lyricPicks = store.get('lyricPicks', {}); // track id -> chosen lyrics version
const LYRIC_KIND = { word: '逐字', line: '逐行', plain: '純文字' };
const LYRIC_SOURCE_SHORT = { netease: '網易雲', kugou: '酷狗', better: 'Apple', lrclib: 'LRCLIB' }; // for the narrow button

async function loadLyrics(t, token) {
  S.lyrics = null; lastLine = -2;
  $('#lyrics').innerHTML = '<div class="spinner"></div>';
  $('#miniLyric').innerHTML = '';
  syncOffset(); syncLyricSource();
  try {
    const q = new URLSearchParams({ title: t.title, artist: t.artist, album: t.album || '', duration: t.duration || '' });
    if (lyricPicks[t.id]) q.set('pick', lyricPicks[t.id]);
    const d = await api('/api/lyrics?' + q);
    if (token !== loadToken) return;
    // id = the track (translations check it); version = which lyrics version this is
    S.lyrics = { ...d, version: d.id, id: t.id, lines: d.lines || [], options: d.options || [], hasTr: (d.lines || []).some(l => l.tr) };
  } catch {
    if (token === loadToken) S.lyrics = { id: t.id, kind: 'none', lines: [], plain: '', options: [] };
  }
  renderLyrics(); syncLyricSource();
  if (S.translate) translateLyrics();
}

function lineHTML(l, i) {
  const words = l.w ? l.w.map(w => `<span class="w">${esc(w[2])}</span>`).join('') : esc(l.text);
  return `<div class="ly${l.w ? ' kara' : ''}" data-i="${i}">${words || '♪'}${S.translate && l.tr ? `<span class="tr">${esc(l.tr)}</span>` : ''}</div>`;
}
function renderLyrics() {
  const L = S.lyrics, box = $('#lyrics');
  if (!L) return;
  if (L.lines.length) box.innerHTML = L.lines.map(lineHTML).join('');
  else if (L.plain) box.innerHTML = `<div class="ly-plain">${esc(L.plain)}</div>`;
  else box.innerHTML = '<div class="ly-none">這首歌暫時沒有歌詞</div>';
  lastLine = -2; syncLyrics(audio.currentTime); startKaraoke();
}
$('#lyrics').addEventListener('click', e => {
  const l = e.target.closest('.ly'); if (!l || !S.lyrics?.lines.length) return;
  audio.currentTime = Math.max(0, S.lyrics.lines[l.dataset.i].t - offset());
});

const offset = () => (cur() && S.offsets[cur().id]) || 0;
function syncOffset() { $('#offVal').textContent = (offset() >= 0 ? '+' : '') + offset().toFixed(1) + 's'; }
function bumpOffset(d) {
  const t = cur(); if (!t) return;
  S.offsets[t.id] = Math.round((offset() + d) * 10) / 10;
  if (!S.offsets[t.id]) delete S.offsets[t.id];
  persist(); syncOffset(); lastLine = -2; syncLyrics(audio.currentTime);
}
$('#offMinus').onclick = () => bumpOffset(-0.5);
$('#offPlus').onclick = () => bumpOffset(0.5);

$('#lyrics').addEventListener('touchmove', () => { userScrollUntil = Date.now() + 3000; }, { passive: true });
$('#lyrics').addEventListener('wheel', () => { userScrollUntil = Date.now() + 3000; }, { passive: true });

let karaokeLine = null, karaokeWords = []; // the current line's element and word spans
function syncLyrics(time) {
  const L = S.lyrics;
  if (!L || !L.lines.length) { $('#miniLyric').innerHTML = ''; karaokeLine = null; return; }
  const t = time + offset() + 0.15;
  let lo = 0, hi = L.lines.length - 1, idx = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (L.lines[m].t <= t) { idx = m; lo = m + 1; } else hi = m - 1; }
  if (idx === lastLine) return;
  lastLine = idx;
  const box = $('#lyrics');
  box.querySelectorAll('.ly.on').forEach(x => x.classList.remove('on'));
  const line = L.lines[idx];
  $('#miniLyric').innerHTML = line ? `${esc(line.text)}${S.translate && line.tr ? `<small>${esc(line.tr)}</small>` : ''}` : '';
  karaokeLine = null; karaokeWords = [];
  if (idx < 0) return;
  const el = box.querySelector(`.ly[data-i="${idx}"]`);
  if (!el) return;
  el.classList.add('on');
  if (line.w) { karaokeLine = line; karaokeWords = [...el.querySelectorAll('.w')]; }
  if (Date.now() > userScrollUntil && $('#viewLyrics').classList.contains('on'))
    box.scrollTo({ top: el.offsetTop - box.clientHeight * (full.classList.contains('focus') ? 0.32 : 0.38), behavior: 'smooth' });
}

// Karaoke: every frame while the lyrics are on screen, fill each word of the current line as far as
// it has been sung (timeupdate only fires ~4×/s, too coarse for a word).
let karaokeRaf = 0;
function karaokeFrame() {
  karaokeRaf = 0;
  if (audio.paused || !full.classList.contains('open') || !$('#viewLyrics').classList.contains('on')) return;
  const t = audio.currentTime + offset();
  syncLyrics(audio.currentTime);
  if (karaokeLine) {
    karaokeLine.w.forEach((w, j) => {
      const p = t <= w[0] ? 0 : t >= w[1] ? 100 : ((t - w[0]) / (w[1] - w[0])) * 100;
      karaokeWords[j]?.style.setProperty('--p', p.toFixed(1) + '%');
    });
  }
  karaokeRaf = requestAnimationFrame(karaokeFrame);
}
function startKaraoke() { if (!karaokeRaf && S.lyrics?.kind === 'word') karaokeRaf = requestAnimationFrame(karaokeFrame); }
audio.addEventListener('play', startKaraoke);
audio.addEventListener('seeked', () => { lastLine = -2; syncLyrics(audio.currentTime); });

// source picker: every version the server found, the current one highlighted
function syncLyricSource() {
  const L = S.lyrics;
  $('#lySource').textContent = !L ? '歌詞' : L.kind === 'none' ? '沒有歌詞' : `${LYRIC_SOURCE_SHORT[L.source] || L.sourceName || '歌詞'} · ${LYRIC_KIND[L.kind] || ''}`;
}
$('#lySource').onclick = () => {
  const L = S.lyrics, t = cur();
  if (!L || !t) return;
  const rows = L.options.map((o, i) => `<button data-o="${i}"${o.id === L.version ? ' class="accent"' : ''}>${esc(o.sourceName)} · ${LYRIC_KIND[o.kind] || ''}${o.id === L.version ? '（使用中）' : ''}
      <small class="block">${esc(o.title)}${o.artist ? ' — ' + esc(o.artist) : ''}${o.duration ? ' · ' + fmt(o.duration) : ''}</small></button>`).join('');
  sheet(`<div class="sheet-title">選擇歌詞版本</div><div class="sheet-scroll">${rows || '<div class="sheet-title">找不到其他版本</div>'}</div><button data-x>取消</button>`, d => {
    const o = L.options[Number(d.o)];
    if (!o || o.id === L.version) return;
    lyricPicks[t.id] = o.id;
    const ids = Object.keys(lyricPicks);
    if (ids.length > 300) delete lyricPicks[ids[0]];
    store.set('lyricPicks', lyricPicks);
    loadLyrics(t, loadToken);
  });
};

// full-screen lyrics: only the lyrics, bigger, with the essential controls; keeps the screen awake
let wakeLock = null;
async function setFocus(on) {
  full.classList.toggle('focus', on);
  setIcon($('#lyFocus'), on ? 'collapse' : 'expand');
  if (on) {
    document.querySelector('.seg button[data-view="lyrics"]').click();
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
  } else {
    wakeLock?.release?.().catch(() => {}); wakeLock = null;
  }
  lastLine = -2; syncLyrics(audio.currentTime);
}
setIcon($('#lyFocus'), 'expand'); setIcon($('#focusExit'), 'collapse');
$('#lyFocus').onclick = () => setFocus(!full.classList.contains('focus'));
$('#focusExit').onclick = () => setFocus(false);
document.addEventListener('visibilitychange', async () => {
  // the browser drops the wake lock when the app is hidden; take it again on return
  if (document.visibilityState === 'visible' && full.classList.contains('focus') && !wakeLock) {
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
  }
});

// translation: the source's own when it has one, otherwise machine translation (Google)
async function translateLyrics() {
  const L = S.lyrics;
  if (!L || !L.lines.length || L.hasTr || L.translated) return;
  const id = L.id;
  const src = L.lines.map(l => l.text || '');
  const all = src.join('');
  const cjk = all.match(/[一-鿿]/g)?.length || 0;
  const kana = all.match(/[぀-ヿ가-힯]/g)?.length || 0;
  if (cjk > all.length * 0.5 && !kana) { toast('歌詞已是中文'); return; }
  status('翻譯中…');
  try {
    const d = await api('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: src, to: 'zh-TW' }) });
    if (!S.lyrics || S.lyrics.id !== id) return;
    d.lines.forEach((tr, i) => { if (L.lines[i] && tr && tr !== L.lines[i].text) L.lines[i].tr = tr; });
    L.translated = true;
    renderLyrics();
  } catch { toast('翻譯失敗'); }
  status('');
}
$('#transBtn').onclick = () => {
  S.translate = !S.translate; persist();
  $('#transBtn').classList.toggle('on', S.translate);
  if (S.translate) translateLyrics();
  renderLyrics();
};

// ---------- boot ----------
syncModes();
syncLike();
setIcon($('#playBtn'), 'play'); setIcon($('#miniPlay'), 'play');
$('#transBtn').classList.toggle('on', S.translate);
if (cur()) {
  // restore last session without autoplay (browsers block it)
  updateMeta(cur());
  audio.preload = 'none';
  audio.src = withKey('/api/stream/' + cur().id);
  loadLyrics(cur(), ++loadToken);
}
render();
loadHome();
loadMe();
pullLibrary();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') pullLibrary();
  else if (store.get('libDirty', false)) { clearTimeout(pushT); pushLibrary(); } // save before the app is backgrounded
});

// keyboard (desktop)
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight' && e.shiftKey) next();
  if (e.code === 'ArrowLeft' && e.shiftKey) prev();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
