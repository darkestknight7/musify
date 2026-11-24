import React, { useEffect, useState } from 'react';
import { Play, Pause, BadgeCheck, Loader2 } from 'lucide-react';
import { fetchArtist } from '../api';
import TrackRow from '../components/TrackRow';
import MediaCard from '../components/MediaCard';

export default function ArtistView({
  artistId,
  savedItems,
  onToggleSaveItem,
  onPlayTrack,
  onPlayCollection,
  currentTrack,
  isPlaying,
  likedIds,
  onToggleLike,
  playlists,
  onAddToPlaylist,
  onNavigate,
}) {
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchArtist(artistId)
      .then((res) => {
        if (!cancelled) setArtist(res);
      })
      .catch(() => {
        if (!cancelled) setArtist(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#ec4899]" />
      </div>
    );
  }

  if (!artist) {
    return <div className="p-8 text-center text-[#a7a7a7]">Artist not found.</div>;
  }

  const isSaved = savedItems.some((item) => item.id === artist.id && item.type === 'artist');
  const isPlayingArtist =
    isPlaying && currentTrack && artist.topSongs.some((t) => t.videoId === currentTrack.videoId);

  return (
    <div className="pb-12">
      {/* Artist Hero */}
      <div className="relative h-64 sm:h-80 flex items-end px-6 pb-6 overflow-hidden bg-[#1e1e1e]">
        {artist.thumbnail && (
          <img
            src={artist.thumbnail}
            alt={artist.name}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/40 to-transparent" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <BadgeCheck className="w-5 h-5 fill-[#3d91f4] text-white" />
            <span>Verified Artist</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
            {artist.name}
          </h1>
          {artist.subscribers && (
            <p className="text-sm text-[#e5e5e5] font-medium">
              {artist.subscribers} subscribers
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-5 flex items-center gap-5">
        <button
          disabled={artist.topSongs.length === 0}
          onClick={() => artist.topSongs.length > 0 && onPlayTrack(artist.topSongs[0], artist.topSongs)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#ec4899] hover:scale-105 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(236,72,153,0.45)] transition-transform"
        >
          {isPlayingArtist ? (
            <Pause className="w-6 h-6 fill-white" />
          ) : (
            <Play className="w-6 h-6 fill-white ml-0.5" />
          )}
        </button>

        <button
          onClick={() =>
            onToggleSaveItem({
              type: 'artist',
              id: artist.id,
              title: artist.name,
              subtitle: 'Artist',
              thumbnail: artist.thumbnail,
            })
          }
          className={`px-5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            isSaved
              ? 'border-[#ec4899] text-[#ec4899]'
              : 'border-[#727272] text-white hover:border-white'
          }`}
        >
          {isSaved ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Popular Songs */}
      {artist.topSongs.length > 0 && (
        <section className="px-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Popular</h2>
          <div className="space-y-0.5">
            {artist.topSongs.map((track, idx) => (
              <TrackRow
                key={track.videoId}
                track={track}
                index={idx}
                isCurrent={currentTrack?.videoId === track.videoId}
                isPlaying={isPlaying}
                isLiked={likedIds.has(track.videoId)}
                playlists={playlists}
                onPlay={() => onPlayTrack(track, artist.topSongs)}
                onToggleLike={onToggleLike}
                onAddToPlaylist={onAddToPlaylist}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      )}

      {/* Discography */}
      {artist.albums.length > 0 && (
        <section className="px-6">
          <h2 className="text-2xl font-bold text-white mb-4">Discography</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {artist.albums.map((album) => (
              <MediaCard
                key={album.id}
                item={album}
                onClick={() => onNavigate({ type: 'album', id: album.id })}
                onPlay={() => onPlayCollection('album', album.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
