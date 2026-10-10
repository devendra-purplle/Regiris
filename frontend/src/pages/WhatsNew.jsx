import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import WhatsNewCard from "../components/WhatsNewCard.jsx";
import CitationDialog from "../components/CitationDialog.jsx";
import { fetchUpdates } from "../services/api.js";

export default function WhatsNew() {
  const [updates, setUpdates] = useState([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [params] = useSearchParams();
  const docId = Number(params.get("doc"));

  // Load cards; a ?doc= link from the upload notification opens that card directly
  useEffect(() => {
    fetchUpdates()
      .then((u) => { setUpdates(u); setSelected(u.find((i) => i.id === docId) ?? null); })
      .catch((e) => setError(e.message));
  }, [docId]);

  return (
    <div className="page-simple">
      <h1 className="page-title">What's New</h1>
      <p className="muted">Review regulatory updates and their version changes.</p>

      <div className="card update-list">
        {updates.map((u) => <WhatsNewCard key={u.id} item={{ ...u, isNew: u.id === docId }} onOpen={setSelected} />)}
        {updates.length === 0 && !error && (
          <p className="muted">No documents ingested yet. <Link to="/library">Upload one in the Document Library.</Link></p>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>

      <CitationDialog open={Boolean(selected)} title={selected?.title} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <p className="muted">{selected.regulator} · {selected.date}</p>
            <strong>Version comparison</strong>
            <ul>{selected.changes.map((c) => <li key={c}>{c}</li>)}</ul>
          </>
        )}
      </CitationDialog>
    </div>
  );
}
