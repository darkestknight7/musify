import React, { useEffect, useState } from 'react';
import { Play, Pause, Loader2, Heart, Flame, Headphones, Download } from 'lucide-react';
import { fetchHome } from '../api';
import MediaCard from '../components/MediaCard';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeView({
  onPlayTrack,
  onPlayCollection,
  onNavigate,
  currentTrack,
  isPlaying,
  likedSongs,
  offlineCount = 0,
  stats = { minutes: 0, plays: 0 },
  onOpenReceipt,
  recentlyPlayed,
}) {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchHome()
      .then((data) => {
        if (!cancelled) setHomeData(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const quickPicks = homeData?.quickPicks || [];
  const sections = homeData?.sections || [];

  return (
    <div className="px-6 pb-12 space-y-8">
      {/* Ambient Spotify Gradient Header */}
      <div className="pt-2">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {getGreeting()}
          </h1>

          {/* Addiction / Listening Vibe Stats Strip */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onOpenReceipt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#3b82f6]/20 to-[#ec4899]/20 border border-[#ec4899]/40 text-xs font-bold text-white hover:brightness-110 transition-all"
            >
              <Flame className="w-3.5 h-3.5 text-[#ec4899]" />
              <span>{stats.plays} plays • Receipt</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#e2e2f0]">
              <Headphones className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>{Math.floor(stats.minutes)} min listened</span>
            </div>
            <button
              onClick={() => onNavigate({ type: 'offline' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-xs font-semibold text-[#60a5fa] hover:bg-[#3b82f6]/25 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{offlineCount} offline</span>
            </button>
          </div>
        </div>

        {/* 2x4 Quick Picks Grid (Spotify Signature) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Always show Liked Songs first */}
          <div
            onClick={() => onNavigate({ type: 'liked' })}
            className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded overflow-hidden cursor-pointer transition-colors pr-3"
          >
            <div className="w-14 h-14 flex-shrink-0 bg-gradient-to-br from-[#2563eb] via-[#9333ea] to-[#ec4899] flex items-center justify-center">
              <Heart className="w-6 h-6 fill-white text-white" />
            </div>
            <span className="font-bold text-sm text-white truncate flex-1">
              Liked Songs
            </span>
            {likedSongs.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTrack(likedSongs[0], likedSongs, 0);
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#ec4899] text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 hover:scale-105 transition-all"
              >
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </button>
            )}
          </div>

          {quickPicks.slice(0, 7).map((track) => {
            const isThisPlaying = isPlaying && currentTrack?.videoId === track.videoId;
            return (
              <div
                key={track.videoId}
                onClick={() => onPlayTrack(track, quickPicks)}
                className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded overflow-hidden cursor-pointer transition-colors pr-3"
              >
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-14 h-14 object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className={`font-bold text-sm truncate ${isThisPlaying ? 'text-[#ec4899]' : 'text-white'}`}>
                    {track.title}
                  </p>
                  <p className="text-xs text-[#a1a1b5] truncate">{track.artist}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayTrack(track, quickPicks);
                  }}
                  className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#ec4899] text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 ${isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                >
                  {isThisPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Recently played</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {recentlyPlayed.slice(0, 6).map((track) => (
              <MediaCard
                key={track.videoId}
                item={{ ...track, subtitle: track.artist }}
                isPlayingThis={isPlaying && currentTrack?.videoId === track.videoId}
                onClick={() => onPlayTrack(track, recentlyPlayed)}
                onPlay={() => onPlayTrack(track, recentlyPlayed)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Loading / Error / Sections */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#a1a1b5]">
          <Loader2 className="w-8 h-8 animate-spin text-[#ec4899]" />
          <p className="text-sm">Loading YouTube Music feed...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-lg bg-[#181818] border border-[#282828] text-center space-y-2">
          <p className="text-white font-bold">Could not load Home feed</p>
          <p className="text-sm text-[#a7a7a7]">{error}</p>
        </div>
      )}

      {sections.map((section, idx) => (
        <section key={`${section.title}-${idx}`}>
          <h2 className="text-2xl font-bold text-white mb-4">{section.title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {section.items.slice(0, 6).map((item, i) => {
              const isSong = item.type === 'song' || !!item.videoId;
              const isPlayingThis = isSong && isPlaying && currentTrack?.videoId === item.videoId;
              return (
                <MediaCard
                  key={`${item.id || item.videoId}-${i}`}
                  item={{ ...item, subtitle: item.subtitle || item.artist }}
                  isPlayingThis={isPlayingThis}
                  onClick={() => {
                    if (isSong) {
                      const songList = section.items.filter((x) => x.videoId);
                      onPlayTrack(item, songList);
                    } else {
                      onNavigate({ type: item.type, id: item.id });
                    }
                  }}
                  onPlay={() => {
                    if (isSong) {
                      const songList = section.items.filter((x) => x.videoId);
                      onPlayTrack(item, songList);
                    } else if (item.type === 'album' || item.type === 'playlist') {
                      onPlayCollection(item.type, item.id);
                    }
                  }}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
