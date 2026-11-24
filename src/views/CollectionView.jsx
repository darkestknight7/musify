import React, { useEffect, useState } from 'react';
import { Play, Pause, Clock, Heart, Bookmark, BookmarkCheck, Loader2, Music2, Download } from 'lucide-react';
import { fetchAlbum, fetchPlaylist } from '../api';
import TrackRow from '../components/TrackRow';

export default function CollectionView({
  view,
  likedSongs,
  offlineTracks = [],
  offlineIds = new Set(),
  savingIds = new Set(),
  onSaveOffline,
  playlists,
  savedItems,
  onToggleSaveItem,
  onPlayTrack,
  currentTrack,
  isPlaying,
  likedIds,
  onToggleLike,
  onAddToPlaylist,
  onNavigate,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (view.type === 'liked') {
      setData({
        id: 'liked',
        type: 'liked',
        title: 'Liked Songs',
        author: 'You',
        tracks: likedSongs,
        gradient: 'from-[#1d4ed8] via-[#6b21a8] to-[#0d0d14]',
      });
      return;
    }

    if (view.type === 'offline') {
      const totalMb = (
        offlineTracks.reduce((acc, t) => acc + (t.sizeBytes || 0), 0) /
        (1024 * 1024)
      ).toFixed(1);
      setData({
        id: 'offline',
        type: 'offline',
        title: 'Offline Songs',
        author: 'Saved on Device',
        description: `${totalMb} MB cached locally — plays anytime with zero internet.`,
        tracks: offlineTracks,
        gradient: 'from-[#0369a1] via-[#1e3a8a] to-[#0d0d14]',
      });
      return;
    }

    if (view.type === 'custom-playlist') {
      const pl = playlists.find((p) => p.id === view.id);
      setData(
        pl
          ? {
            id: pl.id,
            type: 'playlist',
            title: pl.name,
            author: 'You',
            thumbnail: pl.tracks[0]?.thumbnail || '',
            tracks: pl.tracks,
            gradient: 'from-[#1e3a8a] via-[#4c1d95] to-[#0d0d14]',
          }
          : null
      );
      return;
    }

    let cancelled = false;
    setLoading(true);
    const loader = view.type === 'album' ? fetchAlbum(view.id) : fetchPlaylist(view.id);
    loader
      .then((res) => {
        if (!cancelled) {
          setData({
            ...res,
            gradient: 'from-[#1e3a8a] via-[#701a75] to-[#0d0d14]',
          });
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [view.type, view.id, likedSongs, offlineTracks, playlists]);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#ec4899]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-[#a7a7a7]">
        Collection not found.
      </div>
    );
  }

  const tracks = data.tracks || [];
  const isSaved = savedItems.some((item) => item.id === data.id && item.type === view.type);
  const isPlayingFromHere =
    isPlaying && currentTrack && tracks.some((t) => t.videoId === currentTrack.videoId);

  return (
    <div className="pb-12">
      {/* Spotify Gradient Hero Header */}
      <div className={`px-6 pt-4 pb-6 bg-gradient-to-b ${data.gradient} flex flex-col sm:flex-row items-end gap-6`}>
        {view.type === 'liked' ? (
          <div className="w-44 h-44 sm:w-52 sm:h-52 rounded shadow-2xl bg-gradient-to-br from-[#2563eb] via-[#9333ea] to-[#ec4899] flex items-center justify-center flex-shrink-0">
            <Heart className="w-20 h-20 fill-white text-white" />
          </div>
        ) : view.type === 'offline' ? (
          <div className="w-44 h-44 sm:w-52 sm:h-52 rounded shadow-2xl bg-gradient-to-br from-[#0284c7] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
            <Download className="w-20 h-20 text-white" />
          </div>
        ) : data.thumbnail ? (
          <img
            src={data.thumbnail}
            alt={data.title}
            className="w-44 h-44 sm:w-52 sm:h-52 rounded object-cover shadow-2xl flex-shrink-0 bg-[#282828]"
          />
        ) : (
          <div className="w-44 h-44 sm:w-52 sm:h-52 rounded shadow-2xl bg-[#282828] flex items-center justify-center flex-shrink-0">
            <Music2 className="w-16 h-16 text-[#7f7f7f]" />
          </div>
        )}

        <div className="min-w-0 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-white">
            {view.type === 'album' ? 'Album' : 'Playlist'}
          </p>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight break-words">
            {data.title}
          </h1>
          {data.description && (
            <p className="text-sm text-[#d1d1d1] line-clamp-2 max-w-2xl">{data.description}</p>
          )}
          <div className="flex items-center gap-1.5 text-sm text-white font-medium pt-1">
            <span className="font-bold">{data.artist || data.author || 'Musify'}</span>
            {data.year && <span className="text-[#b3b3b3]">• {data.year}</span>}
            <span className="text-[#b3b3b3]">
              • {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 py-5 flex items-center gap-6">
        <button
          disabled={tracks.length === 0}
          onClick={() => tracks.length > 0 && onPlayTrack(tracks[0], tracks)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#ec4899] hover:scale-105 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(236,72,153,0.45)] disabled:opacity-40 transition-transform"
        >
          {isPlayingFromHere ? (
            <Pause className="w-6 h-6 fill-white" />
          ) : (
            <Play className="w-6 h-6 fill-white ml-0.5" />
          )}
        </button>

        {(view.type === 'album' || view.type === 'playlist') && (
          <button
            onClick={() =>
              onToggleSaveItem({
                type: view.type,
                id: data.id,
                title: data.title,
                subtitle: data.artist || data.author,
                thumbnail: data.thumbnail,
              })
            }
            title={isSaved ? 'Remove from Your Library' : 'Save to Your Library'}
            className="text-[#a1a1b5] hover:text-white transition-colors"
          >
            {isSaved ? (
              <BookmarkCheck className="w-7 h-7 text-[#ec4899]" />
            ) : (
              <Bookmark className="w-7 h-7" />
            )}
          </button>
        )}
      </div>

      {/* Tracklist Header */}
      {tracks.length === 0 ? (
        <div className="px-6 py-12 text-center text-[#a7a7a7]">
          No songs here yet. Search for songs and click the heart or + icon to add them!
        </div>
      ) : (
        <div className="px-6">
          <div className="grid grid-cols-[28px_1fr_minmax(120px,0.7fr)_100px] items-center gap-4 px-4 py-2 border-b border-white/10 text-xs font-medium uppercase tracking-wider text-[#a7a7a7] mb-2">
            <span className="text-center">#</span>
            <span>Title</span>
            <span className="hidden sm:block">Album</span>
            <div className="flex justify-end pr-2">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-0.5">
            {tracks.map((track, idx) => (
              <TrackRow
                key={`${track.videoId}-${idx}`}
                track={track}
                index={idx}
                isCurrent={currentTrack?.videoId === track.videoId}
                isPlaying={isPlaying}
                isLiked={likedIds.has(track.videoId)}
                isOffline={offlineIds.has(track.videoId)}
                isSavingOffline={savingIds.has(track.videoId)}
                playlists={playlists}
                onPlay={() => onPlayTrack(track, tracks)}
                onToggleLike={onToggleLike}
                onSaveOffline={onSaveOffline}
                onAddToPlaylist={onAddToPlaylist}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
