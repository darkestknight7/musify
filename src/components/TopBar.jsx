import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, X, Sparkles } from 'lucide-react';

export default function TopBar({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  activeView,
  searchQuery,
  onSearchChange,
  onNavigate,
  scrolled,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (activeView.type === 'search' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeView.type]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onNavigate({ type: 'search' });
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  return (
    <header
      className={`sticky top-0 z-30 h-16 px-6 flex items-center justify-between gap-4 transition-colors duration-300 ${
        scrolled ? 'bg-[#0d0d14]/95 backdrop-blur-md shadow-md border-b border-white/5' : 'bg-transparent'
      }`}
    >
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        {/* History Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            disabled={!canGoBack}
            aria-label="Go back"
            className={`w-8 h-8 rounded-full bg-black/70 flex items-center justify-center transition-opacity ${
              canGoBack ? 'text-white hover:bg-black cursor-pointer' : 'text-[#7f7f99] opacity-50 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onForward}
            disabled={!canGoForward}
            aria-label="Go forward"
            className={`w-8 h-8 rounded-full bg-black/70 flex items-center justify-center transition-opacity ${
              canGoForward ? 'text-white hover:bg-black cursor-pointer' : 'text-[#7f7f99] opacity-50 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Pill Search Bar */}
        <div className="relative flex-1 max-w-[380px]">
          <Search className="w-4 h-4 text-[#a1a1b5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onFocus={() => {
              if (activeView.type !== 'search') onNavigate({ type: 'search' });
            }}
            onChange={(e) => {
              if (activeView.type !== 'search') onNavigate({ type: 'search' });
              onSearchChange(e.target.value);
            }}
            placeholder="What do you want to play?"
            className="w-full h-11 pl-10 pr-9 rounded-full bg-[#181826] hover:bg-[#202033] focus:bg-[#181826] text-sm text-white placeholder-[#a1a1b5] outline-none border border-white/5 focus:border-[#ec4899] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1b5] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right Badges */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#3b82f6]/20 to-[#ec4899]/20 border border-[#ec4899]/30 text-[#f0abfc] text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>Ad-Free • Free Forever</span>
        </div>
        <div
          title="Musify User"
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#ec4899] text-white font-extrabold text-sm flex items-center justify-center shadow-[0_0_12px_rgba(236,72,153,0.4)] cursor-default"
        >
          M
        </div>
      </div>
    </header>
  );
}
