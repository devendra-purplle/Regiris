package com.reg_iris.ingestion_service.demo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentIngestionResponse {

    @JsonProperty("document_id")
    private String documentId;

    @JsonProperty("document_name")
    private String documentName;

    @JsonProperty("upload_date")
    private String uploadDate;

    @JsonProperty("regulator")
    private String regulator;

    @JsonProperty("effective_date")
    private String effectiveDate;

    @JsonProperty("version")
    private String version;

    @JsonProperty("jurisdiction")
    private String jurisdiction;

    @JsonProperty("category")
    private String category;

    @JsonProperty("storage_path")
    private String storagePath;

    @JsonProperty("diff_summary")
    private String diffSummary;

    @JsonProperty("paragraphs")
    private List<ParagraphItem> paragraphs;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParagraphItem {
        @JsonProperty("paragraph_id")
        private String paragraphId;

        @JsonProperty("text")
        private String text;

        @JsonProperty("page_number")
        private int pageNumber;

        @JsonProperty("section")
        private String section;
    }
}
