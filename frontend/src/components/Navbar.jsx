import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({
  searchQuery,
  setSearchQuery,
  handleSearch,
  isSearching,
  handleSearchKeyDown,
  twinSliderVisible,
  setTwinSliderVisible,
  handleCompareClick
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();

  const goToLogin = () => navigate('/login');
  const goToProfile = () => navigate('/profile');

  return (
    <header className="pointer-events-auto relative z-20 flex items-center justify-between px-4 md:px-6 py-4 bg-navy/80 backdrop-blur-2xl border border-cyan/20 shadow-2xl rounded-2xl md:rounded-3xl transition-all duration-300 focus-within:border-cyan/40 focus-within:shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(8,201,192,0.18)]">
      
      {/* Brandmark */}
      <div className={`flex items-center gap-3 shrink-0 transition-all ${mobileSearchOpen ? 'hidden md:flex' : 'flex'}`}>

        <div className="w-8 h-8 rounded-xl bg-[radial-gradient(circle_at_30%_30%,#fff_0%,#c9e0de_35%,#08c9c0_70%,transparent_72%)] shadow-[0_0_18px_rgba(8,201,192,0.6)] shrink-0" aria-hidden="true"></div>
        <span className="font-bold text-lg tracking-wider text-ink hidden sm:block" style={{ fontFamily: '"Syncopate", "Space Grotesk", sans-serif' }}>NovaGlobe</span>
      </div>

      {/* Search Layout */}
      <div className={`flex items-center gap-3 justify-center transition-all duration-300 ${mobileSearchOpen ? 'w-full' : 'hidden md:flex flex-1 md:px-4 lg:px-8'}`}>
        <div className="relative w-full max-w-2xl group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <svg className="w-5 h-5 text-cyan/50 group-focus-within:text-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input
            className="w-full bg-[#030b14]/75 text-ink placeholder-ink-dim/50 border border-cyan/20 rounded-full py-3.5 pl-11 pr-6 outline-none focus:bg-[#07121e]/40 focus:border-cyan/50 transition-all duration-300 text-sm"
            placeholder="Explore coastal cities with sustainable energy..."
            aria-label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoFocus={mobileSearchOpen}
          />
        </div>
        <button 
          className="px-5 md:px-7 py-3.5 bg-transparent border border-cyan/30 text-ink rounded-full text-sm font-medium hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(8,201,192,0.2)] hover:border-cyan/60 transition-all duration-200 disabled:opacity-50 whitespace-nowrap min-w-max hidden sm:block"
          type="button" 
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
        
        {/* Mobile Search Close Button */}
        {mobileSearchOpen && (
          <button 
            className="md:hidden p-2 text-cyan/70 hover:text-cyan"
            onClick={() => setMobileSearchOpen(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        )}
      </div>

      {/* Top Actions & Avatar */}
      <div className={`flex items-center gap-4 md:gap-6 shrink-0 justify-end transition-all ${mobileSearchOpen ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Mobile Search Toggle */}
        <button 
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-cyan/10"
          onClick={() => setMobileSearchOpen(true)}
        >
           <svg className="w-5 h-5 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </button>

        <div className="flex items-center gap-3 md:gap-4">
          <button 
            className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full border border-cyan/20 text-ink hover:bg-cyan/10 hover:border-cyan/50 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(8,201,192,0.3)] transition-all duration-200"
            type="button" 
            title="Digital Twin Simulation"
            onClick={() => setTwinSliderVisible(!twinSliderVisible)}
            aria-label="Digital Twin"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-[22px] md:h-[22px] stroke-cyan" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </button>
          <button 
            className="hidden sm:block px-5 md:px-6 py-2.5 md:py-3 rounded-full border border-cyan/20 text-ink text-sm hover:bg-cyan/10 hover:border-cyan/50 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap" 
            type="button" 
            onClick={handleCompareClick}
          >
            Compare
          </button>
        </div>
        
        {/* Avatar Wrap */}
        <div className="relative z-50 shrink-0">
          <button
            className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-cyan/10 border border-cyan/30 text-ink font-semibold text-xs md:text-[13px] flex items-center justify-center hover:bg-cyan/20 hover:border-cyan/50 transition-all duration-200"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            NG
          </button>
          
          {/* Avatar Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+12px)] w-56 bg-[#0a1522] border border-cyan/50 rounded-2xl p-2.5 shadow-[0_28px_70px_rgba(0,0,0,0.75)] animate-in fade-in zoom-in-95 duration-200">
              <button 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-ink bg-[#0d1f31] border border-cyan/20 hover:bg-[#122a42] hover:border-cyan/70 transition-colors mb-1.5" 
                type="button" 
                onClick={() => { goToLogin(); setMenuOpen(false); }}
              >
                <span className="text-cyan w-4 h-4 md:w-[18px] md:h-[18px] flex items-center justify-center shrink-0" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 3H5a2 2 0 00-2 2v14a2 2 0 002 2h5v-2H5V5h5V3zm6.3 4.3l-1.4 1.4 1.3 1.3H9v2h7.2l-1.3 1.3 1.4 1.4L20 11l-3.7-3.7z" /></svg>
                </span>
                <span>Sign in / Sign up</span>
              </button>
              <div className="h-px bg-cyan/30 mx-1 mb-1.5" />
              <button 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-ink bg-[#0d1f31] border border-cyan/20 hover:bg-[#122a42] hover:border-cyan/70 transition-colors mb-1.5" 
                type="button" 
                onClick={() => { goToProfile(); setMenuOpen(false); }}
              >
                <span className="text-cyan w-4 h-4 md:w-[18px] md:h-[18px] flex items-center justify-center shrink-0" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" /></svg>
                </span>
                <span>My profile</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-ink bg-[#0d1f31] border border-cyan/20 hover:bg-[#122a42] hover:border-cyan/70 transition-colors" type="button">
                <span className="text-cyan w-4 h-4 md:w-[18px] md:h-[18px] flex items-center justify-center shrink-0" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v5.4l3.5 2.1-.8 1.3L11.5 13V7H13z" /></svg>
                </span>
                <span>History</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
