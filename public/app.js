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
};
const setIcon = (el, name) => { el.innerHTML = I[name]; };

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
    if (k) { KEY = k; store.set('key', k); return api(url, opts); }
  }
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// ---------- state ----------
const S = {
  queue: store.get('queue', []),
  index: store.get('index', -1),
  liked: store.get('liked', []),
  history: store.get('history', []),
  shuffle: store.get('shuffle', false),
  repeat: store.get('repeat', 'off'), // off | all | one
  offsets: store.get('offsets', {}),
  translate: store.get('translate', false),
  results: [],
  tab: 'search',
  lyrics: null, // {lines:[{t,text,tr}], plain, id}
  autoRadio: true,
};
const cur = () => S.queue[S.index];
const persist = () => {
  store.set('queue', S.queue.slice(0, 300));
  store.set('index', S.index);
  store.set('liked', S.liked);
  store.set('history', S.history.slice(0, 100));
  store.set('shuffle', S.shuffle);
  store.set('repeat', S.repeat);
  store.set('offsets', S.offsets);
  store.set('translate', S.translate);
};

// ---------- helpers ----------
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}
const status = msg => { $('#status').textContent = msg || ''; };
const isLiked = id => S.liked.some(x => x.id === id);

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
function listFor(tab) {
  if (tab === 'search') return S.results;
  if (tab === 'queue') return S.queue;
  if (tab === 'liked') return S.liked;
  if (tab === 'history') return S.history;
  return [];
}
function render() {
  const el = $('#list');
  const items = listFor(S.tab);
  if (S.tab === 'search' && !items.length) {
    el.innerHTML = `<div class="empty"><img src="/icons/icon-192.png" alt=""><p>MUSIC LIVES HERE</p><small>輸入歌名或歌手開始聽歌</small></div>`;
    return;
  }
  if (!items.length) {
    el.innerHTML = `<div class="empty"><small>${{ queue: '佇列是空的', liked: '還沒有收藏的歌曲', history: '還沒有播放紀錄' }[S.tab]}</small></div>`;
    return;
  }
  let head = '';
  if (S.tab === 'queue') head = `<div class="section-title"><span>${items.length} 首 · 自動接續推薦歌曲</span><button id="clearQ">清空</button></div>`;
  if (S.tab === 'liked') head = `<div class="section-title"><span>${items.length} 首</span><button id="playAllLiked">全部播放</button></div>`;
  el.innerHTML = head + items.map((t, i) => rowHTML(t, i, S.tab)).join('');
}

$('#list').addEventListener('click', e => {
  if (e.target.id === 'clearQ') { const c = cur(); S.queue = c ? [c] : []; S.index = c ? 0 : -1; persist(); render(); return; }
  if (e.target.id === 'playAllLiked') { playList(S.liked, 0); return; }
  const more = e.target.closest('[data-more]');
  const row = e.target.closest('.row');
  if (!row) return;
  const i = Number(row.dataset.i);
  const items = listFor(row.dataset.ctx);
  if (more) { openSheet(items[i], row.dataset.ctx, i); return; }
  if (row.dataset.ctx === 'queue') { playIndex(i); return; }
  if (row.dataset.ctx === 'search') { playList([items[i]], 0, true); return; }
  playList(items, i);
});

// action sheet
function openSheet(t, ctx, i) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  const sh = document.createElement('div'); sh.className = 'sheet';
  sh.innerHTML = `<div class="sheet-title">${esc(t.title)} — ${esc(t.artist)}</div>
    <button data-a="next">下一首播放</button>
    <button data-a="add">加到佇列尾端</button>
    <button data-a="radio">以此歌開始電台</button>
    <button data-a="like">${isLiked(t.id) ? '取消收藏' : '加入收藏'}</button>
    ${ctx === 'queue' ? '<button data-a="rm">從佇列移除</button>' : ''}
    <button data-a="x">取消</button>`;
  const close = () => { bg.remove(); sh.remove(); };
  bg.onclick = close;
  sh.onclick = e => {
    const a = e.target.dataset.a; if (!a) return;
    if (a === 'next') { S.queue.splice(S.index + 1, 0, t); if (S.index < 0) S.index = -1; toast('將在下一首播放'); if (S.index < 0) playIndex(0); }
    if (a === 'add') { S.queue.push(t); toast('已加到佇列'); if (S.index < 0) playIndex(0); }
    if (a === 'radio') playList([t], 0, true);
    if (a === 'like') toggleLike(t);
    if (a === 'rm') { S.queue.splice(i, 1); if (i < S.index) S.index--; else if (i === S.index) { S.index--; next(); } }
    persist(); render(); close();
  };
  document.body.append(bg, sh);
}

// tabs
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  S.tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});

// ---------- search ----------
$('#searchForm').addEventListener('submit', async e => {
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  if (!q) return;
  $('#searchInput').blur();
  document.querySelector('.tabs button[data-tab=search]').click();
  $('#list').innerHTML = '<div class="spinner"></div>';
  try {
    const d = await api('/api/search?q=' + encodeURIComponent(q));
    S.results = d.items || [];
    if (!S.results.length) toast('找不到結果');
  } catch { toast('搜尋失敗，請稍後再試'); S.results = []; }
  render();
});

// ---------- playback ----------
let loadToken = 0;
function playList(list, i, radio = false) {
  S.queue = list.slice();
  S.autoRadio = true;
  playIndex(i);
  if (radio) fillRadio(list[i].id, true);
}

async function fillRadio(id, replaceRest = false) {
  try {
    const d = await api('/api/upnext/' + id);
    const have = new Set(S.queue.map(x => x.id));
    const add = (d.items || []).filter(x => !have.has(x.id));
    if (replaceRest) S.queue = S.queue.slice(0, S.index + 1);
    S.queue.push(...add);
    persist();
    if (S.tab === 'queue') render();
    prefetchNext();
  } catch {}
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
  audio.src = withKey('/api/stream/' + t.id);
  audio.play().catch(err => { if (token === loadToken && err.name === 'NotAllowedError') status('點一下播放鍵開始'); });
  loadLyrics(t, token);
  render();
  // keep the queue topped up for endless listening
  if (S.autoRadio && S.queue.length - S.index <= 3) fillRadio(t.id);
  else prefetchNext();
}

function prefetchNext() {
  const n = S.queue[S.index + 1];
  if (n) fetch(withKey('/api/prepare/' + n.id)).catch(() => {});
}

function next(auto = false) {
  if (!S.queue.length) return;
  if (auto && S.repeat === 'one') { audio.currentTime = 0; audio.play(); return; }
  let i;
  if (S.shuffle && S.queue.length > 1) {
    do { i = Math.floor(Math.random() * S.queue.length); } while (i === S.index);
  } else {
    i = S.index + 1;
    if (i >= S.queue.length) {
      if (S.repeat === 'all') i = 0;
      else { status('佇列已播完'); return; }
    }
  }
  playIndex(i);
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
audio.addEventListener('playing', () => status(''));
audio.addEventListener('waiting', () => status('緩衝中…'));
audio.addEventListener('ended', () => next(true));
audio.addEventListener('error', () => {
  if (!audio.src) return;
  status('這首歌無法播放，跳到下一首');
  toast('無法播放：' + (cur()?.title || ''));
  setTimeout(() => next(), 1200);
});
audio.addEventListener('loadedmetadata', () => { $('#tDur').textContent = fmt(audio.duration); updatePosition(); });

function syncPlayIcons() {
  const p = audio.paused ? 'play' : 'pause';
  setIcon($('#playBtn'), p); setIcon($('#miniPlay'), p);
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
}

// ---------- progress ----------
let seeking = false;
audio.addEventListener('timeupdate', () => {
  const d = audio.duration || cur()?.duration || 0;
  const c = audio.currentTime;
  const p = d ? (c / d) * 100 : 0;
  $('#miniBar').style.width = p + '%';
  if (!seeking) { $('#seek').value = d ? Math.round((c / d) * 1000) : 0; $('#seek').style.setProperty('--p', p + '%'); }
  $('#tCur').textContent = fmt(c);
  syncLyrics(c);
});
const seek = $('#seek');
seek.addEventListener('input', () => {
  seeking = true;
  const d = audio.duration || 0;
  $('#tCur').textContent = fmt((seek.value / 1000) * d);
  seek.style.setProperty('--p', seek.value / 10 + '%');
});
seek.addEventListener('change', () => {
  const d = audio.duration || 0;
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
  $('#tCur').textContent = '0:00'; $('#tDur').textContent = fmt(t.duration);
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
    if (audio.duration && isFinite(audio.duration))
      navigator.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate });
  } catch {}
}
audio.addEventListener('seeked', updatePosition);
audio.addEventListener('play', updatePosition);

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  const h = (a, f) => { try { ms.setActionHandler(a, f); } catch {} };
  h('play', () => audio.play());
  h('pause', () => audio.pause());
  h('nexttrack', () => next());
  h('previoustrack', () => prev());
  h('seekto', d => { audio.currentTime = d.seekTime; updatePosition(); });
  h('seekforward', d => { audio.currentTime = Math.min(audio.duration, audio.currentTime + (d.seekOffset || 10)); });
  h('seekbackward', d => { audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset || 10)); });
}

// like
function toggleLike(t = cur()) {
  if (!t) return;
  if (isLiked(t.id)) { S.liked = S.liked.filter(x => x.id !== t.id); toast('已取消收藏'); }
  else { S.liked.unshift(t); toast('已加入收藏'); }
  persist(); syncLike(); if (S.tab === 'liked') render();
}
function syncLike() {
  const t = cur(); const on = t && isLiked(t.id);
  setIcon($('#likeBtn'), on ? 'heart' : 'heartO');
  $('#likeBtn').classList.toggle('liked', !!on);
}

// full player open/close
const full = $('#full');
const openFull = () => { full.classList.add('open'); full.setAttribute('aria-hidden', 'false'); history.pushState({ full: 1 }, ''); };
const closeFull = () => { full.classList.remove('open'); full.setAttribute('aria-hidden', 'true'); };
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
  lastLine = -2; syncLyrics(audio.currentTime);
});

// controls
setIcon($('#fullClose'), 'down');
setIcon($('#prevBtn'), 'prev'); setIcon($('#nextBtn'), 'next'); setIcon($('#miniNext'), 'next');
setIcon($('#shuffleBtn'), 'shuffle');
const syncModes = () => {
  $('#shuffleBtn').classList.toggle('off', !S.shuffle);
  setIcon($('#repeatBtn'), S.repeat === 'one' ? 'repeat1' : 'repeat');
  $('#repeatBtn').classList.toggle('off', S.repeat === 'off');
};
$('#playBtn').onclick = togglePlay; $('#miniPlay').onclick = togglePlay;
$('#nextBtn').onclick = () => next(); $('#miniNext').onclick = () => next();
$('#prevBtn').onclick = prev;
$('#likeBtn').onclick = () => toggleLike();
$('#shuffleBtn').onclick = () => { S.shuffle = !S.shuffle; persist(); syncModes(); toast(S.shuffle ? '隨機播放：開' : '隨機播放：關'); };
$('#repeatBtn').onclick = () => {
  S.repeat = { off: 'all', all: 'one', one: 'off' }[S.repeat]; persist(); syncModes();
  toast({ off: '重複播放：關', all: '重複整個佇列', one: '單曲重複' }[S.repeat]);
};

// ---------- lyrics ----------
function parseLRC(lrc) {
  const out = [];
  for (const raw of String(lrc).split(/\r?\n/)) {
    const tags = [...raw.matchAll(/\[(\d+):(\d+(?:[.:]\d+)?)\]/g)];
    if (!tags.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of tags) out.push({ t: Number(m[1]) * 60 + parseFloat(m[2].replace(':', '.')), text });
  }
  return out.sort((a, b) => a.t - b.t).filter((l, i, arr) => l.text || (arr[i + 1] && arr[i + 1].t - l.t > 3));
}

async function loadLyrics(t, token) {
  S.lyrics = null; lastLine = -2;
  $('#lyrics').innerHTML = '<div class="spinner"></div>';
  $('#miniLyric').innerHTML = '';
  syncOffset();
  try {
    const q = new URLSearchParams({ title: t.title, artist: t.artist, duration: t.duration || '' });
    const d = await api('/api/lyrics?' + q);
    if (token !== loadToken) return;
    if (d.synced) S.lyrics = { id: t.id, lines: parseLRC(d.synced), plain: '' };
    else if (d.plain) S.lyrics = { id: t.id, lines: [], plain: d.plain };
    else S.lyrics = { id: t.id, lines: [], plain: '' };
  } catch { if (token === loadToken) S.lyrics = { id: t.id, lines: [], plain: '' }; }
  renderLyrics();
  if (S.translate) translateLyrics();
}

function renderLyrics() {
  const L = S.lyrics, box = $('#lyrics');
  if (!L) return;
  if (L.lines.length) {
    box.innerHTML = L.lines.map((l, i) =>
      `<div class="ly" data-i="${i}">${esc(l.text) || '♪'}${l.tr ? `<span class="tr">${esc(l.tr)}</span>` : ''}</div>`).join('');
  } else if (L.plain) {
    box.innerHTML = `<div class="ly-plain">${esc(L.plain)}</div>`;
  } else {
    box.innerHTML = '<div class="ly-none">這首歌暫時沒有歌詞</div>';
  }
  lastLine = -2; syncLyrics(audio.currentTime);
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

let lastLine = -2;
let userScrollUntil = 0;
$('#lyrics').addEventListener('touchmove', () => { userScrollUntil = Date.now() + 3000; }, { passive: true });
$('#lyrics').addEventListener('wheel', () => { userScrollUntil = Date.now() + 3000; }, { passive: true });

function syncLyrics(time) {
  const L = S.lyrics;
  if (!L || !L.lines.length) {
    $('#miniLyric').innerHTML = '';
    return;
  }
  const t = time + offset() + 0.15;
  let lo = 0, hi = L.lines.length - 1, idx = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (L.lines[m].t <= t) { idx = m; lo = m + 1; } else hi = m - 1; }
  if (idx === lastLine) return;
  lastLine = idx;
  const box = $('#lyrics');
  box.querySelectorAll('.ly.on').forEach(x => x.classList.remove('on'));
  const line = L.lines[idx];
  $('#miniLyric').innerHTML = line ? `${esc(line.text)}${line.tr ? `<small>${esc(line.tr)}</small>` : ''}` : '';
  if (idx < 0) return;
  const el = box.querySelector(`.ly[data-i="${idx}"]`);
  if (!el) return;
  el.classList.add('on');
  if (Date.now() > userScrollUntil && $('#viewLyrics').classList.contains('on'))
    box.scrollTo({ top: el.offsetTop - box.clientHeight * 0.38, behavior: 'smooth' });
}

// translation
async function translateLyrics() {
  const L = S.lyrics;
  if (!L || !L.lines.length || L.translated) return;
  const id = L.id;
  const src = L.lines.map(l => l.text || '');
  // skip if the lyrics already look like Traditional Chinese
  const cjk = src.join('').match(/[\u4e00-\u9fff]/g)?.length || 0;
  const kana = src.join('').match(/[\u3040-\u30ff\uac00-\ud7af]/g)?.length || 0;
  if (cjk > src.join('').length * 0.5 && !kana) { toast('歌詞已是中文'); return; }
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
  else if (S.lyrics) { S.lyrics.lines.forEach(l => delete l.tr); S.lyrics.translated = false; renderLyrics(); }
};

// ---------- boot ----------
syncModes();
setIcon($('#playBtn'), 'play'); setIcon($('#miniPlay'), 'play');
$('#transBtn').classList.toggle('on', S.translate);
if (cur()) {
  // restore last session without autoplay (browsers block it)
  updateMeta(cur());
  audio.src = withKey('/api/stream/' + cur().id);
  audio.preload = 'none';
  loadLyrics(cur(), ++loadToken);
  audio.addEventListener('play', () => { audio.preload = 'auto'; }, { once: true });
}
render();

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
