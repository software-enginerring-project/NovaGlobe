import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

const MAP_STYLES = {
  SATELLITE: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
  AERIAL: Cesium.IonWorldImageryStyle.AERIAL,
  ROAD: Cesium.IonWorldImageryStyle.ROAD,
  DARK: Cesium.IonWorldImageryStyle.CANVAS_DARK,
};

const ZOOM_IMAGERY_PROFILES = {
  global: {
    maxHeight: Number.POSITIVE_INFINITY,
    style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
  },
  regional: {
    maxHeight: 1_500_000,
    style: Cesium.IonWorldImageryStyle.ROAD,
  },
};

function getImageryProfile(height) {
  if (height <= ZOOM_IMAGERY_PROFILES.regional.maxHeight) {
    return "regional";
  }
  return "global";
}

export default function GlobeBackground({ mapStyle = "AUTO" }) {
  const cesiumContainerRef = useRef(null);
  const viewerRef = useRef(null);
  const currentBaseLayerRef = useRef(null);
  const currentProfileRef = useRef(null);
  const mapStyleRef = useRef(mapStyle);

  // Sync ref with prop
  useEffect(() => {
    mapStyleRef.current = mapStyle;
  }, [mapStyle]);

  const swapImagery = async (forceStyle = null) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    let styleToApply;
    const activeStyle = forceStyle || mapStyleRef.current;
    
    if (activeStyle !== "AUTO") {
      styleToApply = MAP_STYLES[activeStyle];
    } else {
      const cameraHeight = viewer.camera.positionCartographic.height;
      const nextProfile = getImageryProfile(cameraHeight);
      
      if (nextProfile === currentProfileRef.current && !forceStyle) {
        return;
      }
      styleToApply = ZOOM_IMAGERY_PROFILES[nextProfile].style;
      currentProfileRef.current = nextProfile;
    }

    try {
      const nextLayer = Cesium.ImageryLayer.fromWorldImagery({
        style: styleToApply,
      });

      viewer.imageryLayers.add(nextLayer, 0);

      if (currentBaseLayerRef.current) {
        viewer.imageryLayers.remove(currentBaseLayerRef.current, true);
      }

      currentBaseLayerRef.current = nextLayer;
    } catch (err) {
      console.error("Imagery swap error:", err);
    }
  };

  useEffect(() => {
    if (!cesiumContainerRef.current) return;

    const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
    if (!token) {
      console.error("Missing Cesium Ion token");
      return;
    }

    Cesium.Ion.defaultAccessToken = token;

    let isDestroyed = false;
    let removeCameraListener;

    const init = async () => {
      try {
        const terrainProvider = await Cesium.createWorldTerrainAsync();
        if (isDestroyed) return;

        const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
          terrainProvider,
          baseLayer: false,
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

        viewerRef.current = viewer;
        viewer.scene.globe.enableLighting = true;
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
        viewer.camera.percentageChanged = 0.02;

        await swapImagery(mapStyleRef.current);

        const handleCameraChange = () => {
          if (mapStyleRef.current === "AUTO") {
            void swapImagery("AUTO");
          }
        };

        viewer.camera.changed.addEventListener(handleCameraChange);
        removeCameraListener = () => {
          viewer.camera.changed.removeEventListener(handleCameraChange);
        };

        // Listen for flyTo events dispatched from other components (e.g. search)
        const handleFlyTo = (e) => {
          const { lat, lng, height } = e.detail;
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lng, lat, height || 1500000),
            duration: 2.5,
            orientation: {
              heading: Cesium.Math.toRadians(0),
              pitch: Cesium.Math.toRadians(-45),
              roll: 0,
            },
          });
        };
        window.addEventListener("globe:flyto", handleFlyTo);

        // Store cleanup for flyTo listener
        const removeFlyToListener = () => {
          window.removeEventListener("globe:flyto", handleFlyTo);
        };

        // Augment the cleanup to also remove flyTo listener
        const origRemoveCameraListener = removeCameraListener;
        removeCameraListener = () => {
          origRemoveCameraListener();
          removeFlyToListener();
        };
      } catch (err) {
        console.error("Cesium error:", err);
      }
    };

    void init();

    return () => {
      isDestroyed = true;
      if (removeCameraListener) removeCameraListener();
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
    };
  }, []);

  // Update imagery when mapStyle prop changes
  useEffect(() => {
    if (viewerRef.current) {
      swapImagery(mapStyle);
    }
  }, [mapStyle]);

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
