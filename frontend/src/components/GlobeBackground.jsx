import { useEffect, useRef } from 'react';

export default function GlobeBackground() {
  const cesiumContainerRef = useRef(null);

  useEffect(() => {
    if (window.Cesium && cesiumContainerRef.current) {
        window.Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
        const viewer = new window.Cesium.Viewer(cesiumContainerRef.current, {
            terrain: window.Cesium.Terrain.fromWorldTerrain(),
            timeline: false,
            animation: false,
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false,
            fullscreenButton: false,
            scene3DOnly: true, // Optimizes performance by disabling 2D features
        });

        // Hide the logo
        const creditContainer = viewer.bottomContainer;
        if (creditContainer) {
             creditContainer.style.display = 'none';
        }
        
        return () => {
             viewer.destroy();
        }
    }
  }, []);

  return (
    <div 
      ref={cesiumContainerRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 0,
        pointerEvents: 'auto' 
      }} 
    />
  );
}
