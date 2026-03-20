import React, { useEffect, useRef, useState } from 'react';
import '../styles/dashboard.css';

const Dashboard = ({ cesiumToken }) => {
  const cesiumContainer = useRef(null);
  const [panelsVisible, setPanelsVisible] = useState(false);

  useEffect(() => {
    if (!cesiumToken || !cesiumContainer.current) return;

    window.Cesium.Ion.defaultAccessToken = cesiumToken;
    const viewer = new window.Cesium.Viewer(cesiumContainer.current, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      // ... your other cesiumapp.js settings
    });

    // Apply your transparency styles
    viewer.scene.skyBox.show = false;
    viewer.scene.backgroundColor = window.Cesium.Color.TRANSPARENT;
    viewer.scene.globe.baseColor = window.Cesium.Color.TRANSPARENT;

    return () => viewer.destroy(); // Cleanup on unmount
  }, [cesiumToken]);

  return (
    <div className={`shell ${panelsVisible ? 'panels-on' : 'panels-off'}`}>
      <header className="topbar">
        <div className="brandmark"><div className="spark" />NovaGlobe</div>
        <button className="search-btn" onClick={() => setPanelsVisible(!panelsVisible)}>
          {panelsVisible ? "Close Data" : "Explore"}
        </button>
      </header>

      <main className="layout">
        <div id="cesiumContainer" ref={cesiumContainer} style={{height: '600px'}} />
        
        {/* Panels show/hide based on React State */}
        <section className="panel left">
          <h3>Semantic Discovery</h3>
          {/* Map your semanticResults here */}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;