import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/front.css';
import AgentChat from '../components/AgentChat';
import Navbar from '../components/Navbar';
import TwinSlider from '../components/TwinSlider';
import CompareModal from '../components/CompareModal';

const defaultResults = [
  { title: 'Pacific Gridstream', detail: 'Ocean power simulation', score: '102%', tone: 'good' },
  { title: 'Amsterdam Net Power', detail: 'ES research initiative', score: '83%', tone: 'mid' },
  { title: 'Freiburg City', detail: 'EcoGrid status', score: '68%', tone: 'warm' },
];

const SUGGESTED_LOCATIONS = [
  'Pacific Gridstream',
  'Amsterdam Net Power',
  'Freiburg City',
  'Tokyo EcoHub',
  'Nordic WindFarm',
];

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const toneFor = (confidence) => {
  if (confidence > 0.8) return 'good';
  if (confidence > 0.5) return 'mid';
  return 'warm';
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const mapNameToParams = (name) => {
  const total = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const speed = 0.9 + ((total % 30) / 100);
  const load = 0.85 + (((total + 11) % 35) / 100);
  const cooling = 0.9 + (((total + 23) % 25) / 100);
  return {
    speed_factor: clamp(Number(speed.toFixed(2)), 0.75, 1.3),
    load_factor: clamp(Number(load.toFixed(2)), 0.75, 1.35),
    cooling_factor: clamp(Number(cooling.toFixed(2)), 0.75, 1.3),
  };
};

const sliderToParams = (value) => {
  const normalized = Number(value) / 100;
  return {
    speed_factor: Number((0.75 + normalized * 0.55).toFixed(3)),
    load_factor: Number((1.2 - normalized * 0.4).toFixed(3)),
    cooling_factor: Number((0.9 + normalized * 0.3).toFixed(3)),
  };
};

const createSeedRecords = (assetId) => {
  const now = Date.now();
  const records = [];

  for (let i = 30; i >= 1; i -= 1) {
    const jitter = Math.sin(i * 0.5);
    const timestamp = new Date(now - i * 60_000).toISOString();
    records.push(
      { asset_id: assetId, metric: 'temperature', value: Number((63 + jitter * 4).toFixed(2)), unit: 'C', timestamp },
      { asset_id: assetId, metric: 'power_kw', value: Number((74 + jitter * 7).toFixed(2)), unit: 'kW', timestamp },
      { asset_id: assetId, metric: 'throughput', value: Number((112 + jitter * 10).toFixed(2)), unit: 'units/h', timestamp },
      { asset_id: assetId, metric: 'utilization', value: Number((67 + jitter * 6).toFixed(2)), unit: '%', timestamp },
      { asset_id: assetId, metric: 'quality_score', value: Number((0.95 - Math.abs(jitter) * 0.03).toFixed(3)), unit: 'ratio', timestamp },
      { asset_id: assetId, metric: 'latency_ms', value: Number((78 + Math.abs(jitter) * 15).toFixed(2)), unit: 'ms', timestamp },
      { asset_id: assetId, metric: 'vibration', value: Number((3.8 + Math.abs(jitter) * 1.1).toFixed(2)), unit: 'mm/s', timestamp },
      { asset_id: assetId, metric: 'downtime_minutes', value: Number((Math.abs(jitter) > 0.95 ? 2 : 0).toFixed(2)), unit: 'min', timestamp },
    );
  }
  return records;
};

export default function Home() {
  const [twinSliderVisible, setTwinSliderVisible] = useState(false);
  const [twinSliderValue, setTwinSliderValue] = useState(100);
  const [appliedSliderValue, setAppliedSliderValue] = useState(null);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [place1, setPlace1] = useState('');
  const [place2, setPlace2] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(defaultResults);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [twinError, setTwinError] = useState(null);
  const [twinLoading, setTwinLoading] = useState(false);
  const [twinSyncing, setTwinSyncing] = useState(false);

  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [assets, setAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const [siteKpis, setSiteKpis] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [optimization, setOptimization] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [playback, setPlayback] = useState([]);

  const pulseTimer = useRef(null);
  const simulationTimer = useRef(null);
  const seededAssetsRef = useRef(new Set());
  const bootstrapDoneRef = useRef(false);
  const navigate = useNavigate();

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  );

  useEffect(() => {
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      if (simulationTimer.current) clearTimeout(simulationTimer.current);
    };
  }, []);

  const handleCompareClick = () => setCompareModalVisible(true);

  const withTwinError = (error, fallback = 'Digital twin request failed') => {
    const message = error?.response?.data?.error || fallback;
    if (error?.response?.status === 401) {
      setTwinError('Twin API requires login. Use Sign in / Sign up first, then open Digital Twin Simulation again.');
    } else if (error?.response?.status === 403) {
      setTwinError('Your account needs operator/admin role for simulation write actions.');
    } else {
      setTwinError(message);
    }
  };

  const refreshTwinReadModels = async (siteId, assetId) => {
    try {
      const [
        kpiRes,
        telemetryRes,
        alertsRes,
        maintenanceRes,
        optimizeRes,
        forecastRes,
      ] = await Promise.all([
        api.get(`/api/v1/twin/sites/${siteId}/kpis`),
        api.get(`/api/v1/twin/assets/${assetId}/telemetry`, { params: { limit: 80 } }),
        api.get('/api/v1/twin/alerts', { params: { asset_id: assetId, acknowledged: false, limit: 20 } }),
        api.get(`/api/v1/twin/maintenance/${assetId}`),
        api.get(`/api/v1/twin/optimize/${assetId}`),
        api.post('/api/v1/twin/forecast', { asset_id: assetId, metric: 'power_kw', horizon_minutes: 120 }),
      ]);

      setSiteKpis(kpiRes.data?.kpis || null);
      setTelemetry(telemetryRes.data?.records || []);
      setAlerts(alertsRes.data?.alerts || []);
      setMaintenance(maintenanceRes.data?.prediction || null);
      setOptimization(optimizeRes.data?.suggestions || []);
      setForecast(forecastRes.data?.forecast || null);
    } catch (error) {
      withTwinError(error, 'Unable to refresh twin data');
    }
  };

  const ensureTwinContext = async () => {
    setTwinLoading(true);
    setTwinError(null);

    try {
      const sitesRes = await api.get('/api/v1/twin/sites');
      let listSites = sitesRes.data?.sites || [];
      let site = listSites[0];

      if (!site) {
        const createdSite = await api.post('/api/v1/twin/sites', {
          name: 'NovaGlobe Demo Site',
          location: 'Hyderabad, IN',
          metadata: { profile: 'demo' },
        });
        site = createdSite.data;
        listSites = [site];
      }

      setSites(listSites);
      setSelectedSiteId(site.id);

      const assetsRes = await api.get(`/api/v1/twin/sites/${site.id}/assets`);
      let listAssets = assetsRes.data?.assets || [];
      let asset = listAssets[0];

      if (!asset) {
        const createdAsset = await api.post('/api/v1/twin/assets', {
          site_id: site.id,
          name: 'Grid Turbine Unit 01',
          asset_type: 'turbine',
          status: 'online',
          tags: ['critical', 'renewable'],
          metadata: {
            zone: 'north-grid',
            lat: 17.385,
            lng: 78.4867,
          },
          current_state: {
            mode: 'auto',
            temperature: 63,
            power_kw: 74,
            throughput: 112,
          },
        });
        asset = createdAsset.data;
        listAssets = [asset];
      }

      setAssets(listAssets);
      setSelectedAssetId(asset.id);

      // Seed telemetry one time per asset so forecast/anomaly/simulation has usable baseline.
      if (!seededAssetsRef.current.has(asset.id)) {
        const exists = await api.get(`/api/v1/twin/assets/${asset.id}/telemetry`, { params: { limit: 1 } });
        if (!exists.data?.records?.length) {
          await api.post('/api/v1/twin/telemetry/ingest', { records: createSeedRecords(asset.id) });
        }
        await api.post('/api/v1/twin/rules', {
          asset_id: asset.id,
          metric: 'temperature',
          operator: 'gt',
          threshold: 72,
          severity: 'high',
          enabled: true,
        }).catch(() => {});
        seededAssetsRef.current.add(asset.id);
      }

      await refreshTwinReadModels(site.id, asset.id);
      await runTimelineSimulation(asset.id, Number(twinSliderValue), false);
      bootstrapDoneRef.current = true;
    } catch (error) {
      withTwinError(error, 'Unable to initialize digital twin context');
    } finally {
      setTwinLoading(false);
    }
  };

  const runTimelineSimulation = async (assetId, sliderValue, showLoading = true) => {
    if (!assetId) return;
    if (showLoading) setTwinSyncing(true);
    setTwinError(null);

    try {
      const params = sliderToParams(sliderValue);
      const mode = Number(sliderValue) < 30 ? 'event' : 'what_if';
      const eventParams = mode === 'event'
        ? { ...params, event: 'overload', duration_minutes: 12 + Math.round((30 - Number(sliderValue)) * 0.5) }
        : params;

      const ingestPayload = {
        records: [
          {
            asset_id: assetId,
            metric: 'temperature',
            value: Number((64 + (1 - Number(sliderValue) / 100) * 12).toFixed(2)),
            unit: 'C',
            timestamp: new Date().toISOString(),
          },
          {
            asset_id: assetId,
            metric: 'power_kw',
            value: Number((70 + (1 - Number(sliderValue) / 100) * 16).toFixed(2)),
            unit: 'kW',
            timestamp: new Date().toISOString(),
          },
          {
            asset_id: assetId,
            metric: 'throughput',
            value: Number((98 + Number(sliderValue) / 100 * 24).toFixed(2)),
            unit: 'units/h',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await api.post('/api/v1/twin/telemetry/ingest', ingestPayload);

      const runRes = await api.post('/api/v1/twin/simulations/run', {
        asset_id: assetId,
        name: `Timeline ${sliderValue}`,
        mode,
        parameters: eventParams,
      });
      setSimulationResult(runRes.data || null);
      setAppliedSliderValue(Number(sliderValue));

      const now = new Date();
      const playbackHours = Math.max(1, Math.round((100 - Number(sliderValue)) / 6));
      const start = new Date(now.getTime() - playbackHours * 60 * 60 * 1000).toISOString();
      const end = now.toISOString();

      const playbackRes = await api.post('/api/v1/twin/playback', {
        asset_id: assetId,
        metric: 'throughput',
        start_at: start,
        end_at: end,
      });
      setPlayback(playbackRes.data?.records || []);

      if (selectedSiteId) {
        await refreshTwinReadModels(selectedSiteId, assetId);
      }
    } catch (error) {
      withTwinError(error, 'Simulation run failed');
    } finally {
      if (showLoading) setTwinSyncing(false);
    }
  };

  useEffect(() => {
    if (!twinSliderVisible || !selectedAssetId || !bootstrapDoneRef.current) return;
    if (simulationTimer.current) clearTimeout(simulationTimer.current);
    simulationTimer.current = setTimeout(() => {
      runTimelineSimulation(selectedAssetId, Number(twinSliderValue), true);
    }, 450);
  }, [twinSliderValue, twinSliderVisible, selectedAssetId]);

  const handleStartComparison = async () => {
    if (!place1 || !place2 || place1 === place2) return;
    if (!selectedAssetId) {
      setTwinError('Create/load a twin asset before running comparison');
      return;
    }
    setTwinSyncing(true);
    setTwinError(null);
    try {
      const baseline = mapNameToParams(place1);
      const candidate = mapNameToParams(place2);
      const res = await api.post('/api/v1/twin/scenarios/compare', {
        asset_id: selectedAssetId,
        baseline,
        candidate,
      });
      setCompareResult({
        labelA: place1,
        labelB: place2,
        ...(res.data?.result || {}),
      });
      setCompareModalVisible(false);
    } catch (error) {
      withTwinError(error, 'Scenario comparison failed');
    } finally {
      setTwinSyncing(false);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    window.dispatchEvent(new CustomEvent('agent:close'));

    try {
      const res = await api.post('/search', { query }, { withCredentials: false });
      const data = res.data;

      if (data.success && data.location) {
        const loc = data.location;
        setSearchResults([
          {
            title: loc.display_name,
            detail: loc.description,
            score: `${Math.round(loc.confidence * 100)}%`,
            tone: toneFor(loc.confidence),
          },
        ]);
        window.dispatchEvent(
          new CustomEvent('globe:flyto', {
            detail: { lat: loc.lat, lng: loc.lng },
          })
        );
      } else {
        setSearchError(data.error || 'No location found');
        setSearchResults(defaultResults);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError(err.response?.data?.error || 'Search failed. Is the backend running?');
      setSearchResults(defaultResults);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const openTwinPanel = async () => {
    const nextVisible = !twinSliderVisible;
    setTwinSliderVisible(nextVisible);
    if (nextVisible) {
      await ensureTwinContext();
    }
  };

  return (
    <div className="shell dashboard">
      <header className="topbar">
        <div className="brandmark">
          <div className="spark" aria-hidden="true"></div>
          <span>NovaGlobe</span>
        </div>
        <div className="search-wrap">
          <div className="search">
            <input
              placeholder="Explore the world. Show coastal cities with sustainable energy initiatives"
              aria-label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          <button
            className="search-btn topbar-search-btn"
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        <div className="top-actions">
          <button className="icon-btn topbar-hide-btn" type="button" onClick={() => setPanelsVisible(!panelsVisible)}>
            {panelsVisible ? 'Hide Data' : 'Show Data'}
          </button>
          <button className="chip topbar-compare-btn" type="button" onClick={handleCompareClick}>Compare</button>
        </div>
        <div className="avatar-wrap">
          <button
            className="avatar"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            NG
          </button>
          {menuOpen && (
            <div className="avatar-menu" role="menu">
              <button className="menu-item" type="button" onClick={goToLogin}>
                <span className="menu-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M10 3H5a2 2 0 00-2 2v14a2 2 0 002 2h5v-2H5V5h5V3zm6.3 4.3l-1.4 1.4 1.3 1.3H9v2h7.2l-1.3 1.3 1.4 1.4L20 11l-3.7-3.7z" />
                  </svg>
                </span>
                <span>Sign in / Sign up</span>
              </button>
              <div className="menu-divider" />
              <button className="menu-item" type="button" onClick={goToProfile}>
                <span className="menu-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
                  </svg>
                </span>
                <span>My profile</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="gridlines" aria-hidden="true" />

      <main className={`layout ${panelsVisible ? 'panels-on' : 'panels-off'}`}>
        <section className="panel left">
          <h3>{searchError ? 'Search Error' : 'Semantic Search Results'}</h3>
          {searchError && <div className="inline-error">{searchError}</div>}
          <div className="list">
            {searchResults.map((item) => (
              <div className="list-item" key={item.title}>
                <div>
                  <div className="list-title">{item.title}</div>
                  <div className="list-detail">{item.detail}</div>
                </div>
                <div className={`score ${item.tone}`}>{item.score}</div>
              </div>
            ))}
          </div>
          <div className="panel-footer">
            <button className="chip" type="button" onClick={openTwinPanel}>
              {twinSliderVisible ? 'Close Digital Twin' : 'Digital Twin Simulation'}
            </button>
          </div>
        </section>

        {twinSliderVisible && (
          <section className="panel right">
            <h3>Live Twin Operations</h3>
            {twinError && <div className="inline-error">{twinError}</div>}
            <div className="feed">
              <div className="feed-row"><span>Site</span><span className="value">{selectedSiteId || '--'}</span></div>
              <div className="feed-row"><span>Asset</span><span className="value">{selectedAsset?.name || '--'}</span></div>
              <div className="feed-row"><span>Sync State</span><span className="value">{twinSyncing ? 'Updating' : 'Stable'}</span></div>
              <div className="feed-row"><span>Open Alerts</span><span className="value">{alerts.length}</span></div>
              <div className="feed-row"><span>Avg Efficiency</span><span className="value">{siteKpis?.avg_efficiency ?? '--'}</span></div>
              <div className="feed-row"><span>Maint. Risk</span><span className="value">{maintenance ? `${Math.round((maintenance.risk_probability || 0) * 100)}%` : '--'}</span></div>
              <div className="feed-row"><span>Forecast Power</span><span className="value">{forecast ? `${forecast.predicted_value} kW` : '--'}</span></div>
              <div className="feed-row"><span>Timeline Applied</span><span className="value">{appliedSliderValue === null ? '--' : `${appliedSliderValue}%`}</span></div>
            </div>

            <div className="mini-card">
              <div className="mini-card-title">Latest Simulation</div>
              <div className="mini-card-body">
                <div>Mode: <strong>{simulationResult?.mode || '--'}</strong></div>
                <div>Throughput: <strong>{simulationResult?.result?.throughput ?? '--'}</strong></div>
                <div>Power: <strong>{simulationResult?.result?.power_kw ?? '--'}</strong></div>
                <div>Latency: <strong>{simulationResult?.result?.latency_ms ?? '--'} ms</strong></div>
              </div>
            </div>

            <div className="mini-card">
              <div className="mini-card-title">Recent Alerts</div>
              <div className="mini-alerts">
                {alerts.slice(0, 4).map((alert) => (
                  <div className="mini-alert-row" key={alert.id}>
                    <span>{alert.metric}</span>
                    <span className="value">{alert.observed_value}</span>
                  </div>
                ))}
                {!alerts.length && <div className="list-detail">No active alerts.</div>}
              </div>
            </div>
          </section>
        )}

        <div className={`twin-slider-container ${twinSliderVisible ? '' : 'hidden'}`}>
          <div className="twin-slider-header">
            <span className="twin-slider-title">Simulation Timeline</span>
            <button className="twin-slider-close" onClick={() => setTwinSliderVisible(false)} title="Close">&times;</button>
          </div>
          <div className="twin-slider-value">Year {new Date().getFullYear() - 100 + Number(twinSliderValue)}</div>
          <input
            type="range"
            min="0"
            max="100"
            value={twinSliderValue}
            onChange={(e) => setTwinSliderValue(e.target.value)}
            className="twin-slider-input"
          />
          <div className="twin-slider-labels">
            <span>Past (-100 Yrs)</span>
            <span>Present</span>
          </div>
          <div className="timeline-status">
            {twinLoading ? 'Initializing twin context...' : twinSyncing ? 'Applying simulation...' : 'Move slider to rerun simulation and refresh KPIs.'}
          </div>
          <div className="timeline-kpis">
            <div className="kpi-pill">Playback pts: {playback.length}</div>
            <div className="kpi-pill">Telemetry: {telemetry.length}</div>
            <div className="kpi-pill">Optimize tips: {optimization.length}</div>
          </div>
        </div>
      </main>

      {compareModalVisible && (
        <div className="compare-modal-overlay">
          <div className="compare-modal">
            <div className="compare-modal-header">
              <h3>Compare Scenarios</h3>
              <button className="twin-slider-close" onClick={() => setCompareModalVisible(false)} title="Close">&times;</button>
            </div>
            <div className="compare-modal-body">
              <p className="compare-desc">
                Select two strategy labels. We map them to control parameters and run scenario comparison on the active twin asset.
              </p>

              <div className="compare-inputs">
                <datalist id="compare-locations">
                  {SUGGESTED_LOCATIONS.map((loc) => <option key={loc} value={loc} />)}
                </datalist>

                <div className="input-group">
                  <label>Scenario A</label>
                  <input
                    type="text"
                    list="compare-locations"
                    value={place1}
                    onChange={(e) => setPlace1(e.target.value)}
                    className="compare-select"
                    placeholder="Type or select scenario A..."
                    aria-label="Select first scenario"
                  />
                </div>

                <div className="compare-vs">VS</div>

                <div className="input-group">
                  <label>Scenario B</label>
                  <input
                    type="text"
                    list="compare-locations"
                    value={place2}
                    onChange={(e) => setPlace2(e.target.value)}
                    className="compare-select"
                    placeholder="Type or select scenario B..."
                    aria-label="Select second scenario"
                  />
                </div>
              </div>
            </div>
            <div className="compare-modal-footer">
              <button
                className={`compare-submit-btn ${place1 && place2 && place1 !== place2 ? 'active' : ''}`}
                onClick={handleStartComparison}
                disabled={!place1 || !place2 || place1 === place2}
              >
                {place1 === place2 && place1 !== '' ? 'Select Distinct Scenarios' : 'Run Comparison'}
              </button>
            </div>
          </div>
        </div>
      )}

      {compareResult && (
        <div className="compare-result-toast">
          <div className="toast-head">Comparison: {compareResult.labelA} vs {compareResult.labelB}</div>
          <div className="toast-body">
            Winner: <strong>{compareResult.winner || '--'}</strong> | Score: <strong>{compareResult.score ?? '--'}</strong>
          </div>
        </div>
      )}

      <AgentChat />
    </div>
  );
}
