package com.reg_iris.ingestion_service.demo.orchestrator;

import com.reg_iris.ingestion_service.demo.dto.DocumentChunk;
import com.reg_iris.ingestion_service.demo.dto.DocumentIngestionResponse;
import com.reg_iris.ingestion_service.demo.dto.DocumentUploadRequest;
import com.reg_iris.ingestion_service.demo.model.DocumentMetadata;
import com.reg_iris.ingestion_service.demo.repository.DocumentMetadataRepository;
import com.reg_iris.ingestion_service.demo.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class IngestionOrchestratorService {

    private final MinioStorageService minioStorageService;
    private final DocumentStorageService documentStorageService;
    private final MetadataVersioningService metadataVersioningService;
    private final DocumentParsingService documentParsingService;
    private final ElasticsearchService elasticsearchService;
    private final ChromaDBService chromaDBService;
    private final EmbeddingWebhookService embeddingWebhookService;
    private final DocumentMetadataRepository documentMetadataRepository;

    @Transactional
    public DocumentIngestionResponse processDocument(MultipartFile file, DocumentUploadRequest request) {
        // 1. Upload raw file to MinIO
        String storagePath = minioStorageService.uploadFile(file);

        // 2. Metadata & Versioning in PostgreSQL
        DocumentMetadata metadata = metadataVersioningService.trackAndVersionDocument(
                file.getOriginalFilename(), storagePath, request);

        // Also save to disk storage volume (under the assigned version) so raw downloads can be served inline
        try {
            documentStorageService.saveFile(file, metadata.getRegulator(), metadata.getVersion());
        } catch (Exception e) {
            log.warn("Secondary disk write skipped: {}", e.getMessage());
        }

        // 3. Page-Aware Parsing & Chunking
        List<DocumentChunk> chunks =
                documentParsingService.parseDocument(
                        file,
                        metadata.getDocumentId(),
                        metadata.getRegulator()
                );

        // 3b. "What's New" clause-level diff against the previous version directly from MinIO
        Set<String> newTexts = chunks.stream().map(DocumentChunk::getText).collect(Collectors.toCollection(LinkedHashSet::new));
        if (metadata.getParentDocId() == null) {
            metadata.setDiffSummary("Initial version - " + newTexts.size() + " clauses ingested.");
        } else {
            Set<String> oldTexts = new HashSet<>();
            // Fetch parent document from database
            DocumentMetadata parentDoc = documentMetadataRepository.findById(metadata.getParentDocId()).orElse(null);
            if (parentDoc != null && parentDoc.getStoragePath() != null) {
                try {
                    byte[] parentBytes = minioStorageService.getObjectBytes(parentDoc.getStoragePath());
                    List<DocumentChunk> parentChunks = documentParsingService.parseDocumentBytes(
                            parentBytes, parentDoc.getFileName(), parentDoc.getDocumentId(), parentDoc.getRegulator());
                    oldTexts = parentChunks.stream().map(DocumentChunk::getText).collect(Collectors.toSet());
                    log.info("Successfully retrieved and parsed parent document from MinIO (Doc ID: {}, {} clauses)",
                            parentDoc.getDocumentId(), oldTexts.size());
                } catch (Exception e) {
                    log.warn("Failed to retrieve parent from MinIO, attempting Elasticsearch fallback: {}", e.getMessage());
                    oldTexts = new HashSet<>(elasticsearchService.findClauseTexts(metadata.getParentDocId()));
                }
            } else {
                oldTexts = new HashSet<>(elasticsearchService.findClauseTexts(metadata.getParentDocId()));
            }

            final Set<String> previousClauseTexts = oldTexts;
            List<String> added = newTexts.stream().filter(t -> !previousClauseTexts.contains(t)).toList();
            long removed = previousClauseTexts.stream().filter(t -> !newTexts.contains(t)).count();

            if (added.isEmpty() && removed == 0) {
                String parentVer = parentDoc != null ? parentDoc.getVersion() : "previous version";
                metadata.setDiffSummary("No textual clause differences between " + parentVer + " and " + metadata.getVersion() + ".");
            } else {
                String summary = String.format("+%d added, -%d removed clause%s.",
                        added.size(), removed, (added.size() == 1 && removed == 0 ? "" : "s"));
                if (!added.isEmpty()) {
                    String firstAdded = added.get(0);
                    String preview = firstAdded.length() > 160 ? firstAdded.substring(0, 160) + "..." : firstAdded;
                    summary += " New: \"" + preview + "\"";
                }
                metadata.setDiffSummary(summary);
            }
        }
        documentMetadataRepository.save(metadata);

        // 4. Index in Elasticsearch (BM-25)
        elasticsearchService.indexDocumentClauses(chunks, metadata);

        // 5. Store Embeddings in ChromaDB (Semantic Search)
        chromaDBService.storeEmbeddings(chunks, metadata);

        // 6. Dispatch webhook to FastAPI if running
        try {
            embeddingWebhookService.sendChunksToFastApi(metadata.getDocumentId(), metadata.getRegulator(), chunks);
        } catch (Exception e) {
            log.warn("FastAPI embedding webhook dispatch notification failed (non-blocking): {}", e.getMessage());
        }

        // 7. Build structured JSON response matching requirement specification
        List<DocumentIngestionResponse.ParagraphItem> paragraphItems = chunks.stream().map(c ->
                DocumentIngestionResponse.ParagraphItem.builder()
                        .paragraphId(c.getChunkId())
                        .text(c.getText())
                        .pageNumber(c.getPageNumber())
                        .section(c.getParentSectionId())
                        .build()
        ).toList();

        return DocumentIngestionResponse.builder()
                .documentId("DOC-" + String.format("%03d", metadata.getDocumentId()))
                .documentName(metadata.getFileName())
                .uploadDate(metadata.getUploadTimestamp() != null ? metadata.getUploadTimestamp().toLocalDate().toString() : LocalDate.now().toString())
                .regulator(metadata.getRegulator())
                .effectiveDate(metadata.getEffectiveDate() != null ? metadata.getEffectiveDate().toString() : "")
                .version(metadata.getVersion())
                .jurisdiction(metadata.getJurisdiction())
                .category(metadata.getCategory())
                .storagePath(metadata.getStoragePath())
                .diffSummary(metadata.getDiffSummary())
                .paragraphs(paragraphItems)
                .build();
    }
}