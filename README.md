# Musify

A free, ad-free music & video streaming app powered by YouTube Music, combining a Spotify-style desktop layout with SimpMusic features in a **Blue, Magenta & Black** theme.

## Features
- **100% Free & Ad-Free**: Direct audio & video streaming via `ytmusicapi` and `yt-dlp`.
- **Spotify-Style UI + Custom Theme**: Electric Blue (`#3b82f6`), Neon Magenta (`#ec4899`), and Obsidian Black (`#000000` / `#0d0d14`).
- **Free Offline Downloads**: Cache any song in IndexedDB for 100% offline playback, or download the audio file directly to your device.
- **Highest-Quality Video Playback**: Switch between **Song** and **Video HD** mode seamlessly.
- **Real-Time Synced Lyrics**: Time-synced lyrics from LRCLIB (with YouTube Music fallback) with click-to-seek.
- **Multiple Now Playing Layouts**: Classic Visualizer, Glass Lyrics, SoundCloud-style Waveform, and HD Video.
- **SponsorBlock Auto-Skip**: Automatically skips non-music intros, outros, and off-topic segments.
- **Equalizer, Speed & Sleep Timer**: Built-in Web Audio EQ presets (`Flat`, `Bass Boost`, `Pop`, `Rock`, `Vocal`), playback speed (`0.75x`–`1.5x`), and sleep timer.
- **Listening Receipt**: View your Music Persona, play count, minutes listened, and recent rotation.
- **Installable App (PWA)**: Install directly from Chrome/Edge as a standalone desktop or mobile app.

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
npm install
```

### 2. Build & Run Standalone App
```bash
npm run build
python server.py
```
Open **http://127.0.0.1:8000** in Chrome or Edge, and click the **Install Musify** icon in the address bar to publish/install it as a standalone desktop app!

### Development Mode
Run `./start_musify.ps1` (or `python server.py` + `npm run dev`) to start both servers.
