import { useEffect, useRef, useState, useCallback } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ── Time Slider helpers ──
const SLIDER_DAYS = 30; // how many days back the slider goes
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const sliderIndexToDate = (idx) => daysAgo(SLIDER_DAYS - idx);
const formatSliderDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

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
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [newsData, setNewsData] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('weather');
  const [popupFlipped, setPopupFlipped] = useState(false);
  const [sliderIndex, setSliderIndex] = useState(SLIDER_DAYS); // rightmost = today
  const latLngRef = useRef(null); // store current { lat, lng, name } for re-fetching
  const popupRef = useRef(null);
  const baseLayerRef = useRef(null);
  const layerCacheRef = useRef(new Map());
  const layerLoadPromisesRef = useRef(new Map());
  const applyingStyleRef = useRef(false);
  const queuedStyleRef = useRef(null);
  const flyToHandlerRef = useRef(null);
  const hasIonTokenRef = useRef(false);
  const preloadTimerRef = useRef(null);
  // Lazy 3D Tiles: refs for tileset and camera listener
  const osmTilesetRef = useRef(null);
  const osmTilesetLoadingRef = useRef(false);
  const cameraMovEndListenerRef = useRef(null);

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

    const layer = Cesium.ImageryLayer.fromProviderAsync(
      Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
      )
    );
    viewer.imageryLayers.add(layer, 0);
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

    const initialFallbackLayer = Cesium.ImageryLayer.fromProviderAsync(
      Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
      )
    );

    const viewer = new Cesium.Viewer(containerRef.current, {
      terrainProvider: new Cesium.EllipsoidTerrainProvider(), // placeholder until world terrain loads
      baseLayer: initialFallbackLayer,
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

    // Load Cesium World Terrain (real elevation) so 3D buildings don't float
    if (hasIonTokenRef.current) {
      Cesium.createWorldTerrainAsync({ requestVertexNormals: true, requestWaterMask: true })
        .then((worldTerrain) => {
          if (viewerRef.current && !viewerRef.current.isDestroyed()) {
            viewerRef.current.terrainProvider = worldTerrain;
          }
        })
        .catch((err) => console.warn('World terrain load failed, using flat ellipsoid:', err));
    }

    viewerRef.current = viewer;
    layerCacheRef.current.set("FALLBACK", initialFallbackLayer);
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.dynamicAtmosphereLighting = true;
    viewer.scene.globe.dynamicAtmosphereLightingFromSun = true;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.fog.enabled = false;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.postProcessStages.fxaa.enabled = true;
    viewer.clock.currentTime = Cesium.JulianDate.now();
    viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    viewer.clock.multiplier = DAY_NIGHT_TIME_MULTIPLIER;
    viewer.clock.shouldAnimate = true;

    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableCollisionDetection = true;
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

    // Build a premium glowing SVG marker (created once, cached)
    const buildGlowMarker = () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#0dcaf0" stop-opacity="0.6"/>
            <stop offset="60%" stop-color="#0dcaf0" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#0dcaf0" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#glow)"/>
        <circle cx="32" cy="32" r="10" fill="#0dcaf0" stroke="#fff" stroke-width="3"/>
        <circle cx="32" cy="32" r="16" fill="none" stroke="#0dcaf0" stroke-width="1.5" stroke-opacity="0.5"/>
      </svg>`;
      return 'data:image/svg+xml;base64,' + btoa(svg);
    };

    const glowMarkerImage = buildGlowMarker();

    flyToHandlerRef.current = (event) => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return;

      const { lat, lng, height, focusName, focusInfo } = event.detail || {};
      if (typeof lat !== "number" || typeof lng !== "number") return;

      // Clear existing pins immediately
      viewerInstance.entities.removeAll();
      setPopupData(null);

      // --- Fly to the location with an offset so the marker lands in the
      //     lower portion of the viewport, leaving room for the popup above ---
      const targetHeight = height || 5_000; // 5 km above

      // We offset the camera target ~30% northward (in lat) so the actual
      // location renders in the lower third of the screen.
      // At 5 km altitude, ~0.012° lat corresponds to roughly 30% of the
      // visible ground span.
      const latOffsetDeg = (targetHeight / 5_000) * 0.012;
      const cameraLat = lat + latOffsetDeg;
      const targetPos = Cesium.Cartesian3.fromDegrees(lng, cameraLat, targetHeight);

      viewerInstance.camera.cancelFlight();
      viewerInstance.camera.flyTo({
        destination: targetPos,
        duration: 2.5,
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90), // straight down — no lateral tilt
          roll: 0,
        },
        complete: () => {
          // Drop the glowing marker and show popup AFTER zoom completes
          if (focusName) {
            viewerInstance.entities.add({
              position: Cesium.Cartesian3.fromDegrees(lng, lat),
              billboard: {
                image: glowMarkerImage,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                pixelOffset: new Cesium.Cartesian2(0, 0),
                scale: 1.0,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              },
            });
            setPopupData({
              title: focusName,
              info: focusInfo || "A beautiful destination to explore.",
              position: Cesium.Cartesian3.fromDegrees(lng, lat),
            });

            // Save coords for re-fetching on slider change
            latLngRef.current = { lat, lng, name: focusName };
            setSliderIndex(SLIDER_DAYS); // reset slider to today
            setActiveTab('weather');

            // Fetch real-time weather for this location
            setWeatherData(null);
            setWeatherLoading(true);
            fetch(`${API_BASE}/weather?lat=${lat}&lng=${lng}`)
              .then(res => res.json())
              .then(data => {
                if (data.success && data.weather) {
                  setWeatherData(data.weather);
                }
              })
              .catch(err => console.warn('Weather fetch failed:', err))
              .finally(() => setWeatherLoading(false));

            // Fetch latest news for this location
            setNewsData(null);
            setNewsLoading(true);
            fetch(`${API_BASE}/news?q=${encodeURIComponent(focusName)}`)
              .then(res => res.json())
              .then(data => {
                if (data.success && data.articles) {
                  setNewsData(data.articles);
                }
              })
              .catch(err => console.warn('News fetch failed:', err))
              .finally(() => setNewsLoading(false));
          }
        },
      });
    };

    window.addEventListener("globe:flyto", flyToHandlerRef.current);
    void applyBaseLayer(mapStyle);

    if (hasIonTokenRef.current) {
      // --- Lazy 3D Tiles: load OSM buildings only when user zooms into a region ---
      // This is the key optimization: never load at startup, only on demand.
      const LAZY_TILE_ALTITUDE_THRESHOLD = 3_000_000; // metres - only load when inside 3,000 km

      const handleCameraMoveEnd = () => {
        const v = viewerRef.current;
        if (!v || v.isDestroyed()) return;

        // Get camera height above the ellipsoid (globe surface)
        const cameraHeight = v.camera.positionCartographic?.height ?? Infinity;
        const shouldShowTiles = cameraHeight < LAZY_TILE_ALTITUDE_THRESHOLD;

        if (shouldShowTiles) {
          if (osmTilesetRef.current) {
            // Tileset already loaded — just make it visible
            osmTilesetRef.current.show = true;
          } else if (!osmTilesetLoadingRef.current) {
            // Tileset not yet fetched — fetch it now (only once)
            osmTilesetLoadingRef.current = true;
            Cesium.createOsmBuildingsAsync()
              .then((tileset) => {
                tileset.maximumScreenSpaceError = 16;
                tileset.dynamicScreenSpaceError = true;
                tileset.preloadWhenHidden = false;
                osmTilesetRef.current = tileset;
                if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                  viewerRef.current.scene.primitives.add(tileset);
                }
              })
              .catch((err) => {
                console.warn('OSM 3D Buildings lazy load failed:', err);
                osmTilesetLoadingRef.current = false;
              });
          }
        } else {
          // Zoomed out — hide the tileset to free GPU resources
          if (osmTilesetRef.current) {
            osmTilesetRef.current.show = false;
          }
        }
      };

      cameraMovEndListenerRef.current = handleCameraMoveEnd;
      viewer.camera.moveEnd.addEventListener(handleCameraMoveEnd);
    }

    return () => {
      if (preloadTimerRef.current) {
        clearTimeout(preloadTimerRef.current);
        preloadTimerRef.current = null;
      }
      if (flyToHandlerRef.current) {
        window.removeEventListener("globe:flyto", flyToHandlerRef.current);
      }
      // Remove camera lazy-load listener before destroying
      if (cameraMovEndListenerRef.current && viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.camera.moveEnd.removeEventListener(cameraMovEndListenerRef.current);
      }
      cameraMovEndListenerRef.current = null;
      osmTilesetRef.current = null;
      osmTilesetLoadingRef.current = false;
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

    const PIN_HEIGHT_PX = 64;  // approximate rendered pin height
    const POPUP_WIDTH_PX = 320; // matches the card width
    const VIEWPORT_PADDING = 12; // min distance from any viewport edge

    const preRenderListener = () => {
      if (!popupRef.current) return;
      const canvasPos = Cesium.SceneTransforms.worldToWindowCoordinates(
        viewer.scene,
        popupData.position
      );
      if (canvasPos) {
        popupRef.current.style.display = 'block';
        const cardW = popupRef.current.offsetWidth || POPUP_WIDTH_PX;
        const cardH = popupRef.current.offsetHeight || 120;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Ideal: popup above the pin, centered horizontally
        let x = Math.round(canvasPos.x - cardW / 2);
        let y = Math.round(canvasPos.y - PIN_HEIGHT_PX - cardH);

        // --- Flip below the pin if there's not enough room above ---
        let flipped = false;
        if (y < VIEWPORT_PADDING) {
          // Place below the pin marker instead
          y = Math.round(canvasPos.y + PIN_HEIGHT_PX / 2 + 8);
          flipped = true;
        }

        // --- Clamp to viewport edges ---
        // Horizontal clamping
        if (x < VIEWPORT_PADDING) x = VIEWPORT_PADDING;
        if (x + cardW > vw - VIEWPORT_PADDING) x = vw - VIEWPORT_PADDING - cardW;

        // Vertical clamping (bottom edge)
        if (y + cardH > vh - VIEWPORT_PADDING) y = vh - VIEWPORT_PADDING - cardH;
        // Final top clamping (safety)
        if (y < VIEWPORT_PADDING) y = VIEWPORT_PADDING;

        setPopupFlipped(flipped);
        popupRef.current.style.transform = `translate(${x}px, ${y}px)`;
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
      {/* Scoped slider thumb styles */}
      <style>{`
        .nova-time-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #0dcaf0;
          border: 2px solid rgba(8, 20, 36, 0.9);
          box-shadow: 0 0 8px rgba(13, 202, 240, 0.5), 0 0 2px rgba(0,0,0,0.4);
          cursor: pointer;
          margin-top: -6px;
          transition: box-shadow 0.2s ease;
        }
        .nova-time-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 14px rgba(13, 202, 240, 0.7), 0 0 3px rgba(0,0,0,0.5);
          transform: scale(1.15);
        }
        .nova-time-slider::-moz-range-thumb {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #0dcaf0;
          border: 2px solid rgba(8, 20, 36, 0.9);
          box-shadow: 0 0 8px rgba(13, 202, 240, 0.5);
          cursor: pointer;
        }
        .nova-time-slider::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 4px;
        }
        .nova-time-slider::-moz-range-track {
          height: 4px;
          border-radius: 4px;
          background: transparent;
        }
      `}</style>
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
            position: 'fixed',
            top: 0, left: 0,
            zIndex: 10,
            pointerEvents: 'auto',
            transform: 'translate(-9999px, -9999px)',
            width: '340px',
            maxHeight: '480px',
            padding: '0',
            borderRadius: '18px',
            background: 'rgba(8, 20, 36, 0.94)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(13, 202, 240, 0.35)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 24px rgba(13,202,240,0.12)',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            animation: 'popupFadeIn 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.3rem' }}>📍</span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0dcaf0', fontWeight: 700, lineHeight: 1.3, flex: 1 }}>
                {popupData.title}
              </h3>
              <button
                onClick={() => {
                  setPopupData(null);
                  setWeatherData(null);
                  setNewsData(null);
                  if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                    viewerRef.current.entities.removeAll();
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#7aa3be',
                  fontSize: '0.85rem',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.2)'; e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#7aa3be'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                title="Close"
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', lineHeight: 1.5, color: '#9ab8d4' }}>
              {popupData.info}
            </p>
          </div>

          {/* ── Time Slider ── */}
          <div style={{
            padding: '10px 16px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.6rem', color: '#4a7a94', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🕐 Time Travel</span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: sliderIndex === SLIDER_DAYS ? '#0dcaf0' : '#e8a838',
                background: sliderIndex === SLIDER_DAYS ? 'rgba(13,202,240,0.1)' : 'rgba(232,168,56,0.12)',
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.02em',
              }}>
                {sliderIndex === SLIDER_DAYS ? '● Live' : formatSliderDate(sliderIndexToDate(sliderIndex))}
              </span>
            </div>
            <input
              className="nova-time-slider"
              type="range"
              min={0}
              max={SLIDER_DAYS}
              value={sliderIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSliderIndex(idx);
                const loc = latLngRef.current;
                if (!loc) return;

                const selectedDate = sliderIndexToDate(idx);
                const isToday = idx === SLIDER_DAYS;

                // ── Re-fetch weather ──
                setWeatherData(null);
                setWeatherLoading(true);
                const weatherUrl = isToday
                  ? `${API_BASE}/weather?lat=${loc.lat}&lng=${loc.lng}`
                  : `${API_BASE}/weather/history?lat=${loc.lat}&lng=${loc.lng}&date=${selectedDate}`;
                fetch(weatherUrl)
                  .then(r => r.json())
                  .then(d => { if (d.success && d.weather) setWeatherData(d.weather); })
                  .catch(err => console.warn('Weather fetch failed:', err))
                  .finally(() => setWeatherLoading(false));

                // ── Re-fetch news ──
                setNewsData(null);
                setNewsLoading(true);
                let newsUrl = `${API_BASE}/news?q=${encodeURIComponent(loc.name)}`;
                if (!isToday) {
                  // Fetch news from selectedDate ± 1 day
                  const dayBefore = daysAgo(SLIDER_DAYS - idx + 1);
                  const dayAfter  = daysAgo(Math.max(0, SLIDER_DAYS - idx - 1));
                  newsUrl += `&from=${dayBefore}&to=${dayAfter}`;
                }
                fetch(newsUrl)
                  .then(r => r.json())
                  .then(d => { if (d.success && d.articles) setNewsData(d.articles); })
                  .catch(err => console.warn('News fetch failed:', err))
                  .finally(() => setNewsLoading(false));
              }}
              style={{
                width: '100%',
                height: '4px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, #e8a838 0%, #0dcaf0 ${(sliderIndex / SLIDER_DAYS) * 100}%, rgba(255,255,255,0.08) ${(sliderIndex / SLIDER_DAYS) * 100}%, rgba(255,255,255,0.08) 100%)`,
                borderRadius: '4px',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '0.55rem', color: '#3d6e85' }}>
              <span>{formatSliderDate(daysAgo(SLIDER_DAYS))}</span>
              <span>Today</span>
            </div>
          </div>

          {/* Tab Bar */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}>
            {[
              { key: 'weather', label: '☀️ Weather' },
              { key: 'news', label: '📰 News' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: activeTab === tab.key ? '#0dcaf0' : '#5a8ba8',
                  fontSize: '0.78rem',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.03em',
                  borderBottom: activeTab === tab.key ? '2px solid #0dcaf0' : '2px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable Content */}
          <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>

            {/* ── Weather Tab ── */}
            {activeTab === 'weather' && (
              <div style={{ padding: '12px 16px 14px' }}>
                {weatherLoading && (
                  <div style={{ textAlign: 'center', padding: '10px 0', color: '#4aa8c7', fontSize: '0.75rem',
                    letterSpacing: '0.05em' }}>
                    ● Loading weather…
                  </div>
                )}

                {weatherData && !weatherLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Temp + Icon row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={`https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`}
                          alt={weatherData.description}
                          style={{ width: 48, height: 48, filter: 'drop-shadow(0 0 6px rgba(13,202,240,0.4))' }}
                        />
                        <div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                            {Math.round(weatherData.temp)}°C
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#6daccc', textTransform: 'capitalize', marginTop: '2px' }}>
                            {weatherData.description}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', color: '#5a8ba8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Feels like
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#a0d4ea' }}>
                          {Math.round(weatherData.feels_like)}°C
                        </div>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      {[
                        { label: 'Humidity', value: weatherData.humidity != null ? `${weatherData.humidity}%` : '—', icon: '💧' },
                        { label: 'Wind', value: `${weatherData.wind_speed} m/s`, icon: '🌬️' },
                        ...(weatherData.historical
                          ? [{ label: 'Precip', value: `${weatherData.precipitation_mm ?? 0} mm`, icon: '🌧️' }]
                          : [{ label: 'Clouds', value: `${weatherData.clouds}%`, icon: '☁️' }]),
                      ].map((stat, i) => (
                        <div key={i} style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '10px',
                          padding: '8px 6px',
                          textAlign: 'center',
                        }}>
                          <div style={{ fontSize: '0.9rem', marginBottom: '2px' }}>{stat.icon}</div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d0e8f5' }}>{stat.value}</div>
                          <div style={{ fontSize: '0.58rem', color: '#5c8aa5', textTransform: 'uppercase',
                            letterSpacing: '0.06em', marginTop: '1px' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Min/Max bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 2px 0',
                      fontSize: '0.65rem', color: '#5a8ba8' }}>
                      <span>↓ {Math.round(weatherData.temp_min)}°C</span>
                      <span style={{ color: '#3d6e85' }}>{weatherData.name}{weatherData.country ? `, ${weatherData.country}` : ''}</span>
                      <span>↑ {Math.round(weatherData.temp_max)}°C</span>
                    </div>
                  </div>
                )}

                {!weatherData && !weatherLoading && (
                  <div style={{ textAlign: 'center', padding: '6px 0', color: '#3d6e85', fontSize: '0.7rem' }}>
                    Weather data unavailable
                  </div>
                )}
              </div>
            )}

            {/* ── News Tab ── */}
            {activeTab === 'news' && (
              <div style={{ padding: '12px 16px 14px' }}>
                {newsLoading && (
                  <div style={{ textAlign: 'center', padding: '10px 0', color: '#4aa8c7', fontSize: '0.75rem',
                    letterSpacing: '0.05em' }}>
                    ● Loading news…
                  </div>
                )}

                {newsData && newsData.length > 0 && !newsLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {newsData.slice(0, 5).map((article, i) => (
                      <a
                        key={i}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block',
                          textDecoration: 'none',
                          color: 'inherit',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(13,202,240,0.08)';
                          e.currentTarget.style.borderColor = 'rgba(13,202,240,0.25)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          {article.image && (
                            <img
                              src={article.image}
                              alt=""
                              style={{
                                width: 52, height: 52, borderRadius: '8px',
                                objectFit: 'cover', flexShrink: 0,
                                border: '1px solid rgba(255,255,255,0.06)',
                              }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.78rem', fontWeight: 600, color: '#d0e8f5',
                              lineHeight: 1.35,
                              display: '-webkit-box', WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>
                              {article.title}
                            </div>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              marginTop: '5px', fontSize: '0.6rem', color: '#5a8ba8',
                            }}>
                              <span style={{
                                background: 'rgba(13,202,240,0.12)',
                                color: '#0dcaf0',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                fontSize: '0.58rem',
                                letterSpacing: '0.02em',
                              }}>
                                {article.source}
                              </span>
                              <span>
                                {article.publishedAt
                                  ? new Date(article.publishedAt).toLocaleDateString('en-US', {
                                      month: 'short', day: 'numeric',
                                    })
                                  : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}

                {newsData && newsData.length === 0 && !newsLoading && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#3d6e85', fontSize: '0.75rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>📭</div>
                    No recent news found for this location
                  </div>
                )}

                {!newsData && !newsLoading && (
                  <div style={{ textAlign: 'center', padding: '6px 0', color: '#3d6e85', fontSize: '0.7rem' }}>
                    News data unavailable
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Arrow pointing toward the marker – flips when popup is below */}
          <div style={{
            position: 'absolute',
            ...(popupFlipped
              ? { top: '-12px', bottom: 'auto' }
              : { bottom: '-12px', top: 'auto' }),
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            ...(popupFlipped
              ? { borderBottom: '12px solid rgba(8, 20, 36, 0.94)', borderTop: 'none' }
              : { borderTop: '12px solid rgba(8, 20, 36, 0.94)', borderBottom: 'none' }),
          }} />
        </div>
      )}
    </>
  );
}
