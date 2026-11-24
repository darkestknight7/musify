import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  Mic2,
  ListMusic,
  Loader2,
  Film,
  Maximize2,
  Download,
  CheckCircle2,
  Sliders,
  Moon,
} from 'lucide-react';
import {
  formatTime,
  getAudioStreamUrl,
  getVideoStreamUrl,
  getDownloadUrl,
  fetchVideoInfo,
  fetchSponsorBlock,
} from '../api';
import { getOfflineTrackBlobUrl } from '../offlineDb';

const EQ_PRESETS = {
  Flat: { bass: 0, mid: 0, treble: 0 },
  'Bass Boost': { bass: 8, mid: -1, treble: 2 },
  Pop: { bass: 3, mid: 4, treble: 3 },
  Rock: { bass: 5, mid: 2, treble: 5 },
  Vocal: { bass: -2, mid: 6, treble: 2 },
};

export default function PlayerBar({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  shuffle,
  onToggleShuffle,
  repeat,
  onCycleRepeat,
  isLiked,
  onToggleLike,
  rightPanel,
  onToggleRightPanel,
  onNavigate,
  isOffline,
  isSavingOffline,
  onSaveOffline,
  videoMode,
  onToggleVideoMode,
  immersiveOpen,
  onToggleImmersive,
  videoRef,
  onAnalyserReady,
  onMediaEventsRef,
  onTrackListenedSeconds,
  onTimeSync,
  onRegisterSeek,
  onSponsorSkipToast,
}) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('musify_volume');
    return saved !== null ? parseFloat(saved) : 0.85;
  });
  const [prevVolume, setPrevVolume] = useState(0.85);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  // Addiction / Power features: EQ, Speed, Sleep Timer, Video Quality
  const [eqPreset, setEqPreset] = useState('Flat');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showEqMenu, setShowEqMenu] = useState(false);
  const [sleepTimerMins, setSleepTimerMins] = useState(null);
  const [sleepEndOfTrack, setSleepEndOfTrack] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [videoQuality, setVideoQuality] = useState(null);
  const [sponsorBlockEnabled, setSponsorBlockEnabled] = useState(true);
  const sponsorSegmentsRef = useRef([]);
  const skippedSegmentsRef = useRef(new Set());

  // Web Audio API nodes for Equalizer + Visualizer
  const audioCtxRef = useRef(null);
  const bassFilterRef = useRef(null);
  const midFilterRef = useRef(null);
  const trebleFilterRef = useRef(null);
  const connectedMediaRef = useRef(new WeakSet());

  const activeMediaEl = videoMode && immersiveOpen ? videoRef.current : audioRef.current;

  // Setup Web Audio API EQ + Analyser on <audio>
  const ensureAudioGraph = (mediaEl) => {
    if (!mediaEl || connectedMediaRef.current.has(mediaEl)) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const source = ctx.createMediaElementSource(mediaEl);
      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 120;

      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1;

      const treble = ctx.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 6000;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;

      source.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(analyser);
      analyser.connect(ctx.destination);

      bassFilterRef.current = bass;
      midFilterRef.current = mid;
      trebleFilterRef.current = treble;
      connectedMediaRef.current.add(mediaEl);
      if (onAnalyserReady) onAnalyserReady(analyser);
    } catch {
      // Fallback safely if Web Audio is blocked
    }
  };

  // Apply EQ preset
  useEffect(() => {
    const preset = EQ_PRESETS[eqPreset] || EQ_PRESETS.Flat;
    if (bassFilterRef.current) bassFilterRef.current.gain.value = preset.bass;
    if (midFilterRef.current) midFilterRef.current.gain.value = preset.mid;
    if (trebleFilterRef.current) trebleFilterRef.current.gain.value = preset.treble;
  }, [eqPreset]);

  // Sleep Timer countdown
  useEffect(() => {
    if (!sleepTimerMins) return;
    const id = setTimeout(() => {
      onTogglePlay(false);
      setSleepTimerMins(null);
    }, sleepTimerMins * 60 * 1000);
    return () => clearTimeout(id);
  }, [sleepTimerMins]);

  // Check video quality & SponsorBlock segments when track changes
  useEffect(() => {
    if (!currentTrack?.videoId) return;
    setVideoQuality(null);
    sponsorSegmentsRef.current = [];
    skippedSegmentsRef.current = new Set();

    fetchVideoInfo(currentTrack.videoId).then((info) => {
      if (info?.available) setVideoQuality(info.quality || 'HD');
    });
    if (sponsorBlockEnabled) {
      fetchSponsorBlock(currentTrack.videoId).then((res) => {
        sponsorSegmentsRef.current = res?.segments || [];
      });
    }
  }, [currentTrack?.videoId, sponsorBlockEnabled]);

  useEffect(() => {
    if (onRegisterSeek) {
      onRegisterSeek((sec) => {
        if (activeMediaEl) {
          activeMediaEl.currentTime = sec;
          setCurrentTime(sec);
        }
      });
    }
  }, [activeMediaEl, onRegisterSeek]);

  // Load track (Offline IndexedDB first, then online audio or HD video)
  useEffect(() => {
    if (!currentTrack) return;
    let cancelled = false;
    let objectUrl = null;

    const loadSource = async () => {
      const targetEl = videoMode && immersiveOpen ? videoRef.current : audioRef.current;
      const otherEl = videoMode && immersiveOpen ? audioRef.current : videoRef.current;
      if (otherEl) {
        otherEl.pause();
        otherEl.removeAttribute('src');
      }
      if (!targetEl) return;

      const resumeTime = 0;
      setCurrentTime(0);
      setDuration(currentTrack.durationSeconds || 0);
      setIsBuffering(true);

      let srcUrl = null;
      if (videoMode && immersiveOpen) {
        srcUrl = getVideoStreamUrl(currentTrack.videoId);
      } else {
        const offlineUrl = await getOfflineTrackBlobUrl(currentTrack.videoId);
        if (cancelled) {
          if (offlineUrl) URL.revokeObjectURL(offlineUrl);
          return;
        }
        if (offlineUrl) {
          objectUrl = offlineUrl;
          srcUrl = offlineUrl;
        } else {
          srcUrl = getAudioStreamUrl(currentTrack.videoId);
        }
      }

      if (targetEl === audioRef.current) {
        ensureAudioGraph(targetEl);
      }
      targetEl.src = srcUrl;
      targetEl.volume = volume;
      targetEl.playbackRate = playbackRate;
      targetEl.currentTime = resumeTime;
      targetEl.load();

      if (isPlaying) {
        targetEl.play().catch(() => {});
      }
    };

    loadSource();

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Musify',
        artwork: currentTrack.thumbnail
          ? [{ src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
      navigator.mediaSession.setActionHandler('play', () => onTogglePlay(true));
      navigator.mediaSession.setActionHandler('pause', () => onTogglePlay(false));
      navigator.mediaSession.setActionHandler('previoustrack', onPrev);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [currentTrack?.videoId, videoMode, immersiveOpen]);

  // Sync play/pause
  useEffect(() => {
    const el = activeMediaEl;
    if (!el || !currentTrack) return;
    if (isPlaying) {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isPlaying, activeMediaEl]);

  // Sync volume & playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (videoRef.current) videoRef.current.volume = volume;
    localStorage.setItem('musify_volume', String(volume));
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Spacebar shortcut
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        if (currentTrack) onTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentTrack, onTogglePlay]);

  const lastTickRef = useRef(0);
  const handleTimeUpdate = (e) => {
    const el = e.currentTarget;
    if (!el || isSeeking) return;
    setCurrentTime(el.currentTime);
    if (el.duration && !isNaN(el.duration)) {
      setDuration(el.duration);
    }
    if (onTimeSync) onTimeSync(el.currentTime, el.duration || duration);

    // SponsorBlock auto-skip non-music segments
    if (sponsorBlockEnabled && sponsorSegmentsRef.current.length > 0) {
      for (const seg of sponsorSegmentsRef.current) {
        const key = `${seg.start}-${seg.end}`;
        if (
          !skippedSegmentsRef.current.has(key) &&
          el.currentTime >= seg.start &&
          el.currentTime < seg.end - 0.5
        ) {
          skippedSegmentsRef.current.add(key);
          el.currentTime = seg.end;
          if (onSponsorSkipToast) {
            onSponsorSkipToast(`Skipped ${seg.category.replace('_', ' ')} (SponsorBlock)`);
          }
          break;
        }
      }
    }

    const now = Date.now();
    if (now - lastTickRef.current >= 5000 && isPlaying) {
      lastTickRef.current = now;
      if (onTrackListenedSeconds) onTrackListenedSeconds(5);
    }
  };

  const handleEnded = () => {
    if (sleepEndOfTrack) {
      setSleepEndOfTrack(false);
      onTogglePlay(false);
      return;
    }
    if (repeat === 'one' && activeMediaEl) {
      activeMediaEl.currentTime = 0;
      activeMediaEl.play().catch(() => {});
    } else {
      onNext();
    }
  };

  const mediaHandlers = {
    onTimeUpdate: handleTimeUpdate,
    onLoadedMetadata: (e) => {
      if (e.currentTarget?.duration) setDuration(e.currentTarget.duration);
    },
    onWaiting: () => setIsBuffering(true),
    onCanPlay: () => setIsBuffering(false),
    onPlaying: () => setIsBuffering(false),
    onEnded: handleEnded,
  };

  useEffect(() => {
    if (onMediaEventsRef) onMediaEventsRef.current = mediaHandlers;
  });

  const handleSeekChange = (e) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const handleSeekCommit = (e) => {
    const val = parseFloat(e.target.value);
    if (activeMediaEl) activeMediaEl.currentTime = val;
    setIsSeeking(false);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 0.8);
    }
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const volumePct = Math.round(volume * 100);

  return (
    <footer className="bg-black border-t border-white/10 select-none z-50">
      <audio ref={audioRef} {...mediaHandlers} />

      {/* Mobile Mini-Player (< md) */}
      {currentTrack && (
        <div
          onClick={onToggleImmersive}
          className="md:hidden relative px-3 py-2 flex items-center justify-between gap-3 bg-[#12121e] mx-2 mt-1.5 rounded-xl border border-white/10 shadow-lg cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-10 h-10 rounded-md object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-[11px] text-[#a1a1b5] truncate">{currentTrack.artist}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onToggleLike(currentTrack)}
              className="p-1.5 text-[#a1a1b5] hover:text-white"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#ec4899] text-[#ec4899]' : ''}`} />
            </button>
            <button
              onClick={() => onTogglePlay()}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#ec4899] text-white flex items-center justify-center"
            >
              {isBuffering && isPlaying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>
          </div>
          {/* Thin bottom progress bar */}
          <div className="absolute left-3 right-3 bottom-0 h-[2px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#3b82f6] to-[#ec4899]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Desktop & Tablet Player Bar (>= md) */}
      <div className="hidden md:flex h-[90px] px-4 items-center justify-between gap-4">

      {/* Left: Track Info + Offline / Download */}
      <div className="w-[30%] min-w-[200px] flex items-center gap-3">
        {currentTrack ? (
          <>
            <div
              onClick={onToggleImmersive}
              className="relative w-14 h-14 rounded overflow-hidden bg-[#181826] flex-shrink-0 shadow cursor-pointer group"
            >
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p
                  onClick={onToggleImmersive}
                  className="text-sm font-medium text-white truncate hover:underline cursor-pointer"
                >
                  {currentTrack.title}
                </p>
                {isOffline && (
                  <CheckCircle2 title="Available Offline" className="w-3.5 h-3.5 text-[#3b82f6] flex-shrink-0" />
                )}
              </div>
              <button
                onClick={() => {
                  if (currentTrack.artistId) {
                    onNavigate({ type: 'artist', id: currentTrack.artistId });
                  }
                }}
                className="text-xs text-[#a1a1b5] hover:text-white hover:underline truncate block max-w-full text-left"
              >
                {currentTrack.artist}
              </button>
            </div>
            <button
              onClick={() => onToggleLike(currentTrack)}
              title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
              className="p-1.5 text-[#a1a1b5] hover:text-white transition-transform active:scale-90 flex-shrink-0"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#ec4899] text-[#ec4899]' : ''}`} />
            </button>
            <button
              onClick={() => onSaveOffline(currentTrack)}
              disabled={isOffline || isSavingOffline}
              title={isOffline ? 'Saved for Offline' : 'Save for Offline Playback'}
              className={`p-1.5 transition-colors flex-shrink-0 ${
                isOffline ? 'text-[#3b82f6]' : 'text-[#a1a1b5] hover:text-white'
              }`}
            >
              {isSavingOffline ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#3b82f6]" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          </>
        ) : (
          <div className="text-xs text-[#7f7f99] pl-2">Pick a song to start listening</div>
        )}
      </div>

      {/* Center: Playback Controls & Progress Bar */}
      <div className="flex-1 max-w-[600px] flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-5">
          <button
            onClick={onToggleShuffle}
            title="Shuffle"
            className={`relative p-1 transition-colors ${
              shuffle ? 'text-[#38bdf8]' : 'text-[#a1a1b5] hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            {shuffle && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#38bdf8]" />
            )}
          </button>

          <button
            onClick={onPrev}
            disabled={!currentTrack}
            title="Previous"
            className="p-1 text-[#b3b3b3] hover:text-white disabled:opacity-40 transition-colors"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={() => currentTrack && onTogglePlay()}
            disabled={!currentTrack}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#ec4899] text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-40 transition-transform shadow-[0_0_12px_rgba(236,72,153,0.45)]"
          >
            {isBuffering && isPlaying ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!currentTrack}
            title="Next"
            className="p-1 text-[#b3b3b3] hover:text-white disabled:opacity-40 transition-colors"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={onCycleRepeat}
            title={`Repeat: ${repeat}`}
            className={`relative p-1 transition-colors ${
              repeat !== 'off' ? 'text-[#ec4899]' : 'text-[#a1a1b5] hover:text-white'
            }`}
          >
            {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            {repeat !== 'off' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#ec4899]" />
            )}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex items-center gap-2 text-[11px] text-[#a1a1b5] tabular-nums">
          <span className="w-9 text-right">{formatTime(currentTime)}</span>
          <div className="relative flex-1 h-3 flex items-center group">
            <div className="w-full h-1 bg-[#2a2a3d] rounded-full overflow-hidden">
              <div
                className="h-full bg-white group-hover:bg-gradient-to-r group-hover:from-[#3b82f6] group-hover:to-[#ec4899] transition-colors rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              disabled={!currentTrack}
              onMouseDown={() => setIsSeeking(true)}
              onTouchStart={() => setIsSeeking(true)}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="w-9">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Video Toggle, EQ/Speed, Sleep Timer, Lyrics, Queue, Volume, Fullscreen */}
      <div className="w-[30%] min-w-[240px] flex items-center justify-end gap-2 relative">
        {/* HD Video Mode Toggle */}
        <button
          onClick={() => {
            if (!currentTrack) return;
            if (!immersiveOpen) onToggleImmersive();
            onToggleVideoMode(!videoMode);
          }}
          title={videoQuality ? `Play HD Video (${videoQuality})` : 'Switch to Video Mode'}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-colors ${
            videoMode && immersiveOpen
              ? 'bg-gradient-to-r from-[#3b82f6] to-[#ec4899] text-white'
              : 'text-[#a1a1b5] hover:text-white hover:bg-white/10'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{videoQuality || 'Video'}</span>
        </button>

        {/* Equalizer & Speed */}
        <div className="relative">
          <button
            onClick={() => {
              setShowEqMenu((s) => !s);
              setShowSleepMenu(false);
            }}
            title="Equalizer & Speed"
            className={`p-1.5 transition-colors ${
              eqPreset !== 'Flat' || playbackRate !== 1 ? 'text-[#38bdf8]' : 'text-[#a1a1b5] hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>
          {showEqMenu && (
            <div className="absolute right-0 bottom-10 w-52 bg-[#161624] border border-white/10 rounded-xl p-3 shadow-2xl space-y-3 z-50">
              <div>
                <p className="text-[11px] font-bold uppercase text-[#a1a1b5] mb-1.5">Equalizer</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(EQ_PRESETS).map((name) => (
                    <button
                      key={name}
                      onClick={() => setEqPreset(name)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        eqPreset === name
                          ? 'bg-gradient-to-r from-[#3b82f6] to-[#ec4899] text-white'
                          : 'bg-white/5 text-[#a1a1b5] hover:text-white'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-[#a1a1b5] mb-1.5">Speed</p>
                <div className="flex gap-1.5">
                  {[0.75, 1, 1.25, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setPlaybackRate(rate)}
                      className={`px-2 py-1 rounded text-xs font-medium flex-1 ${
                        playbackRate === rate
                          ? 'bg-[#3b82f6] text-white'
                          : 'bg-white/5 text-[#a1a1b5] hover:text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-1 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-medium text-white">SponsorBlock Skip</span>
                <button
                  onClick={() => setSponsorBlockEnabled((v) => !v)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    sponsorBlockEnabled ? 'bg-[#ec4899] text-white' : 'bg-white/10 text-[#a1a1b5]'
                  }`}
                >
                  {sponsorBlockEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sleep Timer */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSleepMenu((s) => !s);
              setShowEqMenu(false);
            }}
            title="Sleep Timer"
            className={`p-1.5 transition-colors ${
              sleepTimerMins || sleepEndOfTrack ? 'text-[#ec4899]' : 'text-[#a1a1b5] hover:text-white'
            }`}
          >
            <Moon className="w-4 h-4" />
          </button>
          {showSleepMenu && (
            <div className="absolute right-0 bottom-10 w-44 bg-[#161624] border border-white/10 rounded-xl p-2 shadow-2xl space-y-1 z-50">
              <p className="px-2 py-1 text-[11px] font-bold uppercase text-[#a1a1b5]">Sleep Timer</p>
              {[15, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setSleepTimerMins(m);
                    setSleepEndOfTrack(false);
                    setShowSleepMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs ${
                    sleepTimerMins === m ? 'bg-[#ec4899] text-white' : 'text-white hover:bg-white/10'
                  }`}
                >
                  {m} minutes
                </button>
              ))}
              <button
                onClick={() => {
                  setSleepEndOfTrack(true);
                  setSleepTimerMins(null);
                  setShowSleepMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs ${
                  sleepEndOfTrack ? 'bg-[#ec4899] text-white' : 'text-white hover:bg-white/10'
                }`}
              >
                End of track
              </button>
              {(sleepTimerMins || sleepEndOfTrack) && (
                <button
                  onClick={() => {
                    setSleepTimerMins(null);
                    setSleepEndOfTrack(false);
                    setShowSleepMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded text-xs text-red-400 hover:bg-white/10"
                >
                  Turn off
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => onToggleRightPanel('lyrics')}
          title="Lyrics"
          className={`p-1.5 transition-colors ${
            rightPanel === 'lyrics' ? 'text-[#ec4899]' : 'text-[#a1a1b5] hover:text-white'
          }`}
        >
          <Mic2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => onToggleRightPanel('queue')}
          title="Queue"
          className={`p-1.5 transition-colors ${
            rightPanel === 'queue' ? 'text-[#3b82f6]' : 'text-[#a1a1b5] hover:text-white'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Volume */}
        <div className="flex items-center gap-1.5 w-24">
          <button
            onClick={toggleMute}
            title={volume === 0 ? 'Unmute' : 'Mute'}
            className="text-[#a1a1b5] hover:text-white"
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <div className="relative flex-1 h-3 flex items-center group">
            <div className="w-full h-1 bg-[#2a2a3d] rounded-full overflow-hidden">
              <div
                className="h-full bg-white group-hover:bg-gradient-to-r group-hover:from-[#3b82f6] group-hover:to-[#ec4899] rounded-full"
                style={{ width: `${volumePct}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {currentTrack && (
          <a
            href={getDownloadUrl(currentTrack.videoId, currentTrack.title)}
            download
            title="Download Audio File"
            className="p-1.5 text-[#a1a1b5] hover:text-white hidden sm:block"
          >
            <Download className="w-4 h-4" />
          </a>
        )}
      </div>
      </div>
    </footer>
  );
}
