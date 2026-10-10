import { useEffect, useState } from "react";
import { fetchRegulators } from "../services/ruleEngine.js";

export default function RuleEngine() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchRegulators()
      .then((regulators) => {
        if (!active) return;
        const rows = (regulators || []).flatMap((reg) =>
          reg.rules.map((r) => ({
            id: r.id,
            regulator: reg.name,
            jurisdiction: reg.jurisdiction,
            name: r.description,
            severity: r.impact && (r.impact.toLowerCase().includes("mandatory") || r.impact.toLowerCase().includes("cannot")) ? "High" : "Medium",
            impact: r.impact,
            active: true,
          }))
        );
        setRules(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load rules");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggle = (id) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));

  return (
    <div className="page-simple">
      <h1 className="page-title">Rules Engine</h1>
      <p className="muted">Manage and inspect active regulatory validation rules.</p>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Regulator</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Impact Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="muted" style={{ textAlign: "center" }}>Loading regulatory rules...</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={6} className="muted" style={{ textAlign: "center" }}>No rules found.</td></tr>
              ) : (
                rules.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.id}</strong></td>
                    <td>{r.regulator} <small className="muted">({r.jurisdiction})</small></td>
                    <td>{r.name}</td>
                    <td><span className={`impact ${(r.severity || "medium").toLowerCase()}`}>{r.severity}</span></td>
                    <td><small className="muted">{r.impact}</small></td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={r.active} onChange={() => toggle(r.id)} />
                        <span />
                      </label>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
