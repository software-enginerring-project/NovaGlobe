import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/front.css';
import AgentChat from '../components/AgentChat';

const defaultResults = [
  { title: "Pacific Gridstream", detail: "Ocean power simulation", score: "102%", tone: "good", },
  { title: "Amsterdam Net Power", detail: "ES research initiative", score: "83%", tone: "mid", },
  { title: "Freiburg City", detail: "EcoGrid status", score: "68%", tone: "warm", },
];

const liveFeed = [
  { label: "GeoSense API", value: "+30.2 C" },
  { label: "OceanNet API", value: "+28.9 C" },
  { label: "GreenOrbit API", value: "57%" },
  { label: "WaterFlow API", value: "1.29k" },
  { label: "EcoPulse API", value: "99" },
];

const SUGGESTED_LOCATIONS = [
  "Pacific Gridstream",
  "Amsterdam Net Power",
  "Freiburg City",
  "Tokyo EcoHub",
  "Nordic WindFarm"
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelsVisible, setPanelsVisible] = useState(true);
  const [twinSliderVisible, setTwinSliderVisible] = useState(false);
  const [twinSliderValue, setTwinSliderValue] = useState(100);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const [place1, setPlace1] = useState('');
  const [place2, setPlace2] = useState('');
  const pulseTimer = useRef(null);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(defaultResults);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    return () => {
      if (pulseTimer.current) {
        clearTimeout(pulseTimer.current);
      }
    };
  }, []);

  const goToLogin = () => navigate('/login');
  const goToProfile = () => navigate('/profile');
  const handleCompareClick = () => setCompareModalVisible(true);
  const handleStartComparison = () => {
    if (place1 && place2 && place1 !== place2) {
      window.alert(`Comparing ${place1} and ${place2}`);
      setCompareModalVisible(false);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    setRightPanelVisible(true);
    window.dispatchEvent(new CustomEvent('agent:close'));

    try {
      const res = await axios.post('http://localhost:5000/search', { query });
      const data = res.data;

      if (data.success && data.location) {
        const loc = data.location;

        // Update search results panel
        setSearchResults([{
          title: loc.display_name,
          detail: loc.description,
          score: `${Math.round(loc.confidence * 100)}%`,
          tone: loc.confidence > 0.8 ? 'good' : loc.confidence > 0.5 ? 'mid' : 'warm',
        }]);

        // Fly the globe to coordinates
        window.dispatchEvent(new CustomEvent('globe:flyto', {
          detail: { lat: loc.lat, lng: loc.lng }
        }));
      } else {
        setSearchError(data.error || 'No location found');
        setSearchResults(defaultResults);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError(err.response?.data?.error || 'Search failed. Is the backend running?');
      setSearchResults(defaultResults);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
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
            <input
              placeholder="Explore the world. Show coastal cities with sustainable energy initiatives"
              aria-label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          <button 
            className="search-btn topbar-search-btn" 
            type="button" 
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
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

      <div className="gridlines" aria-hidden="true" />

      <main className={`layout ${panelsVisible ? "panels-on" : "panels-off"}`}>

        <section className="panel left">
          <h3>{searchError ? 'Search Error' : 'Semantic Search Results'}</h3>
          {searchError && (
            <div style={{ color: '#ffb58a', fontSize: '12px', padding: '8px 0' }}>
              {searchError}
            </div>
          )}
          <div className="list">
            {searchResults.map((item) => (
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
            <button 
              className="chip" 
              type="button" 
              onClick={() => setTwinSliderVisible(!twinSliderVisible)}
            >
              Digital Twin Simulation
            </button>
          </div>
        </section>

        {rightPanelVisible && (
          <section className="panel right">
            <h3>Location Summary</h3>
            {searchResults.length > 0 && (
              <div className="feed">
                <div className="feed-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '15px', color: 'var(--cyan)', fontWeight: 600 }}>{searchResults[0].title}</span>
                  <span style={{ fontSize: '13px', lineHeight: 1.5 }}>{searchResults[0].detail}</span>
                </div>
                <div className="feed-row">
                  <span>Match Status</span>
                  <span className={`score ${searchResults[0].tone}`}>{searchResults[0].score}</span>
                </div>
              </div>
            )}
            <div className="panel-footer search-footer" style={{ marginTop: 'auto' }}>
              <input
                className="panel-search"
                placeholder="Search location details..."
                aria-label="Search location parameter"
              />
              <button className="search-btn" type="button">Filter</button>
            </div>
          </section>
        )}

        <div className={`twin-slider-container ${twinSliderVisible ? '' : 'hidden'}`}>
          <div className="twin-slider-header">
            <span className="twin-slider-title">Simulation Timeline</span>
            <button className="twin-slider-close" onClick={() => setTwinSliderVisible(false)} title="Close">&times;</button>
          </div>
          <div className="twin-slider-value">Year {new Date().getFullYear() - 100 + Number(twinSliderValue)}</div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={twinSliderValue} 
            onChange={(e) => setTwinSliderValue(e.target.value)}
            className="twin-slider-input" 
          />
          <div className="twin-slider-labels">
            <span>Past (-100 Yrs)</span>
            <span>Present</span>
          </div>
        </div>

      </main>

      {/* Compare Modal */}
      {compareModalVisible && (
        <div className="compare-modal-overlay">
          <div className="compare-modal">
            <div className="compare-modal-header">
              <h3>Compare Locations</h3>
              <button className="twin-slider-close" onClick={() => setCompareModalVisible(false)} title="Close">&times;</button>
            </div>
            <div className="compare-modal-body">
              <p className="compare-desc">Select two regions to evaluate and compare their environmental variables side-by-side.</p>
              
              <div className="compare-inputs">
                <datalist id="compare-locations">
                  {SUGGESTED_LOCATIONS.map(loc => <option key={loc} value={loc} />)}
                </datalist>

                <div className="input-group">
                  <label>Location A</label>
                  <input 
                    type="text" 
                    list="compare-locations" 
                    value={place1} 
                    onChange={(e) => setPlace1(e.target.value)} 
                    className="compare-select" 
                    placeholder="Type or select location A..." 
                    aria-label="Select first location" 
                  />
                </div>
                
                <div className="compare-vs">VS</div>
                
                <div className="input-group">
                  <label>Location B</label>
                  <input 
                    type="text" 
                    list="compare-locations" 
                    value={place2} 
                    onChange={(e) => setPlace2(e.target.value)} 
                    className="compare-select" 
                    placeholder="Type or select location B..." 
                    aria-label="Select second location" 
                  />
                </div>
              </div>
            </div>
            <div className="compare-modal-footer">
              <button 
                className={`compare-submit-btn ${place1 && place2 && place1 !== place2 ? 'active' : ''}`}
                onClick={handleStartComparison}
                disabled={!place1 || !place2 || place1 === place2}
              >
                {place1 === place2 && place1 !== "" ? "Select Distinct Areas" : "Start Comparison"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <AgentChat />
    </div>
  );
}
