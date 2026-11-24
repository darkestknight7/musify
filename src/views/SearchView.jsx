import React, { useEffect, useState } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { searchMusic } from '../api';
import MediaCard from '../components/MediaCard';
import TrackRow from '../components/TrackRow';

const BROWSE_CATEGORIES = [
  { title: 'Pop', color: '#148a08', query: 'Top Pop Hits' },
  { title: 'Hip-Hop', color: '#bc5900', query: 'Hip Hop Hits' },
  { title: 'Bollywood', color: '#e1118c', query: 'Bollywood Hits' },
  { title: 'Workout', color: '#777777', query: 'Workout Motivation Music' },
  { title: 'Chill & Lo-Fi', color: '#27856b', query: 'Lofi Chill Beats' },
  { title: 'Rock', color: '#e91429', query: 'Best Rock Songs' },
  { title: 'Electronic', color: '#0d73ec', query: 'Electronic Dance Music' },
  { title: 'R&B', color: '#dc148c', query: 'R&B Soul Hits' },
  { title: 'Indie', color: '#608108', query: 'Indie Pop Essentials' },
  { title: 'Focus', color: '#503750', query: 'Deep Focus Instrumental' },
  { title: 'Party', color: '#af2896', query: 'Party Dance Hits' },
  { title: 'Jazz', color: '#477d95', query: 'Smooth Jazz Classics' },
];

export default function SearchView({
  searchQuery,
  onSearchChange,
  onPlayTrack,
  onPlayCollection,
  onNavigate,
  currentTrack,
  isPlaying,
  likedIds,
  offlineIds = new Set(),
  savingIds = new Set(),
  onToggleLike,
  onSaveOffline,
  playlists,
  onAddToPlaylist,
}) {
  const [filter, setFilter] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setResults(null);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      searchMusic(q, filter)
        .then((data) => setResults(data))
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, filter]);

  if (!searchQuery.trim()) {
    return (
      <div className="px-6 pb-12">
        <h2 className="text-2xl font-bold text-white mb-5">Browse all</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {BROWSE_CATEGORIES.map((cat) => (
            <button
              key={cat.title}
              onClick={() => onSearchChange(cat.query)}
              style={{ backgroundColor: cat.color }}
              className="relative h-44 rounded-lg p-4 text-left overflow-hidden hover:brightness-110 transition-all group"
            >
              <span className="text-xl font-extrabold text-white tracking-tight">
                {cat.title}
              </span>
              <div className="absolute -bottom-2 -right-3 w-24 h-24 rounded-md bg-black/25 rotate-[25deg] shadow-xl group-hover:scale-105 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-12 space-y-6">
      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: '', label: 'All' },
          { id: 'songs', label: 'Songs' },
          { id: 'artists', label: 'Artists' },
          { id: 'albums', label: 'Albums' },
          { id: 'playlists', label: 'Playlists' },
        ].map((pill) => (
          <button
            key={pill.id}
            onClick={() => setFilter(pill.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === pill.id
                ? 'bg-gradient-to-r from-[#3b82f6] to-[#ec4899] text-white'
                : 'bg-[#1a1a28] text-white hover:bg-[#252538]'
              }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#a1a1b5]">
          <Loader2 className="w-8 h-8 animate-spin text-[#ec4899]" />
          <p className="text-sm">Searching YouTube Music...</p>
        </div>
      ) : results ? (
        <div className="space-y-8">
          {/* Top Result + Songs Split (Spotify Classic!) */}
          {(results.topResult || results.songs?.length > 0) && filter === '' && (
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
              {/* Top Result */}
              {results.topResult && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">Top result</h2>
                  <div
                    onClick={() => {
                      if (results.topResult.videoId) {
                        onPlayTrack(results.topResult, results.songs);
                      } else {
                        onNavigate({ type: results.topResult.type, id: results.topResult.id });
                      }
                    }}
                    className="group relative bg-[#141420] hover:bg-[#1f1f30] border border-white/5 p-5 rounded-lg cursor-pointer transition-colors"
                  >
                    <img
                      src={results.topResult.thumbnail}
                      alt={results.topResult.title}
                      className={`w-24 h-24 object-cover shadow-lg mb-4 ${results.topResult.type === 'artist' ? 'rounded-full' : 'rounded-md'
                        }`}
                    />
                    <h3 className="text-2xl font-extrabold text-white truncate mb-1">
                      {results.topResult.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-[#a1a1b5]">
                      <span>{results.topResult.artist || results.topResult.subtitle}</span>
                      <span className="px-2 py-0.5 rounded-full bg-black/40 text-white text-xs font-bold uppercase">
                        {results.topResult.type || 'Song'}
                      </span>
                    </div>
                    {results.topResult.videoId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrack(results.topResult, results.songs);
                        }}
                        className="absolute bottom-5 right-5 w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#ec4899] text-white flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 transition-all"
                      >
                        {isPlaying && currentTrack?.videoId === results.topResult.videoId ? (
                          <Pause className="w-5 h-5 fill-white" />
                        ) : (
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Songs List */}
              {results.songs?.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">Songs</h2>
                  <div className="space-y-0.5">
                    {results.songs.slice(0, 4).map((song, idx) => (
                      <TrackRow
                        key={song.videoId}
                        track={song}
                        index={idx}
                        showAlbum={false}
                        isCurrent={currentTrack?.videoId === song.videoId}
                        isPlaying={isPlaying}
                        isLiked={likedIds.has(song.videoId)}
                        isOffline={offlineIds.has(song.videoId)}
                        isSavingOffline={savingIds.has(song.videoId)}
                        playlists={playlists}
                        onPlay={() => onPlayTrack(song, results.songs)}
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
          )}

          {/* Full Songs Table when filtered to Songs */}
          {filter === 'songs' && results.songs?.length > 0 && (
            <div className="space-y-1">
              {results.songs.map((song, idx) => (
                <TrackRow
                  key={song.videoId}
                  track={song}
                  index={idx}
                  isCurrent={currentTrack?.videoId === song.videoId}
                  isPlaying={isPlaying}
                  isLiked={likedIds.has(song.videoId)}
                  isOffline={offlineIds.has(song.videoId)}
                  isSavingOffline={savingIds.has(song.videoId)}
                  playlists={playlists}
                  onPlay={() => onPlayTrack(song, results.songs)}
                  onToggleLike={onToggleLike}
                  onSaveOffline={onSaveOffline}
                  onAddToPlaylist={onAddToPlaylist}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}

          {/* Artists */}
          {results.artists?.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {results.artists.map((artist) => (
                  <MediaCard
                    key={artist.id}
                    item={artist}
                    onClick={() => onNavigate({ type: 'artist', id: artist.id })}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {results.albums?.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {results.albums.map((album) => (
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

          {/* Playlists */}
          {results.playlists?.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Playlists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {results.playlists.map((pl) => (
                  <MediaCard
                    key={pl.id}
                    item={pl}
                    onClick={() => onNavigate({ type: 'playlist', id: pl.id })}
                    onPlay={() => onPlayCollection('playlist', pl.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
