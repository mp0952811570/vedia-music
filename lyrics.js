// Vedia Music — synced lyrics from several free sources, best match first.
//   NetEase      word-timed (yrc) or line-timed lyrics, plus a Chinese translation for many foreign songs
//   KuGou        word-timed (krc) lyrics, strongest on Mandarin / Cantonese songs
//   BetterLyrics Apple Music word-timed TTML, mostly Western songs
//   LRCLIB       line-timed community lyrics
// Sources and endpoints follow Auralane's src/main/lyrics.js (MIT, © 2026 adam10000423-oss).
//
// Result: { kind: 'word'|'line'|'plain'|'none', id, source, sourceName, lines, plain, options }
//   lines: [{ t, e, text, w?: [[start, end, text], …], tr? }]   (seconds; w = word timings)
//   options: every source that answered, so the listener can switch versions (pick=<id>).
const zlib = require('zlib');
const OpenCC = require('opencc-js');

const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });
const toTaiwan = OpenCC.Converter({ from: 'cn', to: 'twp' });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const LRCLIB_HEADERS = { 'User-Agent': 'VediaMusic/1.0 (https://github.com/mp0952811570/vedia-music)' };
const SOURCE_NAMES = { netease: '網易雲音樂', kugou: '酷狗音樂', better: 'Apple Music', lrclib: 'LRCLIB' };
const KIND_BONUS = { word: 0.12, line: 0.04, plain: 0 };
const MIN_SCORE = 0.6;
const cooldown = new Map(); // source -> time before which it is skipped (after it errored)

async function getJson(url, options = {}, ms = 6000) {
  const r = await fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
  if (!r.ok) {
    const err = new Error(`${new URL(url).host} ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

// ---------- matching ----------
const VARIANT = /cover|翻唱|翻自|原唱|伴奏|伴唱|instrumental|karaoke|remix|\bdj\b|\blive\b|现场|演唱会|demo|acoustic|吉他|钢琴|纯音乐|女声|男声|抖音|片段|铃声|加速|降调|升调/i;
const canon = s => toSimplified(String(s || '').toLowerCase()).replace(/[\s\p{P}\p{S}]+/gu, '');
const stripBrackets = s => String(s || '').replace(/[(（[【].*?[)）\]】]/g, ' ');

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a.includes(b) || b.includes(a) ? 0.8 : 0;
  const grams = s => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) || 0) + 1);
    return m;
  };
  const A = grams(a), B = grams(b);
  let hit = 0;
  for (const [g, n] of A) hit += Math.min(n, B.get(g) || 0);
  const dice = (2 * hit) / (a.length + b.length - 2);
  return a.includes(b) || b.includes(a) ? Math.max(dice, 0.85) : dice;
}

function context({ title, artist, album, duration }) {
  const artists = String(artist || '').split(/\s*(?:[,&、/／;；×]|\bfeat\.?\s|\bft\.?\s|\bx\s)\s*/i).map(s => s.trim()).filter(Boolean);
  return {
    title: String(title || '').trim(),
    artist: artists[0] || '',
    album: String(album || '').trim(),
    duration: Number(duration) || 0,
    titleKey: canon(stripBrackets(title)) || canon(title),
    artistKeys: artists.map(canon).filter(Boolean),
  };
}

function matchScore(c, ctx) {
  const title = Math.max(similarity(canon(stripBrackets(c.title)), ctx.titleKey), similarity(canon(c.title), ctx.titleKey));
  const candArtists = String(c.artist || '').split(/\s*[,&、/／;；]\s*/).map(canon).filter(Boolean);
  let artist = ctx.artistKeys.length ? 0 : 0.5;
  for (const a of ctx.artistKeys) for (const b of candArtists) artist = Math.max(artist, similarity(a, b));
  const d = ctx.duration && c.duration ? Math.abs(c.duration - ctx.duration) : null;
  const dur = d === null ? 0.5 : d <= 2 ? 1 : d <= 5 ? 0.8 : d <= 10 ? 0.4 : 0;
  const variant = VARIANT.test(toSimplified(c.title)) && !VARIANT.test(toSimplified(ctx.title)) ? 0.35 : 0;
  return title < 0.5 ? 0 : title * 0.4 + artist * 0.4 + dur * 0.2 - variant;
}

// ---------- parsers ----------
function parseLrc(text) {
  const out = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const tags = [...raw.matchAll(/\[(\d+):(\d+(?:[.:]\d+)?)\]/g)];
    if (!tags.length) continue;
    const line = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of tags) out.push({ t: Number(m[1]) * 60 + parseFloat(m[2].replace(':', '.')), text: line });
  }
  return out.sort((a, b) => a.t - b.t).filter((l, i, arr) => l.text || (arr[i + 1] && arr[i + 1].t - l.t > 3));
}

// Words of a timed line: the text between consecutive timing marks (a word may itself contain "(").
// offset = 0 for absolute word times (yrc), the line start for relative ones (krc).
function timedWords(content, markRe, offset) {
  const marks = [...content.matchAll(markRe)];
  return marks.map((p, i) => {
    const start = offset + Number(p[1]);
    return [start / 1000, (start + Number(p[2])) / 1000, content.slice(p.index + p[0].length, marks[i + 1]?.index ?? content.length)];
  }).filter(x => x[2]);
}

// NetEase yrc: [lineStartMs,lineDurMs](wordStartMs,wordDurMs,0)word(…)word
function parseYrc(text) {
  const out = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const m = raw.trim().match(/^\[(\d+),(\d+)\](.*)$/);
    if (!m) continue;
    const w = timedWords(m[3], /\((\d+),(\d+),\d+\)/g, 0);
    const line = w.map(x => x[2]).join('').trim();
    if (line) out.push({ t: Number(m[1]) / 1000, e: (Number(m[1]) + Number(m[2])) / 1000, text: line, w });
  }
  return out;
}

// KuGou krc: base64 of "krc1" + XOR'd zlib data; lines are [lineStartMs,lineDurMs]<offsetMs,durMs,0>word…
const KRC_KEY = [64, 71, 97, 119, 94, 50, 116, 71, 81, 54, 49, 45, 206, 210, 110, 105];
function decodeKrc(b64) {
  const buf = Buffer.from(b64, 'base64').subarray(4);
  for (let i = 0; i < buf.length; i++) buf[i] ^= KRC_KEY[i % KRC_KEY.length];
  return zlib.inflateSync(buf).toString('utf8');
}
function parseKrc(text) {
  const out = [];
  let translations = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const lang = raw.match(/^\[language:([^\]]+)\]/);
    if (lang) {
      try {
        const info = JSON.parse(Buffer.from(lang[1], 'base64').toString('utf8'));
        translations = (info.content || []).find(c => c.type === 1)?.lyricContent?.map(x => (x || []).join('')) || [];
      } catch {}
      continue;
    }
    const m = raw.trim().match(/^\[(\d+),(\d+)\](.*)$/);
    if (!m) continue;
    const start = Number(m[1]);
    const w = timedWords(m[3], /<(\d+),(\d+),\d+>/g, start);
    const line = w.map(x => x[2]).join('').trim();
    if (line) out.push({ t: start / 1000, e: (start + Number(m[2])) / 1000, text: line, w });
  }
  out.forEach((l, i) => { if (translations[i]?.trim()) l.tr = translations[i].trim(); });
  return out;
}

// Apple Music TTML (BetterLyrics): <p begin end> … <span begin end>word</span> …. Backing vocals
// (x-bg), translation and romanisation spans are skipped; whitespace between spans separates words.
const decodeEntities = s => String(s).replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (_, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()];
});
function ttmlTime(v) {
  const s = String(v || '').trim();
  let m;
  if ((m = s.match(/^([\d.]+)s$/))) return Number(m[1]);
  if ((m = s.match(/^([\d.]+)ms$/))) return Number(m[1]) / 1000;
  if ((m = s.match(/^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/))) return Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  if ((m = s.match(/^\d+(?:\.\d+)?$/))) return Number(s);
  return null;
}
function parseTtml(xml) {
  const out = [];
  const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  for (const p of String(xml || '').matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const words = [];
    let depth = 0, skipDepth = -1, word = null, space = false, plain = '';
    for (const tok of p[2].matchAll(/<(\/?)span\b([^>]*)>|([^<]+)|<[^>]*>/g)) {
      if (tok[3] !== undefined) {
        if (skipDepth >= 0) continue;
        const text = decodeEntities(tok[3]);
        if (!text.trim()) { space = true; continue; }
        if (word) {
          if (!word.text && /^\s/.test(text)) word.space = true;
          word.text += text;
        } else plain += (space && plain ? ' ' : '') + text.trim();
        space = /\s$/.test(text);
      } else if (tok[1] === '/') {
        if (depth === skipDepth) skipDepth = -1;
        depth = Math.max(0, depth - 1);
        word = null;
      } else if (tok[0].startsWith('<span')) {
        depth++;
        if (skipDepth >= 0) continue;
        if (/role="x-(bg|translation|roman)/.test(tok[2])) { skipDepth = depth; continue; }
        const b = ttmlTime(attr(tok[0], 'begin')), e = ttmlTime(attr(tok[0], 'end'));
        if (b !== null && e !== null) { word = { b, e, text: '', space }; words.push(word); space = false; }
      }
    }
    const w = words.filter(x => x.text.trim()).map((x, i) => [x.b, x.e, (i && x.space ? ' ' : '') + x.text.trim()]);
    const begin = ttmlTime(attr(p[1], 'begin')), end = ttmlTime(attr(p[1], 'end'));
    const text = w.length ? w.map(x => x[2]).join('').trim() : plain.trim();
    if (text && (w.length || begin !== null)) out.push({ t: w.length ? w[0][0] : begin, e: end ?? (w.length ? w[w.length - 1][1] : undefined), text, ...(w.length ? { w } : {}) });
  }
  return out.sort((a, b) => a.t - b.t);
}

function attachTranslation(lines, tl) {
  for (const t of tl) {
    if (!t.text || t.text === '//') continue;
    let best = null, gap = 0.75;
    for (const l of lines) { const d = Math.abs(l.t - t.t); if (d < gap) { gap = d; best = l; } }
    if (best && !best.tr) best.tr = t.text;
  }
}

// ---------- sources ----------
async function neteaseSearch(ctx) {
  const body = new URLSearchParams({ s: `${toSimplified(ctx.title)} ${toSimplified(ctx.artist)}`.trim(), type: 1, offset: 0, limit: 10, total: true });
  const d = await getJson('https://music.163.com/api/cloudsearch/pc', {
    method: 'POST', body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: 'https://music.163.com/', 'User-Agent': UA },
  });
  return (d?.result?.songs || []).map(s => ({
    id: `netease:${s.id}`, source: 'netease', title: s.name || '',
    artist: (s.ar || []).map(a => a.name).join('/'), duration: (s.dt || 0) / 1000,
  }));
}
async function neteaseLyrics(songId) {
  const d = await getJson(`https://music.163.com/api/song/lyric?id=${encodeURIComponent(songId)}&lv=-1&kv=-1&tv=-1&yv=-1`, {
    headers: { Referer: `https://music.163.com/song?id=${encodeURIComponent(songId)}`, 'User-Agent': UA },
  });
  let lines = parseYrc(d?.yrc?.lyric), kind = 'word';
  if (!lines.length) { lines = parseLrc(d?.lrc?.lyric); kind = 'line'; }
  if (!lines.length || (lines.length < 3 && lines.some(l => /纯音乐/.test(l.text)))) return null; // instrumental
  attachTranslation(lines, parseLrc(d?.tlyric?.lyric));
  return { kind, lines };
}

async function kugouSearch(ctx) {
  const ask = async withDuration => {
    const q = new URLSearchParams({ ver: 1, man: 'yes', client: 'pc', keyword: `${toSimplified(ctx.title)} - ${toSimplified(ctx.artist)}` });
    if (withDuration && ctx.duration) q.set('duration', String(Math.round(ctx.duration * 1000)));
    return (await getJson(`https://lyrics.kugou.com/search?${q}`))?.candidates || [];
  };
  let list = await ask(true);
  if (!list.length && ctx.duration) list = await ask(false);
  return list.map(c => ({
    id: `kugou:${c.id}:${c.accesskey}`, source: 'kugou', title: c.song || '', artist: c.singer || '', duration: (c.duration || 0) / 1000,
  }));
}
async function kugouLyrics(id, accesskey) {
  const q = new URLSearchParams({ ver: 1, client: 'pc', id, accesskey, fmt: 'krc', charset: 'utf8' });
  const d = await getJson(`https://lyrics.kugou.com/download?${q}`);
  if (!d?.content) return null;
  const lines = parseKrc(decodeKrc(d.content));
  return lines.length ? { kind: 'word', lines } : null;
}

async function betterLyrics(ctx) {
  if ((cooldown.get('better') || 0) > Date.now()) return null;
  const q = new URLSearchParams({ s: ctx.title, a: ctx.artist });
  if (ctx.duration) q.set('d', String(Math.round(ctx.duration)));
  if (ctx.album) q.set('al', ctx.album);
  try {
    const d = await getJson(`https://lyrics-api.boidu.dev/getLyrics?${q}`, { headers: { 'User-Agent': UA } }, 12000);
    const lines = d?.ttml ? parseTtml(d.ttml) : [];
    if (!lines.length) return null;
    const dur = ttmlTime(String(d.ttml).match(/<body[^>]*\sdur="([^"]+)"/)?.[1]) || 0;
    return { id: 'better', source: 'better', title: ctx.title, artist: ctx.artist, duration: dur, kind: lines.some(l => l.w) ? 'word' : 'line', lines };
  } catch (e) {
    if (e.status !== 404) cooldown.set('better', Date.now() + 10 * 60 * 1000); // 404 is a plain miss
    return null;
  }
}

async function lrclibSearch(ctx) {
  const search = q => getJson(`https://lrclib.net/api/search?${new URLSearchParams(q)}`, { headers: LRCLIB_HEADERS }, 7000).catch(() => []);
  let list = await search({ track_name: ctx.title, artist_name: ctx.artist });
  if (!list.length) list = await search({ q: `${ctx.title} ${ctx.artist}`.trim() });
  return list.map(x => ({ id: `lrclib:${x.id}`, source: 'lrclib', title: x.trackName || '', artist: x.artistName || '', duration: x.duration || 0, data: x }));
}
function lrclibLyrics(x) {
  if (!x || x.instrumental) return null;
  const lines = parseLrc(x.syncedLyrics);
  if (lines.length) return { kind: 'line', lines };
  return x.plainLyrics ? { kind: 'plain', lines: [], plain: x.plainLyrics } : null;
}

// Lyrics for one search candidate (or a remembered pick id).
async function fetchCandidate(c, ctx) {
  const [source, a, b] = c.id.split(':');
  if (source === 'netease') return neteaseLyrics(a);
  if (source === 'kugou') return kugouLyrics(a, b);
  if (source === 'lrclib') return lrclibLyrics(c.data || await getJson(`https://lrclib.net/api/get/${encodeURIComponent(a)}`, { headers: LRCLIB_HEADERS }));
  if (source === 'better') return c.lines ? c : betterLyrics(ctx);
  return null;
}

// ---------- output ----------
const KANA = /[぀-ヿ]/;
const CJK = /[一-鿿]/;
// Simplified → Taiwan Traditional. Translations (always Chinese) are converted for every song;
// the lyrics themselves only when they are Chinese, so Japanese kanji are left alone.
const isChinese = s => CJK.test(s) && !KANA.test(s);
function toTraditional(result) {
  for (const l of result.lines) if (l.tr) l.tr = toTaiwan(l.tr);
  if (!isChinese(result.lines.map(l => l.text).join('') + (result.plain || ''))) return result;
  for (const l of result.lines) {
    if (l.w) {
      // convert the whole line (phrase-aware: 软件 → 軟體) and cut it back into the same words,
      // unless a phrase changed length; then words are converted one by one
      const joined = l.w.map(x => x[2]).join('');
      const conv = toTaiwan(joined);
      if (conv.length === joined.length) {
        let pos = 0;
        for (const x of l.w) { x[2] = conv.slice(pos, pos + x[2].length); pos += x[2].length; }
      } else for (const x of l.w) x[2] = toTaiwan(x[2]);
      l.text = l.w.map(x => x[2]).join('').trim();
    } else l.text = toTaiwan(l.text);
  }
  if (result.plain) result.plain = toTaiwan(result.plain);
  return result;
}

function finish(chosen, options) {
  if (!chosen) return { kind: 'none', lines: [], plain: '', options };
  const lines = chosen.lines.map((l, i, arr) => ({ ...l, e: l.e ?? (arr[i + 1] ? arr[i + 1].t : l.t + 6) }));
  const out = toTraditional({ kind: chosen.kind, id: chosen.id, source: chosen.source, sourceName: SOURCE_NAMES[chosen.source], lines, plain: chosen.plain || '' });
  return { ...out, options };
}
const shown = s => (isChinese(s) ? toTaiwan(s) : s);
// One entry per distinct version (sources often list the same lyrics twice), best first.
function optionsOf(fetched) {
  const seen = new Set();
  return fetched.filter(c => {
    const key = [c.source, c.kind, canon(c.title), canon(c.artist), Math.round(c.duration || 0)].join('|');
    return !seen.has(key) && seen.add(key);
  }).map(c => ({ id: c.id, source: c.source, sourceName: SOURCE_NAMES[c.source], kind: c.kind, title: shown(c.title), artist: shown(c.artist), duration: Math.round(c.duration || 0) }));
}

async function findLyrics(input) {
  const ctx = context(input);
  const settled = await Promise.allSettled([neteaseSearch(ctx), kugouSearch(ctx), lrclibSearch(ctx), betterLyrics(ctx)]);
  const [ne, kg, lr] = settled.slice(0, 3).map(s => (s.status === 'fulfilled' ? s.value : []));
  const better = settled[3].status === 'fulfilled' ? settled[3].value : null;
  const ranked = list => list.map(c => ({ ...c, score: matchScore(c, ctx) })).filter(c => c.score >= MIN_SCORE).sort((a, b) => b.score - a.score);
  const shortlist = [...ranked(ne).slice(0, 2), ...ranked(kg).slice(0, 2), ...ranked(lr).slice(0, 1)];
  const fetched = (await Promise.allSettled(shortlist.map(async c => ({ ...c, ...(await fetchCandidate(c, ctx)) }))))
    .filter(s => s.status === 'fulfilled' && s.value.kind).map(s => s.value);
  // BetterLyrics matches on its side and reports no title; trust it unless its length disagrees
  if (better) fetched.push({ ...better, score: ctx.duration && better.duration && Math.abs(better.duration - ctx.duration) > 10 ? 0.6 : 0.8 });
  fetched.sort((a, b) => (b.score + KIND_BONUS[b.kind]) - (a.score + KIND_BONUS[a.kind]));
  const options = optionsOf(fetched);
  const preferred = input.pick && fetched.find(c => c.id === input.pick);
  if (preferred || !input.pick) return finish(preferred || fetched[0], options);
  // a remembered pick that this search didn't surface: fetch it directly
  try {
    const got = await fetchCandidate({ id: input.pick }, ctx);
    const [source] = input.pick.split(':');
    if (got?.kind) return finish({ ...got, id: input.pick, source }, options);
  } catch {}
  return finish(fetched[0], options);
}

module.exports = { findLyrics };
