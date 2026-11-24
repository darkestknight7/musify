import React from 'react';
import { Heart, Download, Plus, Music2, Trash2 } from 'lucide-react';

export default function LibraryView({
  likedSongs,
  offlineTracks,
  playlists,
  savedItems,
  onNavigate,
  onCreatePlaylist,
  onDeletePlaylist,
}) {
  return (
    <div className="px-4 sm:px-6 pb-12 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-extrabold text-white">Your Library</h1>
        <button
          onClick={onCreatePlaylist}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#ec4899] text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      <div className="space-y-2">
        {/* Liked Songs */}
        <button
          onClick={() => onNavigate({ type: 'liked' })}
          className="w-full flex items-center gap-3.5 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-left"
        >
          <div className="w-14 h-14 rounded-md bg-gradient-to-br from-[#2563eb] via-[#9333ea] to-[#ec4899] flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 fill-white text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-white truncate">Liked Songs</p>
            <p className="text-xs text-[#a1a1b5]">{likedSongs.length} songs</p>
          </div>
        </button>

        {/* Offline Songs */}
        <button
          onClick={() => onNavigate({ type: 'offline' })}
          className="w-full flex items-center gap-3.5 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-left"
        >
          <div className="w-14 h-14 rounded-md bg-gradient-to-br from-[#0284c7] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-white truncate">Offline Songs</p>
            <p className="text-xs text-[#a1a1b5]">{offlineTracks.length} downloaded</p>
          </div>
        </button>

        {/* Custom Playlists */}
        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => onNavigate({ type: 'custom-playlist', id: pl.id })}
            className="w-full flex items-center gap-3.5 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-left cursor-pointer"
          >
            <div className="w-14 h-14 rounded-md bg-[#1c1c2a] overflow-hidden flex items-center justify-center flex-shrink-0">
              {pl.tracks[0]?.thumbnail ? (
                <img src={pl.tracks[0].thumbnail} alt={pl.name} className="w-full h-full object-cover" />
              ) : (
                <Music2 className="w-6 h-6 text-[#a1a1b5]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-white truncate">{pl.name}</p>
              <p className="text-xs text-[#a1a1b5]">Playlist • {pl.tracks.length} songs</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeletePlaylist(pl.id);
              }}
              className="p-2 text-[#a1a1b5] hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Saved Albums & Artists */}
        {savedItems.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            onClick={() => onNavigate({ type: item.type, id: item.id })}
            className="w-full flex items-center gap-3.5 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-left"
          >
            <img
              src={item.thumbnail}
              alt={item.title}
              className={`w-14 h-14 object-cover flex-shrink-0 bg-[#1c1c2a] ${
                item.type === 'artist' ? 'rounded-full' : 'rounded-md'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-white truncate">{item.title}</p>
              <p className="text-xs text-[#a1a1b5] capitalize truncate">
                {item.type} {item.subtitle ? `• ${item.subtitle}` : ''}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
