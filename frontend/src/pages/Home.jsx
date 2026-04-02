import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import '../assets/css/front.css';
import AgentChat from '../components/AgentChat';
import Navbar from '../components/Navbar';
import TwinSlider from '../components/TwinSlider';
import CompareModal from '../components/CompareModal';

const defaultResults = [
  { title: "Pacific Gridstream", detail: "Ocean power simulation", score: "102%", tone: "good", },
  { title: "Amsterdam Net Power", detail: "ES research initiative", score: "83%", tone: "mid", },
  { title: "Freiburg City", detail: "EcoGrid status", score: "68%", tone: "warm", },
];

const SUGGESTED_LOCATIONS = [
  "Pacific Gridstream",
  "Amsterdam Net Power",
  "Freiburg City",
  "Tokyo EcoHub",
  "Nordic WindFarm"
];

export default function Home() {
  const [twinSliderVisible, setTwinSliderVisible] = useState(false);
  const [twinSliderValue, setTwinSliderValue] = useState(100);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [place1, setPlace1] = useState('');
  const [place2, setPlace2] = useState('');
  const pulseTimer = useRef(null);
  
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
    window.dispatchEvent(new CustomEvent('agent:close'));

    try {
      const res = await axios.post('http://localhost:5000/search', { query });
      const data = res.data;

      if (data.success && data.location) {
        const loc = data.location;
        setSearchResults([{
          title: loc.display_name,
          detail: loc.description,
          score: `${Math.round(loc.confidence * 100)}%`,
          tone: loc.confidence > 0.8 ? 'good' : loc.confidence > 0.5 ? 'mid' : 'warm',
        }]);

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
      <Navbar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        isSearching={isSearching}
        handleSearchKeyDown={handleSearchKeyDown}
        twinSliderVisible={twinSliderVisible}
        setTwinSliderVisible={setTwinSliderVisible}
        handleCompareClick={handleCompareClick}
      />

      <div className="gridlines" aria-hidden="true" />

      <main className="layout panels-off relative flex-1 min-h-0 z-[1]">
        <TwinSlider 
          visible={twinSliderVisible} 
          setVisible={setTwinSliderVisible} 
          value={twinSliderValue} 
          setValue={setTwinSliderValue} 
        />
      </main>

      <CompareModal 
        visible={compareModalVisible} 
        setVisible={setCompareModalVisible}
        SUGGESTED_LOCATIONS={SUGGESTED_LOCATIONS}
        place1={place1}
        setPlace1={setPlace1}
        place2={place2}
        setPlace2={setPlace2}
        handleStartComparison={handleStartComparison}
      />
      
      <AgentChat />
    </div>
  );
}
