import React, { useState } from 'react';
import { Play, Pause, Heart, Plus, Check, Download, CheckCircle2, Loader2 } from 'lucide-react';

export default function TrackRow({
  track,
  index,
  isCurrent,
  isPlaying,
  isLiked,
  isOffline = false,
  isSavingOffline = false,
  playlists = [],
  showAlbum = true,
  onPlay,
  onToggleLike,
  onSaveOffline,
  onAddToPlaylist,
  onNavigate,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      onDoubleClick={onPlay}
      className={`group grid items-center gap-4 px-4 py-2 rounded-md transition-colors ${showAlbum
        ? 'grid-cols-[28px_1fr_minmax(120px,0.7fr)_100px]'
        : 'grid-cols-[28px_1fr_100px]'
        } ${isCurrent ? 'bg-white/10' : 'hover:bg-white/10'}`}
    >
      {/* Index / Play / Equalizer */}
      <div className="flex items-center justify-center text-sm tabular-nums">
        {isCurrent && isPlaying ? (
          <button onClick={onPlay} className="flex items-end gap-[2px] h-4 w-4 justify-center">
            <span className="w-[3px] bg-gradient-to-t from-[#3b82f6] to-[#ec4899] rounded-full eq-bar-1" />
            <span className="w-[3px] bg-gradient-to-t from-[#3b82f6] to-[#ec4899] rounded-full eq-bar-2" />
            <span className="w-[3px] bg-gradient-to-t from-[#3b82f6] to-[#ec4899] rounded-full eq-bar-3" />
          </button>
        ) : (
          <>
            <span className={`group-hover:hidden ${isCurrent ? 'text-[#ec4899] font-semibold' : 'text-[#a1a1b5]'}`}>
              {index + 1}
            </span>
            <button
              onClick={onPlay}
              className="hidden group-hover:flex items-center justify-center text-white"
              aria-label={`Play ${track.title}`}
            >
              {isCurrent && isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
            </button>
          </>
        )}
      </div>

      {/* Title & Artist */}
      <div className="flex items-center gap-3 min-w-0">
        {track.thumbnail && (
          <img
            src={track.thumbnail}
            alt={track.title}
            loading="lazy"
            className="w-10 h-10 rounded object-cover flex-shrink-0 bg-[#282828]"
          />
        )}
        <div className="min-w-0">
          <p className={`text-[15px] font-medium truncate ${isCurrent ? 'text-[#ec4899]' : 'text-white'}`}>
            {track.title}
          </p>
          <p
            onClick={(e) => {
              if (track.artistId && onNavigate) {
                e.stopPropagation();
                onNavigate({ type: 'artist', id: track.artistId });
              }
            }}
            className={`text-[13px] text-[#a7a7a7] truncate ${track.artistId ? 'hover:underline hover:text-white cursor-pointer' : ''
              }`}
          >
            {track.artist}
          </p>
        </div>
      </div>

      {/* Album */}
      {showAlbum && (
        <div className="min-w-0 hidden sm:block">
          <p
            onClick={(e) => {
              if (track.albumId && onNavigate) {
                e.stopPropagation();
                onNavigate({ type: 'album', id: track.albumId });
              }
            }}
            className={`text-[13px] text-[#a7a7a7] truncate ${track.albumId ? 'hover:underline hover:text-white cursor-pointer' : ''
              }`}
          >
            {track.album || 'Single'}
          </p>
        </div>
      )}

      {/* Actions & Duration */}
      <div className="flex items-center justify-end gap-2.5 relative">
        {onSaveOffline && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveOffline(track);
            }}
            title={isOffline ? 'Saved Offline' : 'Save for Offline Playback'}
            className={`transition-opacity ${
              isOffline || isSavingOffline
                ? 'opacity-100 text-[#38bdf8]'
                : 'opacity-0 group-hover:opacity-100 text-[#a1a1b5] hover:text-white'
            }`}
          >
            {isSavingOffline ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isOffline ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(track);
          }}
          title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          className={`transition-opacity ${isLiked ? 'opacity-100 text-[#ec4899]' : 'opacity-0 group-hover:opacity-100 text-[#a1a1b5] hover:text-white'
            }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#ec4899]' : ''}`} />
        </button>

        {playlists.length > 0 && onAddToPlaylist && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              title="Add to playlist"
              className="opacity-0 group-hover:opacity-100 text-[#a7a7a7] hover:text-white transition-opacity"
            >
              <Plus className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                onMouseLeave={() => setMenuOpen(false)}
                className="absolute right-0 bottom-7 z-50 w-44 bg-[#282828] rounded-md shadow-2xl border border-[#3e3e3e] py-1"
              >
                <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#a7a7a7]">
                  Add to playlist
                </p>
                {playlists.map((pl) => {
                  const exists = pl.tracks.some((t) => t.videoId === track.videoId);
                  return (
                    <button
                      key={pl.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToPlaylist(pl.id, track);
                        setMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#3e3e3e] flex items-center justify-between"
                    >
                      <span className="truncate">{pl.name}</span>
                      {exists && <Check className="w-3.5 h-3.5 text-[#38bdf8]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <span className="text-[13px] text-[#a7a7a7] tabular-nums w-10 text-right">
          {track.duration || '—'}
        </span>
      </div>
    </div>
  );
}
