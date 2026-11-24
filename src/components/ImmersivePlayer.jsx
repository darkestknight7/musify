import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Film,
  Music,
  Mic2,
  Download,
  CheckCircle2,
  Loader2,
  Sparkles,
  Activity,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { fetchSyncedLyrics, parseLrc, getDownloadUrl, formatTime } from '../api';

export default function ImmersivePlayer({
  open,
  onClose,
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  currentTime = 0,
  duration = 0,
  onSeekTo,
  videoMode,
  onToggleVideoMode,
  videoQuality,
  videoRef,
  analyserNode,
  isOffline,
  isSavingOffline,
  onSaveOffline,
  onMediaEvents,
  volume,
  playbackRate,
}) {
  const canvasRef = useRef(null);
  const activeLineRef = useRef(null);
  const [layout, setLayout] = useState('classic'); // 'classic' | 'glass' | 'waveform'
  const [lyricsState, setLyricsState] = useState({ synced: [], plain: null, source: null });
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  // Fetch synced lyrics via LRCLIB + YouTube Music fallback
  useEffect(() => {
    if (!open || !currentTrack?.videoId) return;
    let cancelled = false;
    setLoadingLyrics(true);
    fetchSyncedLyrics(currentTrack)
      .then((res) => {
        if (cancelled) return;
        setLyricsState({
          synced: parseLrc(res?.syncedLyrics),
          plain: res?.plainLyrics || null,
          source: res?.source || null,
        });
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
  }, [open, currentTrack?.videoId]);

  // Determine active synced lyric index
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

  // Deterministic waveform bars for SoundCloud-style layout
  const waveformBars = useMemo(() => {
    const seedStr = currentTrack?.videoId || 'musify';
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
    return Array.from({ length: 64 }, (_, i) => {
      const val = Math.abs(Math.sin((i + 1) * 0.45 + seed) * 0.65 + Math.cos(i * 0.9 + seed) * 0.35);
      return Math.max(18, Math.round(val * 100));
    });
  }, [currentTrack?.videoId]);

  // Real-time Web Audio Frequency Visualizer
  useEffect(() => {
    if (!open || videoMode || layout === 'glass' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let rafId;

    const draw = () => {
      rafId = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barCount = 48;
      const barWidth = w / barCount - 3;

      if (analyserNode && isPlaying) {
        const data = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(data);
        for (let i = 0; i < barCount; i++) {
          const val = data[i * 2] || 0;
          const barH = Math.max(4, (val / 255) * h * 0.9);
          const grad = ctx.createLinearGradient(0, h - barH, 0, h);
          grad.addColorStop(0, '#ec4899');
          grad.addColorStop(1, '#3b82f6');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(i * (barWidth + 3), h - barH, barWidth, barH, 3);
          ctx.fill();
        }
      } else {
        for (let i = 0; i < barCount; i++) {
          const grad = ctx.createLinearGradient(0, h - 6, 0, h);
          grad.addColorStop(0, '#ec4899');
          grad.addColorStop(1, '#3b82f6');
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.roundRect(i * (barWidth + 3), h - 6, barWidth, 6, 3);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [open, videoMode, layout, analyserNode, isPlaying]);

  if (!open || !currentTrack) return null;

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  const renderLyricsBody = (centered = false) => {
    if (loadingLyrics) {
      return (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
        </div>
      );
    }
    if (lyricsState.synced.length > 0) {
      return (
        <div className={`space-y-4 py-8 ${centered ? 'text-center' : ''}`}>
          {lyricsState.synced.map((line, idx) => {
            const isActive = idx === activeLyricIndex;
            return (
              <p
                key={`${line.time}-${idx}`}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeekTo && onSeekTo(line.time)}
                className={`cursor-pointer transition-all duration-300 leading-snug ${
                  isActive
                    ? `${centered ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'} font-black bg-gradient-to-r from-[#60a5fa] via-[#f0abfc] to-[#ec4899] bg-clip-text text-transparent scale-[1.02]`
                    : `${centered ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'} font-semibold text-white/35 hover:text-white/75`
                }`}
              >
                {line.text}
              </p>
            );
          })}
        </div>
      );
    }
    if (lyricsState.plain) {
      return (
        <pre className={`whitespace-pre-wrap font-sans text-lg leading-relaxed text-white/90 font-semibold ${centered ? 'text-center' : ''}`}>
          {lyricsState.plain}
        </pre>
      );
    }
    return (
      <div className="py-20 text-center text-[#a1a1b5] text-sm">
        Lyrics not available for this track.
      </div>
    );
  };

  return (
    <div className="fixed inset-0 md:bottom-[90px] z-50 md:z-40 bg-[#07070c] flex flex-col overflow-y-auto md:overflow-hidden">
      {/* Ambient Blurred Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-110 pointer-events-none"
        style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#07070c]/80 to-[#07070c] pointer-events-none" />

      {/* Top Controls */}
      <div className="relative z-10 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Song / Video Toggle */}
          <div className="flex items-center bg-[#181826] border border-white/10 rounded-full p-1">
            <button
              onClick={() => videoMode && onToggleVideoMode(false)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                !videoMode
                  ? 'bg-gradient-to-r from-[#3b82f6] to-[#ec4899] text-white shadow'
                  : 'text-[#a1a1b5] hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Song</span>
            </button>
            <button
              onClick={() => !videoMode && onToggleVideoMode(true)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                videoMode
                  ? 'bg-gradient-to-r from-[#3b82f6] to-[#ec4899] text-white shadow'
                  : 'text-[#a1a1b5] hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Video {videoQuality ? `(${videoQuality})` : 'HD'}</span>
            </button>
          </div>

          {/* SimpMusic Now Playing Layout Switcher */}
          {!videoMode && (
            <div className="flex items-center bg-[#181826] border border-white/10 rounded-full p-1">
              {[
                { id: 'classic', label: 'Classic' },
                { id: 'glass', label: 'Glass Lyrics', icon: Sparkles },
                { id: 'waveform', label: 'Waveform', icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLayout(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    layout === tab.id
                      ? 'bg-white/15 text-white'
                      : 'text-[#a1a1b5] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSaveOffline(currentTrack)}
            disabled={isOffline || isSavingOffline}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
              isOffline
                ? 'border-[#3b82f6]/50 bg-[#3b82f6]/15 text-[#60a5fa]'
                : 'border-white/15 bg-white/5 hover:bg-white/10 text-white'
            }`}
          >
            {isSavingOffline ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isOffline ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isOffline ? 'Saved Offline' : isSavingOffline ? 'Saving...' : 'Save Offline'}</span>
          </button>

          <a
            href={getDownloadUrl(currentTrack.videoId, currentTrack.title)}
            download
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#ec4899]" />
            <span>Download Audio</span>
          </a>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {!videoMode && layout === 'glass' ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8 min-h-0">
          <div className="flex items-center gap-4 mb-4">
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-14 h-14 rounded-lg object-cover shadow-lg border border-white/15"
            />
            <div>
              <h2 className="text-lg font-black text-white">{currentTrack.title}</h2>
              <p className="text-xs text-[#a1a1b5]">{currentTrack.artist}</p>
            </div>
          </div>
          <div className="w-full max-w-3xl flex-1 overflow-y-auto no-scrollbar px-4">
            {renderLyricsBody(true)}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 px-8 pb-8 min-h-0 items-center">
          {/* Left: HD Video, Waveform, or Classic Art + Visualizer */}
          <div className="flex flex-col items-center justify-center h-full min-h-0">
            {videoMode ? (
              <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-black shadow-[0_0_50px_rgba(59,130,246,0.25)] border border-white/10">
                <video
                  ref={videoRef}
                  playsInline
                  className="w-full h-full object-contain bg-black"
                  onTimeUpdate={onMediaEvents.onTimeUpdate}
                  onLoadedMetadata={onMediaEvents.onLoadedMetadata}
                  onWaiting={onMediaEvents.onWaiting}
                  onCanPlay={onMediaEvents.onCanPlay}
                  onPlaying={onMediaEvents.onPlaying}
                  onEnded={onMediaEvents.onEnded}
                  volume={volume}
                  playbackRate={playbackRate}
                />
              </div>
            ) : layout === 'waveform' ? (
              <div className="flex flex-col items-center gap-6 w-full max-w-lg">
                <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(59,130,246,0.3)] border border-white/10">
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black text-white">{currentTrack.title}</h2>
                  <p className="text-sm text-[#a1a1b5]">{currentTrack.artist}</p>
                </div>
                {/* SoundCloud-style Interactive Waveform Seekbar */}
                <div className="w-full space-y-2">
                  <div className="h-16 flex items-center gap-[3px] cursor-pointer">
                    {waveformBars.map((heightPct, i) => {
                      const barRatio = i / waveformBars.length;
                      const played = barRatio <= progressRatio;
                      return (
                        <div
                          key={i}
                          onClick={() => onSeekTo && duration > 0 && onSeekTo(barRatio * duration)}
                          style={{ height: `${heightPct}%` }}
                          className={`flex-1 rounded-full transition-colors ${
                            played
                              ? 'bg-gradient-to-t from-[#3b82f6] to-[#ec4899]'
                              : 'bg-white/20 hover:bg-white/40'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-[#a1a1b5] tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 w-full max-w-md">
                <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.3)] border border-white/10">
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black text-white">{currentTrack.title}</h2>
                  <p className="text-sm text-[#a1a1b5]">{currentTrack.artist}</p>
                </div>
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={64}
                  className="w-full max-w-[420px] h-16"
                />
              </div>
            )}
          </div>

          {/* Right: Synced Lyrics */}
          <div className="h-full max-h-[520px] bg-white/5 border border-white/10 rounded-2xl p-6 overflow-y-auto backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#ec4899] mb-2">
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4" />
                <span>{lyricsState.synced.length ? 'Synced Lyrics' : 'Lyrics'}</span>
              </div>
              {lyricsState.source && (
                <span className="text-[10px] text-[#a1a1b5] font-medium normal-case">
                  {lyricsState.source}
                </span>
              )}
            </div>
            {renderLyricsBody(false)}
          </div>
        </div>
      )}

      {/* Mobile Fullscreen Playback Controls (< md) */}
      <div className="md:hidden relative z-10 px-6 pb-6 pt-2 space-y-3 bg-black/50 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center gap-2 text-[11px] text-[#a1a1b5] tabular-nums">
          <span className="w-9 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={(e) => onSeekTo && onSeekTo(parseFloat(e.target.value))}
            className="flex-1 accent-[#ec4899]"
          />
          <span className="w-9">{formatTime(duration)}</span>
        </div>
        <div className="flex items-center justify-center gap-8">
          <button onClick={onPrev} className="p-2 text-white">
            <SkipBack className="w-6 h-6 fill-white" />
          </button>
          <button
            onClick={() => onTogglePlay && onTogglePlay()}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#ec4899] text-white flex items-center justify-center shadow-lg"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
          </button>
          <button onClick={onNext} className="p-2 text-white">
            <SkipForward className="w-6 h-6 fill-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
