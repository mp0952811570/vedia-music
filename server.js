// Vedia Music — backend
//   GET  /api/search?q=[&type=][&next=]  YouTube Music search, 20 per page; type = songs | videos |
//                              albums | artists | playlists, next = token from the previous page
//   GET  /api/home[?params=]   YouTube Music home shelves + mood chips (params = a chip's filter)
//   GET  /api/playlist/:id     tracks of a playlist                  {name, items}
//   GET  /api/album/:id        tracks of an album                    {name, artist, artistId, items}
//   GET  /api/artist/:id       an artist's page: bio, top songs (items) and shelves of albums,
//                              singles, videos and similar artists
//   GET  /api/upnext/:id       related songs (radio / autoplay queue)
//   GET  /api/stream/:id       audio (remuxed m4a served from disk, live Range proxy as fallback)
//   GET  /api/prepare/:id      pre-resolve a stream and build its file (used to prefetch the next track)
//   GET  /api/lyrics?title=&artist=&album=&duration=[&pick=]   word/line-synced lyrics + other versions
//   POST /api/translate {lines, to}             line-by-line lyric translation
//   GET/PUT /api/library       liked songs + playlists of the code in use
//   GET  /api/me               {name, owner} for the code in use
//   GET/POST /api/users, POST /api/users/:id/reset, DELETE /api/users/:id   friends (owner only)
const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
// The home network's IPv6 can be dead while DNS still returns AAAA records: yt-dlp then hangs on
// "Downloading webpage" and googlevideo URLs (bound to the resolving IP) fail. Use IPv4 everywhere.
require('dns').setDefaultResultOrder('ipv4first');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { findLyrics } = require('./lyrics');

const PORT = process.env.PORT || 3000;
const LOCAL_YTDLP = path.join(os.homedir(), '.local/bin/yt-dlp');
const YTDLP = process.env.YTDLP_BIN || (fs.existsSync(LOCAL_YTDLP) ? LOCAL_YTDLP : 'yt-dlp');
const ACCESS_KEY = process.env.ACCESS_KEY || ''; // the owner's code: ?key= or x-vedia-key header
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => (req.path === '/api/library' ? next() : express.json({ limit: '200kb' })(req, res, next)));

// ---------- Access: the owner's code (ACCESS_KEY) plus one code per friend ----------
// Each code has its own library (liked songs + playlists); only the owner can manage friends.
// Without ACCESS_KEY the server is open and everyone is the owner (local use).
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const OWNER = { id: 'owner', name: '', owner: true };
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(tmp, file);
}
let users = (() => { try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; } })();
const saveUsers = () => writeJson(USERS_FILE, users);
const digest = s => crypto.createHash('sha256').update(String(s)).digest();
const sameCode = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

function userForCode(code) {
  if (!ACCESS_KEY) return OWNER;
  if (!code) return null;
  if (sameCode(code, ACCESS_KEY)) return OWNER;
  const u = users.find(x => sameCode(code, x.key));
  return u ? { id: u.id, name: u.name, owner: false } : null;
}
function markSeen(id) {
  const u = users.find(x => x.id === id);
  if (u && Date.now() - (u.lastSeen || 0) > 10 * 60 * 1000) { u.lastSeen = Date.now(); saveUsers(); }
}

// Wrong codes are counted per client (Cloudflare passes the visitor's IP) and overall, so codes
// can't be guessed through the public URL; requests with a valid code are never slowed down.
const GUESS_WINDOW = 10 * 60 * 1000;
const guesses = new Map(); // client ip -> {n, since}
let recentGuesses = [];
function guessedTooOften(req) {
  const now = Date.now(), ip = String(req.get('cf-connecting-ip') || req.socket.remoteAddress || '');
  let g = guesses.get(ip);
  if (!g || now - g.since > GUESS_WINDOW) { g = { n: 0, since: now }; guesses.set(ip, g); }
  g.n++;
  if (guesses.size > 2000) for (const [k, v] of guesses) if (now - v.since > GUESS_WINDOW) guesses.delete(k);
  recentGuesses = recentGuesses.filter(t => now - t < GUESS_WINDOW);
  recentGuesses.push(now);
  return g.n > 30 || recentGuesses.length > 300;
}

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  const code = String(req.get('x-vedia-key') || req.query.key || '');
  const user = userForCode(code);
  if (user) {
    req.user = user;
    if (!user.owner) markSeen(user.id);
    return next();
  }
  if (code && guessedTooOften(req)) return res.status(429).json({ error: 'too many attempts' });
  res.status(401).json({ error: 'unauthorized' });
});

// ---------- YouTube Music metadata ----------
let ytmPromise = null;
function getYtm() {
  if (!ytmPromise) {
    ytmPromise = (async () => {
      const mod = await import('ytmusic-api');
      const YTMusic = mod.default?.default || mod.default || mod.YTMusic;
      const inst = new YTMusic();
      await inst.initialize({ GL: 'TW', HL: 'zh-TW' });
      return inst;
    })().catch(e => { ytmPromise = null; throw e; });
  }
  return ytmPromise;
}

const bigThumb = url => String(url || '').replace(/=w\d+-h\d+/, '=w544-h544');
const pickThumb = (thumbs = []) => {
  const t = [...thumbs].sort((a, b) => (b.width || 0) - (a.width || 0))[0];
  return t ? bigThumb(t.url) : '';
};
const parseDur = d => {
  if (typeof d === 'number') return d;
  if (!d) return 0;
  return String(d).split(':').reduce((acc, p) => acc * 60 + Number(p || 0), 0);
};

// Search returns 20 results per page; each response carries a continuation token for the next
// page, which the client passes back as ?next= to load more. Each type is a YouTube Music search
// filter (params) parsed by the matching ytmusic-api method.
const SEARCH_TYPES = {
  songs: {
    params: 'Eg-KAQwIARAAGAAgACgAMABqChAEEAMQCRAFEAo%3D', method: 'searchSongs',
    item: s => ID_RE.test(s.videoId || '') && { type: 'song', id: s.videoId, title: s.name, artist: s.artist?.name || '', album: s.album?.name || '', duration: s.duration || 0, cover: pickThumb(s.thumbnails) },
  },
  videos: {
    params: 'Eg-KAQwIABABGAAgACgAMABqChAEEAMQCRAFEAo%3D', method: 'searchVideos',
    item: v => ID_RE.test(v.videoId || '') && { type: 'song', id: v.videoId, title: v.name, artist: v.artist?.name || '', album: '', duration: v.duration || 0, cover: pickThumb(v.thumbnails) },
  },
  albums: {
    params: 'Eg-KAQwIABAAGAEgACgAMABqChAEEAMQCRAFEAo%3D', method: 'searchAlbums',
    item: a => /^MPRE/.test(a.albumId || '') && { type: 'album', id: a.albumId, title: a.name, subtitle: ['專輯', a.artist?.name, a.year].filter(Boolean).join(' · '), cover: pickThumb(a.thumbnails) },
  },
  artists: {
    params: 'Eg-KAQwIABAAGAAgASgAMABqChAEEAMQCRAFEAo%3D', method: 'searchArtists',
    item: a => /^UC/.test(a.artistId || '') && { type: 'artist', id: a.artistId, title: a.name, subtitle: '歌手', cover: pickThumb(a.thumbnails) },
  },
  playlists: {
    params: 'Eg-KAQwIABAAGAAgACgBMABqChAEEAMQCRAFEAo%3D', method: 'searchPlaylists',
    item: p => p.playlistId && { type: 'playlist', id: p.playlistId.replace(/^VL/, ''), title: p.name, subtitle: ['歌單', p.artist?.name].filter(Boolean).join(' · '), cover: pickThumb(p.thumbnails) },
  },
};
const findContinuation = data => {
  let token = null;
  (function walk(n) {
    if (token || !n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    token = n.nextContinuationData?.continuation
      || n.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null;
    if (!token) Object.values(n).forEach(walk);
  })(data);
  return token;
};

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const next = String(req.query.next || '');
  const type = SEARCH_TYPES[req.query.type] ? String(req.query.type) : 'songs';
  if (!q) return res.status(400).json({ error: 'missing q' });
  try {
    const y = await getYtm();
    const { params, method, item } = SEARCH_TYPES[type];
    const data = next
      ? await y.constructRequest('search', {}, { continuation: next, ctoken: next, type: 'next' })
      : await y.constructRequest('search', { query: q, params });
    // Parse with the library's own parser: the search method run against the page fetched above.
    const page = Object.create(y);
    page.constructRequest = async () => data;
    const results = await y[method].call(page, q);
    res.json({ items: results.map(item).filter(Boolean), next: findContinuation(data) });
  } catch (e) {
    console.error('search', e.message);
    ytmPromise = null;
    res.status(502).json({ error: 'search failed' });
  }
});

// ---------- Home and collections ----------
// Read straight from the browse responses: the library's getHomeSections() drops the first page,
// and its playlist calls only add the "VL" browse prefix to PL… ids, so YouTube Music's own
// RDCLAK…/OLAK… playlists (most of the home page) answer 400 through it.
const textOf = t => (t?.runs || []).map(r => r.text).join('') || t?.simpleText || '';
const findAll = (node, key, out = []) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const n of node) findAll(n, key, out); return out; }
  if (node[key]) { out.push(node[key]); return out; }
  for (const v of Object.values(node)) findAll(v, key, out);
  return out;
};
const lastThumb = thumbs => bigThumb((thumbs || []).at(-1)?.url || '');

function shelfSong(r) {
  const cols = (r.flexColumns || []).map(c => c.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []);
  const id = r.playlistItemData?.videoId || cols[0]?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
  if (!ID_RE.test(id || '')) return null;
  const runs = cols.slice(1).flat();
  const fixed = (r.fixedColumns || []).flatMap(c => c.musicResponsiveListItemFixedColumnRenderer?.text?.runs || []);
  const linked = prefix => runs.filter(x => x.navigationEndpoint?.browseEndpoint?.browseId?.startsWith(prefix)).map(x => x.text);
  const durRun = [...runs, ...fixed].reverse().find(x => /^\d+(:\d{2})+$/.test((x.text || '').trim()));
  return {
    type: 'song',
    id,
    title: (cols[0] || []).map(x => x.text).join(''),
    artist: linked('UC').join('、') || cols[1]?.[0]?.text || '',
    album: linked('MPRE')[0] || '',
    duration: durRun ? parseDur(durRun.text.trim()) : 0,
    cover: lastThumb(r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails),
  };
}

function shelfCard(c) {
  const nav = c.navigationEndpoint || {};
  const title = textOf(c.title), subtitle = textOf(c.subtitle);
  const cover = lastThumb(c.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails);
  const videoId = nav.watchEndpoint?.videoId;
  if (videoId) {
    return ID_RE.test(videoId) ? { type: 'song', id: videoId, title, artist: c.subtitle?.runs?.[0]?.text || '', album: '', duration: 0, cover } : null;
  }
  const browseId = nav.browseEndpoint?.browseId || '';
  if (browseId.startsWith('VL')) return { type: 'playlist', id: browseId.slice(2), title, subtitle, cover };
  if (browseId.startsWith('MPRE')) return { type: 'album', id: browseId, title, subtitle, cover };
  if (browseId.startsWith('UC')) return { type: 'artist', id: browseId, title, subtitle, cover };
  return null; // podcasts, episodes and other pages this player can't open
}

// Shelves of song rows (quick picks) or cards (playlists, albums, artists, videos).
function shelves(data) {
  return findAll(data, 'musicCarouselShelfRenderer').map(s => {
    const head = s.header?.musicCarouselShelfBasicHeaderRenderer;
    const contents = s.contents || [];
    return {
      title: textOf(head?.title),
      subtitle: textOf(head?.strapline),
      layout: contents.some(x => x.musicTwoRowItemRenderer) ? 'cards' : 'rows',
      items: contents.map(x => (x.musicTwoRowItemRenderer ? shelfCard(x.musicTwoRowItemRenderer)
        : x.musicResponsiveListItemRenderer ? shelfSong(x.musicResponsiveListItemRenderer) : null)).filter(Boolean),
    };
  }).filter(s => s.title && s.items.length);
}

const HOME_TTL = 30 * 60 * 1000;
const homeCache = new Map(); // chip params ('' = everything) -> {at, data}

app.get('/api/home', async (req, res) => {
  const params = String(req.query.params || '').slice(0, 400);
  const hit = homeCache.get(params);
  if (hit && Date.now() - hit.at < HOME_TTL && !req.query.fresh) return res.json(hit.data);
  try {
    const y = await getYtm();
    let page = await y.constructRequest('browse', params ? { browseId: 'FEmusic_home', params } : { browseId: 'FEmusic_home' });
    const chips = findAll(page, 'chipCloudChipRenderer')
      .map(c => ({ title: textOf(c.text), params: c.navigationEndpoint?.browseEndpoint?.params || '' }))
      .filter(c => c.title && c.params && !/podcast/i.test(c.title)); // podcast shows can't be played here
    const sections = shelves(page);
    let token = findContinuation(page);
    for (let i = 0; token && i < 4; i++) {
      page = await y.constructRequest('browse', {}, { continuation: token, ctoken: token, type: 'next' });
      sections.push(...shelves(page));
      token = findContinuation(page);
    }
    const data = { chips, sections };
    homeCache.set(params, { at: Date.now(), data });
    if (homeCache.size > 40) homeCache.delete(homeCache.keys().next().value);
    res.json(data);
  } catch (e) {
    console.error('home', e.message);
    ytmPromise = null;
    res.status(502).json({ error: 'home failed' });
  }
});

const playable = list => (list || []).filter(s => s.videoId && ID_RE.test(s.videoId));
const toTrack = (s, fallback = {}) => ({
  id: s.videoId,
  title: s.name || '',
  artist: s.artist?.name || fallback.artist || '',
  album: s.album?.name || fallback.album || '',
  duration: s.duration || 0,
  cover: pickThumb(s.thumbnails) || fallback.cover || `https://i.ytimg.com/vi/${s.videoId}/hqdefault.jpg`,
});

// Playlist rows plus their continuation pages. Long playlists page on with continuationCommand
// tokens, which the library mistakes for the page's reload token (another 400).
async function playlistTracks(id) {
  const y = await getYtm();
  let page = await y.constructRequest('browse', { browseId: id.startsWith('VL') ? id : 'VL' + id });
  const head = findAll(page, 'musicResponsiveHeaderRenderer')[0] || findAll(page, 'musicDetailHeaderRenderer')[0];
  const seen = new Set(), items = [];
  const add = data => {
    for (const r of findAll(data, 'musicResponsiveListItemRenderer')) {
      const s = shelfSong(r);
      if (s && !seen.has(s.id)) { seen.add(s.id); items.push(s); }
    }
  };
  add(page);
  let token = findContinuation(page);
  for (let i = 0; token && items.length < 1000 && i < 20; i++) {
    page = await y.constructRequest('browse', {}, { continuation: token, ctoken: token, type: 'next' });
    add(page);
    token = findContinuation(page);
  }
  return { name: textOf(head?.title), items: items.slice(0, 1000) };
}

app.get('/api/playlist/:id', async (req, res) => {
  const id = req.params.id;
  if (!/^[A-Za-z0-9_-]{6,120}$/.test(id)) return res.status(400).json({ error: 'bad id' });
  try { res.json(await playlistTracks(id)); }
  catch (e) { console.error('playlist', id, e.message); res.status(502).json({ error: 'playlist failed' }); }
});

app.get('/api/album/:id', async (req, res) => {
  const id = req.params.id;
  if (!/^MPRE[A-Za-z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'bad id' });
  try {
    const y = await getYtm();
    const a = await y.getAlbum(id);
    const fallback = { artist: a.artist?.name, album: a.name, cover: pickThumb(a.thumbnails) };
    res.json({
      name: a.name || '', artist: a.artist?.name || '', artistId: a.artist?.artistId || '', year: a.year || '', cover: fallback.cover,
      items: playable(a.songs).map(s => toTrack(s, fallback)),
    });
  } catch (e) { console.error('album', id, e.message); res.status(502).json({ error: 'album failed' }); }
});

app.get('/api/artist/:id', async (req, res) => {
  const id = req.params.id;
  if (!/^UC[A-Za-z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'bad id' });
  try {
    // Read the page itself: the library's getArtist() maps shelves by position, which shifts
    // whenever an artist has no singles or videos.
    const y = await getYtm();
    const data = await y.constructRequest('browse', { browseId: id });
    const h = Object.values(data.header || {})[0] || {};
    const top = findAll(data, 'musicShelfRenderer')[0];
    const all = top?.bottomEndpoint?.browseEndpoint?.browseId || top?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
    res.json({
      name: textOf(h.title),
      description: textOf(h.description),
      subscribers: textOf(h.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText),
      listeners: textOf(h.monthlyListenerCount),
      banner: (h.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []).at(-1)?.url || '', // wide photo
      items: (top?.contents || []).map(x => x.musicResponsiveListItemRenderer && shelfSong(x.musicResponsiveListItemRenderer)).filter(Boolean),
      allSongs: all.startsWith('VL') ? all.slice(2) : '', // playlist of every song
      sections: shelves(data), // albums, singles, videos, live, playlists, similar artists
    });
  } catch (e) { console.error('artist', id, e.message); res.status(502).json({ error: 'artist failed' }); }
});

app.get('/api/upnext/:id', async (req, res) => {
  const id = req.params.id;
  if (!ID_RE.test(id)) return res.status(400).json({ error: 'bad id' });
  try {
    const y = await getYtm();
    const list = await y.getUpNexts(id);
    res.json({
      items: list.filter(s => s.videoId && s.videoId !== id).slice(0, 30).map(s => ({
        id: s.videoId,
        title: s.title,
        artist: s.artists || '',
        album: '',
        duration: parseDur(s.duration),
        cover: bigThumb(s.thumbnail),
      })),
    });
  } catch (e) {
    console.error('upnext', e.message);
    res.json({ items: [] });
  }
});

// ---------- Audio stream resolution (yt-dlp) ----------
const streamCache = new Map(); // id -> {url, ext, expires}
const inflight = new Map();

function resolveStream(id) {
  const hit = streamCache.get(id);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit);
  if (inflight.has(id)) return inflight.get(id);
  const p = new Promise((resolve, reject) => {
    execFile(
      YTDLP,
      [
        '--no-warnings', '--no-playlist', '--force-ipv4',
        '--js-runtimes', 'node', '--remote-components', 'ejs:github',
        '-f', 'bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio',
        '--print', '%(url)s', '--print', '%(ext)s',
        `https://music.youtube.com/watch?v=${id}`,
      ],
      { timeout: 60000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        inflight.delete(id);
        if (err) return reject(new Error(String(stderr || err.message).trim().split('\n').pop()));
        const [url, ext] = stdout.trim().split('\n');
        if (!url || !url.startsWith('http')) return reject(new Error('no url'));
        const m = url.match(/[?&]expire=(\d+)/);
        const expires = m ? Number(m[1]) * 1000 - 10 * 60 * 1000 : Date.now() + 60 * 60 * 1000;
        const entry = { url, ext: ext || 'm4a', expires };
        streamCache.set(id, entry);
        if (streamCache.size > 500) streamCache.delete(streamCache.keys().next().value);
        resolve(entry);
      }
    );
  });
  inflight.set(id, p);
  return p;
}

const mimeFor = ext => (ext === 'webm' ? 'audio/webm' : 'audio/mp4');

app.get('/api/prepare/:id', async (req, res) => {
  const id = req.params.id;
  if (!ID_RE.test(id)) return res.status(400).end();
  try {
    await resolveStream(id);
    audioFile(id).catch(() => {}); // build the next track's file now so it starts instantly
    res.json({ ok: true });
  } catch (e) { res.status(502).json({ ok: false, detail: e.message }); }
});

// YouTube throttles long single requests, so the upstream is always fetched in
// small Range chunks (fast) and stitched into one response for the browser.
const CHUNK = 512 * 1024;

async function upstreamChunk(id, start, end, signal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const src = await resolveStream(id);
    const r = await fetch(src.url, { headers: { 'User-Agent': UA, Range: `bytes=${start}-${end}` }, signal });
    if (r.status === 403 || r.status === 410) { await r.body?.cancel(); streamCache.delete(id); continue; }
    if (r.status !== 206 && r.status !== 200) { await r.body?.cancel(); throw new Error('upstream ' + r.status); }
    const total = Number((r.headers.get('content-range') || '').split('/')[1]) || 0;
    return { r, total, src };
  }
  throw new Error('upstream refused');
}

async function getTotal(id, signal) {
  const src = await resolveStream(id);
  if (src.total) return src.total;
  const m = src.url.match(/[?&]clen=(\d+)/);
  if (m) { src.total = Number(m[1]); return src.total; }
  const { r, total } = await upstreamChunk(id, 0, 0, signal);
  await r.body?.cancel();
  src.total = total;
  return total;
}

// ---------- Audio files (download once, remux, serve from disk) ----------
// YouTube's audio-only m4a is a fragmented MP4 whose header already states the full length; iOS
// Safari adds the fragments on top and reports about twice the real duration (the second half is
// silence). Each track is downloaded once and remuxed by ffmpeg (stream copy, no re-encode) into a
// regular faststart m4a, which every browser times correctly. Tracks that can't take this path
// (webm-only, multi-hour uploads, a failed download or remux) use the live Range proxy instead.
const FFMPEG = process.env.FFMPEG_BIN || 'ffmpeg';
const AUDIO_DIR = path.resolve(process.env.AUDIO_CACHE_DIR || path.join(os.homedir(), '.cache', 'vedia-music', 'audio'));
const AUDIO_CACHE_BYTES = (Number(process.env.AUDIO_CACHE_MB) || 2048) * 1024 * 1024;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
fs.mkdirSync(AUDIO_DIR, { recursive: true });
for (const f of fs.readdirSync(AUDIO_DIR)) {
  if (/\.(part|tmp)$/.test(f)) fs.rmSync(path.join(AUDIO_DIR, f), { force: true });
}

const fileJobs = new Map(); // id -> Promise<file path>
const fileFailed = new Map(); // id -> time before which the file path isn't retried

function remux(input, output) {
  return new Promise((resolve, reject) => {
    execFile(
      FFMPEG,
      ['-v', 'error', '-y', '-i', input, '-map', '0:a:0', '-c', 'copy', '-movflags', '+faststart', '-f', 'mp4', output],
      { timeout: 120000 },
      (err, stdout, stderr) => (err ? reject(new Error(String(stderr || err.message).trim().split('\n').pop())) : resolve())
    );
  });
}

async function downloadAudio(id, total, file) {
  const signal = AbortSignal.timeout(180000);
  async function* body() {
    for (let pos = 0; pos < total; pos += CHUNK) {
      const { r } = await upstreamChunk(id, pos, Math.min(pos + CHUNK, total) - 1, signal);
      yield* Readable.fromWeb(r.body);
    }
  }
  await pipeline(body(), fs.createWriteStream(file));
  if (fs.statSync(file).size !== total) throw new Error('incomplete download');
}

// Least recently played files go first once the cache is over its size limit.
function pruneAudioCache() {
  try {
    const files = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.m4a')).map(f => {
      const p = path.join(AUDIO_DIR, f);
      const st = fs.statSync(p);
      return { p, size: st.size, used: st.atimeMs };
    }).sort((a, b) => a.used - b.used);
    let total = files.reduce((sum, f) => sum + f.size, 0);
    for (const f of files) {
      if (total <= AUDIO_CACHE_BYTES) break;
      fs.rmSync(f.p, { force: true });
      total -= f.size;
    }
  } catch (e) {
    console.error('audio cache', e.message);
  }
}

function audioFile(id) {
  const file = path.join(AUDIO_DIR, id + '.m4a');
  if (fs.existsSync(file)) return Promise.resolve(file);
  if (fileJobs.has(id)) return fileJobs.get(id);
  if ((fileFailed.get(id) || 0) > Date.now()) return Promise.reject(new Error('recently failed'));
  const job = (async () => {
    const src = await resolveStream(id);
    if (src.ext !== 'm4a' && src.ext !== 'mp4') throw new Error('format ' + src.ext);
    const total = await getTotal(id);
    if (!total || total > MAX_FILE_BYTES) throw new Error('size ' + total);
    const part = file + '.part', tmp = file + '.tmp';
    try {
      await downloadAudio(id, total, part);
      await remux(part, tmp);
      fs.renameSync(tmp, file);
    } finally {
      fs.rmSync(part, { force: true });
      fs.rmSync(tmp, { force: true });
    }
    pruneAudioCache();
    return file;
  })();
  fileJobs.set(id, job);
  job.then(() => fileJobs.delete(id), e => {
    fileJobs.delete(id);
    fileFailed.set(id, Date.now() + 10 * 60 * 1000);
    if (fileFailed.size > 500) fileFailed.delete(fileFailed.keys().next().value);
    console.error('audio file', id, e.message);
  });
  return job;
}

// Refresh the access time only: mtime feeds the ETag a resumed Range request is checked against.
const markPlayed = file => fs.stat(file, (err, st) => { if (!err) fs.utimes(file, new Date(), st.mtime, () => {}); });

app.get('/api/stream/:id', async (req, res) => {
  const id = req.params.id;
  if (!ID_RE.test(id)) return res.status(400).end();
  let closed = false;
  res.on('close', () => { closed = true; });
  let file = null;
  try { file = await audioFile(id); } catch {}
  if (closed) return;
  if (!file) return proxyStream(req, res, id);
  markPlayed(file);
  // root keeps send's dotfile check off the ~/.cache part of the path
  res.sendFile(path.basename(file), { root: AUDIO_DIR, headers: { 'Content-Type': 'audio/mp4', 'Cache-Control': 'no-store' } }, err => {
    if (err && !closed && !res.headersSent) proxyStream(req, res, id);
  });
});

// Live Range proxy straight from YouTube (fallback when there's no remuxed file).
async function proxyStream(req, res, id) {
  const ac = new AbortController();
  res.on('close', () => ac.abort());

  let total, src;
  try {
    src = await resolveStream(id);
    total = await getTotal(id, ac.signal);
  } catch (e) {
    if (ac.signal.aborted) return;
    console.error('resolve', id, e.message);
    return res.status(502).json({ error: 'cannot resolve audio', detail: e.message });
  }
  if (!total) return res.status(502).json({ error: 'unknown length' });

  let start = 0, end = total - 1;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) {
    if (m[1] === '' && m[2]) { start = Math.max(0, total - Number(m[2])); }
    else { start = Number(m[1] || 0); if (m[2]) end = Math.min(Number(m[2]), total - 1); }
    if (start >= total || start > end) {
      res.set('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }
  }

  res.status(m ? 206 : 200);
  res.set('Content-Type', mimeFor(src.ext));
  res.set('Accept-Ranges', 'bytes');
  res.set('Cache-Control', 'no-store');
  res.set('Content-Length', String(end - start + 1));
  if (m) res.set('Content-Range', `bytes ${start}-${end}/${total}`);

  try {
    for (let pos = start; pos <= end && !ac.signal.aborted; pos += CHUNK) {
      const to = Math.min(pos + CHUNK - 1, end);
      const { r } = await upstreamChunk(id, pos, to, ac.signal);
      for await (const buf of Readable.fromWeb(r.body)) {
        if (!res.write(buf)) await new Promise(ok => res.once('drain', ok));
      }
    }
    res.end();
  } catch (e) {
    if (!ac.signal.aborted) console.error('stream', id, e.message);
    res.destroy();
  }
}

// ---------- Lyrics (NetEase, KuGou, Apple Music via BetterLyrics, LRCLIB — see lyrics.js) ----------
const LYRICS_TTL = 6 * 60 * 60 * 1000;
const LYRICS_MISS_TTL = 10 * 60 * 1000; // a miss may be a source being down: retry sooner
const lyricCache = new Map(); // key -> {at, data}

const cleanTitle = t => String(t || '')
  .replace(/\s*[\(\[【（][^\)\]】）]*?(official|mv|music video|lyric|歌詞|audio|live|版|ver)[^\)\]】）]*[\)\]】）]/gi, '')
  .replace(/\s*-\s*(official|mv).*$/i, '')
  .trim();

app.get('/api/lyrics', async (req, res) => {
  const title = cleanTitle(req.query.title);
  const artist = String(req.query.artist || '').trim();
  const album = String(req.query.album || '').trim();
  const duration = Number(req.query.duration) || 0;
  const pick = String(req.query.pick || '').slice(0, 120); // a version the listener chose before
  if (!title) return res.status(400).json({ error: 'missing title' });
  const key = JSON.stringify([title, artist, duration, pick]);
  const hit = lyricCache.get(key);
  if (hit && Date.now() - hit.at < (hit.data.kind === 'none' ? LYRICS_MISS_TTL : LYRICS_TTL)) return res.json(hit.data);
  let data;
  try {
    data = await findLyrics({ title, artist, album, duration, pick });
  } catch (e) {
    console.error('lyrics', e.message);
    data = { kind: 'none', lines: [], plain: '', options: [] };
  }
  lyricCache.set(key, { at: Date.now(), data });
  if (lyricCache.size > 500) lyricCache.delete(lyricCache.keys().next().value);
  res.json(data);
});

// ---------- Translation ----------
app.post('/api/translate', async (req, res) => {
  const lines = Array.isArray(req.body?.lines) ? req.body.lines.slice(0, 300).map(String) : [];
  const tl = String(req.body?.to || 'zh-TW').replace(/[^A-Za-z-]/g, '') || 'zh-TW';
  if (!lines.length) return res.json({ lines: [] });
  try {
    const out = [];
    for (let i = 0; i < lines.length; i += 40) {
      const chunk = lines.slice(i, i + 40);
      const body = new URLSearchParams({ q: chunk.join('\n') });
      const r = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t`,
        { method: 'POST', body, headers: { 'User-Agent': UA } }
      );
      if (!r.ok) throw new Error(`google translate ${r.status}`); // 429 = rate limited (an HTML page)
      const data = await r.json();
      const parts = (data[0] || []).map(s => s[0]).join('').split('\n');
      for (let j = 0; j < chunk.length; j++) out.push((parts[j] || '').trim());
    }
    res.json({ lines: out });
  } catch (e) {
    console.error('translate', e.message);
    res.status(502).json({ error: 'translate failed' });
  }
});

// ---------- Import a YouTube / YouTube Music playlist ----------
app.get('/api/ytplaylist', async (req, res) => {
  const raw = String(req.query.url || '').trim();
  const m = raw.match(/[?&]list=([A-Za-z0-9_-]+)/) || raw.match(/^(?:VL)?((?:PL|OLAK5uy_|RD|LL|FL|UU)[A-Za-z0-9_-]+)$/);
  if (!m) return res.status(400).json({ error: 'no playlist id' });
  const id = m[1].replace(/^VL/, '');
  try {
    res.json(await playlistTracks(id));
  } catch (e) {
    console.error('ytplaylist', id, e.message);
    res.status(502).json({ error: 'import failed' });
  }
});

// ---------- Library (liked + playlists) saved on the server, one per code ----------
const LIB_FILE = process.env.LIBRARY_FILE || path.join(DATA_DIR, 'library.json'); // the owner's
const LIB_DIR = path.join(DATA_DIR, 'libraries'); // friends': <id>.json
const libFile = user => (user.owner ? LIB_FILE : path.join(LIB_DIR, `${user.id}.json`));
function readLib(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { liked: [], playlists: [], updatedAt: 0 }; }
}
app.get('/api/library', (req, res) => res.json(readLib(libFile(req.user))));
app.put('/api/library', express.json({ limit: '8mb' }), (req, res) => {
  const b = req.body || {};
  if (!Array.isArray(b.liked) || !Array.isArray(b.playlists)) return res.status(400).json({ error: 'bad body' });
  const lib = { liked: b.liked.slice(0, 5000), playlists: b.playlists.slice(0, 500), updatedAt: Number(b.updatedAt) || Date.now() };
  try {
    writeJson(libFile(req.user), lib);
    res.json({ ok: true, updatedAt: lib.updatedAt });
  } catch (e) {
    console.error('library save', e.message);
    res.status(500).json({ error: 'save failed' });
  }
});

// ---------- Friends (owner only): add, list, new code, remove ----------
const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (l/1, o/0, i)
const newCode = () => Array.from({ length: 10 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
const friendOf = u => ({ id: u.id, name: u.name, key: u.key, created: u.created, lastSeen: u.lastSeen || 0 });
const ownerOnly = (req, res, next) => (req.user.owner ? next() : res.status(403).json({ error: 'owner only' }));
const findFriend = (req, res, next) => {
  req.friend = users.find(x => x.id === req.params.id);
  return req.friend ? next() : res.status(404).json({ error: 'no such friend' });
};

app.get('/api/me', (req, res) => res.json({ name: req.user.name, owner: req.user.owner }));
app.get('/api/users', ownerOnly, (req, res) => res.json({ users: users.map(friendOf) }));
app.post('/api/users', ownerOnly, (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 40);
  if (!name) return res.status(400).json({ error: 'missing name' });
  let id;
  do id = crypto.randomBytes(4).toString('hex'); while (users.some(x => x.id === id));
  const u = { id, name, key: newCode(), created: Date.now(), lastSeen: 0 };
  users.push(u);
  saveUsers();
  res.json(friendOf(u));
});
// a new code for the same friend: the old link stops working, the library stays
app.post('/api/users/:id/reset', ownerOnly, findFriend, (req, res) => {
  req.friend.key = newCode();
  saveUsers();
  res.json(friendOf(req.friend));
});
app.delete('/api/users/:id', ownerOnly, findFriend, (req, res) => {
  users = users.filter(x => x !== req.friend);
  saveUsers();
  fs.rmSync(path.join(LIB_DIR, `${req.friend.id}.json`), { force: true });
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true, auth: !!ACCESS_KEY }));

// ---------- Static PWA ----------
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, file) {
    if (/(sw\.js|index\.html|manifest\.json|app\.js|style\.css)$/.test(file)) res.set('Cache-Control', 'no-cache');
  },
}));

app.listen(PORT, process.env.HOST || '0.0.0.0', () => console.log(`Vedia Music on :${PORT} (yt-dlp: ${YTDLP})`));
