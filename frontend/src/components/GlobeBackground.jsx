import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

const MAP_STYLES = {
  AUTO: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
  SATELLITE: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
  AERIAL: Cesium.IonWorldImageryStyle.AERIAL,
  ROAD: Cesium.IonWorldImageryStyle.ROAD,
  DARK: Cesium.IonWorldImageryStyle.CANVAS_DARK,
};

const DAY_NIGHT_TIME_MULTIPLIER = 120;

export default function GlobeBackground({ mapStyle = "AUTO" }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const baseLayerRef = useRef(null);
  const layerCacheRef = useRef(new Map());
  const layerLoadPromisesRef = useRef(new Map());
  const applyingStyleRef = useRef(false);
  const queuedStyleRef = useRef(null);
  const flyToHandlerRef = useRef(null);
  const hasIonTokenRef = useRef(false);
  const preloadTimerRef = useRef(null);

  const normalizeStyle = (styleKey) => (styleKey === "AUTO" ? "SATELLITE" : styleKey);

  const applyStyleTuning = (viewer, layer, styleKey) => {
    const resolvedStyle = normalizeStyle(styleKey);

    // Reset to neutral defaults first.
    layer.brightness = 1.0;
    layer.contrast = 1.0;
    layer.hue = 0.0;
    layer.saturation = 1.0;
    layer.gamma = 1.0;
    layer.alpha = 1.0;
    layer.dayAlpha = 1.0;
    layer.nightAlpha = 0.35;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#0f2233");

    if (resolvedStyle === "DARK") {
      layer.brightness = 0.38;
      layer.contrast = 1.35;
      layer.saturation = 0.08;
      layer.gamma = 0.95;
      layer.nightAlpha = 0.7;
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#05090f");
      return;
    }

    if (resolvedStyle === "ROAD") {
      layer.brightness = 1.1;
      layer.contrast = 1.02;
      layer.saturation = 0.92;
      return;
    }

    if (resolvedStyle === "AERIAL") {
      layer.brightness = 1.0;
      layer.contrast = 1.12;
      layer.saturation = 1.08;
      return;
    }

    // SATELLITE / AUTO
    layer.brightness = 1.03;
    layer.contrast = 1.2;
    layer.saturation = 1.2;
    layer.gamma = 0.98;
  };

  const setActiveLayer = (viewer, layer, styleKey) => {
    layerCacheRef.current.forEach((cachedLayer) => {
      cachedLayer.show = cachedLayer === layer;
    });
    baseLayerRef.current = layer;
    applyStyleTuning(viewer, layer, styleKey);
    viewer.scene.requestRender();
  };

  const applyFallbackLayer = () => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return null;

    const cachedFallback = layerCacheRef.current.get("FALLBACK");
    if (cachedFallback) return cachedFallback;

    const fallbackProvider = new Cesium.TileMapServiceImageryProvider({
      url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
    });
    const layer = viewer.imageryLayers.addImageryProvider(fallbackProvider, 0);
    layerCacheRef.current.set("FALLBACK", layer);
    return layer;
  };

  const getOrCreateIonLayer = async (styleKey) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return null;

    const normalizedStyle = normalizeStyle(styleKey);
    const cachedLayer = layerCacheRef.current.get(normalizedStyle);
    if (cachedLayer) return cachedLayer;

    const pendingPromise = layerLoadPromisesRef.current.get(normalizedStyle);
    if (pendingPromise) {
      return pendingPromise;
    }

    const loadPromise = (async () => {
      const ionStyle = MAP_STYLES[normalizedStyle] || MAP_STYLES.AUTO;
      const provider = await Cesium.createWorldImageryAsync({ style: ionStyle });
      const layer = viewer.imageryLayers.addImageryProvider(provider, 0);
      layer.show = false;
      layerCacheRef.current.set(normalizedStyle, layer);
      return layer;
    })();

    layerLoadPromisesRef.current.set(normalizedStyle, loadPromise);
    try {
      return await loadPromise;
    } finally {
      layerLoadPromisesRef.current.delete(normalizedStyle);
    }
  };

  const applyBaseLayer = async (styleKey) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (applyingStyleRef.current) {
      queuedStyleRef.current = styleKey;
      return;
    }
    applyingStyleRef.current = true;

    try {
      let nextLayer = null;
      if (hasIonTokenRef.current) {
        nextLayer = await getOrCreateIonLayer(styleKey);
      } else {
        nextLayer = applyFallbackLayer();
      }

      if (!nextLayer) {
        nextLayer = applyFallbackLayer();
      }

      setActiveLayer(viewer, nextLayer, styleKey);
    } catch (error) {
      console.warn("Imagery load failed, using fallback layer:", error);
      const fallbackLayer = applyFallbackLayer();
      if (fallbackLayer) {
        setActiveLayer(viewer, fallbackLayer, styleKey);
      } else {
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#15314a");
        viewer.scene.requestRender();
      }
    } finally {
      applyingStyleRef.current = false;
      if (queuedStyleRef.current) {
        const nextStyle = queuedStyleRef.current;
        queuedStyleRef.current = null;
        void applyBaseLayer(nextStyle);
      }
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
    hasIonTokenRef.current = Boolean(token);
    if (token) {
      Cesium.Ion.defaultAccessToken = token;
    }

    const viewer = new Cesium.Viewer(containerRef.current, {
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
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
      requestRenderMode: false,
      useBrowserRecommendedResolution: true,
    });

    viewerRef.current = viewer;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.dynamicAtmosphereLighting = true;
    viewer.scene.globe.dynamicAtmosphereLightingFromSun = true;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.fog.enabled = false;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.postProcessStages.fxaa.enabled = true;
    viewer.clock.currentTime = Cesium.JulianDate.now();
    viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    viewer.clock.multiplier = DAY_NIGHT_TIME_MULTIPLIER;
    viewer.clock.shouldAnimate = true;

    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableCollisionDetection = false;
    controller.enableTilt = true;
    controller.inertiaSpin = 0.86;
    controller.inertiaTranslate = 0.9;
    controller.inertiaZoom = 0.8;
    controller.maximumMovementRatio = 0.2;
    controller.minimumZoomDistance = 500;
    controller.maximumZoomDistance = 120_000_000;
    controller.bounceAnimationTime = 0;

    viewer.camera.percentageChanged = 0.05;

    flyToHandlerRef.current = (event) => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return;

      const { lat, lng, height } = event.detail || {};
      if (typeof lat !== "number" || typeof lng !== "number") return;

      viewerInstance.camera.cancelFlight();
      viewerInstance.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, height || 1_500_000),
        duration: 1.5,
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0,
        },
      });
    };

    window.addEventListener("globe:flyto", flyToHandlerRef.current);
    void applyBaseLayer(mapStyle);

    if (hasIonTokenRef.current) {
      preloadTimerRef.current = setTimeout(() => {
        const stylesToPreload = ["AERIAL", "ROAD", "DARK"];
        stylesToPreload.forEach((styleKey) => {
          void getOrCreateIonLayer(styleKey);
        });
      }, 250);
    }

    return () => {
      if (preloadTimerRef.current) {
        clearTimeout(preloadTimerRef.current);
        preloadTimerRef.current = null;
      }
      if (flyToHandlerRef.current) {
        window.removeEventListener("globe:flyto", flyToHandlerRef.current);
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
      baseLayerRef.current = null;
      layerCacheRef.current.clear();
      layerLoadPromisesRef.current.clear();
      applyingStyleRef.current = false;
      queuedStyleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    void applyBaseLayer(mapStyle);
  }, [mapStyle]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
      }}
    />
  );
}
