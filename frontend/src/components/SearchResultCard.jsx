import { FileText } from "lucide-react";

export default function SearchResultCard({ result, onCite }) {
  return (
    <article className="card result-card">
      <div className="result-top">
        <span className="tag">{result.regulator}</span>
        <small>{result.clause} · {result.date}</small>
      </div>
      <h3>{result.title}</h3>
      <p dangerouslySetInnerHTML={{ __html: result.snippet }} />
      <button
        type="button"
        className="link-btn"
        style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}
        onClick={() => onCite(result)}
      >
        <FileText size={14} />
        <span>View citation</span>
      </button>
    </article>
  );
}
