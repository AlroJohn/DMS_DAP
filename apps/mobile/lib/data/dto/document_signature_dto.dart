/// Existing signature from GET /api/document-signatures/documents/:id/signatures
class DocumentSignatureDto {
  DocumentSignatureDto({
    required this.documentFileId,
    required this.pageNumber,
    required this.xPosition,
    required this.yPosition,
    required this.width,
    required this.height,
    this.signatureData,
  });

  final String documentFileId;
  final int pageNumber;
  final double xPosition;
  final double yPosition;
  final double width;
  final double height;
  final String? signatureData;

  factory DocumentSignatureDto.fromJson(Map<String, dynamic> json) {
    return DocumentSignatureDto(
      documentFileId: json['documentFileFile_id'] as String? ?? json['document_file_id'] as String? ?? '',
      pageNumber: (json['page_number'] as num?)?.toInt() ?? 0,
      xPosition: (json['x_position'] as num?)?.toDouble() ?? 0,
      yPosition: (json['y_position'] as num?)?.toDouble() ?? 0,
      width: (json['width'] as num?)?.toDouble() ?? 0,
      height: (json['height'] as num?)?.toDouble() ?? 0,
      signatureData: json['signature_data'] as String?,
    );
  }
}
