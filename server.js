const express = require('express');
const ytdl = require('ytdl-core');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Search endpoint using youtube-search-api
const { search } = require('youtube-search-api');

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({error: 'Missing query'});
  try {
    const results = await search(query, { maxResults: 5 });
    const items = results.map(item => ({
      id: { videoId: item.videoId },
      snippet: {
        title: item.title,
        channelTitle: item.channel,
        thumbnails: {
          medium: { url: item.thumbnails.high ? item.thumbnails.high : item.thumbnails.default }
        }
      }
    }));
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({error: 'Search failed'});
  }
});

// Audio proxy endpoint
app.get('/api/audio/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).send('Invalid video ID');
  }
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    // Request audio-only format (highest quality audio)
    const info = ytdl.getInfo(url);
    info.then(info => {
      const audioFormat = ytdl.filterFormats(info.formats, 'audioonly');
      if (!audioFormat.length) {
        // fallback to any format with audio
        const fmt = ytdl.chooseFormat(info.formats, { quality: 'highest' });
        return ytdl(url, { format: fmt }).pipe(res);
      }
      const format = ytdl.chooseFormat(audioFormat, { quality: 'highest' });
      res.setHeader('Content-Type', 'audio/mpeg');
      ytdl(url, { format: format }).pipe(res);
    }).catch(err => {
      console.error(err);
      res.status(500).send('Unable to retrieve audio');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
});

// Lyrics endpoint using LRCLIB
app.get('/api/lyrics', async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) return res.status(400).json({error: 'Missing videoId'});
  // First try to get lyrics from LRCLIB by searching video title? LRCLIB doesn't accept videoId directly.
  // We'll need to fetch video metadata to get title/artist, then query LRCLIB.
  // For simplicity, we'll fetch info from ytdl to get title and artist.
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const info = await ytdl.getInfo(info);
    const title = info.videoDetails.title;
    const artist = info.videoDetails.author.name; // uploader
    // Query LRCLIB
    const lrclibUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
    const lrResp = await fetch(lrclibUrl);
    if (!lrResp.ok) {
      // fallback: no lyrics
      return res.json({lyrics: '', translation: '', lrc: ''});
    }
    const data = await lrResp.json();
    const lrc = data.syncedLyrics || '';
    const plainLyrics = data.lyrics || '';
    // translation not provided by LRCLIB; we can leave empty
    res.json({lrc, lyrics: plainLyrics, translation: ''});
  } catch (e) {
    console.error(e);
    res.json({lrc: '', lyrics: '', translation: ''});
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});