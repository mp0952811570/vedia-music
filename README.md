# Vedia Music

<img src="public/icons/icon-192.png" width="96" align="right">

Music lives here — 手機也能用的 YouTube Music 播放器（PWA）。

- 無廣告：伺服器用 yt-dlp 取得純音訊串流，瀏覽器直接播放音訊檔
- 鎖屏 / 背景繼續播放，鎖定畫面與耳機可控制播放、暫停、上一首、下一首、拖曳進度
- YouTube Music 歌曲搜尋，播完自動接推薦歌曲（電台模式）
- 同步歌詞（LRCLIB），點歌詞跳轉、±0.5 秒時間微調、一鍵翻譯成繁體中文
- 播放佇列、收藏、最近播放（存在手機本機）
- 可「加到主畫面」當 App 使用

## 部署（Railway）

1. Railway → New Project → Deploy from GitHub → 選這個 repo（會自動用 Dockerfile 建置）
2. Service → Settings → Networking → **Generate Domain**
3. （建議）Variables 新增 `ACCESS_KEY=你的通行碼`，避免別人用你的伺服器。第一次開網頁會要求輸入一次。

## 本機執行

需要 Node.js 18+ 與 [yt-dlp](https://github.com/yt-dlp/yt-dlp)。

```bash
npm install
npm start          # http://localhost:3000
```

環境變數：`PORT`、`ACCESS_KEY`（選用）、`YTDLP_BIN`（yt-dlp 路徑）。

## 加到手機主畫面

- iPhone：Safari 開網址 → 分享 → 加入主畫面
- Android：Chrome 開網址 → 選單 → 安裝應用程式

> 非官方用戶端，與 Google / YouTube 無關。僅供個人使用。
