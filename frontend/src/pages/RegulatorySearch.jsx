import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, FileText, Copy, Check, ExternalLink, AlertTriangle } from "lucide-react";
import SearchResultCard from "../components/SearchResultCard.jsx";
import CitationDialog from "../components/CitationDialog.jsx";
import { searchDocuments, fetchDocuments } from "../services/api.js";

const POPULAR_SEARCHES = [
  "EMIR interest rate swaps",
  "MiFID II Counterparty LEI",
  "FCA trade reporting",
  "Execution Venue MIC",
];

export default function RegulatorySearch() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") || "";
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cite, setCite] = useState(null);
  const [copied, setCopied] = useState(false);
  const [docMap, setDocMap] = useState({});

  useEffect(() => {
    fetchDocuments()
      .then((docs) => {
        const map = {};
        docs.forEach((d) => {
          if (d.fileName) map[d.fileName.toLowerCase()] = d.documentId;
          if (d.documentId) map[String(d.documentId)] = d.documentId;
        });
        setDocMap(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    searchDocuments(initial).then((r) => {
      if (active) {
        setResults(r);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [initial]);

  const submit = (e) => {
    e.preventDefault();
    setParams(q ? { q } : {});
  };

  const handleCopy = () => {
    if (!cite?.citation) return;
    navigator.clipboard.writeText(cite.citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeDocId = cite
    ? cite.doc_id || cite.document_id || docMap[(cite.document_name || "").toLowerCase()] || docMap[(cite.title || "").toLowerCase()]
    : null;

  return (
    <div className="page-simple">
      <h1 className="page-title">Regulatory Search</h1>
      <p className="muted">Search across regulatory documents, rules and clauses.</p>

      <form className="search-box wide" onSubmit={submit}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a regulatory question..." />
        <button className="btn icon-only" aria-label="Search"><Search size={18} /></button>
      </form>
      <div className="chip-row">
        {POPULAR_SEARCHES.map((p) => (
          <button key={p} className="chip" onClick={() => { setQ(p); setParams({ q: p }); }}>
            {p}
          </button>
        ))}
      </div>

      <div className="result-list">
        {loading ? (
          <p className="muted">Searching…</p>
        ) : results.length === 0 ? (
          <p className="muted">No results found.</p>
        ) : (
          results.map((r) => <SearchResultCard key={r.id} result={r} onCite={setCite} />)
        )}
      </div>

      <CitationDialog
        open={Boolean(cite)}
        title="Regulatory Citation"
        className="dialog-lg"
        onClose={() => {
          setCite(null);
          setCopied(false);
        }}
      >
        {cite && (
          <div className="citation-modal-content">
            <div className="citation-header-info">
              <h4 className="citation-doc-title">{cite.document_name || cite.title}</h4>
              <div className="citation-meta-tags">
                <span className="tag">{cite.regulator}</span>
                {cite.version && <span className="tag-outline">{cite.version}</span>}
                {cite.page_number && <span className="tag-outline">Page {cite.page_number}</span>}
                {cite.clause && <span className="tag-outline">{cite.clause}</span>}
                {cite.date && <span className="tag-outline">Effective: {cite.date}</span>}
              </div>
            </div>

            <div className="citation-code-block">
              <div className="citation-code-label">Standardized Citation Reference</div>
              <div className="citation-code-row">
                <span className="citation-code-text">{cite.citation}</span>
                <button
                  type="button"
                  className="btn-copy"
                  onClick={handleCopy}
                  aria-label="Copy citation reference"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="citation-source-card">
              <div className="citation-source-header">
                <FileText size={15} />
                <span>Cited Regulatory Text (Grounded Source)</span>
              </div>
              <div
                className="citation-source-text"
                dangerouslySetInnerHTML={{
                  __html: cite.snippet || cite.content,
                }}
              />
            </div>

            {cite.applicability_warning && (
              <div className="citation-warning-banner">
                <AlertTriangle size={15} />
                <span>{cite.applicability_warning}</span>
              </div>
            )}

            <div className="citation-dialog-footer">
              {activeDocId && (
                <a
                  href={`/api/v1/ingest/documents/${activeDocId}/raw`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                >
                  <ExternalLink size={15} /> Open Source Document ({String(cite.title || "").endsWith(".html") ? "HTML" : "PDF"})
                </a>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setCite(null);
                  setCopied(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </CitationDialog>
    </div>
  );
}
