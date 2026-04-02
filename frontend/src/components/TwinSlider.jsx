import React from 'react';

const TwinSlider = ({ visible, setVisible, value, setValue }) => {
  return (
    <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-[min(90%,500px)] bg-navy/80 backdrop-blur-2xl border border-cyan/30 rounded-3xl shadow-[0_24px_60px_rgba(2,8,16,0.85),0_0_50px_rgba(8,201,192,0.18)] p-6 z-[100] flex flex-col gap-3 text-center transition-all duration-400 pointer-events-auto ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none -translate-y-10 scale-95'}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-cyan uppercase tracking-[1.5px]">Simulation Timeline</span>
        <button 
          className="bg-transparent border-none text-ink-dim/80 hover:text-cyan hover:scale-110 cursor-pointer text-2xl leading-none p-1 transition-all flex items-center justify-center" 
          onClick={() => setVisible(false)} 
          title="Close"
        >
          &times;
        </button>
      </div>
      <div className="text-[28px] font-bold text-ink drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ fontFamily: '"Syncopate", "Space Grotesk", sans-serif' }}>
        Year {new Date().getFullYear() - 100 + Number(value)}
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full h-1.5 bg-cyan/20 rounded-md outline-none transition-all my-2.5 appearance-none cursor-pointer hover:bg-cyan/30 accent-cyan"
      />
      <div className="flex justify-between text-[11px] text-ink-dim/80 uppercase tracking-wide">
        <span>Past (-100 Yrs)</span>
        <span>Present</span>
      </div>
    </div>
  );
};

export default TwinSlider;
