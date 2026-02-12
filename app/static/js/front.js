const { useEffect, useRef, useState } = React;

const semanticResults = [
  {
    title: "Pacific Gridstream",
    detail: "Ocean power simulation",
    score: "102%",
    tone: "good",
  },
  {
    title: "Amsterdam Net Power",
    detail: "ES research initiative",
    score: "83%",
    tone: "mid",
  },
  {
    title: "Freiburg City",
    detail: "EcoGrid status",
    score: "68%",
    tone: "warm",
  },
];

const liveFeed = [
  { label: "GeoSense API", value: "+30.2 C" },
  { label: "OceanNet API", value: "+28.9 C" },
  { label: "GreenOrbit API", value: "57%" },
  { label: "WaterFlow API", value: "1.29k" },
  { label: "EcoPulse API", value: "99" },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelsVisible, setPanelsVisible] = useState(false);
  const pulseTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (pulseTimer.current) {
        clearTimeout(pulseTimer.current);
      }
    };
  }, []);

  const goToLogin = () => {
    window.location.href = "/login";
  };
    const goToProfile = () => {
      window.location.href = "/profile";
    };
  const handleCenterClick = () => {
    if (!panelsVisible) {
      setPanelsVisible(true);
      return;
    }

    setPanelsVisible(false);
    if (pulseTimer.current) {
      clearTimeout(pulseTimer.current);
    }
    pulseTimer.current = setTimeout(() => {
      setPanelsVisible(true);
    }, 160);
  };

  return (
    <div className="shell dashboard">
      <header className="topbar">
        <div className="brandmark">
          <div className="spark" aria-hidden="true"></div>
          <span>NovaGlobe</span>
        </div>
        <div className="search-wrap">
          <div className="search">
            <span className="search-icon" aria-hidden="true">Search</span>
            <input
              placeholder="Explore the world. Show coastal cities with sustainable energy initiatives"
              aria-label="Search"
            />
          </div>
          <button className="search-btn" type="button">Search</button>
        </div>
        <div className="top-actions">
          <button className="chip" type="button">Compare</button>
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
                <button className="menu-item" type="button">
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
        </div>
      </header>

      <div className="gridlines" aria-hidden="true" />
      <div className="ambient-orb" aria-hidden="true" />

      <main className={`layout ${panelsVisible ? "panels-on" : "panels-off"}`}>
        <section className="center" onClick={handleCenterClick}>
          <div className="center-shell" role="button" tabIndex={0}>
            <div className="globe-placeholder">Globe API Mount</div>
          </div>
        </section>

        <section className="panel left">
          <h3>Semantic Search Results</h3>
          <div className="list">
            {semanticResults.map((item) => (
              <div className="list-item" key={item.title}>
                <div>
                  <div className="list-title">{item.title}</div>
                  <div className="list-detail">{item.detail}</div>
                </div>
                <div className={`score ${item.tone}`}>{item.score}</div>
              </div>
            ))}
          </div>
          <div className="panel-footer">
            <button className="chip" type="button">Digital Twin Simulation</button>
          </div>
        </section>

        <section className="panel right">
          <h3>Live Data Feed</h3>
          <div className="feed">
            {liveFeed.map((item) => (
              <div className="feed-row" key={item.label}>
                <span>{item.label}</span>
                <span className="value">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="panel-footer search-footer">
            <input
              className="panel-search"
              placeholder="Search feed"
              aria-label="Search feed"
            />
            <button className="search-btn" type="button">Search</button>
          </div>
        </section>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
