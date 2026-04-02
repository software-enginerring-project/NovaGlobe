import React, { useState } from 'react';

const MapControls = ({ currentStyle, onStyleChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const styles = [
    { id: 'AUTO', label: 'Auto', icon: '🌐' },
    { id: 'SATELLITE', label: 'Satellite', icon: '🛰️' },
    { id: 'ROAD', label: 'Street', icon: '🛣️' },
    { id: 'AERIAL', label: 'Aerial', icon: '🗺️' },
  ];

  return (
    <div className="map-controls">
      {isOpen && (
        <div className="map-style-menu">
          {styles.map((style) => (
            <div
              key={style.id}
              className={`style-option ${currentStyle === style.id ? 'active' : ''}`}
              onClick={() => {
                onStyleChange(style.id);
                setIsOpen(false);
              }}
            >
              <div className="style-icon-wrapper">{style.icon}</div>
              <span className="style-label">{style.label}</span>
            </div>
          ))}
        </div>
      )}
      <button
        className={`map-control-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Change Map Style"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 2L1 7l11 5 11-5-11-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </button>
    </div>
  );
};

export default MapControls;
