const API_BASE = '/api';

export async function fetchHome() {
  const res = await fetch(`${API_BASE}/home`);
  if (!res.ok) throw new Error('Failed to load home feed');
  return res.json();
}

export async function searchMusic(query, filter = '') {
  const params = new URLSearchParams({ q: query });
  if (filter) params.set('filter', filter);
  const res = await fetch(`${API_BASE}/search?${params.toString()}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function fetchAlbum(browseId) {
  const res = await fetch(`${API_BASE}/album/${encodeURIComponent(browseId)}`);
  if (!res.ok) throw new Error('Failed to load album');
  return res.json();
}

export async function fetchPlaylist(playlistId) {
  const res = await fetch(`${API_BASE}/playlist/${encodeURIComponent(playlistId)}`);
  if (!res.ok) throw new Error('Failed to load playlist');
  return res.json();
}

export async function fetchArtist(channelId) {
  const res = await fetch(`${API_BASE}/artist/${encodeURIComponent(channelId)}`);
  if (!res.ok) throw new Error('Failed to load artist');
  return res.json();
}

export async function fetchWatchNext(videoId) {
  const res = await fetch(`${API_BASE}/watch/${encodeURIComponent(videoId)}`);
  if (!res.ok) return { tracks: [] };
  return res.json();
}

export async function fetchLyrics(videoId) {
  const res = await fetch(`${API_BASE}/lyrics/${encodeURIComponent(videoId)}`);
  if (!res.ok) return { lyrics: null };
  return res.json();
}

export async function fetchSyncedLyrics(track) {
  if (!track) return { syncedLyrics: null, plainLyrics: null };
  const params = new URLSearchParams({
    title: track.title || '',
    artist: track.artist || '',
    duration: String(track.durationSeconds || 0),
    video_id: track.videoId || '',
  });
  const res = await fetch(`${API_BASE}/synced-lyrics?${params.toString()}`);
  if (!res.ok) return { syncedLyrics: null, plainLyrics: null };
  return res.json();
}

export async function fetchSponsorBlock(videoId) {
  const res = await fetch(`${API_BASE}/sponsorblock/${encodeURIComponent(videoId)}`);
  if (!res.ok) return { segments: [] };
  return res.json();
}

export function parseLrc(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (!match) continue;
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    const ms = parseInt(match[3].padEnd(3, '0'), 10);
    const time = mins * 60 + secs + ms / 1000;
    const text = line.replace(timeRegex, '').trim();
    if (text) parsed.push({ time, text });
  }
  return parsed;
}

export function getAudioStreamUrl(videoId) {
  return `${API_BASE}/audio/${encodeURIComponent(videoId)}`;
}

export function getVideoStreamUrl(videoId) {
  return `${API_BASE}/video/${encodeURIComponent(videoId)}`;
}

export function getDownloadUrl(videoId, title = 'track') {
  return `${API_BASE}/download/${encodeURIComponent(videoId)}?title=${encodeURIComponent(title)}`;
}

export async function fetchVideoInfo(videoId) {
  const res = await fetch(`${API_BASE}/video-info/${encodeURIComponent(videoId)}`);
  if (!res.ok) return { available: false, quality: null };
  return res.json();
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
