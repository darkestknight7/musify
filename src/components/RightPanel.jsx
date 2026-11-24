import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Play, Loader2, Mic2 } from 'lucide-react';
import { fetchSyncedLyrics, parseLrc } from '../api';

export default function RightPanel({
  mode,
  onClose,
  currentTrack,
  currentTime = 0,
  onSeekTo,
  queue,
  queueIndex,
  onPlayTrackFromQueue,
  onNavigate,
}) {
  const [lyricsState, setLyricsState] = useState({ synced: [], plain: null, source: null });
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const activeLineRef = useRef(null);

  useEffect(() => {
    if (mode !== 'lyrics' || !currentTrack?.videoId) return;
    let cancelled = false;
    setLoadingLyrics(true);
    fetchSyncedLyrics(currentTrack)
      .then((res) => {
        if (!cancelled) {
          setLyricsState({
            synced: parseLrc(res?.syncedLyrics),
            plain: res?.plainLyrics || null,
            source: res?.source || null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setLyricsState({ synced: [], plain: null, source: null });
      })
      .finally(() => {
        if (!cancelled) setLoadingLyrics(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, currentTrack?.videoId]);

  const activeLyricIndex = useMemo(() => {
    if (!lyricsState.synced.length) return -1;
    let idx = -1;
    for (let i = 0; i < lyricsState.synced.length; i++) {
      if (currentTime >= lyricsState.synced[i].time) idx = i;
      else break;
    }
    return idx;
  }, [lyricsState.synced, currentTime]);

  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLyricIndex]);

  if (!mode) return null;

  const upcomingTracks = queue.slice(queueIndex + 1);

  return (
    <aside className="w-[300px] xl:w-[340px] flex-shrink-0 bg-[#0d0d14] border border-white/5 rounded-lg flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/5">
        <h2 className="text-base font-bold text-white">
          {mode === 'lyrics' ? (lyricsState.synced.length ? 'Synced Lyrics' : 'Lyrics') : 'Queue'}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-[#a1a1b5] hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {mode === 'lyrics' ? (
          !currentTrack ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#a1a1b5] gap-2">
              <Mic2 className="w-8 h-8 opacity-50" />
              <p className="text-sm">Play a song to view its lyrics</p>
            </div>
          ) : loadingLyrics ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#ec4899]" />
            </div>
          ) : lyricsState.synced.length > 0 ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-white">{currentTrack.title}</p>
                <p className="text-xs text-[#a1a1b5]">{currentTrack.artist}</p>
              </div>
              <div className="space-y-3 py-2">
                {lyricsState.synced.map((line, idx) => {
                  const isActive = idx === activeLyricIndex;
                  return (
                    <p
                      key={`${line.time}-${idx}`}
                      ref={isActive ? activeLineRef : null}
                      onClick={() => onSeekTo && onSeekTo(line.time)}
                      className={`cursor-pointer transition-all text-[15px] leading-snug ${
                        isActive
                          ? 'font-bold bg-gradient-to-r from-[#60a5fa] to-[#ec4899] bg-clip-text text-transparent'
                          : 'text-white/40 hover:text-white/80 font-medium'
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })}
              </div>
              {lyricsState.source && (
                <p className="text-[11px] text-[#7f7f99] pt-2">{lyricsState.source}</p>
              )}
            </div>
          ) : lyricsState.plain ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-white">{currentTrack.title}</p>
                <p className="text-xs text-[#a1a1b5]">{currentTrack.artist}</p>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-[#e5e5e5] font-medium">
                {lyricsState.plain}
              </pre>
              {lyricsState.source && (
                <p className="text-[11px] text-[#7f7f99] pt-2">{lyricsState.source}</p>
              )}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center text-[#a1a1b5] gap-2">
              <p className="text-sm font-medium">No lyrics available for this track</p>
              <p className="text-xs text-[#7f7f99]">Try another song to see lyrics here.</p>
            </div>
          )
        ) : (
          <div className="space-y-5">
            {currentTrack && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#a1a1b5] mb-2">
                  Now Playing
                </h3>
                <div className="flex items-center gap-3 p-2 rounded-md bg-white/5">
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-11 h-11 rounded object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#ec4899] truncate">
                      {currentTrack.title}
                    </p>
                    <p className="text-xs text-[#a1a1b5] truncate">{currentTrack.artist}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#a1a1b5] mb-2">
                Next Up
              </h3>
              {upcomingTracks.length === 0 ? (
                <p className="text-xs text-[#7f7f99] py-4">Queue is empty</p>
              ) : (
                <div className="space-y-1">
                  {upcomingTracks.map((track, idx) => {
                    const actualIdx = queueIndex + 1 + idx;
                    return (
                      <button
                        key={`${track.videoId}-${actualIdx}`}
                        onClick={() => onPlayTrackFromQueue(actualIdx)}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/10 text-left group transition-colors"
                      >
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full rounded object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
                            <Play className="w-4 h-4 fill-white text-white" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{track.title}</p>
                          <p
                            onClick={(e) => {
                              if (track.artistId) {
                                e.stopPropagation();
                                onNavigate({ type: 'artist', id: track.artistId });
                              }
                            }}
                            className="text-xs text-[#a1a1b5] truncate hover:underline"
                          >
                            {track.artist}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
