from __future__ import annotations

import math
import statistics
from datetime import datetime, timedelta, timezone

from app.models import (
    AlertEvent,
    AlertRule,
    AuditLog,
    ForecastRecord,
    ScenarioComparison,
    SimulationRun,
    TelemetryRecord,
    TwinAsset,
    db,
)


OPERATORS = {
    "gt": lambda value, threshold: value > threshold,
    "gte": lambda value, threshold: value >= threshold,
    "lt": lambda value, threshold: value < threshold,
    "lte": lambda value, threshold: value <= threshold,
    "eq": lambda value, threshold: value == threshold,
    "neq": lambda value, threshold: value != threshold,
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _latest_metric_value(asset_id: int, metric: str, default=0.0) -> float:
    record = (
        TelemetryRecord.query.filter_by(asset_id=asset_id, metric=metric)
        .order_by(TelemetryRecord.timestamp.desc())
        .first()
    )
    return record.value if record else default


def _metric_series(asset_id: int, metric: str, limit=200) -> list[float]:
    rows = (
        TelemetryRecord.query.filter_by(asset_id=asset_id, metric=metric)
        .order_by(TelemetryRecord.timestamp.desc())
        .limit(limit)
        .all()
    )
    values = [r.value for r in rows]
    values.reverse()
    return values


def audit_event(user_id: int | None, action: str, resource_type: str, resource_id: str, details=None):
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        details=details or {},
    )
    db.session.add(log)


def evaluate_rules(asset_id: int, metric: str, value: float) -> list[AlertEvent]:
    created_events = []
    rules = AlertRule.query.filter_by(asset_id=asset_id, metric=metric, enabled=True).all()
    for rule in rules:
        check = OPERATORS.get(rule.operator)
        if not check:
            continue
        if check(value, rule.threshold):
            event = AlertEvent(
                rule_id=rule.id,
                asset_id=asset_id,
                metric=metric,
                observed_value=value,
                severity=rule.severity,
                message=f"{metric} {rule.operator} {rule.threshold} triggered at {value}",
            )
            db.session.add(event)
            created_events.append(event)
    return created_events


def detect_anomaly(asset_id: int, metric: str, current_value: float, lookback=40) -> dict:
    series = _metric_series(asset_id, metric, limit=lookback + 1)
    if len(series) < 8:
        return {"is_anomaly": False, "score": 0.0, "reason": "insufficient_history"}

    baseline = series[:-1]
    mean = statistics.mean(baseline)
    std_dev = statistics.pstdev(baseline)
    if std_dev <= 1e-9:
        return {"is_anomaly": False, "score": 0.0, "reason": "flat_baseline"}

    z_score = abs((current_value - mean) / std_dev)
    return {
        "is_anomaly": z_score >= 2.5,
        "score": round(z_score, 3),
        "mean": round(mean, 3),
        "std_dev": round(std_dev, 3),
    }


def predict_maintenance(asset_id: int) -> dict:
    temperature = _metric_series(asset_id, "temperature", limit=50)
    vibration = _metric_series(asset_id, "vibration", limit=50)
    utilization = _metric_series(asset_id, "utilization", limit=50)

    score = 0.0
    if temperature:
        score += max(0.0, (statistics.mean(temperature) - 55.0) / 35.0)
    if vibration:
        score += max(0.0, (statistics.mean(vibration) - 4.0) / 8.0)
    if utilization:
        score += max(0.0, (statistics.mean(utilization) - 70.0) / 45.0)

    risk = min(0.99, score / 3.0)
    remaining_days = max(1, int(120 * (1 - risk)))
    return {
        "risk_probability": round(risk, 3),
        "remaining_useful_life_days": remaining_days,
        "recommended_action": "schedule_service" if risk > 0.55 else "monitor",
    }


def forecast_metric(asset_id: int, metric: str, horizon_minutes: int = 60) -> dict:
    series = _metric_series(asset_id, metric, limit=100)
    if len(series) < 4:
        predicted = _latest_metric_value(asset_id, metric, default=0.0)
        confidence = 0.35
    else:
        window = series[-8:]
        recent_mean = statistics.mean(window)
        slope = (window[-1] - window[0]) / max(1, len(window) - 1)
        predicted = recent_mean + slope * min(12, horizon_minutes / 5)
        volatility = statistics.pstdev(window)
        confidence = max(0.35, min(0.95, 1 - (volatility / (abs(recent_mean) + 1))))

    forecast = ForecastRecord(
        asset_id=asset_id,
        metric=metric,
        horizon_minutes=int(horizon_minutes),
        predicted_value=float(predicted),
        confidence=float(confidence),
    )
    db.session.add(forecast)
    return {
        "metric": metric,
        "horizon_minutes": int(horizon_minutes),
        "predicted_value": round(float(predicted), 3),
        "confidence": round(float(confidence), 3),
    }


def optimization_suggestions(asset_id: int) -> list[dict]:
    power = _metric_series(asset_id, "power_kw", limit=60)
    temperature = _metric_series(asset_id, "temperature", limit=60)
    utilization = _metric_series(asset_id, "utilization", limit=60)
    suggestions = []

    if power and statistics.mean(power) > 80:
        suggestions.append(
            {
                "category": "energy",
                "message": "Average power is high; reducing peak load by 8-12% could lower energy cost.",
                "expected_impact": {"power_kw": -0.1, "cost": -0.08},
            }
        )
    if temperature and statistics.mean(temperature) > 65:
        suggestions.append(
            {
                "category": "reliability",
                "message": "Thermal baseline is elevated; improve cooling airflow to avoid accelerated wear.",
                "expected_impact": {"temperature": -0.12, "failure_risk": -0.15},
            }
        )
    if utilization and statistics.mean(utilization) < 45:
        suggestions.append(
            {
                "category": "throughput",
                "message": "Low utilization detected; rebalance workload for higher throughput.",
                "expected_impact": {"utilization": 0.2, "output": 0.14},
            }
        )
    return suggestions


def _simulate_kpis(asset_id: int, params: dict, mode: str) -> dict:
    throughput = _latest_metric_value(asset_id, "throughput", default=100)
    power_kw = _latest_metric_value(asset_id, "power_kw", default=60)
    downtime = _latest_metric_value(asset_id, "downtime_minutes", default=0)
    quality = _latest_metric_value(asset_id, "quality_score", default=0.95)
    latency = _latest_metric_value(asset_id, "latency_ms", default=80)

    speed_factor = _safe_float(params.get("speed_factor", 1.0), 1.0)
    load_factor = _safe_float(params.get("load_factor", 1.0), 1.0)
    cooling_factor = _safe_float(params.get("cooling_factor", 1.0), 1.0)
    event = params.get("event")
    duration = _safe_float(params.get("duration_minutes", 30), 30)

    projected_throughput = throughput * speed_factor * max(0.6, 1 - (load_factor - 1) * 0.18)
    projected_power = power_kw * load_factor * (0.9 + speed_factor * 0.1)
    projected_quality = quality * min(1.1, 1 + (cooling_factor - 1) * 0.04)
    projected_downtime = downtime
    projected_latency = latency * max(0.75, load_factor * 0.95)

    if mode == "event":
        if event == "downtime":
            projected_downtime += duration
            projected_throughput *= 0.7
        elif event == "overload":
            projected_power *= 1.2
            projected_quality *= 0.92
            projected_latency *= 1.4
        elif event == "network_loss":
            projected_latency *= 1.8
            projected_throughput *= 0.86

    efficiency = projected_throughput / max(projected_power, 1e-6)
    return {
        "throughput": round(projected_throughput, 3),
        "power_kw": round(projected_power, 3),
        "downtime_minutes": round(projected_downtime, 3),
        "quality_score": round(min(1.0, projected_quality), 3),
        "latency_ms": round(projected_latency, 3),
        "efficiency": round(efficiency, 3),
    }


def run_simulation(asset_id: int, name: str, mode: str, parameters: dict, user_id: int | None):
    baseline = {
        "throughput": _latest_metric_value(asset_id, "throughput", default=100),
        "power_kw": _latest_metric_value(asset_id, "power_kw", default=60),
        "downtime_minutes": _latest_metric_value(asset_id, "downtime_minutes", default=0),
        "quality_score": _latest_metric_value(asset_id, "quality_score", default=0.95),
        "latency_ms": _latest_metric_value(asset_id, "latency_ms", default=80),
    }
    result = _simulate_kpis(asset_id, parameters or {}, mode=mode or "what_if")

    run = SimulationRun(
        asset_id=asset_id,
        name=name or "simulation",
        mode=mode or "what_if",
        parameters=parameters or {},
        baseline_snapshot=baseline,
        result=result,
        created_by=user_id,
    )
    db.session.add(run)
    audit_event(user_id, "run_simulation", "asset", str(asset_id), {"mode": run.mode, "name": run.name})
    return run, baseline, result


def compare_scenarios(asset_id: int, baseline_params: dict, candidate_params: dict, user_id: int | None):
    baseline_kpis = _simulate_kpis(asset_id, baseline_params or {}, mode="what_if")
    candidate_kpis = _simulate_kpis(asset_id, candidate_params or {}, mode="what_if")

    delta = {}
    for key, value in baseline_kpis.items():
        candidate = candidate_kpis.get(key, 0)
        delta[key] = round(candidate - value, 3)

    score = (
        (delta.get("throughput", 0) * 0.5)
        - (delta.get("power_kw", 0) * 0.2)
        - (delta.get("downtime_minutes", 0) * 0.3)
        + (delta.get("quality_score", 0) * 40)
        - (delta.get("latency_ms", 0) * 0.03)
    )
    winner = "candidate" if score >= 0 else "baseline"

    result = {
        "baseline": baseline_kpis,
        "candidate": candidate_kpis,
        "delta": delta,
        "winner": winner,
        "score": round(score, 3),
    }
    row = ScenarioComparison(
        asset_id=asset_id,
        baseline_params=baseline_params or {},
        candidate_params=candidate_params or {},
        result=result,
        created_by=user_id,
    )
    db.session.add(row)
    audit_event(user_id, "compare_scenarios", "asset", str(asset_id), {"winner": winner, "score": score})
    return row, result


def sync_virtual_command(asset: TwinAsset, command: dict, user_id: int | None):
    state = dict(asset.current_state or {})
    state.update(command or {})
    state["last_synced_at"] = _utc_now().isoformat()
    asset.current_state = state
    asset.updated_at = _utc_now()
    audit_event(user_id, "sync_virtual_command", "asset", str(asset.id), {"command": command or {}})
    return state


def telemetry_playback(asset_id: int, start_at: datetime, end_at: datetime, metric: str | None = None):
    query = TelemetryRecord.query.filter(
        TelemetryRecord.asset_id == asset_id,
        TelemetryRecord.timestamp >= start_at,
        TelemetryRecord.timestamp <= end_at,
    ).order_by(TelemetryRecord.timestamp.asc())
    if metric:
        query = query.filter(TelemetryRecord.metric == metric)
    rows = query.all()
    return [
        {
            "metric": row.metric,
            "value": row.value,
            "unit": row.unit,
            "quality": row.quality,
            "timestamp": row.timestamp.isoformat(),
        }
        for row in rows
    ]


def compute_site_kpis(site_id: int):
    assets = TwinAsset.query.filter_by(site_id=site_id).all()
    if not assets:
        return {
            "asset_count": 0,
            "online_assets": 0,
            "alert_count_open": 0,
            "avg_efficiency": 0,
            "maintenance_risk_avg": 0,
        }

    online = sum(1 for asset in assets if asset.status == "online")
    open_alerts = (
        AlertEvent.query.join(TwinAsset, AlertEvent.asset_id == TwinAsset.id)
        .filter(TwinAsset.site_id == site_id, AlertEvent.acknowledged.is_(False))
        .count()
    )

    efficiencies = []
    risks = []
    for asset in assets:
        throughput = _latest_metric_value(asset.id, "throughput", default=0)
        power = _latest_metric_value(asset.id, "power_kw", default=0)
        if power > 0:
            efficiencies.append(throughput / power)
        risks.append(predict_maintenance(asset.id)["risk_probability"])

    return {
        "asset_count": len(assets),
        "online_assets": online,
        "alert_count_open": open_alerts,
        "avg_efficiency": round(statistics.mean(efficiencies), 3) if efficiencies else 0,
        "maintenance_risk_avg": round(statistics.mean(risks), 3) if risks else 0,
    }
