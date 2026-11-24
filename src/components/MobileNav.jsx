import React from 'react';
import { Home, Search, Library, Download } from 'lucide-react';

export default function MobileNav({ activeView, onNavigate }) {
  const items = [
    { id: 'home', label: 'Home', icon: Home, view: { type: 'home' } },
    { id: 'search', label: 'Search', icon: Search, view: { type: 'search' } },
    { id: 'library', label: 'Library', icon: Library, view: { type: 'library' } },
    { id: 'offline', label: 'Offline', icon: Download, view: { type: 'offline' } },
  ];

  return (
    <nav className="md:hidden h-14 bg-[#08080e]/95 backdrop-blur-lg border-t border-white/10 flex items-center justify-around px-2 z-50 select-none">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeView.type === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.view)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
              isActive ? 'text-[#ec4899]' : 'text-[#a1a1b5] hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-semibold">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
