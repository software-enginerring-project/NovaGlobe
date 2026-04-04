from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
import requests as http_requests
from flask import Blueprint, current_app, jsonify, make_response, request
from google.auth.transport import requests as grequests
from google.oauth2 import id_token
from werkzeug.security import check_password_hash, generate_password_hash

from .models import (
    AlertEvent,
    AlertRule,
    TelemetryRecord,
    TwinAsset,
    TwinSite,
    User,
    UserRole,
    db,
)
from .services.digital_twin_service import (
    audit_event,
    compare_scenarios,
    compute_site_kpis,
    detect_anomaly,
    evaluate_rules,
    forecast_metric,
    optimization_suggestions,
    predict_maintenance,
    run_simulation,
    sync_virtual_command,
    telemetry_playback,
)

# Create a Blueprint
main = Blueprint("main", __name__)


def _parse_iso_datetime(value: str | None, default=None):
    if not value:
        return default
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return default


def _get_authenticated_user():
    token = request.cookies.get("token")
    if not token:
        return None
    try:
        data = jwt.decode(
            token,
            current_app.config["JWT_SECRET"],
            algorithms=["HS256"],
        )
        return data
    except jwt.InvalidTokenError:
        return None


# To verify whether a user is authorized to access a resource or not
def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = _get_authenticated_user()
        if not user:
            return {"error": "Unauthorized"}, 401
        request.user = user
        return f(*args, **kwargs)

    return wrapper


def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = _get_authenticated_user()
            if not user:
                return {"error": "Unauthorized"}, 401
            request.user = user
            user_id = user.get("user_id")
            user_role = UserRole.query.filter_by(user_id=user_id).first()
            role = (user_role.role if user_role else "viewer").lower()
            if role not in [r.lower() for r in allowed_roles]:
                return {"error": "Forbidden", "required_roles": list(allowed_roles), "current_role": role}, 403
            return f(*args, **kwargs)

        return wrapper

    return decorator


def _json_error(message, code=400):
    return jsonify({"error": message}), code


def _build_auth_response(user: User, message: str):
    payload = {
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    jwt_token = jwt.encode(
        payload,
        current_app.config["JWT_SECRET"],
        algorithm="HS256",
    )

    role_row = UserRole.query.filter_by(user_id=user.id).first()
    role = role_row.role if role_row else "viewer"

    response = make_response(
        {
            "message": message,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": role,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
        }
    )
    response.set_cookie(
        "token",
        jwt_token,
        httponly=True,
        secure=False,
        samesite="Lax",
    )
    return response


@main.route("/auth/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name:
        return _json_error("name is required")
    if not email:
        return _json_error("email is required")
    if len(password) < 6:
        return _json_error("password must be at least 6 characters")

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return _json_error("An account with this email already exists", 409)

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.flush()
    db.session.add(UserRole(user_id=user.id, role="viewer"))
    db.session.commit()

    return jsonify(
        {
            "message": "Account created successfully",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": "viewer",
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
        }
    ), 201


@main.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return _json_error("email and password are required")

    user = User.query.filter_by(email=email).first()
    if not user or not user.password_hash or not check_password_hash(user.password_hash, password):
        return _json_error("Invalid email or password", 401)

    return _build_auth_response(user, "Logged in successfully")


@main.route("/auth/logout", methods=["POST"])
def logout():
    response = make_response({"message": "Logged out successfully"})
    response.set_cookie("token", "", expires=0, httponly=True, secure=False, samesite="Lax")
    return response


@main.route("/auth/change-password", methods=["POST"])
@login_required
def change_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not current_password or not new_password or not confirm_password:
        return _json_error("current_password, new_password, and confirm_password are required")
    if len(new_password) < 6:
        return _json_error("new_password must be at least 6 characters")
    if new_password != confirm_password:
        return _json_error("new_password and confirm_password must match")

    user = User.query.get(request.user.get("user_id"))
    if not user:
        return _json_error("User not found", 404)

    if not user.password_hash:
        return _json_error("This account does not support password login yet", 400)
    if not check_password_hash(user.password_hash, current_password):
        return _json_error("Current password is incorrect", 401)
    if check_password_hash(user.password_hash, new_password):
        return _json_error("New password must be different from current password")

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({"message": "Password updated successfully"})


@main.route("/auth/google", methods=["POST"])
def google_auth():
    data = request.get_json()
    token = data.get("token") if data else None

    try:
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(
            token,
            grequests.Request(),
            current_app.config["GOOGLE_CLIENT_ID"],
        )

        google_id = idinfo["sub"]
        email = idinfo["email"]
        name = idinfo.get("name")

        # Step 1: Check user in DB
        user = User.query.filter_by(google_id=google_id).first()

        # Step 2: If not exists create
        if not user:
            user = User(
                email=email,
                name=name,
                google_id=google_id,
            )
            db.session.add(user)
            db.session.flush()
            db.session.add(UserRole(user_id=user.id, role="admin"))
            db.session.commit()

        return _build_auth_response(user, "Login successful")

    except Exception as e:
        print("Google Auth Error:", e)
        return jsonify({"error": "Invalid token"}), 401


@main.route("/profile")
@login_required
def profile():
    user_id = request.user.get("user_id")
    user = User.query.get(user_id)
    if not user:
        return _json_error("User not found", 404)

    role_row = UserRole.query.filter_by(user_id=user_id).first()
    role = role_row.role if role_row else "viewer"
    return jsonify(
        {
            "message": "Authorized",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": role,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
        }
    )


@main.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    user_id = request.user.get("user_id")
    user = User.query.get(user_id)
    if not user:
        return _json_error("User not found", 404)

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()

    if not name:
        return _json_error("name is required")
    if not email:
        return _json_error("email is required")

    existing_user = User.query.filter_by(email=email).first()
    if existing_user and existing_user.id != user_id:
        return _json_error("This email is already used by another account", 409)

    user.name = name
    user.email = email
    db.session.commit()

    # Refresh auth cookie so JWT payload (name/email) stays in sync after profile edits.
    return _build_auth_response(user, "Profile updated successfully")


@main.route("/status")
def status():
    return jsonify({"status": "ok", "message": "NovaGlobe API is running"})


@main.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    query = data.get("query", "").strip() if data else ""

    if not query:
        return jsonify({"success": False, "error": "No query provided"}), 400

    from .services.search_service import semantic_search

    result = semantic_search(query)

    status_code = 200 if result["success"] else 422
    return jsonify(result), status_code


@main.route("/agent/chat", methods=["POST"])
def agent_chat():
    data = request.get_json()
    message = data.get("message", "").strip() if data else ""
    session_id = data.get("session_id", "anonymous") if data else "anonymous"

    user_id = None
    user = _get_authenticated_user()
    if user:
        user_id = user.get("user_id")

    from .services.agent_service import process_agent_message

    result = process_agent_message(user_id, session_id, message)
    if "error" in result:
        return jsonify(result), 400

    if result.get("fallback"):
        return jsonify(result), 500
    
    return jsonify(result), 200


@main.route("/agent/history", methods=["GET"])
def agent_history():
    session_id = request.args.get("session_id", "anonymous")
    from .services.agent_service import get_chat_history

    history = get_chat_history(session_id)
    return jsonify({"history": history}), 200


@main.route("/api/v1/twin/roles/<int:user_id>", methods=["PUT"])
@role_required("admin")
def update_user_role(user_id):
    data = request.get_json(silent=True) or {}
    role = (data.get("role") or "").strip().lower()
    if role not in {"viewer", "operator", "admin"}:
        return _json_error("role must be one of viewer/operator/admin")

    target_user = User.query.get(user_id)
    if not target_user:
        return _json_error("User not found", 404)

    row = UserRole.query.filter_by(user_id=user_id).first()
    if not row:
        row = UserRole(user_id=user_id, role=role)
        db.session.add(row)
    else:
        row.role = role
    audit_event(request.user.get("user_id"), "update_role", "user", str(user_id), {"role": role})
    db.session.commit()
    return jsonify({"user_id": user_id, "role": role})


@main.route("/api/v1/twin/sites", methods=["POST"])
@role_required("admin", "operator")
def create_site():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return _json_error("name is required")

    site = TwinSite(
        name=name,
        external_id=(data.get("external_id") or "").strip() or None,
        location=(data.get("location") or "").strip() or None,
        metadata_json=data.get("metadata", {}),
        created_by=request.user.get("user_id"),
    )
    db.session.add(site)
    audit_event(request.user.get("user_id"), "create_site", "site", "pending", {"name": name})
    db.session.commit()
    return (
        jsonify(
            {
                "id": site.id,
                "name": site.name,
                "external_id": site.external_id,
                "location": site.location,
                "metadata": site.metadata_json or {},
            }
        ),
        201,
    )


@main.route("/api/v1/twin/sites", methods=["GET"])
@login_required
def list_sites():
    sites = TwinSite.query.order_by(TwinSite.created_at.desc()).all()
    return jsonify(
        {
            "sites": [
                {
                    "id": s.id,
                    "name": s.name,
                    "external_id": s.external_id,
                    "location": s.location,
                    "metadata": s.metadata_json or {},
                    "created_at": s.created_at.isoformat(),
                }
                for s in sites
            ]
        }
    )


@main.route("/api/v1/twin/assets", methods=["POST"])
@role_required("admin", "operator")
def create_asset():
    data = request.get_json(silent=True) or {}
    site_id = data.get("site_id")
    name = (data.get("name") or "").strip()
    asset_type = (data.get("asset_type") or "").strip()

    if not site_id or not name or not asset_type:
        return _json_error("site_id, name, and asset_type are required")

    if not TwinSite.query.get(site_id):
        return _json_error("site not found", 404)

    asset = TwinAsset(
        site_id=site_id,
        parent_asset_id=data.get("parent_asset_id"),
        name=name,
        asset_type=asset_type,
        status=(data.get("status") or "online").strip().lower(),
        tags=data.get("tags", []),
        metadata_json=data.get("metadata", {}),
        current_state=data.get("current_state", {}),
    )
    db.session.add(asset)
    audit_event(request.user.get("user_id"), "create_asset", "site", str(site_id), {"asset_name": name})
    db.session.commit()
    return (
        jsonify(
            {
                "id": asset.id,
                "site_id": asset.site_id,
                "parent_asset_id": asset.parent_asset_id,
                "name": asset.name,
                "asset_type": asset.asset_type,
                "status": asset.status,
                "tags": asset.tags or [],
                "metadata": asset.metadata_json or {},
                "current_state": asset.current_state or {},
            }
        ),
        201,
    )


@main.route("/api/v1/twin/sites/<int:site_id>/assets", methods=["GET"])
@login_required
def list_assets(site_id):
    assets = TwinAsset.query.filter_by(site_id=site_id).order_by(TwinAsset.created_at.desc()).all()
    return jsonify(
        {
            "assets": [
                {
                    "id": a.id,
                    "site_id": a.site_id,
                    "parent_asset_id": a.parent_asset_id,
                    "name": a.name,
                    "asset_type": a.asset_type,
                    "status": a.status,
                    "tags": a.tags or [],
                    "metadata": a.metadata_json or {},
                    "current_state": a.current_state or {},
                    "updated_at": a.updated_at.isoformat() if a.updated_at else None,
                }
                for a in assets
            ]
        }
    )


@main.route("/api/v1/twin/assets/<int:asset_id>/sync", methods=["POST"])
@role_required("admin", "operator")
def sync_asset(asset_id):
    asset = TwinAsset.query.get(asset_id)
    if not asset:
        return _json_error("asset not found", 404)

    data = request.get_json(silent=True) or {}
    state = sync_virtual_command(asset, data.get("command", {}), request.user.get("user_id"))
    db.session.commit()
    return jsonify({"asset_id": asset_id, "state": state})


@main.route("/api/v1/twin/telemetry/ingest", methods=["POST"])
@role_required("admin", "operator")
def ingest_telemetry():
    data = request.get_json(silent=True) or {}
    records = data.get("records")
    if not isinstance(records, list) or not records:
        return _json_error("records must be a non-empty list")

    inserted = []
    anomalies = []
    generated_alerts = []
    user_id = request.user.get("user_id")

    for item in records:
        asset_id = item.get("asset_id")
        metric = (item.get("metric") or "").strip()
        if not asset_id or not metric:
            continue
        asset = TwinAsset.query.get(asset_id)
        if not asset:
            continue

        value = float(item.get("value", 0))
        ts = _parse_iso_datetime(item.get("timestamp"), default=datetime.now(timezone.utc))
        rec = TelemetryRecord(
            asset_id=asset_id,
            metric=metric,
            value=value,
            unit=item.get("unit"),
            quality=item.get("quality", "good"),
            source=item.get("source", "api"),
            metadata_json=item.get("metadata", {}),
            timestamp=ts,
        )
        db.session.add(rec)
        inserted.append(rec)

        # Keep current_state synchronized with physical latest readings.
        current_state = dict(asset.current_state or {})
        current_state[metric] = value
        current_state["last_telemetry_at"] = ts.isoformat()
        asset.current_state = current_state
        asset.updated_at = datetime.now(timezone.utc)

        anomaly = detect_anomaly(asset_id, metric, value)
        if anomaly.get("is_anomaly"):
            anomalies.append({"asset_id": asset_id, "metric": metric, "value": value, "anomaly": anomaly})

        events = evaluate_rules(asset_id, metric, value)
        if events:
            generated_alerts.extend(events)

    audit_event(user_id, "ingest_telemetry", "telemetry", "batch", {"records": len(inserted)})
    db.session.commit()

    return jsonify(
        {
            "inserted": len(inserted),
            "anomalies": [
                {
                    "asset_id": row["asset_id"],
                    "metric": row["metric"],
                    "value": row["value"],
                    "score": row["anomaly"]["score"],
                }
                for row in anomalies
            ],
            "alerts_created": len(generated_alerts),
        }
    )


@main.route("/api/v1/twin/assets/<int:asset_id>/state", methods=["GET"])
@login_required
def asset_state(asset_id):
    asset = TwinAsset.query.get(asset_id)
    if not asset:
        return _json_error("asset not found", 404)
    return jsonify(
        {
            "asset_id": asset.id,
            "name": asset.name,
            "status": asset.status,
            "state": asset.current_state or {},
            "updated_at": asset.updated_at.isoformat() if asset.updated_at else None,
        }
    )


@main.route("/api/v1/twin/assets/<int:asset_id>/telemetry", methods=["GET"])
@login_required
def list_telemetry(asset_id):
    metric = request.args.get("metric")
    limit = min(max(int(request.args.get("limit", 200)), 1), 2000)
    query = TelemetryRecord.query.filter_by(asset_id=asset_id)
    if metric:
        query = query.filter_by(metric=metric)
    rows = query.order_by(TelemetryRecord.timestamp.desc()).limit(limit).all()
    return jsonify(
        {
            "records": [
                {
                    "id": r.id,
                    "asset_id": r.asset_id,
                    "metric": r.metric,
                    "value": r.value,
                    "unit": r.unit,
                    "quality": r.quality,
                    "timestamp": r.timestamp.isoformat(),
                }
                for r in rows
            ]
        }
    )


@main.route("/api/v1/twin/playback", methods=["POST"])
@login_required
def playback():
    data = request.get_json(silent=True) or {}
    asset_id = data.get("asset_id")
    if not asset_id:
        return _json_error("asset_id is required")

    end_at = _parse_iso_datetime(data.get("end_at"), default=datetime.now(timezone.utc))
    start_at = _parse_iso_datetime(data.get("start_at"), default=end_at - timedelta(hours=1))
    metric = data.get("metric")

    if start_at >= end_at:
        return _json_error("start_at must be before end_at")

    records = telemetry_playback(asset_id, start_at, end_at, metric=metric)
    return jsonify(
        {
            "asset_id": asset_id,
            "metric": metric,
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
            "records": records,
        }
    )


@main.route("/api/v1/twin/rules", methods=["POST"])
@role_required("admin", "operator")
def create_rule():
    data = request.get_json(silent=True) or {}
    asset_id = data.get("asset_id")
    metric = (data.get("metric") or "").strip()
    operator = (data.get("operator") or "gt").strip().lower()
    threshold = data.get("threshold")
    if not asset_id or not metric or threshold is None:
        return _json_error("asset_id, metric, and threshold are required")
    if operator not in {"gt", "gte", "lt", "lte", "eq", "neq"}:
        return _json_error("Invalid operator")

    if not TwinAsset.query.get(asset_id):
        return _json_error("asset not found", 404)

    rule = AlertRule(
        asset_id=asset_id,
        metric=metric,
        operator=operator,
        threshold=float(threshold),
        severity=(data.get("severity") or "medium").strip().lower(),
        enabled=bool(data.get("enabled", True)),
        created_by=request.user.get("user_id"),
    )
    db.session.add(rule)
    audit_event(request.user.get("user_id"), "create_rule", "asset", str(asset_id), {"metric": metric})
    db.session.commit()
    return (
        jsonify(
            {
                "id": rule.id,
                "asset_id": rule.asset_id,
                "metric": rule.metric,
                "operator": rule.operator,
                "threshold": rule.threshold,
                "severity": rule.severity,
                "enabled": rule.enabled,
            }
        ),
        201,
    )


@main.route("/api/v1/twin/alerts", methods=["GET"])
@login_required
def list_alerts():
    asset_id = request.args.get("asset_id", type=int)
    acknowledged = request.args.get("acknowledged")
    limit = min(max(int(request.args.get("limit", 200)), 1), 2000)

    query = AlertEvent.query
    if asset_id:
        query = query.filter_by(asset_id=asset_id)
    if acknowledged in {"true", "false"}:
        query = query.filter_by(acknowledged=(acknowledged == "true"))
    rows = query.order_by(AlertEvent.created_at.desc()).limit(limit).all()

    return jsonify(
        {
            "alerts": [
                {
                    "id": r.id,
                    "rule_id": r.rule_id,
                    "asset_id": r.asset_id,
                    "metric": r.metric,
                    "observed_value": r.observed_value,
                    "severity": r.severity,
                    "message": r.message,
                    "acknowledged": r.acknowledged,
                    "created_at": r.created_at.isoformat(),
                }
                for r in rows
            ]
        }
    )


@main.route("/api/v1/twin/alerts/<int:alert_id>/ack", methods=["POST"])
@role_required("admin", "operator")
def acknowledge_alert(alert_id):
    alert = AlertEvent.query.get(alert_id)
    if not alert:
        return _json_error("alert not found", 404)
    alert.acknowledged = True
    alert.acknowledged_by = request.user.get("user_id")
    alert.acknowledged_at = datetime.now(timezone.utc)
    audit_event(request.user.get("user_id"), "acknowledge_alert", "alert", str(alert_id), {})
    db.session.commit()
    return jsonify({"id": alert.id, "acknowledged": True, "acknowledged_at": alert.acknowledged_at.isoformat()})


@main.route("/api/v1/twin/simulations/run", methods=["POST"])
@role_required("admin", "operator")
def run_sim():
    data = request.get_json(silent=True) or {}
    asset_id = data.get("asset_id")
    if not asset_id:
        return _json_error("asset_id is required")
    if not TwinAsset.query.get(asset_id):
        return _json_error("asset not found", 404)

    name = (data.get("name") or "simulation").strip()
    mode = (data.get("mode") or "what_if").strip().lower()
    if mode not in {"what_if", "event", "forecast"}:
        return _json_error("mode must be one of what_if/event/forecast")
    params = data.get("parameters", {}) or {}

    run, baseline, result = run_simulation(asset_id, name, mode, params, request.user.get("user_id"))
    db.session.commit()
    return jsonify(
        {
            "simulation_id": run.id,
            "asset_id": asset_id,
            "name": run.name,
            "mode": mode,
            "baseline": baseline,
            "result": result,
            "created_at": run.created_at.isoformat(),
        }
    )


@main.route("/api/v1/twin/scenarios/compare", methods=["POST"])
@role_required("admin", "operator")
def compare():
    data = request.get_json(silent=True) or {}
    asset_id = data.get("asset_id")
    if not asset_id:
        return _json_error("asset_id is required")
    if not TwinAsset.query.get(asset_id):
        return _json_error("asset not found", 404)
    baseline_params = data.get("baseline", {}) or {}
    candidate_params = data.get("candidate", {}) or {}
    row, result = compare_scenarios(asset_id, baseline_params, candidate_params, request.user.get("user_id"))
    db.session.commit()
    return jsonify({"comparison_id": row.id, "asset_id": asset_id, "result": result, "created_at": row.created_at.isoformat()})


@main.route("/api/v1/twin/forecast", methods=["POST"])
@login_required
def forecast():
    data = request.get_json(silent=True) or {}
    asset_id = data.get("asset_id")
    metric = (data.get("metric") or "").strip()
    if not asset_id or not metric:
        return _json_error("asset_id and metric are required")
    if not TwinAsset.query.get(asset_id):
        return _json_error("asset not found", 404)
    horizon = int(data.get("horizon_minutes", 60))
    result = forecast_metric(asset_id, metric, horizon_minutes=horizon)
    db.session.commit()
    return jsonify({"asset_id": asset_id, "forecast": result})


@main.route("/api/v1/twin/anomaly", methods=["POST"])
@login_required
def anomaly():
    data = request.get_json(silent=True) or {}
    asset_id = data.get("asset_id")
    metric = (data.get("metric") or "").strip()
    value = data.get("value")
    if not asset_id or not metric or value is None:
        return _json_error("asset_id, metric, and value are required")
    result = detect_anomaly(asset_id, metric, float(value))
    return jsonify({"asset_id": asset_id, "metric": metric, "value": float(value), "anomaly": result})


@main.route("/api/v1/twin/maintenance/<int:asset_id>", methods=["GET"])
@login_required
def maintenance(asset_id):
    if not TwinAsset.query.get(asset_id):
        return _json_error("asset not found", 404)
    return jsonify({"asset_id": asset_id, "prediction": predict_maintenance(asset_id)})


@main.route("/api/v1/twin/optimize/<int:asset_id>", methods=["GET"])
@login_required
def optimize(asset_id):
    if not TwinAsset.query.get(asset_id):
        return _json_error("asset not found", 404)
    return jsonify({"asset_id": asset_id, "suggestions": optimization_suggestions(asset_id)})


@main.route("/api/v1/twin/sites/<int:site_id>/kpis", methods=["GET"])
@login_required
def site_kpis(site_id):
    if not TwinSite.query.get(site_id):
        return _json_error("site not found", 404)
    return jsonify({"site_id": site_id, "kpis": compute_site_kpis(site_id)})


@main.route("/weather", methods=["GET"])
def weather():
    """Fetch real-time weather from OpenWeatherMap for given lat/lng."""
    lat = request.args.get("lat")
    lng = request.args.get("lng")

    if not lat or not lng:
        return _json_error("lat and lng query parameters are required")

    api_key = current_app.config.get("OPENWEATHER_API_KEY")
    if not api_key:
        return _json_error("OpenWeather API key not configured on server", 500)

    try:
        owm_url = "https://api.openweathermap.org/data/2.5/weather"
        resp = http_requests.get(
            owm_url,
            params={
                "lat": lat,
                "lon": lng,
                "appid": api_key,
                "units": "metric",
            },
            timeout=8,
        )

        if resp.status_code != 200:
            return jsonify({"success": False, "error": f"OpenWeather API error: {resp.status_code}"}), resp.status_code

        data = resp.json()
        weather_item = data.get("weather", [{}])[0]

        return jsonify({
            "success": True,
            "weather": {
                "temp": data["main"]["temp"],
                "feels_like": data["main"]["feels_like"],
                "temp_min": data["main"]["temp_min"],
                "temp_max": data["main"]["temp_max"],
                "humidity": data["main"]["humidity"],
                "pressure": data["main"]["pressure"],
                "wind_speed": data.get("wind", {}).get("speed", 0),
                "wind_deg": data.get("wind", {}).get("deg", 0),
                "description": weather_item.get("description", ""),
                "icon": weather_item.get("icon", "01d"),
                "main": weather_item.get("main", ""),
                "clouds": data.get("clouds", {}).get("all", 0),
                "visibility": data.get("visibility", 10000),
                "name": data.get("name", ""),
                "country": data.get("sys", {}).get("country", ""),
                "sunrise": data.get("sys", {}).get("sunrise"),
                "sunset": data.get("sys", {}).get("sunset"),
            },
        })

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "error": "Weather API timed out"}), 504
    except Exception as e:
        print("Weather fetch error:", e)
        return jsonify({"success": False, "error": "Failed to fetch weather data"}), 500


def _fetch_newsapi_articles(query, max_records=10, from_date=None, to_date=None):
    """Internal helper: fetch articles from NewsAPI."""
    api_key = current_app.config.get("NEWS_API_KEY")
    if not api_key:
        return []
        
    news_url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "sortBy": "publishedAt",
        "pageSize": max_records,
        "language": "en",
        "apiKey": api_key,
    }
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date
    
    try:
        resp = http_requests.get(news_url, params=params, timeout=10)
        if resp.status_code != 200:
            return []
        data = resp.json()
    except Exception:
        return []
        
    raw_articles = data.get("articles", [])
    articles = []
    for a in raw_articles:
        title = (a.get("title") or "").strip()
        if not title or title == "[Removed]":
            continue
        articles.append({
            "title": title,
            "domain": a.get("source", {}).get("name", "unknown"),
            "seendate": a.get("publishedAt", ""),
            "description": a.get("description", ""),
        })
    return articles


@main.route("/news", methods=["GET"])
def location_news():
    """Fetch news about a location from NewsAPI.org."""
    query = request.args.get("q", "").strip()

    if not query:
        return _json_error("q (location name) query parameter is required")

    try:
        articles = _fetch_newsapi_articles(query, max_records=10)
        return jsonify({"success": True, "articles": articles})
    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "error": "NewsAPI timed out"}), 504
    except Exception as e:
        print("News fetch error:", e)
        return jsonify({"success": False, "error": "Failed to fetch news"}), 500


@main.route("/news/summary", methods=["POST"])
def news_summary():
    """RAG-powered: fetch news for a location and generate an AI summary."""
    data = request.get_json(silent=True) or {}
    location = (data.get("location") or "").strip()
    if not location:
        return _json_error("location is required")

    try:
        articles = _fetch_newsapi_articles(location, max_records=10)

        if not articles:
            return jsonify({
                "success": True,
                "summary": f"No recent news coverage found for {location} in the past week.",
                "article_count": 0,
            })

        # Build context from retrieved articles
        context_lines = []
        for i, a in enumerate(articles, 1):
            date_str = a.get("seendate", "")[:10] if a.get("seendate") else "Unknown date"
            context_lines.append(f"{i}. [{date_str}] {a['title']} (via {a.get('domain', 'unknown')})")
        news_context = "\n".join(context_lines)

        # RAG: feed context to LLM for summary generation
        import os
        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key:
            return jsonify({
                "success": True,
                "summary": "AI summary unavailable (missing API key). Raw headlines:\n" + news_context,
                "article_count": len(articles),
            })

        from langchain_groq import ChatGroq
        from langchain_core.messages import SystemMessage

        llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.5, api_key=groq_key)
        prompt = f"""You are a concise news analyst for the NovaGlobe application.
Based on the following recent news headlines about "{location}", write a brief, informative summary (3-5 sentences) of what is currently happening in or related to this location.
Do NOT include any URLs or links. Focus on key events, trends, and notable developments.
Write in a professional but engaging tone.

Recent headlines:
{news_context}

Summary:"""

        response = llm.invoke([SystemMessage(content=prompt)])
        summary_text = response.content.strip()

        return jsonify({
            "success": True,
            "summary": summary_text,
            "article_count": len(articles),
        })

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "error": "GDELT API timed out"}), 504
    except Exception as e:
        print("News summary error:", e)
        return jsonify({"success": False, "error": "Failed to generate news summary"}), 500


@main.route("/news/ask", methods=["POST"])
def news_ask():
    """RAG-powered: answer a user question about a location using news + weather as context."""
    data = request.get_json(silent=True) or {}
    location = (data.get("location") or "").strip()
    question = (data.get("question") or "").strip()
    lat = data.get("lat")
    lng = data.get("lng")

    if not location or not question:
        return _json_error("location and question are required")

    try:
        # Retrieve news context
        articles = _fetch_newsapi_articles(location, max_records=10)
        context_parts = []

        if articles:
            news_lines = []
            for i, a in enumerate(articles, 1):
                date_str = a.get("seendate", "")[:10] if a.get("seendate") else "Unknown"
                news_lines.append(f"{i}. [{date_str}] {a['title']} (via {a.get('domain', 'unknown')})")
            context_parts.append("Recent News Headlines:\n" + "\n".join(news_lines))
        else:
            context_parts.append("No recent news articles found for this location.")

        # Retrieve weather context if coordinates available
        if lat and lng:
            try:
                owm_key = current_app.config.get("OPENWEATHER_API_KEY")
                if owm_key:
                    weather_resp = http_requests.get(
                        "https://api.openweathermap.org/data/2.5/weather",
                        params={"lat": lat, "lon": lng, "appid": owm_key, "units": "metric"},
                        timeout=6,
                    )
                    if weather_resp.status_code == 200:
                        wd = weather_resp.json()
                        desc = wd.get("weather", [{}])[0].get("description", "")
                        temp = wd.get("main", {}).get("temp", "")
                        humidity = wd.get("main", {}).get("humidity", "")
                        context_parts.append(f"Current Weather: {desc}, {temp}\u00b0C, Humidity {humidity}%")
            except Exception:
                pass  # weather context is optional

        full_context = "\n\n".join(context_parts)

        # RAG: feed context + question to LLM
        import os
        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key:
            return _json_error("AI service key not configured", 500)

        from langchain_groq import ChatGroq
        from langchain_core.messages import SystemMessage

        llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.5, api_key=groq_key)
        prompt = f"""You are an expert location analyst for the NovaGlobe application.
Answer the user's question about "{location}" using ONLY the context provided below.
If the context doesn't contain enough information to fully answer, say so honestly and provide what you can.
Do NOT include any URLs or links. Be concise (2-4 sentences) and informative.

Context about {location}:
{full_context}

User Question: {question}

Answer:"""

        response = llm.invoke([SystemMessage(content=prompt)])
        answer_text = response.content.strip()

        return jsonify({
            "success": True,
            "answer": answer_text,
            "location": location,
        })

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "error": "Request timed out"}), 504
    except Exception as e:
        print("News ask error:", e)
        return jsonify({"success": False, "error": "Failed to answer question"}), 500


# ---------------------------------------------------------------------------
# WMO Weather‑code → human description + OWM-style icon mapping
# ---------------------------------------------------------------------------
_WMO_MAP = {
    0:  ("Clear sky",            "01d"),
    1:  ("Mainly clear",         "02d"),
    2:  ("Partly cloudy",        "03d"),
    3:  ("Overcast",             "04d"),
    45: ("Fog",                  "50d"),
    48: ("Depositing rime fog",  "50d"),
    51: ("Light drizzle",        "09d"),
    53: ("Moderate drizzle",     "09d"),
    55: ("Dense drizzle",        "09d"),
    56: ("Light freezing drizzle","09d"),
    57: ("Dense freezing drizzle","09d"),
    61: ("Slight rain",          "10d"),
    63: ("Moderate rain",        "10d"),
    65: ("Heavy rain",           "10d"),
    66: ("Light freezing rain",  "13d"),
    67: ("Heavy freezing rain",  "13d"),
    71: ("Slight snowfall",      "13d"),
    73: ("Moderate snowfall",    "13d"),
    75: ("Heavy snowfall",       "13d"),
    77: ("Snow grains",          "13d"),
    80: ("Slight rain showers",  "09d"),
    81: ("Moderate rain showers","09d"),
    82: ("Violent rain showers", "09d"),
    85: ("Slight snow showers",  "13d"),
    86: ("Heavy snow showers",   "13d"),
    95: ("Thunderstorm",         "11d"),
    96: ("Thunderstorm with hail","11d"),
    99: ("Thunderstorm with heavy hail", "11d"),
}


@main.route("/weather/history", methods=["GET"])
def weather_history():
    """Fetch historical daily climate data from Open-Meteo (free, no key)."""
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    date = request.args.get("date", "").strip()   # YYYY-MM-DD

    if not lat or not lng or not date:
        return _json_error("lat, lng, and date query parameters are required")

    try:
        archive_url = "https://archive-api.open-meteo.com/v1/archive"
        resp = http_requests.get(
            archive_url,
            params={
                "latitude": lat,
                "longitude": lng,
                "start_date": date,
                "end_date": date,
                "daily": ",".join([
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "temperature_2m_mean",
                    "apparent_temperature_max",
                    "apparent_temperature_min",
                    "precipitation_sum",
                    "windspeed_10m_max",
                    "weathercode",
                    "relative_humidity_2m_mean",
                ]),
                "timezone": "auto",
            },
            timeout=10,
        )

        if resp.status_code != 200:
            return jsonify({"success": False, "error": f"Open-Meteo error: {resp.status_code}"}), resp.status_code

        data = resp.json()
        daily = data.get("daily", {})

        if not daily or not daily.get("time"):
            return jsonify({"success": False, "error": "No historical data found"}), 404

        # Extract the first (only) day's values
        wmo_code = (daily.get("weathercode") or [0])[0] or 0
        desc, icon = _WMO_MAP.get(wmo_code, ("Unknown", "01d"))

        temp_max = (daily.get("temperature_2m_max") or [None])[0]
        temp_min = (daily.get("temperature_2m_min") or [None])[0]
        temp_mean = (daily.get("temperature_2m_mean") or [None])[0]
        feels_max = (daily.get("apparent_temperature_max") or [None])[0]
        feels_min = (daily.get("apparent_temperature_min") or [None])[0]
        humidity = (daily.get("relative_humidity_2m_mean") or [None])[0]
        wind = (daily.get("windspeed_10m_max") or [None])[0]
        precip = (daily.get("precipitation_sum") or [None])[0]

        # Compute averages where sensible
        temp = temp_mean if temp_mean is not None else (
            ((temp_max or 0) + (temp_min or 0)) / 2 if temp_max is not None else 0
        )
        feels_like = (
            ((feels_max or 0) + (feels_min or 0)) / 2
            if feels_max is not None else temp
        )

        return jsonify({
            "success": True,
            "weather": {
                "temp": round(temp, 1),
                "feels_like": round(feels_like, 1),
                "temp_min": round(temp_min, 1) if temp_min is not None else None,
                "temp_max": round(temp_max, 1) if temp_max is not None else None,
                "humidity": round(humidity) if humidity is not None else None,
                "wind_speed": round(wind / 3.6, 2) if wind is not None else 0,  # km/h → m/s
                "description": desc,
                "icon": icon,
                "clouds": None,
                "precipitation_mm": round(precip, 1) if precip is not None else 0,
                "name": "",
                "country": "",
                "historical": True,
                "date": date,
            },
        })

    except http_requests.exceptions.Timeout:
        return jsonify({"success": False, "error": "Open-Meteo API timed out"}), 504
    except Exception as e:
        print("Historical weather fetch error:", e)
        return jsonify({"success": False, "error": "Failed to fetch historical weather"}), 500


@main.route("/agent/compare", methods=["POST"])
def agent_compare():
    data = request.get_json(silent=True) or {}
    place1 = (data.get("place1") or "").strip()
    place2 = (data.get("place2") or "").strip()

    if not place1 or not place2:
        return _json_error("place1 and place2 are required")

    from .services.agent_service import generate_location_comparison
    result = generate_location_comparison(place1, place2)

    status_code = 200 if result.get("success") else 500
    return jsonify(result), status_code
