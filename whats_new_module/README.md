# 📜 What's New & Regulatory Version Diff: Complete Guide
## Reg IRIS – Intelligent Regulatory Repository & Impact Scanner

---

## 1. 📌 Context & Problem Overview

In investment banking, compliance teams must monitor multiple regulatory bodies (**MiFID II, SEC, EMIR, FCA, CFTC**). When a regulator issues an updated version of a policy document (e.g., *MiFID II 2023 v1.0* updated to *v2.0*), compliance officers manually read hundreds of pages to find what changed.

**Reg IRIS automates this completely**:
- When a new document version is uploaded, the system stores the raw file in **MinIO object storage**.
- Detects the previous parent version in **PostgreSQL**.
- Downloads and parses both versions, compares their clauses dynamically, and calculates the **Clause-Level Diff**.
- Persists the version history and diff summary in PostgreSQL.
- Pushes an **Alert Notification** and displays a **"What's New" Card** on the UI dashboard.

---

## 2. 🎯 What the Problem Statement & Developer Expect (Deliverables)

According to the official **Definition of Done (DoD)**:

| # | Deliverable | Description in Problem Statement |
|---|-------------|-----------------------------------|
| **1** | **"What's New" Card** | UI dashboard displays a "What's New" card highlighting the regulator, effective date, version transition (`v1.0 → v2.0`), and a short diff. |
| **2** | **Relational Versioning Layer** | PostgreSQL database table (`doc_metadata`) records every upload, sets `parent_doc_id`, increments version numbers, and stores `diff_summary`. |
| **3** | **MinIO Raw Object Storage** | Spring Boot Ingestion Service stores all uploaded raw documents (PDF, HTML, TXT) immutably in MinIO bucket `reg-iris-docs`. |
| **4** | **Alert Panel Notification** | A mock notification toast pops up on document upload, linking directly to the generated "What's New" card (`/updates?doc=...`). |
| **5** | **Lineage & Traceability** | Lineage linking every diff to the exact clause title, paragraph number, and effective enforcement date. |

---

## 3. 🏗️ End-to-End Architectural Flow

```
   [ Compliance Officer / UI (:3000) ]
                   │
                   │ 1. Uploads PDF (e.g., MiFID_II_2023_v2.pdf)
                   ▼
   [ Spring Boot Ingestion Service (:8081) ]
       ├── 2. Uploads raw binary ──────────────► [ MinIO Bucket: 'reg-iris-docs' (:9000) ]
       │                                            (File stored with unique UUID)
       │
       ├── 3. Checks parent version ───────────► [ PostgreSQL: 'doc_metadata' (:5432) ]
       │      (Found parent_doc_id=1, v1.0)         (Sets version = 'v2.0', parent_doc_id = 1)
       │
       ├── 4. Fetches parent binary ───────────► [ MinIO: retrieves parent file bytes ]
       │      (Parses parent clauses on the fly)
       │
       ├── 5. Runs Dynamic Clause Diff:
       │      • Added Clauses:    +1 (Paragraph 7. Execution Venue Disclosure)
       │      • Removed Clauses:  -0
       │      • Summary: "+1 added, -0 removed clause. New: 'Paragraph 7...'"
       │
       ├── 6. Updates diff_summary ────────────► [ PostgreSQL: doc_metadata ]
       │
       ├── 7. Indexes clauses for search ──────► [ Elasticsearch (:9200) & ChromaDB (:8002) ]
       │
       ▼
   [ Frontend React Dashboard (:3000) ]
       ├── 8. Displays Toast Notification: "New MiFID II document ingested (v2.0)"
       └── 9. Renders "What's New" Card at /updates:
              Badge: MiFID II | Title: MiFID_II_2023_v2.pdf · v1.0 → v2.0
              Effective Date: 2023-07-01
              Diff: "+1 added, -0 removed clause. New: Paragraph 7..."
```

---

## 4. ⚙️ How the Implementation Works (Zero Hardcoding)

1. **MinIO Content Retrieval (`MinioStorageService.java`)**:
   - `uploadFile(MultipartFile file)`: Streams binary to MinIO, returning `reg-iris-docs/{UUID}-{fileName}`.
   - `getObjectBytes(String storagePath)`: Fetches the raw file bytes back from MinIO whenever diff comparison is triggered.

2. **Byte-Level Document Parsing (`DocumentParsingService.java`)**:
   - `parseDocumentBytes(byte[] bytes, String fileName, ...)`: Parses PDF, HTML, TXT, or DOCX directly from bytes. No temporary disk files or mocks needed.

3. **Dynamic Clause Diff Engine (`IngestionOrchestratorService.java`)**:
   - When `metadata.getParentDocId() != null`:
     - Reads `parentDoc.getStoragePath()` from PostgreSQL.
     - Downloads parent document bytes from MinIO via `minioStorageService.getObjectBytes()`.
     - Extracts parent clauses and compares against the new document clauses.
     - Detects added, removed, and modified clauses.
     - Persists `diff_summary` into PostgreSQL (`doc_metadata`).

4. **Dynamic Frontend Rendering (`frontend/src/services/api.js` & `WhatsNew.jsx`)**:
   - Fetches live data from `/api/v1/ingest/documents`.
   - Formats cards dynamically from `doc_metadata` fields without artificial fallbacks.

---

## 5. 🧪 How to Verify from Scratch (Testing from the Start)

### Step 1: Reset to a Clean State (One-Liner)
Run this command in terminal to reset the database and search index to 0:
```bash
docker exec regiris-postgres psql -U regiris_user -d regiris_db -c "TRUNCATE TABLE doc_metadata RESTART IDENTITY CASCADE;" && curl -s -X DELETE "http://localhost:9200/regulatory_clauses" > /dev/null
```

### Step 2: Test in the Browser UI
1. Open **`http://localhost:3000/library`** (Document Library).
2. **Upload Version 1**:
   - Regulator: `MiFID II`
   - Effective Date: `2023-07-01`
   - Select file: `sample_input/regulations/MiFID_II_2023_v1.pdf`
   - Result: Ingested as baseline version **`v1.0`** (`DOC-001`).
3. **Upload Version 2**:
   - Regulator: `MiFID II`
   - Effective Date: `2023-07-01`
   - Select file: `sample_input/regulations/MiFID_II_2023_v2.pdf`
   - Result:
     - Notification Toast pops up: **"New MiFID II document ingested (v2.0)"**.
     - Links directly to **"What's New"** card.
4. Open **`http://localhost:3000/updates`**:
   - See the **What's New Card**:
     - `MiFID II` · `MiFID_II_2023_v2.pdf · v1.0 → v2.0`
     - `Effective 2023-07-01`
     - `+1 added, -0 removed clause. New: "Paragraph 7. New Clause – Execution Venue Disclosure (v2.0)..."`
   - Click the card to open the **Comparison Dialog**.

### Step 3: Verify MinIO & PostgreSQL
- **MinIO Console**: Open `http://localhost:9001` (`minioadmin` / `minioadmin`) ➔ Bucket `reg-iris-docs` to see both raw PDF files stored.
- **PostgreSQL**: Run in terminal:
  ```bash
  docker exec -it regiris-postgres psql -U regiris_user -d regiris_db -c \
  "SELECT document_id, file_name, regulator, version, parent_doc_id, diff_summary FROM doc_metadata ORDER BY document_id ASC;"
  ```
  Shows `parent_doc_id = 1` for `document_id = 2` with the exact live calculated diff!
