import { useEffect, useState } from "react";
import { fetchAlerts, acknowledgeAlert } from "../services/api.js";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState("All");

  useEffect(() => {
    let active = true;
    fetchAlerts()
      .then((data) => {
        if (active) {
          setAlerts(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const unread = alerts.filter((a) => !a.read).length;
  const shown = alerts.filter((a) => level === "All" || a.level === level);

  const markRead = async (id) => {
    try {
      await acknowledgeAlert(id);
      setAlerts((as) => as.map((a) => (a.id === id ? { ...a, read: true } : a)));
    } catch {
      // optimistic update
      setAlerts((as) => as.map((a) => (a.id === id ? { ...a, read: true } : a)));
    }
  };

  const markAllRead = async () => {
    const unreadAlerts = alerts.filter((a) => !a.read);
    for (const a of unreadAlerts) {
      acknowledgeAlert(a.id).catch(() => {});
    }
    setAlerts((as) => as.map((a) => ({ ...a, read: true })));
  };

  return (
    <div className="page-simple">
      <h1 className="page-title">Alerts</h1>
      <p className="muted">{loading ? "Loading alerts..." : `${unread} unread alert${unread !== 1 ? "s" : ""}.`}</p>

      <div className="toolbar-row">
        <div className="chip-row">
          {["All", "Critical", "High", "Medium", "Low"].map((l) => (
            <button key={l} className={`chip${level === l ? " active" : ""}`} onClick={() => setLevel(l)}>{l}</button>
          ))}
        </div>
        <button className="btn ghost" onClick={markAllRead} disabled={unread === 0}>Mark all as read</button>
      </div>

      <div className="card update-list">
        {shown.map((a) => (
          <div key={a.id} className={`alert-row${a.read ? " read" : ""}`}>
            <span className={`status-dot ${a.level === "Critical" ? "high" : a.level === "High" ? "high" : a.level === "Medium" ? "medium" : "low"}`} />
            <div className="update-main">
              <strong>{a.title}</strong>
              <small>{a.regulator} · {a.date}</small>
              {a.description && <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>{a.description}</p>}
            </div>
            <span className={`impact ${(a.level || "medium").toLowerCase()}`}>{a.level}</span>
            {!a.read && <button className="link-btn nomargin" onClick={() => markRead(a.id)}>Mark read</button>}
          </div>
        ))}
        {!loading && shown.length === 0 && <p className="muted">No active alerts.</p>}
      </div>
    </div>
  );
}
