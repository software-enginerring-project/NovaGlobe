import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import GlobeBackground from './components/GlobeBackground';
import MapControls from './components/MapControls';

function App() {
  const [mapStyle, setMapStyle] = useState('AUTO');

  return (
    <>
      <GlobeBackground mapStyle={mapStyle} />
      <MapControls currentStyle={mapStyle} onStyleChange={(style) => setMapStyle(style)} />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;