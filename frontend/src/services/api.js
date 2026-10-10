import { searchResults, assistantPrompts } from "../data/mockData.js";

// Swap these mock calls for real backend requests when ready.
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export async function searchDocuments(query) {
  await delay();
  const q = query.trim().toLowerCase();
  if (!q) return searchResults;
  const words = q.split(/\s+/);
  return searchResults.filter((r) =>
    words.some((w) => `${r.title} ${r.regulator} ${r.snippet}`.toLowerCase().includes(w))
  );
}

export async function askAssistant(question) {
  await delay(500);
  return `Here is a summary related to "${question}". Connect this to your backend to return grounded answers with citations.`;
}

export const suggestedPrompts = assistantPrompts;

// Ingestion service (Spring Boot): upload + relational versioning layer (doc_metadata)
export async function uploadDocument(file, { regulator, effectiveDate }) {
  const form = new FormData();
  form.append("file", file);
  form.append("regulator", regulator);
  if (effectiveDate) form.append("effectiveDate", effectiveDate);
  const res = await fetch("/api/v1/ingest/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.text()) || `Upload failed (HTTP ${res.status})`);
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch("/api/v1/ingest/documents");
  if (!res.ok) throw new Error(`Could not load documents (HTTP ${res.status})`);
  return (await res.json()).sort((a, b) => b.documentId - a.documentId);
}

// "What's New" cards: one per recorded upload, newest first, shaped for WhatsNewCard
export async function fetchUpdates() {
  const docs = await fetchDocuments();
  return docs.map((d) => {
    const from = docs.find((p) => p.documentId === d.parentDocId)?.version;
    const diff = d.diffSummary || "No diff recorded for this version.";
    return {
      id: d.documentId,
      regulator: d.regulator,
      title: `${d.fileName} · ${from ? `${from} → ${d.version}` : `${d.version} (new document)`}`,
      date: `Effective ${d.effectiveDate || "N/A"} · Uploaded ${String(d.uploadTimestamp ?? "").slice(0, 10)}`,
      level: from ? "high" : "low",
      summary: diff,
      changes: [`Version: ${from ?? "none"} → ${d.version}`, `Effective date: ${d.effectiveDate || "N/A"}`, diff],
    };
  });
}
