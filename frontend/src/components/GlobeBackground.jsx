import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

export default function GlobeBackground() {
  const cesiumContainerRef = useRef(null);

  useEffect(() => {
    if (!cesiumContainerRef.current) return;

    const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
    console.log("TOKEN:", token);

    if (!token) {
      console.error("❌ Missing token");
      return;
    }

    Cesium.Ion.defaultAccessToken = token;

    let viewer;

    const init = async () => {
      try {
        // ✅ CORRECT modern API
        const terrainProvider = await Cesium.createWorldTerrainAsync();

        viewer = new Cesium.Viewer(cesiumContainerRef.current, {
          terrainProvider,
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          scene3DOnly: true,
        });

        viewer.scene.globe.enableLighting = true;
      } catch (err) {
        console.error("❌ Cesium error:", err);
      }
    };

    init();

    return () => {
      if (viewer) viewer.destroy();
    };
  }, []);

  return (
    <div
      ref={cesiumContainerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
      }}
    />
  );
}