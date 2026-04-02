import React, { useState } from 'react';

const TwinSlider = ({ visible, setVisible, value, setValue }) => {
  const year = new Date().getFullYear() - 100 + Number(value);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`pointer-events-auto fixed w-[90%] max-w-[360px] 
      bg-[#030b14]/85 backdrop-blur-3xl border border-cyan/20 rounded-[1.5rem] 
      shadow-[0_0_0_1px_rgba(8,201,192,0.1),0_20px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(8,201,192,0.15)] 
      pt-5 pb-6 px-6 z-[100] flex flex-col gap-4 text-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
      ${visible ? 'opacity-100 -translate-y-1/2 scale-100' : 'opacity-0 -translate-y-1/4 scale-90 pointer-events-none'}`}
      style={{ left: '12px', top: '50%' }}
    >
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center shadow-[0_0_15px_rgba(8,201,192,0.2)]">
            <svg className="w-4 h-4 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-cyan uppercase tracking-[0.2em]">Simulation Timeline</span>
        </div>
        <button 
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-ink/70 hover:text-white hover:bg-white/10 hover:scale-110 flex items-center justify-center transition-all duration-300 group cursor-pointer" 
          onClick={() => setVisible(false)} 
          title="Close Timeline"
        >
          <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col items-center gap-1 my-2 relative z-10">
        {/* Decorative background glow behind the text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 bg-cyan/20 blur-[40px] rounded-full pointer-events-none" />
        
        <div className="text-[10px] uppercase tracking-[3px] text-cyan/70 font-semibold mb-1 drop-shadow-[0_0_8px_rgba(8,201,192,0.3)]">Target Epoch</div>
        <div 
          className="text-[40px] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan/60 drop-shadow-[0_2px_15px_rgba(8,201,192,0.3)] transition-all duration-300 leading-none pb-1" 
          style={{ fontFamily: '"Space Grotesk", "Syncopate", sans-serif', transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
        >
          {year}
        </div>
      </div>

      <div className="relative mt-2 z-10" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {/* Custom filled track underneath */}
        <div 
          className="absolute top-[13px] left-0 h-1.5 rounded-full bg-gradient-to-r from-cyan to-[#00f0ff] shadow-[0_0_12px_rgba(8,201,192,0.8)] pointer-events-none transition-all duration-200"
          style={{ width: `${value}%` }}
        />
        
        {/* Ticks for quarters */}
        <div className="absolute top-[13px] w-full flex justify-between px-[2px] pointer-events-none">
          {[0, 25, 50, 75, 100].map((tick) => (
             <div key={tick} className={`w-[6px] h-[6px] rounded-full transition-colors duration-300 ${Number(value) >= tick ? 'bg-white shadow-[0_0_8px_white]' : 'bg-ink/20'}`} />
          ))}
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full h-1.5 bg-ink/10 rounded-full outline-none transition-all appearance-none cursor-pointer relative z-10 
            [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:-mt-[7px]
            [&::-webkit-slider-thumb]:bg-[#030b14] [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[#00f0ff]
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_20px_rgba(8,201,192,0.9),inset_0_0_8px_rgba(8,201,192,0.5)]
            [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-300 [&::-webkit-slider-thumb]:hover:scale-[1.25]
            [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing
          "
        />
        
        <div className="flex justify-between text-[10px] text-ink/60 uppercase tracking-[2px] font-medium mt-4 pb-1 px-1">
          <span className="hover:text-cyan transition-colors cursor-pointer" onClick={() => setValue(0)}>-100 Yrs</span>
          <span className="hover:text-cyan transition-colors cursor-pointer text-ink/40">{new Date().getFullYear() - 50}</span>
          <span className="hover:text-cyan transition-colors cursor-pointer" onClick={() => setValue(100)}>Present</span>
        </div>
      </div>
    </div>
  );
};

export default TwinSlider;
