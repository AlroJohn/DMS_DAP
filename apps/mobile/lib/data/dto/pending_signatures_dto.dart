/// Single document item from GET /api/pending-signatures response data array.
class PendingSignatureDocumentDto {
  PendingSignatureDocumentDto({
    required this.documentId,
    required this.documentName,
    required this.classification,
    required this.status,
    required this.createdAt,
    this.type,
    this.files = const [],
    required this.isSigned,
    required this.pendingSignatures,
  });

  final String documentId;
  final String documentName;
  final String classification;
  final String status;
  final String createdAt;
  final DocumentTypeDto? type;
  final List<DocumentFileDto> files;
  final bool isSigned;
  final int pendingSignatures;

  factory PendingSignatureDocumentDto.fromJson(Map<String, dynamic> json) {
    final typeJson = json['type'] as Map<String, dynamic>?;
    final filesList = json['files'] as List<dynamic>? ?? [];
    return PendingSignatureDocumentDto(
      documentId: json['document_id'] as String? ?? '',
      documentName: json['document_name'] as String? ?? '',
      classification: json['classification'] as String? ?? '',
      status: json['status'] as String? ?? '',
      createdAt: json['created_at'] != null
          ? (json['created_at'] is String
              ? json['created_at'] as String
              : (json['created_at'] as DateTime).toIso8601String())
          : '',
      type: typeJson != null ? DocumentTypeDto.fromJson(typeJson) : null,
      files: filesList
          .map((e) => DocumentFileDto.fromJson(e as Map<String, dynamic>))
          .toList(),
      isSigned: json['is_signed'] as bool? ?? false,
      pendingSignatures: json['pending_signatures'] as int? ?? 0,
    );
  }
}

class DocumentTypeDto {
  DocumentTypeDto({required this.typeId, required this.typeName});

  final String typeId;
  final String typeName;

  factory DocumentTypeDto.fromJson(Map<String, dynamic> json) {
    return DocumentTypeDto(
      typeId: json['type_id'] as String? ?? '',
      typeName: json['type_name'] as String? ?? '',
    );
  }
}

class DocumentFileDto {
  DocumentFileDto({
    required this.fileId,
    required this.fileName,
    required this.filePath,
  });

  final String fileId;
  final String fileName;
  final String filePath;

  factory DocumentFileDto.fromJson(Map<String, dynamic> json) {
    return DocumentFileDto(
      fileId: json['file_id'] as String? ?? '',
      fileName: json['file_name'] as String? ?? '',
      filePath: json['file_path'] as String? ?? '',
    );
  }
}
