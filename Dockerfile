FROM node:22-bookworm-slim

# yt-dlp standalone binary (no Python needed) + certificates
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && curl -fsSL -o /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux \
 && chmod +x /usr/local/bin/yt-dlp \
 && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production YTDLP_BIN=/usr/local/bin/yt-dlp
EXPOSE 3000
# refresh yt-dlp on every boot (YouTube changes often), then start
CMD ["sh", "-c", "yt-dlp -U >/dev/null 2>&1 || true; exec node server.js"]
