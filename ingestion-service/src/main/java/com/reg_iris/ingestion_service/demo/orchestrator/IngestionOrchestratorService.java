package com.reg_iris.ingestion_service.demo.orchestrator;

import com.reg_iris.ingestion_service.demo.dto.DocumentChunk;
import com.reg_iris.ingestion_service.demo.dto.DocumentIngestionResponse;
import com.reg_iris.ingestion_service.demo.dto.DocumentUploadRequest;
import com.reg_iris.ingestion_service.demo.model.DocumentMetadata;
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

        // 3b. "What's New" paragraph-level diff against the previous version
        Set<String> newTexts = chunks.stream().map(DocumentChunk::getText).collect(Collectors.toCollection(LinkedHashSet::new));
        if (metadata.getParentDocId() == null) {
            metadata.setDiffSummary("Initial version - " + newTexts.size() + " clauses ingested.");
        } else {
            Set<String> oldTexts = new HashSet<>(elasticsearchService.findClauseTexts(metadata.getParentDocId()));
            List<String> added = newTexts.stream().filter(t -> !oldTexts.contains(t)).toList();
            long removed = oldTexts.stream().filter(t -> !newTexts.contains(t)).count();
            metadata.setDiffSummary(String.format("+%d added, -%d removed clauses.", added.size(), removed)
                    + (added.isEmpty() ? " No new clause text." : " New: \"" + (added.get(0).length() > 160 ? added.get(0).substring(0, 160) + "..." : added.get(0)) + "\""));
        }

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