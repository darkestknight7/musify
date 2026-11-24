import React, { useState } from 'react';
import { Home, Search, Library, Plus, Heart, Music2, Trash2, Download } from 'lucide-react';

export default function Sidebar({
  activeView,
  onNavigate,
  likedSongs,
  offlineTracks = [],
  playlists,
  savedItems,
  onCreatePlaylist,
  onDeletePlaylist,
}) {
  const [libraryFilter, setLibraryFilter] = useState('all');

  const showPlaylists = libraryFilter === 'all' || libraryFilter === 'playlists';
  const showSaved = libraryFilter === 'all' || libraryFilter === 'saved';

  return (
    <aside className="w-[280px] xl:w-[300px] flex-shrink-0 flex flex-col gap-2 h-full select-none">
      {/* Top Navigation Card */}
      <div className="bg-[#0d0d14] border border-white/5 rounded-lg px-3 py-3 flex flex-col gap-1">
        {/* Cool New Musify Logo: Electric Blue-to-Magenta Sonic Prism */}
        <button
          onClick={() => onNavigate({ type: 'home' })}
          className="flex items-center gap-3 px-3 py-2 mb-1 text-left group"
        >
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#3b82f6] via-[#a855f7] to-[#ec4899] flex items-center justify-center shadow-[0_0_18px_rgba(236,72,153,0.45)] group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(59,130,246,0.65)] transition-all">
            <svg viewBox="0 0 32 32" className="w-5 h-5 fill-none">
              <path
                d="M6.5 22.5V9.5l5.5 6.5 5.5-6.5v13"
                stroke="#ffffff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21.5 14v8.5M25.5 10.5v12"
                stroke="#ffffff"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-[#60a5fa] via-[#e879f9] to-[#ec4899] bg-clip-text text-transparent">
            Musify
          </span>
        </button>

        <button
          onClick={() => onNavigate({ type: 'home' })}
          className={`flex items-center gap-5 px-3 py-2.5 rounded-md font-bold text-[15px] transition-colors ${
            activeView.type === 'home'
              ? 'text-white bg-white/5'
              : 'text-[#a1a1b5] hover:text-white'
          }`}
        >
          <Home className={`w-6 h-6 ${activeView.type === 'home' ? 'text-[#3b82f6]' : ''}`} strokeWidth={activeView.type === 'home' ? 2.5 : 2} />
          <span>Home</span>
        </button>

        <button
          onClick={() => onNavigate({ type: 'search' })}
          className={`flex items-center gap-5 px-3 py-2.5 rounded-md font-bold text-[15px] transition-colors ${
            activeView.type === 'search'
              ? 'text-white bg-white/5'
              : 'text-[#a1a1b5] hover:text-white'
          }`}
        >
          <Search className={`w-6 h-6 ${activeView.type === 'search' ? 'text-[#ec4899]' : ''}`} strokeWidth={activeView.type === 'search' ? 2.5 : 2} />
          <span>Search</span>
        </button>
      </div>

      {/* Your Library Card */}
      <div className="bg-[#0d0d14] border border-white/5 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <button
            onClick={() => setLibraryFilter('all')}
            className="flex items-center gap-3 text-[#a1a1b5] hover:text-white transition-colors font-bold text-[15px]"
          >
            <Library className="w-6 h-6" />
            <span>Your Library</span>
          </button>
          <button
            onClick={onCreatePlaylist}
            title="Create playlist"
            className="p-1.5 rounded-full text-[#a1a1b5] hover:text-white hover:bg-white/10 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'playlists', label: 'Playlists' },
            { id: 'saved', label: 'Albums & Artists' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setLibraryFilter(libraryFilter === pill.id ? 'all' : pill.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                libraryFilter === pill.id
                  ? 'bg-gradient-to-r from-[#3b82f6] to-[#ec4899] text-white'
                  : 'bg-[#1a1a28] text-[#e2e2f0] hover:bg-[#252538]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Library Items List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {/* Liked Songs */}
          {showPlaylists && (
            <button
              onClick={() => onNavigate({ type: 'liked' })}
              className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors group ${
                activeView.type === 'liked' ? 'bg-[#1a1a2a]' : 'hover:bg-white/5'
              }`}
            >
              <div className="w-12 h-12 rounded flex-shrink-0 bg-gradient-to-br from-[#2563eb] via-[#9333ea] to-[#ec4899] flex items-center justify-center shadow">
                <Heart className="w-5 h-5 fill-white text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] font-medium truncate ${activeView.type === 'liked' ? 'text-[#ec4899]' : 'text-white'}`}>
                  Liked Songs
                </p>
                <p className="text-xs text-[#a1a1b5] truncate">
                  Playlist • {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'}
                </p>
              </div>
            </button>
          )}

          {/* Offline Downloads */}
          {showPlaylists && (
            <button
              onClick={() => onNavigate({ type: 'offline' })}
              className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors group ${
                activeView.type === 'offline' ? 'bg-[#1a1a2a]' : 'hover:bg-white/5'
              }`}
            >
              <div className="w-12 h-12 rounded flex-shrink-0 bg-gradient-to-br from-[#0284c7] to-[#3b82f6] flex items-center justify-center shadow">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] font-medium truncate ${activeView.type === 'offline' ? 'text-[#38bdf8]' : 'text-white'}`}>
                  Offline Songs
                </p>
                <p className="text-xs text-[#a1a1b5] truncate">
                  Downloads • {offlineTracks.length} {offlineTracks.length === 1 ? 'song' : 'songs'}
                </p>
              </div>
            </button>
          )}

          {/* User Created Playlists */}
          {showPlaylists && playlists.map((pl) => {
            const isActive = activeView.type === 'custom-playlist' && activeView.id === pl.id;
            return (
              <div
                key={pl.id}
                onClick={() => onNavigate({ type: 'custom-playlist', id: pl.id })}
                className={`w-full flex items-center gap-3 p-2 rounded-md text-left cursor-pointer transition-colors group ${
                  isActive ? 'bg-[#1a1a2a]' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-12 h-12 rounded flex-shrink-0 bg-[#1c1c2a] overflow-hidden flex items-center justify-center">
                  {pl.tracks[0]?.thumbnail ? (
                    <img src={pl.tracks[0].thumbnail} alt={pl.name} className="w-full h-full object-cover" />
                  ) : (
                    <Music2 className="w-5 h-5 text-[#a1a1b5]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] font-medium truncate ${isActive ? 'text-[#ec4899]' : 'text-white'}`}>
                    {pl.name}
                  </p>
                  <p className="text-xs text-[#a1a1b5] truncate">
                    Playlist • {pl.tracks.length} {pl.tracks.length === 1 ? 'song' : 'songs'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePlaylist(pl.id);
                  }}
                  title="Delete playlist"
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-[#a1a1b5] hover:text-white transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {/* Saved Albums / Artists / YT Playlists */}
          {showSaved && savedItems.map((item) => {
            const isActive =
              (activeView.type === item.type && activeView.id === item.id);
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => onNavigate({ type: item.type, id: item.id })}
                className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                  isActive ? 'bg-[#1a1a2a]' : 'hover:bg-white/5'
                }`}
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className={`w-12 h-12 flex-shrink-0 object-cover bg-[#1c1c2a] ${
                    item.type === 'artist' ? 'rounded-full' : 'rounded'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] font-medium truncate ${isActive ? 'text-[#ec4899]' : 'text-white'}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-[#a1a1b5] truncate capitalize">
                    {item.type} {item.subtitle ? `• ${item.subtitle}` : ''}
                  </p>
                </div>
              </button>
            );
          })}

          {playlists.length === 0 && savedItems.length === 0 && (
            <div className="mt-4 mx-2 p-4 rounded-lg bg-[#161624] border border-white/5 space-y-2">
              <p className="text-sm font-bold text-white">Create your first playlist</p>
              <p className="text-xs text-[#a1a1b5]">It&apos;s easy, we&apos;ll help you</p>
              <button
                onClick={onCreatePlaylist}
                className="mt-2 px-4 py-1.5 bg-gradient-to-r from-[#3b82f6] to-[#ec4899] text-white text-xs font-bold rounded-full hover:scale-105 transition-transform"
              >
                Create playlist
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
