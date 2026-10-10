import { useEffect, useState } from "react";
import { fetchDocuments } from "../services/api.js";

export default function CoverageChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchDocuments()
      .then((docs) => {
        const counts = {};
        docs.forEach((d) => {
          const reg = d.regulator || "Unassigned";
          counts[reg] = (counts[reg] || 0) + 1;
        });
        const list = Object.entries(counts).map(([regulator, count]) => ({
          regulator,
          docs: count,
        }));
        setData(list);
      })
      .catch(() => setData([]));
  }, []);

  if (data.length === 0) {
    return <p className="muted small">No regulatory documents ingested yet.</p>;
  }

  const max = Math.max(...data.map((c) => c.docs), 1);
  return (
    <div className="coverage">
      {data.map((c) => (
        <div key={c.regulator} className="cov-row">
          <span>{c.regulator}</span>
          <div className="cov-track">
            <div className="cov-bar" style={{ width: `${(c.docs / max) * 100}%` }} />
          </div>
          <strong>{c.docs}</strong>
        </div>
      ))}
    </div>
  );
}
