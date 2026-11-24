<div align="center">
  <img src="public/icon.svg" alt="Musify Logo" width="88" height="88" />
  <h1>Musify</h1>
  <p><strong>Free, ad-free cross-platform music &amp; video streaming powered by YouTube Music</strong></p>
  <p>Spotify-inspired desktop &amp; mobile UI • SimpMusic features • Blue, Magenta &amp; Black theme</p>

  <p>
    <a href="https://bd6e72082acca4.app.lhr.life/">
      <img src="https://img.shields.io/badge/Live%20Demo-Open%20Musify-10b981?style=for-the-badge" alt="Live Demo" />
    </a>
  </p>
  <p>
    <a href="https://github.com/darkestknight7/musify/actions/workflows/build-android.yml">
      <img src="https://github.com/darkestknight7/musify/actions/workflows/build-android.yml/badge.svg" alt="Build Status" />
    </a>
    <img src="https://img.shields.io/badge/platforms-Android%20%7C%20iOS%20%7C%20Windows%20%7C%20macOS%20%7C%20Linux-ec4899" alt="Platforms" />
    <img src="https://img.shields.io/badge/frontend-React%20%2B%20Vite%20%2B%20Tailwind-3b82f6" alt="Frontend" />
    <img src="https://img.shields.io/badge/backend-FastAPI%20%2B%20ytmusicapi%20%2B%20yt--dlp-a855f7" alt="Backend" />
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
    </a>
  </p>
  <p><sub>Live tunnel: <a href="https://bd6e72082acca4.app.lhr.life/">https://bd6e72082acca4.app.lhr.life/</a> (active while host server is online)</sub></p>
</div>

---

## Key Features

- **100% Free & Ad-Free Streaming**: Direct audio & video proxying with HTTP Range seeking via `ytmusicapi` and `yt-dlp`.
- **Cross-Platform Responsive UI**: 3-column desktop/tablet workspace and a dedicated mobile bottom navigation bar + mini-player for phones.
- **Offline Downloads (IndexedDB + File Export)**: Cache tracks locally in the browser for true offline playback, or download audio files directly to your device.
- **Song / HD Video Toggle**: Switch seamlessly between audio-only and highest-quality music video playback.
- **Real-Time Synced Lyrics**: Time-synced LRC lyrics from **LRCLIB** (with YouTube Music fallback) featuring auto-scroll and click-to-seek.
- **Multiple Now Playing Layouts**: **Classic** (frequency spectrum visualizer), **Glass Lyrics**, **Waveform** (interactive seek bar), and **Video HD**.
- **SponsorBlock Auto-Skip**: Automatically skips non-music intros, outros, and off-topic segments.
- **Built-in Equalizer, Speed & Sleep Timer**: Web Audio API EQ presets (`Flat`, `Bass Boost`, `Pop`, `Rock`, `Vocal`), `0.75x`–`1.5x` speed, and sleep timer.
- **Listening Receipt**: Tracks plays, minutes listened, offline count, and generates your Music Persona receipt.
- **Installable App (PWA & Capacitor)**: Install directly from Chrome/Edge/Safari on any device, or build a native Android APK / iOS app.

---

## Architecture

| Layer | Stack | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons | Responsive Spotify-style UI, Web Audio EQ & visualizer, IndexedDB offline cache |
| **Backend** | FastAPI, Uvicorn, `ytmusicapi`, `yt-dlp`, `httpx` | YouTube Music metadata, LRCLIB synced lyrics, SponsorBlock, Range-supported audio/video proxy |
| **Mobile** | Capacitor (Android & iOS) + PWA Web Manifest | Native APK builds via GitHub Actions and browser home-screen installation |

---

## Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**

### 1. Clone & Install
```bash
git clone https://github.com/darkestknight7/musify.git
cd musify
pip install -r requirements.txt
npm install
npm run build
```

### 2. Run on Desktop (Windows, macOS, Linux)

- **Windows (PowerShell):**
  ```powershell
  .\start_musify.ps1
  ```
- **macOS / Linux:**
  ```bash
  chmod +x start_musify.sh
  ./start_musify.sh
  ```
- Open **http://127.0.0.1:8000** in Chrome or Edge and click **Install Musify** in the address bar to run it as a standalone desktop app.

---

## Access From Phones & Tablets (Android / iOS)

> **Important:** Do **not** open `127.0.0.1:8000` on your phone or tablet — `127.0.0.1` always refers to the device itself, not your PC. Use one of the options below instead:

### Option A: One-Command Public HTTPS Link (Works on Any Network / Mobile Data)
Run Musify with `--public` to automatically generate an `https://...lhr.life` link you can open on any phone or tablet:
- **Python (Any OS):** `python server.py --public`
- **Windows:** `.\start_musify.ps1 -Public`
- **macOS / Linux:** `./start_musify.sh --public`

Open the printed `https://...lhr.life` link on your phone:
- **Android (Chrome):** Tap `⋮` → **Install app**
- **iPhone / iPad (Safari):** Tap **Share** → **Add to Home Screen**

### Option B: Same Wi-Fi Network
When you start `python server.py`, it prints your PC's local Wi-Fi URL (e.g. `http://192.168.1.x:8000`). Open that URL on any phone/tablet connected to the same Wi-Fi.

### Option C: Native Android APK
Download the pre-built **`Musify-Android-APK`** (`app-debug.apk`) artifact from the [GitHub Actions](https://github.com/darkestknight7/musify/actions) tab, or sync locally:
```bash
npm run build
npx cap sync android
```

---

## API Reference

| Endpoint | Description |
| :--- | :--- |
| `GET /api/health` | Service health check |
| `GET /api/home` | Trending charts & home recommendations |
| `GET /api/search?q=...&filter=...` | Search songs, artists, albums, playlists |
| `GET /api/album/{browse_id}` | Album metadata & tracklist |
| `GET /api/playlist/{playlist_id}` | Playlist metadata & tracklist |
| `GET /api/artist/{channel_id}` | Artist profile, top songs & discography |
| `GET /api/watch/{video_id}` | Up-next radio recommendations |
| `GET /api/synced-lyrics` | Synced LRC lyrics via LRCLIB (with YTM fallback) |
| `GET /api/sponsorblock/{video_id}` | SponsorBlock non-music skip segments |
| `GET /api/audio/{video_id}` | Range-supported ad-free audio stream |
| `GET /api/video/{video_id}` | Range-supported HD video stream |
| `GET /api/download/{video_id}` | Direct audio file download |

---

## Contributing & License
Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.  
Licensed under the [MIT License](LICENSE).
