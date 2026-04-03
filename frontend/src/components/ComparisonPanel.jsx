import React from 'react';

const ComparisonPanel = ({ visible, setVisible, data1, data2 }) => {
  if (!visible || !data1 || !data2) return null;

  return (
    <div className="absolute inset-0 bg-[#050a12]/70 backdrop-blur-md z-[250] flex items-center justify-center pointer-events-auto animate-in fade-in duration-300">
      <div className="w-[min(95%,900px)] max-h-[90vh] overflow-y-auto bg-navy/80 backdrop-blur-2xl border border-cyan/30 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.9),0_0_40px_rgba(8,201,192,0.1)] p-6 md:p-8 flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-400">
        
        <div className="flex justify-between items-center bg-[#0a182a]/50 p-4 rounded-2xl border border-cyan/20">
          <h3 className="m-0 font-bold text-xl text-cyan uppercase tracking-wider" style={{ fontFamily: '"Syncopate", "Space Grotesk", sans-serif' }}>
            Comparison Results
          </h3>
          <button 
            className="bg-transparent border-none text-ink-dim/80 hover:text-cyan hover:scale-110 cursor-pointer text-3xl leading-none transition-all flex items-center justify-center rounded-full w-10 h-10 hover:bg-cyan/10" 
            onClick={() => setVisible(false)} 
            title="Close"
          >
            &times;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Location A */}
          <div className="bg-[#0a182a]/60 border border-cyan/30 rounded-2xl p-6 flex flex-col gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:border-cyan/60 hover:shadow-[0_0_20px_rgba(8,201,192,0.2)] transition-all">
            <h4 className="text-sm font-bold text-ink-dim uppercase tracking-widest border-b border-cyan/20 pb-3">Location A</h4>
            <h2 className="text-2xl font-bold text-ink mb-1">{data1.display_name}</h2>
            <div className="text-sm text-ink/80 leading-relaxed bg-[#050a12]/50 p-4 rounded-xl border border-cyan/10">
              {data1.description || "No description available."}
            </div>
            
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="bg-[#030b14]/80 p-3 rounded-xl border border-cyan/10 flex flex-col gap-1">
                <span className="text-xs text-cyan/70 uppercase tracking-wider">Latitude</span>
                <span className="text-base text-ink font-mono">{parseFloat(data1.lat).toFixed(4)}</span>
              </div>
              <div className="bg-[#030b14]/80 p-3 rounded-xl border border-cyan/10 flex flex-col gap-1">
                <span className="text-xs text-cyan/70 uppercase tracking-wider">Longitude</span>
                <span className="text-base text-ink font-mono">{parseFloat(data1.lng).toFixed(4)}</span>
              </div>
              <div className="bg-[#030b14]/80 p-3 rounded-xl border border-cyan/10 flex flex-col gap-1 col-span-2">
                 <span className="text-xs text-cyan/70 uppercase tracking-wider">Confidence Score</span>
                 <div className="flex items-center gap-2 mt-1">
                   <div className="h-2 flex-grow bg-cyan/20 rounded-full overflow-hidden">
                     <div className="h-full bg-cyan rounded-full shadow-[0_0_10px_#08c9c0]" style={{ width: `${(data1.confidence || 0) * 100}%` }}></div>
                   </div>
                   <span className="text-sm text-cyan font-bold">{Math.round((data1.confidence || 0) * 100)}%</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Location B */}
          <div className="bg-[#0a182a]/60 border border-cyan/30 rounded-2xl p-6 flex flex-col gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:border-cyan/60 hover:shadow-[0_0_20px_rgba(8,201,192,0.2)] transition-all">
            <h4 className="text-sm font-bold text-ink-dim uppercase tracking-widest border-b border-cyan/20 pb-3">Location B</h4>
            <h2 className="text-2xl font-bold text-ink mb-1">{data2.display_name}</h2>
            <div className="text-sm text-ink/80 leading-relaxed bg-[#050a12]/50 p-4 rounded-xl border border-cyan/10">
              {data2.description || "No description available."}
            </div>
            
             <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="bg-[#030b14]/80 p-3 rounded-xl border border-cyan/10 flex flex-col gap-1">
                <span className="text-xs text-cyan/70 uppercase tracking-wider">Latitude</span>
                <span className="text-base text-ink font-mono">{parseFloat(data2.lat).toFixed(4)}</span>
              </div>
              <div className="bg-[#030b14]/80 p-3 rounded-xl border border-cyan/10 flex flex-col gap-1">
                <span className="text-xs text-cyan/70 uppercase tracking-wider">Longitude</span>
                <span className="text-base text-ink font-mono">{parseFloat(data2.lng).toFixed(4)}</span>
              </div>
              <div className="bg-[#030b14]/80 p-3 rounded-xl border border-cyan/10 flex flex-col gap-1 col-span-2">
                 <span className="text-xs text-cyan/70 uppercase tracking-wider">Confidence Score</span>
                 <div className="flex items-center gap-2 mt-1">
                   <div className="h-2 flex-grow bg-cyan/20 rounded-full overflow-hidden">
                     <div className="h-full bg-cyan rounded-full shadow-[0_0_10px_#08c9c0]" style={{ width: `${(data2.confidence || 0) * 100}%` }}></div>
                   </div>
                   <span className="text-sm text-cyan font-bold">{Math.round((data2.confidence || 0) * 100)}%</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ComparisonPanel;
