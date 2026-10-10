package com.reg_iris.ingestion_service.demo.service;

import com.reg_iris.ingestion_service.demo.dto.DocumentChunk;
import com.reg_iris.ingestion_service.demo.model.DocumentMetadata;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.annotation.Id;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.annotations.DateFormat;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.query.Criteria;
import org.springframework.data.elasticsearch.core.query.CriteriaQuery;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ElasticsearchService {

    private final ElasticsearchOperations elasticsearchOperations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Document(indexName = "regulatory_clauses")
    public static class ClauseIndexItem {
        @Id
        @Field(name = "chunk_id", type = FieldType.Keyword)
        private String chunkId;

        @Field(name = "document_id", type = FieldType.Long)
        private Long documentId;

        @Field(name = "file_name", type = FieldType.Keyword)
        private String fileName;

        @Field(name = "document_name", type = FieldType.Keyword)
        private String documentName;

        @Field(type = FieldType.Keyword)
        private String regulator;

        @Field(type = FieldType.Keyword)
        private String jurisdiction;

        @Field(type = FieldType.Keyword)
        private String category;

        @Field(type = FieldType.Keyword)
        private String version;

        @Field(name = "parent_section_id", type = FieldType.Keyword)
        private String parentSectionId;

        @Field(name = "parent_header", type = FieldType.Keyword)
        private String parentHeader;

        @Field(name = "prev_chunk_id", type = FieldType.Keyword)
        private String prevChunkId;

        @Field(name = "next_chunk_id", type = FieldType.Keyword)
        private String nextChunkId;

        @Field(name = "page_number", type = FieldType.Integer)
        private int pageNumber;

        @Field(name = "effective_date", type = FieldType.Date, format = DateFormat.date)
        private LocalDate effectiveDate;

        @Field(name = "effective_from", type = FieldType.Date, format = DateFormat.date)
        private LocalDate effectiveFrom;

        @Field(type = FieldType.Text, analyzer = "standard")
        private String text;

        @Field(type = FieldType.Text, analyzer = "standard")
        private String content;
    }

    public void indexDocumentClauses(List<DocumentChunk> chunks, DocumentMetadata doc) {
        List<ClauseIndexItem> indexItems = chunks.stream().map(c -> ClauseIndexItem.builder()
                .chunkId(c.getChunkId())
                .documentId(doc.getDocumentId())
                .fileName(doc.getFileName())
                .documentName(doc.getFileName())
                .regulator(doc.getRegulator())
                .jurisdiction(doc.getJurisdiction())
                .category(doc.getCategory())
                .version(doc.getVersion())
                .parentSectionId(c.getParentSectionId())
                .parentHeader(c.getParentSectionId())
                .prevChunkId(c.getPrevChunkId())
                .nextChunkId(c.getNextChunkId())
                .pageNumber(c.getPageNumber())
                .effectiveDate(doc.getEffectiveDate())
                .effectiveFrom(doc.getEffectiveDate())
                .text(c.getText())
                .content(c.getText())
                .build()
        ).collect(Collectors.toList());

        // Create the index from the @Field mapping (keyword facets, date ranges) instead of dynamic text mapping,
        // otherwise core-api search aggregations on regulator/jurisdiction/category fail
        if (!elasticsearchOperations.indexOps(ClauseIndexItem.class).exists()) {
            elasticsearchOperations.indexOps(ClauseIndexItem.class).createWithMapping();
        }
        elasticsearchOperations.save(indexItems);
        // Make clauses searchable immediately so the next version's "What's New" diff sees them
        elasticsearchOperations.indexOps(ClauseIndexItem.class).refresh();
        log.info("Indexed {} clauses into 'regulatory_clauses' for Doc ID: {}", indexItems.size(), doc.getDocumentId());
    }

    // Clause texts of an already-indexed document version (used for the "What's New" diff)
    public List<String> findClauseTexts(Long documentId) {
        CriteriaQuery query = new CriteriaQuery(new Criteria("documentId").is(documentId), PageRequest.of(0, 10000));
        return elasticsearchOperations.search(query, ClauseIndexItem.class).stream()
                .map(hit -> hit.getContent().getText())
                .collect(Collectors.toList());
    }
}