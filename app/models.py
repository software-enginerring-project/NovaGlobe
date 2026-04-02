from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100))
    google_id = db.Column(db.String(100), unique=True)
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    session_id = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'agent'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class UserRole(db.Model):
    __tablename__ = "user_roles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    role = db.Column(db.String(20), nullable=False, default="viewer")  # viewer, operator, admin
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class TwinSite(db.Model):
    __tablename__ = "twin_sites"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    external_id = db.Column(db.String(120), unique=True)
    location = db.Column(db.String(200))
    metadata_json = db.Column(db.JSON, default=dict)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class TwinAsset(db.Model):
    __tablename__ = "twin_assets"

    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(db.Integer, db.ForeignKey("twin_sites.id"), nullable=False, index=True)
    parent_asset_id = db.Column(db.Integer, db.ForeignKey("twin_assets.id"), nullable=True, index=True)
    name = db.Column(db.String(120), nullable=False)
    asset_type = db.Column(db.String(80), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="online")
    tags = db.Column(db.JSON, default=list)
    metadata_json = db.Column(db.JSON, default=dict)
    current_state = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class TelemetryRecord(db.Model):
    __tablename__ = "telemetry_records"

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("twin_assets.id"), nullable=False, index=True)
    metric = db.Column(db.String(80), nullable=False, index=True)
    value = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(30))
    quality = db.Column(db.String(20), default="good")
    source = db.Column(db.String(80), default="api")
    metadata_json = db.Column(db.JSON, default=dict)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class AlertRule(db.Model):
    __tablename__ = "alert_rules"

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("twin_assets.id"), nullable=False, index=True)
    metric = db.Column(db.String(80), nullable=False)
    operator = db.Column(db.String(20), nullable=False, default="gt")  # gt, gte, lt, lte, eq, neq
    threshold = db.Column(db.Float, nullable=False)
    severity = db.Column(db.String(20), nullable=False, default="medium")
    enabled = db.Column(db.Boolean, nullable=False, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class AlertEvent(db.Model):
    __tablename__ = "alert_events"

    id = db.Column(db.Integer, primary_key=True)
    rule_id = db.Column(db.Integer, db.ForeignKey("alert_rules.id"), nullable=True, index=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("twin_assets.id"), nullable=False, index=True)
    metric = db.Column(db.String(80), nullable=False)
    observed_value = db.Column(db.Float, nullable=False)
    severity = db.Column(db.String(20), nullable=False, default="medium")
    message = db.Column(db.String(300), nullable=False)
    acknowledged = db.Column(db.Boolean, nullable=False, default=False)
    acknowledged_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class SimulationRun(db.Model):
    __tablename__ = "simulation_runs"

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("twin_assets.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    mode = db.Column(db.String(40), nullable=False, default="what_if")  # what_if, event, forecast
    parameters = db.Column(db.JSON, default=dict)
    baseline_snapshot = db.Column(db.JSON, default=dict)
    result = db.Column(db.JSON, default=dict)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class ScenarioComparison(db.Model):
    __tablename__ = "scenario_comparisons"

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("twin_assets.id"), nullable=False, index=True)
    baseline_params = db.Column(db.JSON, default=dict)
    candidate_params = db.Column(db.JSON, default=dict)
    result = db.Column(db.JSON, default=dict)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class ForecastRecord(db.Model):
    __tablename__ = "forecast_records"

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("twin_assets.id"), nullable=False, index=True)
    metric = db.Column(db.String(80), nullable=False)
    horizon_minutes = db.Column(db.Integer, nullable=False, default=60)
    predicted_value = db.Column(db.Float, nullable=False)
    confidence = db.Column(db.Float, nullable=False, default=0.5)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    action = db.Column(db.String(120), nullable=False, index=True)
    resource_type = db.Column(db.String(80), nullable=False, index=True)
    resource_id = db.Column(db.String(80), nullable=False, index=True)
    details = db.Column(db.JSON, default=dict)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
