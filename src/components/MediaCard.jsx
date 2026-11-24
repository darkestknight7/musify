import React from 'react';
import { Play, Pause } from 'lucide-react';

export default function MediaCard({
  item,
  onClick,
  onPlay,
  isPlayingThis = false,
}) {
  const isArtist = item.type === 'artist';

  return (
    <div
      onClick={onClick}
      className="group relative bg-[#141420] hover:bg-[#1f1f30] border border-white/5 p-4 rounded-lg transition-colors duration-200 cursor-pointer flex flex-col"
    >
      <div className="relative mb-4 aspect-square w-full overflow-hidden shadow-lg bg-[#1c1c2c] rounded-md">
        <img
          src={item.thumbnail}
          alt={item.title}
          loading="lazy"
          className={`w-full h-full object-cover ${isArtist ? 'rounded-full' : 'rounded-md'}`}
        />
        {onPlay && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            aria-label={`Play ${item.title}`}
            className={`absolute bottom-2 right-2 w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#ec4899] hover:scale-105 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(236,72,153,0.5)] transition-all duration-200 ${
              isPlayingThis
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
            }`}
          >
            {isPlayingThis ? (
              <Pause className="w-5 h-5 fill-white" />
            ) : (
              <Play className="w-5 h-5 fill-white ml-0.5" />
            )}
          </button>
        )}
      </div>
      <h3 className="text-[15px] font-bold text-white truncate mb-1">{item.title}</h3>
      <p className="text-[13px] text-[#a7a7a7] line-clamp-2 leading-snug">
        {item.subtitle || item.artist || (isArtist ? 'Artist' : '')}
      </p>
    </div>
  );
}
