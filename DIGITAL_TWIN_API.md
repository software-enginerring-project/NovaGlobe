# NovaGlobe Digital Twin API (v1)

All endpoints below are served by the Flask backend and are prefixed with:

- `/api/v1/twin`

Authentication:

- Read endpoints require logged-in user (`token` cookie).
- Write/control endpoints require role `operator` or `admin`.
- Role management requires `admin`.

## 1) Roles and Access

- `PUT /api/v1/twin/roles/<user_id>`
```json
{
  "role": "viewer"
}
```
Valid roles: `viewer`, `operator`, `admin`.

## 2) Site and Asset Modeling

- `POST /api/v1/twin/sites`
```json
{
  "name": "Factory A",
  "external_id": "FA-001",
  "location": "Hyderabad, IN",
  "metadata": {
    "timezone": "Asia/Calcutta"
  }
}
```

- `GET /api/v1/twin/sites`

- `POST /api/v1/twin/assets`
```json
{
  "site_id": 1,
  "parent_asset_id": null,
  "name": "Boiler Unit 1",
  "asset_type": "boiler",
  "status": "online",
  "tags": ["critical", "thermal"],
  "metadata": {
    "manufacturer": "Acme"
  },
  "current_state": {
    "mode": "auto"
  }
}
```

- `GET /api/v1/twin/sites/<site_id>/assets`
- `GET /api/v1/twin/assets/<asset_id>/state`
- `POST /api/v1/twin/assets/<asset_id>/sync` (virtual-to-physical command sync)
```json
{
  "command": {
    "target_mode": "eco",
    "fan_speed": 0.8
  }
}
```

## 3) Real-Time Telemetry and Playback

- `POST /api/v1/twin/telemetry/ingest`
```json
{
  "records": [
    {
      "asset_id": 1,
      "metric": "temperature",
      "value": 78.2,
      "unit": "C",
      "quality": "good",
      "source": "mqtt-gateway",
      "timestamp": "2026-04-02T10:00:00Z",
      "metadata": {
        "sensor_id": "T-90"
      }
    }
  ]
}
```
Runs anomaly checks and alert-rule evaluation automatically.

- `GET /api/v1/twin/assets/<asset_id>/telemetry?metric=temperature&limit=200`

- `POST /api/v1/twin/playback`
```json
{
  "asset_id": 1,
  "metric": "temperature",
  "start_at": "2026-04-02T09:00:00Z",
  "end_at": "2026-04-02T10:00:00Z"
}
```

## 4) Rules and Alerts

- `POST /api/v1/twin/rules`
```json
{
  "asset_id": 1,
  "metric": "temperature",
  "operator": "gt",
  "threshold": 75,
  "severity": "high",
  "enabled": true
}
```

- `GET /api/v1/twin/alerts?asset_id=1&acknowledged=false&limit=200`
- `POST /api/v1/twin/alerts/<alert_id>/ack`

## 5) Simulation and Scenario Analysis

- `POST /api/v1/twin/simulations/run`
```json
{
  "asset_id": 1,
  "name": "Night Shift What-If",
  "mode": "what_if",
  "parameters": {
    "speed_factor": 1.05,
    "load_factor": 0.95,
    "cooling_factor": 1.1
  }
}
```

Event simulation example:
```json
{
  "asset_id": 1,
  "name": "Overload Test",
  "mode": "event",
  "parameters": {
    "event": "overload",
    "duration_minutes": 20,
    "load_factor": 1.2
  }
}
```

- `POST /api/v1/twin/scenarios/compare`
```json
{
  "asset_id": 1,
  "baseline": {
    "speed_factor": 1.0,
    "load_factor": 1.0
  },
  "candidate": {
    "speed_factor": 1.08,
    "load_factor": 0.96,
    "cooling_factor": 1.1
  }
}
```

## 6) Forecasting and Intelligence

- `POST /api/v1/twin/forecast`
```json
{
  "asset_id": 1,
  "metric": "power_kw",
  "horizon_minutes": 120
}
```

- `POST /api/v1/twin/anomaly`
```json
{
  "asset_id": 1,
  "metric": "temperature",
  "value": 82.3
}
```

- `GET /api/v1/twin/maintenance/<asset_id>`
- `GET /api/v1/twin/optimize/<asset_id>`

## 7) Operational KPIs

- `GET /api/v1/twin/sites/<site_id>/kpis`

Returns:
- `asset_count`
- `online_assets`
- `alert_count_open`
- `avg_efficiency`
- `maintenance_risk_avg`

## Notes

- Audit trails are recorded for write operations.
- Tables are created automatically on app startup through `db.create_all()`.
- SQLite is supported out of the box; move to PostgreSQL for production scale.
