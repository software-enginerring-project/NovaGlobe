import React from 'react';

const Navbar = ({ 
  panelsVisible, 
  setPanelsVisible, 
  handleCompareClick, 
  menuOpen, 
  setMenuOpen, 
  goToLogin, 
  goToProfile 
}) => {
  return (
    <header className="topbar">
      <div className="brandmark">
        <div className="spark" aria-hidden="true"></div>
        <span>NovaGlobe</span>
      </div>
      <div className="search-wrap">
        <div className="search">
          <input
            placeholder="Explore the world. Show coastal cities with sustainable energy initiatives"
            aria-label="Search"
          />
        </div>
        <button className="search-btn topbar-search-btn" type="button">Search</button>
      </div>
      <div className="top-actions">
        <button className="icon-btn topbar-hide-btn" type="button" onClick={() => setPanelsVisible(!panelsVisible)}>
          {panelsVisible ? 'Hide Data' : 'Show Data'}
        </button>
        <button className="chip topbar-compare-btn" type="button" onClick={handleCompareClick}>Compare</button>
      </div>
      <div className="avatar-wrap">
        <button
          className="avatar"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          NG
        </button>
        {menuOpen && (
          <div className="avatar-menu" role="menu">
            <button className="menu-item" type="button" onClick={goToLogin}>
              <span className="menu-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path d="M10 3H5a2 2 0 00-2 2v14a2 2 0 002 2h5v-2H5V5h5V3zm6.3 4.3l-1.4 1.4 1.3 1.3H9v2h7.2l-1.3 1.3 1.4 1.4L20 11l-3.7-3.7z" />
                </svg>
              </span>
              <span>Sign in / Sign up</span>
            </button>
            <div className="menu-divider" />
            <button className="menu-item" type="button" onClick={goToProfile}>
              <span className="menu-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
                </svg>
              </span>
              <span>My profile</span>
            </button>
            <button className="menu-item" type="button">
              <span className="menu-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v5.4l3.5 2.1-.8 1.3L11.5 13V7H13z" />
                </svg>
              </span>
              <span>History</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
