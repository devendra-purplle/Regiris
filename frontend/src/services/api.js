export async function searchDocuments(query) {
  const q = (query || "").trim();
  if (!q) return [];
  const res = await fetch("/api/v1/search/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, search_mode: "hybrid" }),
  });
  if (!res.ok) throw new Error(`Search failed (HTTP ${res.status})`);
  const data = await res.json();
  return (data.results || []).map((r) => ({
    id: r.chunk_id,
    doc_id: r.doc_id || "",
    document_id: r.doc_id || "",
    document_name: r.citation?.document_name || "Regulatory Document",
    title: r.citation?.document_name || r.parent_header || "Regulatory Document",
    regulator: r.regulator || "N/A",
    jurisdiction: r.jurisdiction || "Global",
    category: r.category || "General",
    clause: r.citation?.clause_reference || r.parent_header || (r.citation?.page_number ? `Page ${r.citation.page_number}` : "Clause"),
    page: r.citation?.page_number ? `Page ${r.citation.page_number}` : "",
    page_number: r.citation?.page_number || 1,
    version: r.citation?.version || "v1.0",
    date: r.effective_from || "Active",
    effective_from: r.effective_from || "",
    effective_to: r.effective_to || "",
    snippet: r.matched_snippet || r.content,
    content: r.content || r.matched_snippet || "",
    citation: r.citation?.citation_label || `${r.citation?.document_name || "Document"} (${r.citation?.version || "v1.0"}) - Page ${r.citation?.page_number || 1}`,
    citation_label: r.citation?.citation_label || "",
    applicability_warning: r.applicability_warning || null,
  }));
}

export async function askAssistant(question) {
  const q = (question || "").trim();
  if (!q) return "";
  const res = await fetch("/api/v1/chat/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: q }),
  });
  if (!res.ok) throw new Error(`Assistant failed (HTTP ${res.status})`);
  const data = await res.json();
  let answer = (data.answer || "").trim();
  if (data.grounded_sources?.length) {
    const validSources = data.grounded_sources
      .map((s) => s.citation_label || (s.document_name ? `${s.document_name} (${s.version || "v1.0"}) - Page ${s.page_number || 1}` : ""))
      .filter(Boolean);
    if (validSources.length > 0) {
      answer += "\n\nSources:\n" + validSources.map((lbl) => `• ${lbl}`).join("\n");
    }
  }
  return answer;
}

export const suggestedPrompts = [
  "What are the reporting fields for interest rate swaps under EMIR?",
  "Summarise latest MiFID II updates",
  "Show rules related to Counterparty LEI",
  "What are the changes in execution venue disclosure?",
];

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
    const parentDoc = docs.find((p) => p.documentId === d.parentDocId);
    const from = parentDoc?.version;
    const diff = d.diffSummary ? d.diffSummary.trim() : "";
    const changeItems = [
      `Version: ${from ? `${from} → ${d.version}` : `${d.version} (baseline version)`}`,
    ];
    if (d.effectiveDate) {
      changeItems.push(`Effective date: ${d.effectiveDate}`);
    }
    if (diff) {
      changeItems.push(diff);
    }
    return {
      id: d.documentId,
      regulator: d.regulator,
      title: `${d.fileName} · ${from ? `${from} → ${d.version}` : `${d.version} (new document)`}`,
      date: `Effective ${d.effectiveDate || "N/A"} · Uploaded ${String(d.uploadTimestamp ?? "").slice(0, 10)}`,
      level: from ? "high" : "low",
      summary: diff,
      changes: changeItems,
    };
  });
}

// Regulatory Alerts API
export async function fetchAlerts() {
  const res = await fetch("/api/v1/alerts");
  if (!res.ok) throw new Error(`Could not load alerts (HTTP ${res.status})`);
  const data = await res.json();
  return (data.items || []).map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    level: a.severity ? a.severity.charAt(0).toUpperCase() + a.severity.slice(1) : "Medium",
    read: a.status === "acknowledged" || a.status === "resolved",
    status: a.status,
    regulator: a.metadata?.regulator || a.category || "General",
    date: String(a.created_at || "").slice(0, 10),
  }));
}

export async function acknowledgeAlert(alertId) {
  const res = await fetch(`/api/v1/alerts/${alertId}/acknowledge`, { method: "POST" });
  if (!res.ok) throw new Error(`Could not acknowledge alert (HTTP ${res.status})`);
  return res.json();
}

export async function resolveAlert(alertId) {
  const res = await fetch(`/api/v1/alerts/${alertId}/resolve`, { method: "POST" });
  if (!res.ok) throw new Error(`Could not resolve alert (HTTP ${res.status})`);
  return res.json();
}
