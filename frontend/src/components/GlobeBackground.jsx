import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

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

export default function GlobeBackground() {
  const cesiumContainerRef = useRef(null);

  useEffect(() => {
    if (!cesiumContainerRef.current) return;

    const token = import.meta.env.VITE_CESIUM_ION_TOKEN;

    if (!token) {
      console.error("Missing Cesium Ion token");
      return;
    }

    Cesium.Ion.defaultAccessToken = token;

    let viewer;
    let currentBaseLayer;
    let currentProfile;
    let isDestroyed = false;
    let removeCameraListener;

    const swapImageryForHeight = async () => {
      if (!viewer || isDestroyed) return;

      const cameraHeight = viewer.camera.positionCartographic.height;
      const nextProfile = getImageryProfile(cameraHeight);

      if (nextProfile === currentProfile) {
        return;
      }

      const nextLayer = Cesium.ImageryLayer.fromWorldImagery({
        style: ZOOM_IMAGERY_PROFILES[nextProfile].style,
      });

      viewer.imageryLayers.add(nextLayer, 0);

      if (currentBaseLayer) {
        viewer.imageryLayers.remove(currentBaseLayer, true);
      }

      currentBaseLayer = nextLayer;
      currentProfile = nextProfile;
    };

    const init = async () => {
      try {
        const terrainProvider = await Cesium.createWorldTerrainAsync();

        if (isDestroyed) return;

        viewer = new Cesium.Viewer(cesiumContainerRef.current, {
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

        viewer.scene.globe.enableLighting = true;
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
        viewer.camera.percentageChanged = 0.02;

        await swapImageryForHeight();

        const handleCameraChange = () => {
          void swapImageryForHeight();
        };

        viewer.camera.changed.addEventListener(handleCameraChange);
        removeCameraListener = () => {
          viewer.camera.changed.removeEventListener(handleCameraChange);
        };
      } catch (err) {
        console.error("Cesium error:", err);
      }
    };

    void init();

    return () => {
      isDestroyed = true;

      if (removeCameraListener) {
        removeCameraListener();
      }

      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
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
