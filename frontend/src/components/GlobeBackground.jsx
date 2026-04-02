import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

const MAP_STYLES = {
  AUTO: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
  SATELLITE: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
  AERIAL: Cesium.IonWorldImageryStyle.AERIAL,
  ROAD: Cesium.IonWorldImageryStyle.ROAD,
};

const DAY_NIGHT_TIME_MULTIPLIER = 120;

export default function GlobeBackground({ mapStyle = "AUTO" }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const pinBuilderRef = useRef(null);
  const [popupData, setPopupData] = useState(null);
  const popupRef = useRef(null);
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

    if (!pinBuilderRef.current) {
      pinBuilderRef.current = new Cesium.PinBuilder();
    }

    flyToHandlerRef.current = (event) => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return;

      const { lat, lng, height, focusName, focusInfo } = event.detail || {};
      if (typeof lat !== "number" || typeof lng !== "number") return;
      
      const destinationPos = Cesium.Cartesian3.fromDegrees(lng, lat, height || 6000);

      viewerInstance.camera.cancelFlight();
      viewerInstance.camera.flyTo({
        destination: destinationPos,
        duration: 2.0,
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-35),
          roll: 0,
        },
      });

      // Clear existing pins
      viewerInstance.entities.removeAll();

      if (focusName) {
        const pinImage = pinBuilderRef.current.fromColor(Cesium.Color.fromCssColorString('#0dcaf0'), 48).toDataURL();
        viewerInstance.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lng, lat),
          billboard: {
            image: pinImage,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, 0),
          }
        });

        setPopupData({
          title: focusName,
          info: focusInfo || "A beautiful destination to explore.",
          position: Cesium.Cartesian3.fromDegrees(lng, lat)
        });
      } else {
        setPopupData(null);
      }
    };

    window.addEventListener("globe:flyto", flyToHandlerRef.current);
    void applyBaseLayer(mapStyle);

    if (hasIonTokenRef.current) {
      preloadTimerRef.current = setTimeout(() => {
        const stylesToPreload = ["AERIAL", "ROAD", "SATELLITE"];
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

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !popupData) return;

    const preRenderListener = () => {
      if (!popupRef.current) return;
      // Fixed deprecated function name to current Cesium API
      const canvasPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, popupData.position);
      if (canvasPos) {
        popupRef.current.style.display = 'block';
        popupRef.current.style.transform = `translate(${canvasPos.x}px, ${canvasPos.y}px)`;
      } else {
        popupRef.current.style.display = 'none';
      }
    };

    viewer.scene.preRender.addEventListener(preRenderListener);
    return () => {
      viewer.scene.preRender.removeEventListener(preRenderListener);
    };
  }, [popupData]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
        }}
      />

      {popupData && (
        <div 
          ref={popupRef}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            zIndex: 10,
            pointerEvents: 'none',
            transform: 'translate(-9999px, -9999px)',
            transformOrigin: 'bottom center',
            marginTop: '-65px', 
            marginLeft: '-150px', 
            width: '300px',
            padding: '16px',
            borderRadius: '16px',
            background: 'rgba(15, 34, 51, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(13, 202, 240, 0.4)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(13, 202, 240, 0.2)',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            transition: 'opacity 0.3s ease'
          }}
        >
          <div style={{
             display: 'flex', 
             alignItems: 'center',
             gap: '10px',
             marginBottom: '10px',
             borderBottom: '1px solid rgba(255,255,255,0.1)',
             paddingBottom: '10px'
          }}>
            <span style={{ fontSize: '1.4rem' }}>📍</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0dcaf0', fontWeight: 600, lineHeight: 1.2 }}>
              {popupData.title}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: '#e0e0e0' }}>
            {popupData.info}
          </p>
          
          <div style={{
             position: 'absolute',
             bottom: '-12px',
             left: '50%',
             transform: 'translateX(-50%)',
             borderLeft: '12px solid transparent',
             borderRight: '12px solid transparent',
             borderTop: '12px solid rgba(15, 34, 51, 0.85)',
          }} />
        </div>
      )}
    </>
  );
}
