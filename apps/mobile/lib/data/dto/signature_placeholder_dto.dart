/// Signature placeholder from GET /api/document-signatures/documents/:id/signature-placeholders
class SignaturePlaceholderDto {
  SignaturePlaceholderDto({
    required this.placeholderId,
    required this.documentFileId,
    required this.pageNumber,
    required this.xPosition,
    required this.yPosition,
    required this.width,
    required this.height,
    this.assignedUserId,
  });

  final String placeholderId;
  final String documentFileId;
  final int pageNumber;
  final double xPosition;
  final double yPosition;
  final double width;
  final double height;
  final String? assignedUserId;

  factory SignaturePlaceholderDto.fromJson(Map<String, dynamic> json) {
    return SignaturePlaceholderDto(
      placeholderId: json['placeholder_id'] as String? ?? '',
      documentFileId: json['document_file_id'] as String? ?? '',
      pageNumber: (json['page_number'] as num?)?.toInt() ?? 0,
      xPosition: (json['x_position'] as num?)?.toDouble() ?? 0,
      yPosition: (json['y_position'] as num?)?.toDouble() ?? 0,
      width: (json['width'] as num?)?.toDouble() ?? 0,
      height: (json['height'] as num?)?.toDouble() ?? 0,
      assignedUserId: json['assigned_user_id'] as String?,
    );
  }
}
