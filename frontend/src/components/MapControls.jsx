import React, { useState } from 'react';

const MapControls = ({ currentStyle, onStyleChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const styles = [
    { id: 'AUTO', label: 'Auto', icon: '🌐' },
    { id: 'SATELLITE', label: 'Satellite', icon: '🛰️' },
    { id: 'ROAD', label: 'Street', icon: '🛣️' },
    { id: 'DARK', label: 'Dark', icon: '🌑' },
  ];

  return (
    <div className="absolute bottom-8 left-6 z-10 pointer-events-auto group hidden md:block">
      <div className="relative">
        <button 
          className={`w-12 h-12 flex items-center justify-center rounded-2xl bg-[#08131f]/80 backdrop-blur-xl border transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${isOpen ? 'border-cyan/70 shadow-[0_0_20px_rgba(8,201,192,0.3)] bg-cyan/10' : 'border-cyan/30 hover:border-cyan/50 hover:bg-[#0b1a2b]/95'}`}
          onClick={() => setIsOpen(!isOpen)}
          title="Change Map Style"
        >
          <svg viewBox="0 0 24 24" className={`w-6 h-6 stroke-2 fill-none transition-all duration-300 ${isOpen ? 'stroke-cyan' : 'stroke-ink hover:stroke-cyan'}`} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 bottom-14 w-48 bg-[#0a1522]/95 backdrop-blur-2xl border border-cyan/50 rounded-2xl p-2.5 shadow-[0_28px_70px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-bottom-4 duration-200">
            {styles.map((style) => (
              <button
                key={style.id}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-1.5 last:mb-0 ${currentStyle === style.id ? 'bg-cyan/15 text-cyan border border-cyan/40' : 'bg-[#0d1f31]/80 text-ink border border-cyan/10 hover:bg-[#122a42] hover:border-cyan/40'}`}
                onClick={() => {
                  onStyleChange(style.id);
                  setIsOpen(false);
                }}
              >
                <div className="text-lg w-6 flex items-center justify-center shrink-0">{style.icon}</div>
                <span className="font-medium tracking-wide">{style.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapControls;
