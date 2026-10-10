import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Search, Bell, X } from "lucide-react";
import { fetchDocuments, uploadDocument } from "../services/api.js";
import { fetchRegulators } from "../services/ruleEngine.js";

export default function DocumentLibrary() {
  const [docs, setDocs] = useState([]);
  const [regulators, setRegulators] = useState([]);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [uploadReg, setUploadReg] = useState("EMIR");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchDocuments().then(setDocs).catch((e) => setError(e.message));
    fetchRegulators()
      .then((list) => {
        const ids = list.map((r) => r.id);
        setRegulators(ids);
        if (ids.length > 0) setUploadReg(ids[0]);
      })
      .catch(() => {});
  }, []);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setUploaded(await uploadDocument(file, { regulator: uploadReg, effectiveDate }));
      setDocs(await fetchDocuments());
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const shown = docs.filter(
    (d) => (filter === "All" || d.regulator === filter) && d.fileName.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="page-simple">
      <h1 className="page-title">Document Library</h1>
      <p className="muted">Browse and upload regulatory documents.</p>

      <div className="card toolbar">
        <div className="search-box grow">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents..." />
          <span className="search-icon"><Search size={16} /></span>
        </div>
        <select className="select" value={uploadReg} onChange={(e) => setUploadReg(e.target.value)} aria-label="Regulator for upload">
          {regulators.map((r) => <option key={r}>{r}</option>)}
        </select>
        <input className="select" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} aria-label="Effective date for upload" />
        <input ref={fileRef} type="file" accept=".pdf,.html,.htm,.txt,.docx" hidden onChange={onUpload} />
        <button className="btn" disabled={uploading} onClick={() => fileRef.current.click()}>
          <Upload size={15} /> {uploading ? "Ingesting..." : "Upload"}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}

      <div className="chip-row filters">
        {["All", ...regulators].map((r) => (
          <button key={r} className={`chip${filter === r ? " active" : ""}`} onClick={() => setFilter(r)}>{r}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Document</th><th>Regulator</th><th>Type</th><th>Version</th><th>Effective</th><th>Uploaded</th></tr></thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.documentId}>
                  <td>{d.fileName}</td><td><span className="tag">{d.regulator}</span></td>
                  <td>{d.fileName.split(".").pop().toUpperCase()}</td><td>{d.version}</td>
                  <td>{d.effectiveDate || "N/A"}</td><td>{String(d.uploadTimestamp ?? "").slice(0, 10)}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan="6" className="muted">No documents found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload notification linking to the generated "What's New" card (document_id is "DOC-005" -> 5) */}
      {uploaded && (
        <div className="toast" role="status">
          <Bell size={18} className="toast-icon" />
          <div className="update-main">
            <strong>New {uploaded.regulator} document ingested</strong>
            <small>{uploaded.document_name} · {uploaded.version} · Effective {uploaded.effective_date || "N/A"}</small>
            <p>{uploaded.diff_summary}</p>
            <Link to={`/updates?doc=${Number(uploaded.document_id.slice(4))}`}>View "What's New" card →</Link>
          </div>
          <button className="icon-btn" onClick={() => setUploaded(null)} aria-label="Dismiss notification"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
