import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/front.css';
import RobotGuide from '../components/RobotGuide';
import Navbar from '../components/Navbar';
import TwinSlider from '../components/TwinSlider';
import CompareModal from '../components/CompareModal';

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
  const [panelsVisible, setPanelsVisible] = useState(true);
  const [place1, setPlace1] = useState('');
  const [place2, setPlace2] = useState('');
  const pulseTimer = useRef(null);
  
  const [isComparing, setIsComparing] = useState(false);
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
    
    setIsComparing(true);
    setTwinError(null);
    try {
      const res = await api.post('/agent/compare', {
        place1,
        place2,
      });
      setCompareResult({
        labelA: place1,
        labelB: place2,
        text: res.data?.comparison || 'No comparison report generated.',
      });
      setCompareModalVisible(false);
      setPlace1('');
      setPlace2('');
    } catch (error) {
      console.error("Comparison Error", error);
      alert("Failed to generate comparison. " + (error?.response?.data?.error || ""));
    } finally {
      setIsComparing(false);
    }
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

      <Navbar 
        twinSliderVisible={twinSliderVisible}
        setTwinSliderVisible={setTwinSliderVisible}
        handleCompareClick={handleCompareClick}
      />

      <div className="gridlines" aria-hidden="true" />

      <main className={`layout ${panelsVisible ? 'panels-on' : 'panels-off'}`}>


        {twinSliderVisible && (
          <section className="pointer-events-auto fixed -translate-y-1/2 w-[320px] max-h-[50vh] overflow-y-auto 
          bg-[#030b14]/85 backdrop-blur-3xl border border-cyan/20 rounded-[1.5rem] 
          shadow-[0_0_0_1px_rgba(8,201,192,0.1),0_20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(8,201,192,0.1)] 
          p-5 flex flex-col gap-4 text-sm text-ink/80 transition-all duration-500 z-[90] 
          [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ right: '12px', top: '50%' }}>
            
            <div className="flex items-center gap-3 border-b border-cyan/10 pb-3 mt-1">
              <div className="w-8 h-8 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center shadow-[0_0_10px_rgba(8,201,192,0.2)]">
                <svg className="w-4 h-4 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="uppercase tracking-[0.15em] font-bold text-cyan text-xs m-0">Live Twin Ops</h3>
            </div>

            {twinError && <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]">{twinError}</div>}
            
            <div className="flex flex-col gap-2">
              {[
                { label: 'Site ID', value: selectedSiteId || '--' },
                { label: 'Asset Name', value: selectedAsset?.name || '--' },
                { label: 'Sync State', value: twinSyncing ? 'Updating...' : 'Stable', hl: twinSyncing },
                { label: 'Open Alerts', value: alerts.length, hl: alerts.length > 0 },
                { label: 'Avg Efficiency', value: siteKpis?.avg_efficiency ?? '--' },
                { label: 'Maint. Risk', value: maintenance ? `${Math.round((maintenance.risk_probability || 0) * 100)}%` : '--' },
                { label: 'Forecast', value: forecast ? `${forecast.predicted_value} kW` : '--' },
                { label: 'Timeline', value: appliedSliderValue === null ? '--' : `${appliedSliderValue}%`, hl: true }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-2 bg-white/5 rounded-xl border border-white/5 hover:bg-cyan/5 transition-colors">
                  <span className="text-[10px] text-ink/50 uppercase tracking-[0.15em] font-medium">{item.label}</span>
                  <span className={`text-[11px] font-bold tracking-wide ${item.hl ? 'text-cyan drop-shadow-[0_0_8px_rgba(8,201,192,0.6)]' : 'text-ink/90'}`}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#02060d]/60 border border-cyan/10 rounded-xl p-4 flex flex-col gap-3 mt-1 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
              <span className="text-[10px] text-cyan/70 uppercase tracking-[0.2em] font-bold">Latest Simulation</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[9px] text-ink/40 tracking-wider mb-0.5">MODE</span>
                  <span className="font-semibold text-xs text-ink/90">{simulationResult?.mode || '--'}</span>
                </div>
                <div className="flex flex-col bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[9px] text-ink/40 tracking-wider mb-0.5">THROUGHPUT</span>
                  <span className="font-semibold text-xs text-ink/90">{simulationResult?.result?.throughput ?? '--'}</span>
                </div>
                <div className="flex flex-col bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[9px] text-ink/40 tracking-wider mb-0.5">POWER</span>
                  <span className="font-semibold text-xs text-ink/90">{simulationResult?.result?.power_kw ?? '--'}</span>
                </div>
                <div className="flex flex-col bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[9px] text-ink/40 tracking-wider mb-0.5">LATENCY</span>
                  <span className="font-semibold text-xs text-ink/90">{simulationResult?.result?.latency_ms ? `${simulationResult.result.latency_ms} ms` : '--'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-1 mb-2">
              <span className="text-[10px] text-cyan/70 uppercase tracking-[0.2em] font-bold px-1">Recent Alerts</span>
              {alerts.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-ink/30 italic bg-white/5 rounded-xl border border-white/5">All systems nominal.</div>
              ) : (
                alerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="flex justify-between items-center px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl shadow-[inset_0_0_8px_rgba(239,68,68,0.1)]">
                    <span className="text-[10px] text-red-300/80 uppercase tracking-wider font-medium">{alert.metric}</span>
                    <span className="text-[11px] font-bold text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">{alert.observed_value}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        <TwinSlider 
          visible={twinSliderVisible} 
          setVisible={setTwinSliderVisible} 
          value={twinSliderValue} 
          setValue={setTwinSliderValue} 
        />
      </main>



      {compareResult && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-[min(95%,800px)] bg-[#030b14]/90 backdrop-blur-2xl border border-cyan/40 shadow-[0_30px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(8,201,192,0.2)] rounded-[2rem] p-6 md:p-8 flex flex-col gap-5 max-h-[85vh] animate-in slide-in-from-bottom-8 duration-400 pointer-events-auto">
            <div className="flex justify-between items-center border-b border-cyan/20 pb-4">
              <h3 className="m-0 font-bold text-xl text-cyan uppercase tracking-widest" style={{ fontFamily: '"Syncopate", "Space Grotesk", sans-serif' }}>{compareResult.labelA} <span className="text-ink-dim px-2 text-sm">VS</span> {compareResult.labelB}</h3>
              <button className="text-ink-dim hover:text-cyan text-3xl leading-none p-2 hover:scale-110 transition-transform" onClick={() => setCompareResult(null)} title="Close">&times;</button>
            </div>
            <div className="overflow-y-auto text-ink/90 text-[15px] leading-relaxed whitespace-pre-wrap pr-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan/40 [&::-webkit-scrollbar-thumb]:rounded-full markdown-body custom-scrollbar">
              {compareResult.text}
            </div>
          </div>
        </div>
      )}

      <CompareModal 
        visible={compareModalVisible} 
        setVisible={setCompareModalVisible}
        SUGGESTED_LOCATIONS={SUGGESTED_LOCATIONS}
        place1={place1}
        setPlace1={setPlace1}
        place2={place2}
        setPlace2={setPlace2}
        handleStartComparison={handleStartComparison}
        isComparing={isComparing}
      />
      
      <RobotGuide />
    </div>
  );
}
