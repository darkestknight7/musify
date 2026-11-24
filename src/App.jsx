import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import PlayerBar from './components/PlayerBar';
import RightPanel from './components/RightPanel';
import ImmersivePlayer from './components/ImmersivePlayer';
import ListeningReceiptModal from './components/ListeningReceiptModal';
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import CollectionView from './views/CollectionView';
import ArtistView from './views/ArtistView';
import { fetchAlbum, fetchPlaylist, fetchWatchNext } from './api';
import { listOfflineTracks, saveOfflineTrack, removeOfflineTrack } from './offlineDb';

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  // Navigation history
  const [history, setHistory] = useState([{ type: 'home' }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const activeView = history[historyIndex];

  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef(null);

  // Library state persisted in localStorage
  const [likedSongs, setLikedSongs] = useState(() => loadStorage('musify_liked', []));
  const [playlists, setPlaylists] = useState(() => loadStorage('musify_playlists', []));
  const [savedItems, setSavedItems] = useState(() => loadStorage('musify_saved', []));
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => loadStorage('musify_recent', []));
  const [stats, setStats] = useState(() => loadStorage('musify_stats', { minutes: 0, plays: 0 }));

  // Offline IndexedDB state
  const [offlineTracks, setOfflineTracks] = useState([]);
  const [savingIds, setSavingIds] = useState(new Set());

  // Player state
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // 'off' | 'all' | 'one'
  const [rightPanel, setRightPanel] = useState(null); // null | 'lyrics' | 'queue'
  const [videoMode, setVideoMode] = useState(false);
  const [immersiveOpen, setImmersiveOpen] = useState(false);
  const [analyserNode, setAnalyserNode] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const seekFnRef = useRef(null);
  const videoRef = useRef(null);
  const mediaEventsRef = useRef({});

  // Create Playlist Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    listOfflineTracks().then(setOfflineTracks);
  }, []);

  useEffect(() => {
    localStorage.setItem('musify_liked', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('musify_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('musify_saved', JSON.stringify(savedItems));
  }, [savedItems]);

  useEffect(() => {
    localStorage.setItem('musify_recent', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  useEffect(() => {
    localStorage.setItem('musify_stats', JSON.stringify(stats));
  }, [stats]);

  const likedIds = useMemo(() => new Set(likedSongs.map((s) => s.videoId)), [likedSongs]);
  const offlineIds = useMemo(() => new Set(offlineTracks.map((s) => s.videoId)), [offlineTracks]);

  const currentTrack = queue[queueIndex] || null;

  // Navigation helpers
  const navigate = (nextView) => {
    const curr = history[historyIndex];
    if (curr.type === nextView.type && curr.id === nextView.id) return;
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(nextView);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setImmersiveOpen(false);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      if (mainRef.current) mainRef.current.scrollTop = 0;
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      if (mainRef.current) mainRef.current.scrollTop = 0;
    }
  };

  const recordRecent = (track) => {
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.videoId !== track.videoId);
      return [track, ...filtered].slice(0, 20);
    });
    setStats((s) => ({ ...s, plays: s.plays + 1 }));
  };

  const handleSaveOffline = async (track) => {
    if (!track?.videoId) return;
    if (offlineIds.has(track.videoId)) {
      await removeOfflineTrack(track.videoId);
      setOfflineTracks(await listOfflineTracks());
      return;
    }
    setSavingIds((prev) => new Set(prev).add(track.videoId));
    try {
      await saveOfflineTrack(track);
      setOfflineTracks(await listOfflineTracks());
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(track.videoId);
        return next;
      });
    }
  };

  // Play a track
  const playTrack = (track, list = null, index = null) => {
    if (!track) return;

    if (currentTrack?.videoId === track.videoId) {
      setIsPlaying((p) => !p);
      return;
    }

    if (list && list.length > 0) {
      const idx = index !== null ? index : list.findIndex((t) => t.videoId === track.videoId);
      setQueue(list);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else {
      setQueue([track]);
      setQueueIndex(0);
    }

    setIsPlaying(true);
    recordRecent(track);

    if (!list || list.length <= 1) {
      fetchWatchNext(track.videoId).then((res) => {
        if (res?.tracks?.length > 0) {
          setQueue((prev) => {
            if (prev[0]?.videoId === track.videoId && prev.length === 1) {
              return [track, ...res.tracks];
            }
            return prev;
          });
        }
      });
    }
  };

  const playCollection = async (type, id) => {
    try {
      const data = type === 'album' ? await fetchAlbum(id) : await fetchPlaylist(id);
      if (data?.tracks?.length > 0) {
        playTrack(data.tracks[0], data.tracks, 0);
      }
    } catch {
      // Ignore collection fetch error
    }
  };

  const handleNext = () => {
    if (queue.length === 0) return;

    if (shuffle && queue.length > 1) {
      let nextIdx = Math.floor(Math.random() * queue.length);
      if (nextIdx === queueIndex) nextIdx = (queueIndex + 1) % queue.length;
      setQueueIndex(nextIdx);
      setIsPlaying(true);
      recordRecent(queue[nextIdx]);
      return;
    }

    if (queueIndex < queue.length - 1) {
      const nextIdx = queueIndex + 1;
      setQueueIndex(nextIdx);
      setIsPlaying(true);
      recordRecent(queue[nextIdx]);
    } else if (repeat === 'all') {
      setQueueIndex(0);
      setIsPlaying(true);
      recordRecent(queue[0]);
    } else if (currentTrack) {
      fetchWatchNext(currentTrack.videoId).then((res) => {
        if (res?.tracks?.length > 0) {
          setQueue((prev) => [...prev, ...res.tracks]);
          setQueueIndex((i) => i + 1);
          setIsPlaying(true);
          recordRecent(res.tracks[0]);
        } else {
          setIsPlaying(false);
        }
      });
    }
  };

  const handlePrev = () => {
    if (queue.length === 0) return;
    const prevIdx = queueIndex > 0 ? queueIndex - 1 : repeat === 'all' ? queue.length - 1 : 0;
    setQueueIndex(prevIdx);
    setIsPlaying(true);
    recordRecent(queue[prevIdx]);
  };

  const toggleLike = (track) => {
    if (!track) return;
    setLikedSongs((prev) => {
      const exists = prev.some((t) => t.videoId === track.videoId);
      if (exists) return prev.filter((t) => t.videoId !== track.videoId);
      return [track, ...prev];
    });
  };

  const toggleSaveItem = (item) => {
    setSavedItems((prev) => {
      const exists = prev.some((x) => x.id === item.id && x.type === item.type);
      if (exists) return prev.filter((x) => !(x.id === item.id && x.type === item.type));
      return [item, ...prev];
    });
  };

  const handleCreatePlaylist = (e) => {
    e.preventDefault();
    const name = newPlaylistName.trim() || `My Playlist #${playlists.length + 1}`;
    const newPl = { id: `pl-${Date.now()}`, name, tracks: [] };
    setPlaylists((prev) => [newPl, ...prev]);
    setNewPlaylistName('');
    setShowCreateModal(false);
    navigate({ type: 'custom-playlist', id: newPl.id });
  };

  const handleDeletePlaylist = (id) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (activeView.type === 'custom-playlist' && activeView.id === id) {
      navigate({ type: 'home' });
    }
  };

  const handleAddToPlaylist = (playlistId, track) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const exists = pl.tracks.some((t) => t.videoId === track.videoId);
        return {
          ...pl,
          tracks: exists
            ? pl.tracks.filter((t) => t.videoId !== track.videoId)
            : [...pl.tracks, track],
        };
      })
    );
  };

  const toggleRightPanel = (panel) => {
    setRightPanel((curr) => (curr === panel ? null : panel));
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Main 3-Column Workspace */}
      <div className="flex-1 flex gap-2 p-2 min-h-0 overflow-hidden">
        <Sidebar
          activeView={activeView}
          onNavigate={navigate}
          likedSongs={likedSongs}
          offlineTracks={offlineTracks}
          playlists={playlists}
          savedItems={savedItems}
          onCreatePlaylist={() => setShowCreateModal(true)}
          onDeletePlaylist={handleDeletePlaylist}
        />

        {/* Center Main Content */}
        <main
          ref={mainRef}
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 20)}
          className="flex-1 bg-[#0d0d14] border border-white/5 rounded-lg overflow-y-auto relative min-w-0"
        >
          {activeView.type === 'home' && (
            <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#1e3a8a]/55 via-[#86198f]/25 to-transparent pointer-events-none" />
          )}

          <TopBar
            canGoBack={historyIndex > 0}
            canGoForward={historyIndex < history.length - 1}
            onBack={goBack}
            onForward={goForward}
            activeView={activeView}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNavigate={navigate}
            scrolled={scrolled}
          />

          <div className="relative z-10">
            {activeView.type === 'home' && (
              <HomeView
                onPlayTrack={playTrack}
                onPlayCollection={playCollection}
                onNavigate={navigate}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                likedSongs={likedSongs}
                offlineCount={offlineTracks.length}
                stats={stats}
                onOpenReceipt={() => setReceiptOpen(true)}
                recentlyPlayed={recentlyPlayed}
              />
            )}

            {activeView.type === 'search' && (
              <SearchView
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onPlayTrack={playTrack}
                onPlayCollection={playCollection}
                onNavigate={navigate}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                likedIds={likedIds}
                offlineIds={offlineIds}
                savingIds={savingIds}
                onToggleLike={toggleLike}
                onSaveOffline={handleSaveOffline}
                playlists={playlists}
                onAddToPlaylist={handleAddToPlaylist}
              />
            )}

            {(activeView.type === 'liked' ||
              activeView.type === 'offline' ||
              activeView.type === 'custom-playlist' ||
              activeView.type === 'album' ||
              activeView.type === 'playlist') && (
              <CollectionView
                view={activeView}
                likedSongs={likedSongs}
                offlineTracks={offlineTracks}
                offlineIds={offlineIds}
                savingIds={savingIds}
                onSaveOffline={handleSaveOffline}
                playlists={playlists}
                savedItems={savedItems}
                onToggleSaveItem={toggleSaveItem}
                onPlayTrack={playTrack}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                likedIds={likedIds}
                onToggleLike={toggleLike}
                onAddToPlaylist={handleAddToPlaylist}
                onNavigate={navigate}
              />
            )}

            {activeView.type === 'artist' && (
              <ArtistView
                artistId={activeView.id}
                savedItems={savedItems}
                onToggleSaveItem={toggleSaveItem}
                onPlayTrack={playTrack}
                onPlayCollection={playCollection}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                likedIds={likedIds}
                onToggleLike={toggleLike}
                playlists={playlists}
                onAddToPlaylist={handleAddToPlaylist}
                onNavigate={navigate}
              />
            )}
          </div>
        </main>

        <RightPanel
          mode={rightPanel}
          onClose={() => setRightPanel(null)}
          currentTrack={currentTrack}
          currentTime={currentTime}
          onSeekTo={(sec) => seekFnRef.current && seekFnRef.current(sec)}
          queue={queue}
          queueIndex={queueIndex}
          onPlayTrackFromQueue={(idx) => {
            setQueueIndex(idx);
            setIsPlaying(true);
            recordRecent(queue[idx]);
          }}
          onNavigate={navigate}
        />
      </div>

      {/* Immersive Fullscreen Theater (HD Video + Visualizer + Synced Lyrics + Layouts) */}
      <ImmersivePlayer
        open={immersiveOpen}
        onClose={() => setImmersiveOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onSeekTo={(sec) => seekFnRef.current && seekFnRef.current(sec)}
        videoMode={videoMode}
        onToggleVideoMode={setVideoMode}
        videoRef={videoRef}
        analyserNode={analyserNode}
        isOffline={currentTrack ? offlineIds.has(currentTrack.videoId) : false}
        isSavingOffline={currentTrack ? savingIds.has(currentTrack.videoId) : false}
        onSaveOffline={handleSaveOffline}
        onMediaEvents={mediaEventsRef.current}
      />

      {/* Bottom Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={(force) => setIsPlaying((p) => (typeof force === 'boolean' ? force : !p))}
        onNext={handleNext}
        onPrev={handlePrev}
        shuffle={shuffle}
        onToggleShuffle={() => setShuffle((s) => !s)}
        repeat={repeat}
        onCycleRepeat={() =>
          setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))
        }
        isLiked={currentTrack ? likedIds.has(currentTrack.videoId) : false}
        onToggleLike={toggleLike}
        rightPanel={rightPanel}
        onToggleRightPanel={toggleRightPanel}
        onNavigate={navigate}
        isOffline={currentTrack ? offlineIds.has(currentTrack.videoId) : false}
        isSavingOffline={currentTrack ? savingIds.has(currentTrack.videoId) : false}
        onSaveOffline={handleSaveOffline}
        videoMode={videoMode}
        onToggleVideoMode={setVideoMode}
        immersiveOpen={immersiveOpen}
        onToggleImmersive={() => setImmersiveOpen((o) => !o)}
        videoRef={videoRef}
        onAnalyserReady={setAnalyserNode}
        onMediaEventsRef={mediaEventsRef}
        onTrackListenedSeconds={(sec) =>
          setStats((s) => ({ ...s, minutes: s.minutes + sec / 60 }))
        }
        onTimeSync={(t, d) => {
          setCurrentTime(t);
          if (d) setDuration(d);
        }}
        onRegisterSeek={(fn) => {
          seekFnRef.current = fn;
        }}
        onSponsorSkipToast={(msg) => {
          setToast(msg);
          setTimeout(() => setToast(null), 3000);
        }}
      />

      {/* SponsorBlock Toast */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#ec4899] text-white text-xs font-bold shadow-xl">
          {toast}
        </div>
      )}

      {/* Listening Receipt Modal */}
      <ListeningReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        stats={stats}
        recentlyPlayed={recentlyPlayed}
        likedCount={likedSongs.length}
        offlineCount={offlineTracks.length}
      />

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreatePlaylist}
            className="w-full max-w-sm bg-[#161624] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4"
          >
            <h2 className="text-xl font-bold text-white">Create playlist</h2>
            <input
              type="text"
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder={`My Playlist #${playlists.length + 1}`}
              className="w-full px-3.5 py-2.5 rounded bg-[#222236] text-white placeholder-[#a1a1b5] text-sm outline-none focus:ring-2 focus:ring-[#ec4899]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-full text-sm font-bold text-[#a1a1b5] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-[#3b82f6] to-[#ec4899] text-white hover:opacity-95"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
