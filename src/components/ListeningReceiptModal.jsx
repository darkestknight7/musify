import React from 'react';
import { X, Sparkles, Flame, Headphones, Download } from 'lucide-react';

function getMusicPersona(plays, minutes) {
  if (plays >= 50 || minutes >= 120) return 'Midnight Neon Audiophile';
  if (plays >= 20) return 'Electric Wave Explorer';
  if (plays >= 5) return 'Sonic Vibe Seeker';
  return 'Fresh Frequency Listener';
}

export default function ListeningReceiptModal({
  open,
  onClose,
  stats,
  recentlyPlayed = [],
  likedCount = 0,
  offlineCount = 0,
}) {
  if (!open) return null;

  const persona = getMusicPersona(stats.plays, stats.minutes);
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0b0b12] border border-[#ec4899]/30 rounded-2xl shadow-[0_0_50px_rgba(236,72,153,0.25)] overflow-hidden"
      >
        {/* Neon Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#1e3a8a] via-[#701a75] to-[#be185d] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
              Musify Listening Receipt
            </p>
            <h2 className="text-xl font-black text-white mt-0.5">{persona}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-5 font-mono text-xs">
          <div className="flex justify-between text-[#a1a1b5] border-b border-dashed border-white/15 pb-3">
            <span>DATE: {dateStr}</span>
            <span>PLAN: FREE • AD-FREE</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Flame className="w-4 h-4 text-[#ec4899] mx-auto mb-1" />
              <p className="text-lg font-black text-white">{stats.plays}</p>
              <p className="text-[10px] text-[#a1a1b5]">PLAYS</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Headphones className="w-4 h-4 text-[#38bdf8] mx-auto mb-1" />
              <p className="text-lg font-black text-white">{Math.floor(stats.minutes)}</p>
              <p className="text-[10px] text-[#a1a1b5]">MINUTES</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Download className="w-4 h-4 text-[#a855f7] mx-auto mb-1" />
              <p className="text-lg font-black text-white">{offlineCount}</p>
              <p className="text-[10px] text-[#a1a1b5]">OFFLINE</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#ec4899] mb-2">
              Recent Rotation ({recentlyPlayed.length})
            </p>
            {recentlyPlayed.length === 0 ? (
              <p className="text-[#a1a1b5] py-3">Play a few songs to build your receipt!</p>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {recentlyPlayed.slice(0, 6).map((t, i) => (
                  <div key={t.videoId} className="flex items-center justify-between gap-2 text-white">
                    <span className="truncate">
                      {String(i + 1).padStart(2, '0')}. {t.title} — <span className="text-[#a1a1b5]">{t.artist}</span>
                    </span>
                    <span className="text-[#a1a1b5] flex-shrink-0">{t.duration || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-white/15 pt-3 flex items-center justify-between text-[#a1a1b5]">
            <span>LIKED TRACKS: {likedCount}</span>
            <span className="flex items-center gap-1 text-[#38bdf8]">
              <Sparkles className="w-3.5 h-3.5" /> MUSIFY.APP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
