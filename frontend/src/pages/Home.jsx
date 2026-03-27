import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/front.css';
import Navbar from '../components/Navbar';
import SidePanels from '../components/SidePanels';

const semanticResults = [
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
  const [place1, setPlace1] = useState('');
  const [place2, setPlace2] = useState('');
  const pulseTimer = useRef(null);
  const navigate = useNavigate();

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

  return (
    <div className="shell dashboard">
      <Navbar
        panelsVisible={panelsVisible}
        setPanelsVisible={setPanelsVisible}
        handleCompareClick={handleCompareClick}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        goToLogin={goToLogin}
        goToProfile={goToProfile}
      />

      <div className="gridlines" aria-hidden="true" />

      <main className={`layout ${panelsVisible ? "panels-on" : "panels-off"}`}>
        <SidePanels
          semanticResults={semanticResults}
          twinSliderVisible={twinSliderVisible}
          setTwinSliderVisible={setTwinSliderVisible}
          liveFeed={liveFeed}
        />

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
    </div>
  );
}
