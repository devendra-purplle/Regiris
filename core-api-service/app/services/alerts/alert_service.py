
from datetime import datetime, timezone

from app.schemas.alert import (
    Alert,
    AlertSeverity,
    AlertStatus,
    AlertSummary,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# Real in-memory store for regulatory and compliance alerts.
_alerts: dict[str, Alert] = {}


def create_alert(alert: Alert) -> Alert:
    """Dynamically registers a new alert."""
    _alerts[alert.id] = alert
    return alert


def list_alerts(
    status: AlertStatus | None = None,
    severity: AlertSeverity | None = None,
    limit: int = 50,
) -> list[Alert]:
    results = list(_alerts.values())

    if status is not None:
        results = [a for a in results if a.status == status]

    if severity is not None:
        results = [a for a in results if a.severity == severity]

    results.sort(
        key=lambda alert: alert.created_at,
        reverse=True,
    )

    return results[:limit]


def get_alert(alert_id: str) -> Alert | None:
    return _alerts.get(alert_id)


def acknowledge_alert(alert_id: str) -> Alert | None:
    alert = _alerts.get(alert_id)

    if alert is None:
        return None

    if alert.status == AlertStatus.RESOLVED:
        raise ValueError("A resolved alert cannot be acknowledged.")

    alert.status = AlertStatus.ACKNOWLEDGED
    alert.updated_at = utc_now()

    return alert


def resolve_alert(alert_id: str) -> Alert | None:
    alert = _alerts.get(alert_id)

    if alert is None:
        return None

    alert.status = AlertStatus.RESOLVED
    alert.updated_at = utc_now()

    return alert


def get_alert_summary() -> AlertSummary:
    alerts = list(_alerts.values())

    return AlertSummary(
        total=len(alerts),
        open=sum(a.status == AlertStatus.OPEN for a in alerts),
        acknowledged=sum(
            a.status == AlertStatus.ACKNOWLEDGED for a in alerts
        ),
        resolved=sum(
            a.status == AlertStatus.RESOLVED for a in alerts
        ),
        critical=sum(
            a.severity == AlertSeverity.CRITICAL for a in alerts
        ),
        high=sum(
            a.severity == AlertSeverity.HIGH for a in alerts
        ),
    )
