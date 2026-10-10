import { useState } from "react";
import { Download, FileBarChart } from "lucide-react";
import { downloadCsv } from "../services/export.js";
import { fetchDocuments, fetchAlerts } from "../services/api.js";
import { fetchRegulators } from "../services/ruleEngine.js";

const REPORTS_LIST = [
  { id: "coverage", title: "Regulatory Coverage Report", desc: "Overview of all ingested regulatory documents, jurisdictions, and version distribution." },
  { id: "rules", title: "Rules Inventory & Status", desc: "Complete inventory of active compliance rules across EMIR, FCA, and MiFID II." },
  { id: "alerts", title: "Compliance Alerts Summary", desc: "Audit log of all detected regulatory changes, timeline modifications, and severity levels." },
];

export default function Reports() {
  const [downloading, setDownloading] = useState("");

  const handleDownload = async (reportId) => {
    setDownloading(reportId);
    try {
      if (reportId === "coverage") {
        const docs = await fetchDocuments();
        const counts = {};
        docs.forEach((d) => {
          const reg = d.regulator || "Unassigned";
          counts[reg] = (counts[reg] || 0) + 1;
        });
        const rows = Object.entries(counts).map(([reg, count]) => [reg, count]);
        downloadCsv("regulatory-coverage.csv", ["Regulator", "Document Count"], rows);
      } else if (reportId === "rules") {
        const regulators = await fetchRegulators();
        const rows = [];
        regulators.forEach((reg) => {
          (reg.rules || []).forEach((rule) => {
            rows.push([rule.id, reg.name, reg.jurisdiction || "Global", rule.description, rule.impact]);
          });
        });
        downloadCsv("rules-inventory.csv", ["Rule ID", "Regulator", "Jurisdiction", "Description", "Impact"], rows);
      } else if (reportId === "alerts") {
        const alerts = await fetchAlerts();
        const rows = (alerts || []).map((a) => [a.id, a.title, a.regulator || "N/A", a.severity, a.status, a.created_at || ""]);
        downloadCsv("compliance-alerts.csv", ["Alert ID", "Title", "Regulator", "Severity", "Status", "Created At"], rows);
      }
    } catch (err) {
      alert("Failed to export report: " + err.message);
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="page-simple">
      <h1 className="page-title">Reports</h1>
      <p className="muted">Generate and download live compliance reports as CSV.</p>

      <div className="report-grid">
        {REPORTS_LIST.map((r) => (
          <div key={r.id} className="card report-card">
            <div className="round-icon green"><FileBarChart size={22} /></div>
            <h3>{r.title}</h3>
            <p className="muted">{r.desc}</p>
            <button
              className="btn"
              disabled={downloading === r.id}
              onClick={() => handleDownload(r.id)}
            >
              <Download size={15} /> {downloading === r.id ? "Exporting..." : "Download CSV"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
