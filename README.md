# Musify

A free, ad-free cross-platform music & video streaming app powered by YouTube Music, blending a Spotify-style desktop/mobile UI .

**Supported Platforms:** Android • iOS • Windows • macOS • Linux

## Features
- **100% Free & Ad-Free**: Direct audio & video streaming via `ytmusicapi` and `yt-dlp`.
- **Cross-Platform UI**: Desktop 3-column layout, Tablet layout, and Phone bottom-nav + Mini-Player.
- **Free Offline Downloads**: Cache any song in IndexedDB for 100% offline playback, or download the audio file directly.
- **Highest-Quality Video Playback**: Switch seamlessly between **Song** and **Video HD**.
- **Real-Time Synced Lyrics**: Time-synced lyrics from LRCLIB (with YouTube Music fallback) with click-to-seek.
- **Multiple Now Playing Layouts**: Classic Visualizer, Glass Lyrics, SoundCloud-style Waveform, and HD Video.
- **SponsorBlock Auto-Skip**: Automatically skips non-music intros, outros, and off-topic segments.
- **Equalizer, Speed & Sleep Timer**: Built-in Web Audio EQ presets (`Flat`, `Bass Boost`, `Pop`, `Rock`, `Vocal`), speed (`0.75x`–`1.5x`), and sleep timer.
- **Listening Receipt**: View your Music Persona, play count, minutes listened, and recent rotation.

---

## Run on Every Device

### Windows
```powershell
pip install -r requirements.txt
npm install
npm run build
python server.py
```
Or double-click / run `./start_musify.ps1`, then open **http://127.0.0.1:8000** and click **Install Musify** in Chrome/Edge.

### macOS & Linux
```bash
chmod +x start_musify.sh
./start_musify.sh
```
Open **http://127.0.0.1:8000** in Chrome/Edge/Safari and install as an app.

### Android (Native APK + PWA)
- **APK**: Download `Musify-Android-APK` (`app-debug.apk`) from the **GitHub Actions** tab, or build locally with:
  ```bash
  npm run build && npx cap sync android
  ```
- **Phone/Tablet Browser**: Open `http://<YOUR_PC_IP>:8000` on Wi-Fi and tap **Install App**.

### iOS (iPhone & iPad)
- **PWA (No Mac required)**: Open `http://<YOUR_PC_IP>:8000` in Safari → tap **Share** → **Add to Home Screen**.
- **Native Xcode Build (macOS)**:
  ```bash
  npm run build && npx cap add ios && npx cap open ios
  ```
