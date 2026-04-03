import React from 'react';

const CompareModal = ({ visible, setVisible, SUGGESTED_LOCATIONS, place1, setPlace1, place2, setPlace2, handleStartComparison, isComparing }) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 bg-[#050a12]/70 backdrop-blur-md z-[200] flex items-center justify-center pointer-events-auto animate-in fade-in duration-300">
      <div className="w-[min(90%,540px)] bg-navy/80 backdrop-blur-2xl border border-cyan/30 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.9),0_0_40px_rgba(8,201,192,0.1)] p-8 flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-400">
        <div className="flex justify-between items-center">
          <h3 className="m-0 font-bold text-lg text-cyan uppercase tracking-wide" style={{ fontFamily: '"Syncopate", "Space Grotesk", sans-serif' }}>Compare Locations</h3>
          <button className="bg-transparent border-none text-ink-dim/80 hover:text-cyan hover:scale-110 cursor-pointer text-2xl leading-none p-1 transition-all flex items-center justify-center" onClick={() => setVisible(false)} title="Close">&times;</button>
        </div>
        <div className="flex flex-col gap-6">
          <p className="m-0 text-[13px] text-ink-dim leading-relaxed">Select two regions to evaluate and compare their environmental variables side-by-side.</p>

          <div className="flex flex-col md:flex-row items-center gap-4 mt-2">
            <datalist id="compare-locations">
              {SUGGESTED_LOCATIONS?.map((loc) => <option key={loc} value={loc} />)}
            </datalist>

            <div className="flex-1 flex flex-col gap-2 relative w-full">
              <label className="text-xs text-ink uppercase tracking-wide">Location A</label>
              <input
                type="text"
                list="compare-locations"
                value={place1}
                onChange={(e) => setPlace1(e.target.value)}
                className="w-full p-3 bg-[#0a182a]/60 border border-cyan/25 rounded-xl text-ink text-sm outline-none transition-all focus:border-cyan focus:bg-[#0a182a]/90 hover:border-cyan/60"
                placeholder="Select location A..."
                aria-label="Select first location"
              />
            </div>

            <div className="font-bold text-sm text-ink-dim tracking-widest uppercase my-2 md:my-0 md:mt-6" style={{ fontFamily: '"Syncopate", sans-serif' }}>VS</div>

            <div className="flex-1 flex flex-col gap-2 relative w-full">
              <label className="text-xs text-ink uppercase tracking-wide">Location B</label>
              <input
                type="text"
                list="compare-locations"
                value={place2}
                onChange={(e) => setPlace2(e.target.value)}
                className="w-full p-3 bg-[#0a182a]/60 border border-cyan/25 rounded-xl text-ink text-sm outline-none transition-all focus:border-cyan focus:bg-[#0a182a]/90 hover:border-cyan/60"
                placeholder="Select location B..."
                aria-label="Select second location"
              />
            </div>
          </div>
        </div>
        <div className="mt-2 text-right">
          <button
            className={`w-full md:w-auto px-8 py-3.5 rounded-full border border-cyan text-ink font-semibold tracking-wide hover:shadow-[0_0_20px_rgba(8,201,192,0.4)] transition-all duration-300 ${place1 && place2 && place1 !== place2 && !isComparing ? 'bg-cyan hover:bg-cyan/90 text-navy' : 'bg-transparent opacity-50 cursor-not-allowed'}`}
            onClick={handleStartComparison}
            disabled={!place1 || !place2 || place1 === place2 || isComparing}
          >
            {isComparing ? "Generating Report..." : place1 === place2 && place1 !== "" ? "Select Distinct Areas" : "Start Comparison"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompareModal;
