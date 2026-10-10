package com.reg_iris.ingestion_service.demo.service;


import com.reg_iris.ingestion_service.demo.dto.DocumentUploadRequest;
import com.reg_iris.ingestion_service.demo.model.DocumentMetadata;
import com.reg_iris.ingestion_service.demo.repository.DocumentMetadataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.ZonedDateTime;

@Service
@RequiredArgsConstructor
public class MetadataVersioningService {

    // Strips a trailing version tag so "MiFID_II_2023_v2.pdf" and "MiFID_II_2023_v1.pdf" share one document family
    private static final String VERSION_SUFFIX = "(?i)_v\\d+(\\.\\d+)?(?=\\.[^.]+$)";

    private final DocumentMetadataRepository repository;

    public DocumentMetadata trackAndVersionDocument(String fileName, String storagePath, DocumentUploadRequest request) {
        DocumentMetadata metadata = new DocumentMetadata();
        metadata.setFileName(fileName);
        metadata.setRegulator(request.getRegulator());
        metadata.setJurisdiction(request.getJurisdiction());
        metadata.setEffectiveDate(request.getEffectiveDate());
        metadata.setCategory(request.getCategory());
        metadata.setUploadTimestamp(ZonedDateTime.now());
        metadata.setStoragePath(storagePath);

        // Versioning Logic: latest upload of the same regulator + document family is the parent
        String family = fileName.replaceAll(VERSION_SUFFIX, "");
        repository.findAllByRegulatorOrderByDocumentIdAsc(request.getRegulator()).stream()
                .filter(doc -> doc.getFileName().replaceAll(VERSION_SUFFIX, "").equalsIgnoreCase(family))
                .reduce((previous, latest) -> latest)
                .ifPresentOrElse(
                        parentDoc -> {
                            metadata.setParentDocId(parentDoc.getDocumentId());
                            metadata.setVersion(incrementVersion(parentDoc.getVersion()));
                        },
                        () -> {
                            metadata.setParentDocId(null);
                            metadata.setVersion("v1.0");
                        }
                );

        // Optional manual override from the upload form
        if (request.getVersion() != null && !request.getVersion().isBlank()) {
            metadata.setVersion(request.getVersion().trim());
        }

        return repository.save(metadata);
    }

    private String incrementVersion(String currentVersion) {
        if (currentVersion == null || !currentVersion.startsWith("v")) return "v1.0";
        try {
            double vNum = Double.parseDouble(currentVersion.replace("v", ""));
            return "v" + String.format("%.1f", vNum + 1.0); // e.g., v1.0 -> v2.0
        } catch (NumberFormatException e) {
            return currentVersion + "-updated";
        }
    }
}