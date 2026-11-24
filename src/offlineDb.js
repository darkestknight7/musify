const DB_NAME = 'musify_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOfflineTrack(track, onProgress) {
  const url = `/api/download/${encodeURIComponent(track.videoId)}?title=${encodeURIComponent(track.title)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to download track');

  const contentLength = Number(res.headers.get('content-length') || 0);
  const reader = res.body?.getReader();
  let blob;

  if (reader && contentLength > 0 && onProgress) {
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress(Math.min(99, Math.round((received / contentLength) * 100)));
    }
    blob = new Blob(chunks, { type: res.headers.get('content-type') || 'audio/mp4' });
  } else {
    blob = await res.blob();
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      ...track,
      blob,
      sizeBytes: blob.size,
      savedAt: Date.now(),
    });
    tx.oncomplete = () => {
      if (onProgress) onProgress(100);
      resolve(true);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineTrackBlobUrl(videoId) {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(videoId);
    req.onsuccess = () => {
      const record = req.result;
      if (record?.blob) {
        resolve(URL.createObjectURL(record.blob));
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

export async function listOfflineTracks() {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const items = (req.result || []).map(({ blob, ...meta }) => meta);
      items.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      resolve(items);
    };
    req.onerror = () => resolve([]);
  });
}

export async function removeOfflineTrack(videoId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(videoId);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
