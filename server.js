// Vedia Music — backend
//   GET  /api/search?q=        YouTube Music song search
//   GET  /api/upnext/:id       related songs (radio / autoplay queue)
//   GET  /api/stream/:id       audio-only stream proxy (yt-dlp resolves, Range supported)
//   GET  /api/prepare/:id      pre-resolve a stream (used to prefetch the next track)
//   GET  /api/lyrics?title=&artist=&duration=   synced lyrics (LRCLIB)
//   POST /api/translate {lines, to}             line-by-line lyric translation
const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { Readable } = require('stream');

const PORT = process.env.PORT || 3000;
const LOCAL_YTDLP = path.join(os.homedir(), '.local/bin/yt-dlp');
const YTDLP = process.env.YTDLP_BIN || (fs.existsSync(LOCAL_YTDLP) ? LOCAL_YTDLP : 'yt-dlp');
const ACCESS_KEY = process.env.ACCESS_KEY || ''; // optional password: ?key= or x-vedia-key header
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));

if (ACCESS_KEY) {
  app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    const k = req.get('x-vedia-key') || req.query.key;
    if (k === ACCESS_KEY) return next();
    res.status(401).json({ error: 'unauthorized' });
  });
}

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

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'missing q' });
  try {
    const y = await getYtm();
    const songs = await y.searchSongs(q);
    res.json({
      items: songs.filter(s => s.videoId).slice(0, 25).map(s => ({
        id: s.videoId,
        title: s.name,
        artist: s.artist?.name || '',
        album: s.album?.name || '',
        duration: s.duration || 0,
        cover: pickThumb(s.thumbnails),
      })),
    });
  } catch (e) {
    console.error('search', e.message);
    ytmPromise = null;
    res.status(502).json({ error: 'search failed' });
  }
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
        '--no-warnings', '--no-playlist',
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
  if (!ID_RE.test(req.params.id)) return res.status(400).end();
  try { await resolveStream(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(502).json({ ok: false, detail: e.message }); }
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

app.get('/api/stream/:id', async (req, res) => {
  const id = req.params.id;
  if (!ID_RE.test(id)) return res.status(400).end();
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
});

// ---------- Lyrics (LRCLIB) ----------
const lyricCache = new Map();
const LRCLIB_HEADERS = { 'User-Agent': 'VediaMusic/1.0 (https://github.com/mp0952811570/vedia-music)' };

const cleanTitle = t => String(t || '')
  .replace(/\s*[\(\[【（][^\)\]】）]*?(official|mv|music video|lyric|歌詞|audio|live|版|ver)[^\)\]】）]*[\)\]】）]/gi, '')
  .replace(/\s*-\s*(official|mv).*$/i, '')
  .trim();

app.get('/api/lyrics', async (req, res) => {
  const title = cleanTitle(req.query.title);
  const artist = String(req.query.artist || '').split(/[,&、]/)[0].trim();
  const duration = Number(req.query.duration) || 0;
  if (!title) return res.status(400).json({ error: 'missing title' });
  const key = `${title}|${artist}|${duration}`;
  if (lyricCache.has(key)) return res.json(lyricCache.get(key));

  let result = { synced: '', plain: '', source: '' };
  try {
    const qs = new URLSearchParams({ track_name: title, artist_name: artist });
    if (duration) qs.set('duration', String(duration));
    let r = await fetch(`https://lrclib.net/api/get?${qs}`, { headers: LRCLIB_HEADERS });
    let hit = r.ok ? await r.json() : null;
    if (!hit || (!hit.syncedLyrics && !hit.plainLyrics)) {
      const sq = new URLSearchParams({ q: `${title} ${artist}`.trim() });
      r = await fetch(`https://lrclib.net/api/search?${sq}`, { headers: LRCLIB_HEADERS });
      const list = r.ok ? await r.json() : [];
      const scored = (Array.isArray(list) ? list : [])
        .map(x => ({ x, s: (x.syncedLyrics ? 2 : 0) + (duration && Math.abs((x.duration || 0) - duration) <= 3 ? 3 : 0) }))
        .sort((a, b) => b.s - a.s);
      hit = scored[0]?.x || null;
    }
    if (hit) result = { synced: hit.syncedLyrics || '', plain: hit.plainLyrics || '', source: 'LRCLIB' };
  } catch (e) {
    console.error('lyrics', e.message);
  }
  lyricCache.set(key, result);
  if (lyricCache.size > 1000) lyricCache.delete(lyricCache.keys().next().value);
  res.json(result);
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

app.get('/api/health', (req, res) => res.json({ ok: true, auth: !!ACCESS_KEY }));

// ---------- Static PWA ----------
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, file) {
    if (/(sw\.js|index\.html|manifest\.json|app\.js|style\.css)$/.test(file)) res.set('Cache-Control', 'no-cache');
  },
}));

app.listen(PORT, process.env.HOST || '0.0.0.0', () => console.log(`Vedia Music on :${PORT} (yt-dlp: ${YTDLP})`));
