/// Single file from GET /api/documents/:id/files response.
class DocumentFileDto {
  DocumentFileDto({
    required this.fileId,
    required this.fileName,
  });

  final String fileId;
  final String fileName;

  factory DocumentFileDto.fromJson(Map<String, dynamic> json) {
    return DocumentFileDto(
      fileId: json['id'] as String? ?? '',
      fileName: json['name'] as String? ?? '',
    );
  }
}
