import { Link } from "react-router-dom";
import { Download, ArrowRight } from "lucide-react";

const toCsv = (rows) => {
  const head = ["Trade ID", "Product Type", "Regulator", "Rule / Clause", "Impact", "Reason"];
  const body = rows.map((r) => [r.tradeId, r.product, r.regulator, r.rule, r.impact, r.reason].map((v) => `"${v}"`).join(","));
  return [head.join(","), ...body].join("\n");
};

export default function ImpactMatrix({ rows = [] }) {
  const exportCsv = () => {
    if (!rows || rows.length === 0) return;
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "impact-matrix.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!rows || rows.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center" }}>
        <p className="muted" style={{ marginBottom: 12 }}>No trade evaluations yet. Run an impact check to inspect live trade-to-rule compliance.</p>
        <Link to="/impact" className="btn" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          Go to Impact Analysis <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Trade ID</th><th>Product Type</th><th>Regulator</th><th>Rule / Clause</th><th>Impact</th><th>Reason</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tradeId}>
                <td>{r.tradeId}</td><td>{r.product}</td><td>{r.regulator}</td><td>{r.rule}</td>
                <td><span className={`impact ${r.impact.toLowerCase()}`}>{r.impact}</span></td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-footer">
        <button className="btn" onClick={exportCsv}><Download size={15} /> Export CSV</button>
      </div>
    </>
  );
}
